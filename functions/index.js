import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';

initializeApp();
const db = getFirestore();
const mailApiKey = defineSecret('MAIL_API_KEY');
const notificationFrom = defineSecret('NOTIFICATION_FROM');

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
