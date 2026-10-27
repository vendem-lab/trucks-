import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';

initializeApp();
const db = getFirestore();
const mailApiKey = defineSecret('MAIL_API_KEY');
const notificationFrom = defineSecret('NOTIFICATION_FROM');

function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  return request.auth;
}

async function requireStaff(request) {
  const auth = requireAuth(request);
  const profile = await db.doc(`users/${auth.uid}`).get();
  if (profile.data()?.role !== 'staff') throw new HttpsError('permission-denied', 'Staff access is required.');
  return auth;
}

export const updateOwnMemberProfile = onCall(async (request) => {
  const auth = requireAuth(request);
  const allowed = ['name', 'phone', 'region', 'city', 'vehicleType', 'vehiclePlate', 'licenseNumber', 'emergencyName', 'emergencyPhone', 'notes'];
  const patch = request.data || {};
  if (Object.keys(patch).some((key) => !allowed.includes(key))) {
    throw new HttpsError('invalid-argument', 'Profile contains unsupported fields.');
  }
  const memberRef = db.doc(`members/${auth.uid}`);
  const profileRef = db.doc(`users/${auth.uid}`);
  const member = await memberRef.get();
  if (!member.exists) throw new HttpsError('not-found', 'Member profile not found.');
  await memberRef.update({ ...patch, updatedAt: new Date().toISOString() });
  if (typeof patch.name === 'string') await profileRef.set({ name: patch.name }, { merge: true });
  return { ok: true };
});

export const claimOpenLoad = onCall(async (request) => {
  const auth = requireAuth(request);
  const memberSnapshot = await db.doc(`members/${auth.uid}`).get();
  if (!memberSnapshot.exists || memberSnapshot.data().status !== 'active') {
    throw new HttpsError('permission-denied', 'An active membership is required to claim loads.');
  }
  const loadId = String(request.data?.loadId || '');
  if (!loadId) throw new HttpsError('invalid-argument', 'Load id is required.');
  const loadRef = db.doc(`loads/${loadId}`);
  await db.runTransaction(async (transaction) => {
    const load = await transaction.get(loadRef);
    if (!load.exists) throw new HttpsError('not-found', 'Load not found.');
    if (load.data().status !== 'open') throw new HttpsError('failed-precondition', 'This load has already been claimed.');
    transaction.update(loadRef, {
      status: 'filled', filledBy: memberSnapshot.data().name || auth.token.name || 'Member',
      filledById: auth.uid, filledAt: new Date().toISOString()
    });
  });
  return { ok: true };
});

export const registerForEvent = onCall(async (request) => {
  const auth = requireAuth(request);
  const eventId = String(request.data?.eventId || '');
  const name = String(request.data?.name || '').trim();
  const email = String(auth.token.email || '').trim().toLowerCase();
  const phone = String(request.data?.phone || '').trim();
  if (!eventId || !name || !email || !phone) throw new HttpsError('invalid-argument', 'Complete the registration details.');
  const eventRef = db.doc(`events/${eventId}`);
  const registrationId = `${eventId}_${auth.uid}`;
  const registrationRef = db.doc(`registrations/${registrationId}`);
  await db.runTransaction(async (transaction) => {
    const [event, existing] = await Promise.all([transaction.get(eventRef), transaction.get(registrationRef)]);
    if (!event.exists) throw new HttpsError('not-found', 'Event not found.');
    if (existing.exists) throw new HttpsError('already-exists', 'You are already registered for this event.');
    const data = event.data();
    let member = null;
    if (data.memberOnly) member = await transaction.get(db.doc(`members/${auth.uid}`));
    if (data.memberOnly && (!member?.exists || member.data().status !== 'active')) throw new HttpsError('permission-denied', 'An active membership is required for this event.');
    if (Number(data.capacity) > 0 && Number(data.registered) >= Number(data.capacity)) {
      throw new HttpsError('resource-exhausted', 'This event is full.');
    }
    transaction.create(registrationRef, {
      eventId, eventTitle: data.title, memberId: auth.uid, name, email, phone,
      createdAt: new Date().toISOString()
    });
    transaction.update(eventRef, { registered: FieldValue.increment(1) });
  });
  return { ok: true, registrationId };
});

export const setMemberStatus = onCall(async (request) => {
  await requireStaff(request);
  const memberId = String(request.data?.memberId || '');
  const status = String(request.data?.status || '');
  if (!memberId || !['active', 'suspended', 'expired', 'pending'].includes(status)) {
    throw new HttpsError('invalid-argument', 'A valid member and status are required.');
  }
  const memberRef = db.doc(`members/${memberId}`);
  const member = await memberRef.get();
  if (!member.exists) throw new HttpsError('not-found', 'Member not found.');
  await memberRef.update({ status, ...(status === 'active' ? { approvedAt: new Date().toISOString() } : {}) });
  await db.doc(`users/${memberId}`).set({ memberStatus: status }, { merge: true });
  return { ok: true };
});

export const approveMemberApplication = onCall(async (request) => {
  await requireStaff(request);
  const applicationId = String(request.data?.applicationId || '');
  if (!applicationId) throw new HttpsError('invalid-argument', 'Application id is required.');
  const applicationRef = db.doc(`applications/${applicationId}`);
  await db.runTransaction(async (transaction) => {
    const application = await transaction.get(applicationRef);
    if (!application.exists) throw new HttpsError('not-found', 'Application not found.');
    const data = application.data();
    const uid = String(data.uid || '');
    if (!uid) throw new HttpsError('failed-precondition', 'Application has no account id.');
    const existingMember = await transaction.get(db.doc(`members/${uid}`));
    if (existingMember.exists) throw new HttpsError('already-exists', 'Member record already exists.');
    const memberRef = db.doc(`members/${uid}`);
    const userRef = db.doc(`users/${uid}`);
    transaction.set(memberRef, { ...data, status: 'active', approvedAt: new Date().toISOString() });
    transaction.set(userRef, { uid, memberId: uid, name: data.name, email: data.email, role: 'member', memberStatus: 'active', tier: data.tier }, { merge: true });
    transaction.update(applicationRef, { status: 'approved', approvedAt: new Date().toISOString() });
  });
  return { ok: true };
});

async function sendOfficeNotification(kind, data, apiKey, from) {
  const settings = await db.doc('settings/union').get();
  const to = settings.data()?.email;
  if (!to || !apiKey || !from) {
    logger.warn('Notification delivery is not configured; record saved without email.', { kind });
    return;
  }

  const subject = kind === 'application'
    ? `New membership application: ${data.name || data.email}`
    : `New union enquiry: ${data.subject || data.type || 'General'}`;
  const body = kind === 'application'
    ? `${data.name || ''} (${data.email || ''}) applied for ${data.tier || 'membership'}. Review it in the admin members area.`
    : `${data.name || ''} (${data.email || ''}) submitted: ${data.subject || ''}\n\n${data.message || ''}`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, text: body })
  });
  if (!response.ok) throw new Error(`Notification provider returned ${response.status}`);
}

export const notifyNewApplication = onDocumentCreated(
  { document: 'applications/{applicationId}', secrets: [mailApiKey, notificationFrom] },
  async (event) => {
    try {
      await sendOfficeNotification('application', event.data.data(), mailApiKey.value(), notificationFrom.value());
    } catch (error) {
      logger.error('Application notification failed.', error);
      await db.collection('notificationFailures').add({ kind: 'application', recordId: event.params.applicationId, error: String(error), createdAt: new Date().toISOString() });
    }
  }
);

export const notifyNewEnquiry = onDocumentCreated(
  { document: 'enquiries/{enquiryId}', secrets: [mailApiKey, notificationFrom] },
  async (event) => {
    try {
      await sendOfficeNotification('enquiry', event.data.data(), mailApiKey.value(), notificationFrom.value());
    } catch (error) {
      logger.error('Enquiry notification failed.', error);
      await db.collection('notificationFailures').add({ kind: 'enquiry', recordId: event.params.enquiryId, error: String(error), createdAt: new Date().toISOString() });
    }
  }
);
