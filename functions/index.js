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

export const payDues = onCall(async (request) => {
  const auth = requireAuth(request);
  const duesId = String(request.data?.duesId || '');
  const method = String(request.data?.method || '');
  if (!duesId) throw new HttpsError('invalid-argument', 'Dues invoice id is required.');
  if (!['momo', 'bank', 'cash'].includes(method)) {
    throw new HttpsError('invalid-argument', 'Choose a valid payment method.');
  }

  const invoiceRef = db.doc(`dues/${duesId}`);
  const [invoice, profile] = await Promise.all([
    invoiceRef.get(),
    db.doc(`users/${auth.uid}`).get()
  ]);
  if (!invoice.exists) throw new HttpsError('not-found', 'Dues invoice not found.');

  const isStaff = profile.data()?.role === 'staff';
  if (!isStaff && invoice.data().memberId !== auth.uid) {
    throw new HttpsError('permission-denied', 'You can only pay your own dues.');
  }
  if (invoice.data().status === 'paid') return { ok: true };
  if (invoice.data().status === 'waived') {
    throw new HttpsError('failed-precondition', 'This invoice has been waived.');
  }

  await invoiceRef.update({
    status: 'paid',
    paidAt: new Date().toISOString(),
    method,
    note: `Payment recorded by ${method}.`
  });
  return { ok: true };
});

export const deleteEventRegistration = onCall(async (request) => {
  await requireStaff(request);
  const registrationId = String(request.data?.registrationId || '');
  if (!registrationId) throw new HttpsError('invalid-argument', 'Registration id is required.');

  await db.runTransaction(async (transaction) => {
    const registrationRef = db.doc(`registrations/${registrationId}`);
    const registration = await transaction.get(registrationRef);
    if (!registration.exists) throw new HttpsError('not-found', 'Registration not found.');
    const eventRef = db.doc(`events/${registration.data().eventId}`);
    const event = await transaction.get(eventRef);
    transaction.delete(registrationRef);
    if (event.exists) {
      transaction.update(eventRef, {
        registered: Math.max(0, (Number(event.data().registered) || 0) - 1)
      });
    }
  });
  return { ok: true };
});

export const deleteEvent = onCall(async (request) => {
  await requireStaff(request);
  const eventId = String(request.data?.eventId || '');
  if (!eventId) throw new HttpsError('invalid-argument', 'Event id is required.');

  const registrations = await db.collection('registrations').where('eventId', '==', eventId).get();
  const batch = db.batch();
  registrations.forEach((registration) => batch.delete(registration.ref));
  batch.delete(db.doc(`events/${eventId}`));
  await batch.commit();
  return { ok: true };
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

const ALERT_FIELDS = ['origin', 'destination', 'trailerType', 'minRate', 'frequency', 'active'];

function cleanAlertInput(input, { creating = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpsError('invalid-argument', 'Alert details are required.');
  }
  const unsupported = Object.keys(input).filter((key) => !ALERT_FIELDS.includes(key));
  if (unsupported.length) throw new HttpsError('invalid-argument', 'Alert contains unsupported fields.');
  const result = {};
  if ('origin' in input) result.origin = String(input.origin || '').trim().slice(0, 100);
  if ('destination' in input) result.destination = String(input.destination || '').trim().slice(0, 100);
  if ('trailerType' in input) result.trailerType = String(input.trailerType || 'Any').trim().slice(0, 60);
  if ('minRate' in input) {
    const rate = Number(input.minRate);
    if (!Number.isFinite(rate) || rate < 0) throw new HttpsError('invalid-argument', 'Minimum rate must be a non-negative number.');
    result.minRate = rate;
  }
  if ('frequency' in input) {
    const frequency = String(input.frequency || '');
    if (!['instant', 'daily', 'weekly'].includes(frequency)) throw new HttpsError('invalid-argument', 'Alert frequency is invalid.');
    result.frequency = frequency;
  }
  if ('active' in input) {
    if (typeof input.active !== 'boolean') throw new HttpsError('invalid-argument', 'Alert active must be boolean.');
    result.active = input.active;
  }
  if (creating && !result.origin && !result.destination && (!result.trailerType || result.trailerType === 'Any')) {
    throw new HttpsError('invalid-argument', 'Add an origin, destination, or trailer type.');
  }
  return result;
}

export const createJobAlert = onCall(async (request) => {
  const auth = requireAuth(request);
  const memberSnapshot = await db.doc(`members/${auth.uid}`).get();
  if (!memberSnapshot.exists || memberSnapshot.data().status !== 'active') {
    throw new HttpsError('permission-denied', 'An active membership is required to create job alerts.');
  }
  const data = cleanAlertInput(request.data, { creating: true });
  const member = memberSnapshot.data();
  const ref = db.collection('alerts').doc();
  const alert = {
    ...data,
    memberId: auth.uid,
    name: member.name || auth.token.name || 'Member',
    email: String(auth.token.email || '').toLowerCase(),
    phone: member.phone || '',
    active: true,
    createdAt: new Date().toISOString()
  };
  await ref.set(alert);
  return { id: ref.id, ...alert };
});

export const updateJobAlert = onCall(async (request) => {
  const auth = requireAuth(request);
  const alertId = String(request.data?.alertId || '');
  if (!alertId) throw new HttpsError('invalid-argument', 'Alert id is required.');
  const patch = cleanAlertInput(request.data?.patch);
  if (!Object.keys(patch).length) throw new HttpsError('invalid-argument', 'Provide alert changes.');
  const ref = db.doc(`alerts/${alertId}`);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Alert not found.');
  if (snapshot.data().memberId !== auth.uid) throw new HttpsError('permission-denied', 'You can only update your own alerts.');
  await ref.update({ ...patch, updatedAt: new Date().toISOString() });
  return { ok: true };
});

export const deleteJobAlert = onCall(async (request) => {
  const auth = requireAuth(request);
  const alertId = String(request.data?.alertId || '');
  if (!alertId) throw new HttpsError('invalid-argument', 'Alert id is required.');
  const ref = db.doc(`alerts/${alertId}`);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Alert not found.');
  if (snapshot.data().memberId !== auth.uid) throw new HttpsError('permission-denied', 'You can only delete your own alerts.');
  await ref.delete();
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
