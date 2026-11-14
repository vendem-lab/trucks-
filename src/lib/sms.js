import { TIER_BY_ID } from '../config.js';
import { firebaseAuth } from './firebase.js';
import { addSmsMessage, getState, isDemoMode } from './store.js';
import { duesSummary, formatPeriod, matchesAlert } from './union.js';
import {
  SMS_MAX_LENGTH,
  SMS_TEMPLATES,
  buildStatusMessage,
  normalizePhone,
  renderTemplate,
  smsMoney,
  statusLabel
} from './smsTemplates.js';

function invoicesFor(state, memberId) {
  return (state.dues || []).filter((invoice) => invoice.memberId === memberId);
}

function memberVars(state, member, extras = {}) {
  const invoices = invoicesFor(state, member.id);
  const summary = duesSummary(invoices, state.settings?.duesGraceDays);
  const outstandingPeriod =
    summary.overdue?.period || summary.outstanding?.[0]?.period || summary.current?.period || '';
  return {
    name: member.name || '',
    firstName: String(member.name || '').split(/\s+/)[0] || '',
    memberNumber: member.memberNumber || '',
    unionName: state.settings?.unionName || "Haulway Drivers' Union",
    officePhone: state.settings?.phone || state.settings?.memberLine || '',
    officeEmail: state.settings?.email || '',
    amount: smsMoney(summary.totalOutstanding),
    count: String(summary.outstanding.length),
    period: formatPeriod(outstandingPeriod),
    status: statusLabel(member.status),
    ...extras
  };
}

function loadVars(load) {
  return {
    loadTitle: load.title || 'New load',
    loadReference: load.reference || '',
    origin: load.origin || '',
    destination: load.destination || '',
    trailerType: load.trailerType || load.vehicleType || '',
    rate: smsMoney(load.rate),
    pickupDate: load.pickupDate || ''
  };
}

function toRecipient(state, member, extras = {}) {
  return {
    memberId: member.id,
    name: member.name || '',
    phone: member.phone || '',
    vars: memberVars(state, member, extras)
  };
}

function dedupeByPhone(recipients) {
  const seen = new Map();
  recipients.forEach((recipient) => {
    const phone = normalizePhone(recipient.phone);
    if (!phone) return;
    if (!seen.has(phone)) seen.set(phone, { ...recipient, phone });
  });
  return Array.from(seen.values());
}

export function buildRecipients(audience = { type: 'all' }, state = getState()) {
  const members = state.members || [];
  const active = members.filter((member) => member.status === 'active');
  let recipients = [];

  if (audience.type === 'region') {
    recipients = active
      .filter((member) => member.region === audience.value)
      .map((member) => toRecipient(state, member));
  } else if (audience.type === 'tier') {
    recipients = active
      .filter((member) => member.tier === audience.value)
      .map((member) => toRecipient(state, member));
  } else if (audience.type === 'dues') {
    const allowed = Array.isArray(audience.ids) && audience.ids.length
      ? new Set(audience.ids)
      : null;
    recipients = active
      .filter((member) => !allowed || allowed.has(member.id))
      .map((member) => toRecipient(state, member))
      .filter((recipient) => {
        const summary = duesSummary(
          invoicesFor(state, recipient.memberId),
          state.settings?.duesGraceDays
        );
        return summary.totalOutstanding > 0;
      });
  } else if (audience.type === 'members') {
    const ids = new Set(Array.isArray(audience.ids) ? audience.ids : []);
    recipients = members
      .filter((member) => ids.has(member.id))
      .map((member) => toRecipient(state, member));
  } else if (audience.type === 'load-alerts') {
    const load = (state.loads || []).find(
      (entry) => entry.id === (audience.value || audience.loadId)
    );
    if (!load) return { recipients: [], skipped: 0, load: null };
    const alerts = (state.alerts || []).filter(
      (alert) => alert.active !== false && matchesAlert(load, alert)
    );
    const ids = new Set(alerts.map((alert) => alert.memberId));
    recipients = members
      .filter((member) => ids.has(member.id))
      .map((member) => toRecipient(state, member, loadVars(load)));
    return { recipients: dedupeByPhone(recipients), skipped: 0, load };
  } else {
    recipients = active.map((member) => toRecipient(state, member));
  }

  const withPhones = recipients.filter((recipient) => normalizePhone(recipient.phone));
  return {
    recipients: dedupeByPhone(withPhones),
    skipped: recipients.length - withPhones.length,
    load: null
  };
}

export function describeAudience(audience = { type: 'all' }, state = getState()) {
  if (audience.type === 'region') return `Members in ${audience.value}`;
  if (audience.type === 'tier') return TIER_BY_ID[audience.value]?.name || audience.value;
  if (audience.type === 'dues') {
    const ids = Array.isArray(audience.ids) ? audience.ids : [];
    if (ids.length === 1) {
      const member = (state.members || []).find((entry) => entry.id === ids[0]);
      return member ? `Dues reminder for ${member.name}` : 'Dues reminder for 1 member';
    }
    if (ids.length > 1) return `Dues reminders for ${ids.length} members`;
    return 'Members with outstanding dues';
  }
  if (audience.type === 'members') {
    const ids = Array.isArray(audience.ids) ? audience.ids : [];
    if (ids.length === 1) {
      const member = (state.members || []).find((entry) => entry.id === ids[0]);
      return member ? member.name : 'Selected member';
    }
    return `${ids.length} selected members`;
  }
  if (audience.type === 'load-alerts') {
    const load = (state.loads || []).find(
      (entry) => entry.id === (audience.value || audience.loadId)
    );
    return load ? `Job alerts for ${load.reference}` : 'Matching job alerts';
  }
  return 'All active members';
}

export function previewMessage(message, recipients = []) {
  const first = recipients[0];
  if (!first) return '';
  return renderTemplate(message, first.vars).trim();
}

export async function fetchSmsStatus() {
  if (isDemoMode()) {
    return { provider: 'arkesel', configured: true, demo: true, sender: 'HAULWAY' };
  }
  const user = firebaseAuth.currentUser;
  if (!user) return { configured: false, sender: '', error: 'Sign in to check SMS configuration.' };
  try {
    const token = await user.getIdToken();
    const response = await fetch('/api/sms', {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    return await response.json();
  } catch (error) {
    return {
      configured: false,
      sender: '',
      error:
        'The SMS endpoint is not reachable. Deploy the app to Vercel or Netlify with the Arkesel environment variables set.'
    };
  }
}

export async function sendSms({ kind = 'announcement', audience = { type: 'all' }, message, sentBy = '' }) {
  const text = String(message || '').trim();
  if (!text) throw new Error('Write a message before sending.');
  if (text.length > SMS_MAX_LENGTH) {
    throw new Error(`Keep the message under ${SMS_MAX_LENGTH} characters.`);
  }

  const state = getState();
  const resolved = buildRecipients(audience, state);
  if (!resolved.recipients.length) {
    throw new Error('No members with a phone number match this audience.');
  }

  if (isDemoMode()) {
    const rendered = resolved.recipients.map((recipient) => ({
      memberId: recipient.memberId,
      name: recipient.name,
      phone: recipient.phone,
      text: renderTemplate(text, recipient.vars).trim()
    }));
    const log = {
      id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind,
      audience: describeAudience(audience, state),
      message: text,
      recipients: rendered.length,
      sent: rendered.length,
      failed: 0,
      status: 'sent',
      sender: 'HAULWAY',
      simulated: true,
      preview: rendered[0]?.text || '',
      createdBy: 'demo',
      createdByName: sentBy || 'Union office',
      createdAt: new Date().toISOString()
    };
    addSmsMessage(log);
    return { ok: true, ...log };
  }

  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('Sign in again to send SMS.');
  const token = await user.getIdToken();
  const response = await fetch('/api/sms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ kind, audience, message: text })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `The SMS service returned ${response.status}.`);
  }
  return data;
}

export function notifyStatusChange(member, status, sentBy = '') {
  const state = getState();
  if (state.settings?.smsStatusUpdates === false) return Promise.resolve(null);
  if (!member?.phone) return Promise.resolve(null);
  const message = renderTemplate(buildStatusMessage(status), { status: statusLabel(status) });
  return sendSms({
    kind: 'status',
    audience: { type: 'members', ids: [member.id] },
    message,
    sentBy
  });
}

export function notifyDuesReminder(member, sentBy = '') {
  return sendSms({
    kind: 'dues',
    audience: { type: 'dues', ids: [member.id] },
    message: SMS_TEMPLATES.dues.message,
    sentBy
  });
}

export function notifyLoadAlerts(load, sentBy = '') {
  return sendSms({
    kind: 'load-alert',
    audience: { type: 'load-alerts', value: load.id },
    message: SMS_TEMPLATES.loadAlert.message,
    sentBy
  });
}

export { SMS_TEMPLATES, SMS_MAX_LENGTH, smsSegments } from './smsTemplates.js';
