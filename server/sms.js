import { matchesAlert } from '../src/lib/union.js';
import {
  SMS_MAX_LENGTH,
  normalizePhone,
  renderTemplate,
  smsSegments,
  statusLabel
} from '../src/lib/smsTemplates.js';
import {
  HttpError,
  bearerToken,
  createDocument,
  fieldFilter,
  getDocument,
  projectIdFrom,
  runQuery,
  verifyFirebaseToken
} from './firebaseRest.js';

const DEFAULT_API_URL = 'https://sms.arkesel.com/api/v2/sms/send';
const MAX_RECIPIENTS = 200;
const PROVIDER_BATCH = 100;

async function requireStaff({ projectId, token, uid }) {
  const profile = await getDocument({ projectId, token, collectionId: 'users', id: uid });
  if (!profile || profile.role !== 'staff') {
    throw new HttpError(403, 'Staff access is required to send SMS.');
  }
  return profile;
}

/* ------------------------------------------------------------------
   Recipients and message variables
------------------------------------------------------------------ */

function formatPeriod(period) {
  const [year, month] = String(period || '').split('-').map(Number);
  if (!year || !month) return 'the current period';
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  });
}

function money(value) {
  return (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function memberVars(member, settings, dues = [], extras = {}) {
  const outstanding = dues.filter((invoice) => ['due', 'overdue'].includes(invoice.status));
  const totalOutstanding = outstanding.reduce(
    (sum, invoice) => sum + (Number(invoice.amount) || 0),
    0
  );
  const overdue = outstanding.find((invoice) => invoice.status === 'overdue');
  const period = overdue?.period || outstanding[0]?.period || dues[0]?.period || '';
  return {
    name: member.name || '',
    firstName: String(member.name || '').split(/\s+/)[0] || '',
    memberNumber: member.memberNumber || '',
    unionName: settings?.unionName || "Haulway Drivers' Union",
    officePhone: settings?.phone || settings?.memberLine || '',
    officeEmail: settings?.email || '',
    amount: money(totalOutstanding),
    count: String(outstanding.length),
    period: formatPeriod(period),
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
    rate: money(load.rate),
    pickupDate: load.pickupDate || ''
  };
}

function toRecipient(member, settings, dues, extras) {
  return {
    memberId: member.id,
    name: member.name || '',
    phone: normalizePhone(member.phone),
    vars: memberVars(member, settings, dues, extras)
  };
}

function dedupe(recipients) {
  const seen = new Map();
  recipients.forEach((recipient) => {
    if (!recipient.phone || seen.has(recipient.phone)) return;
    seen.set(recipient.phone, recipient);
  });
  return Array.from(seen.values());
}

function audienceLabel(audience, settings, load) {
  if (audience.type === 'region') return `Members in ${audience.value}`;
  if (audience.type === 'tier') return `Members on the ${audience.value} tier`;
  if (audience.type === 'dues') {
    const ids = Array.isArray(audience.ids) ? audience.ids : [];
    if (ids.length === 1) return 'Dues reminder for 1 member';
    if (ids.length > 1) return `Dues reminders for ${ids.length} members`;
    return 'Members with outstanding dues';
  }
  if (audience.type === 'members') return `${(audience.ids || []).length} selected member(s)`;
  if (audience.type === 'load-alerts') return load ? `Job alerts for ${load.reference}` : 'Job alerts';
  return 'All active members';
}

async function resolveRecipients({ projectId, token, audience, settings }) {
  const members = [];
  let dues = [];

  if (audience.type === 'members') {
    const ids = Array.isArray(audience.ids) ? audience.ids.slice(0, MAX_RECIPIENTS) : [];
    const found = await Promise.all(
      ids.map((id) => getDocument({ projectId, token, collectionId: 'members', id }))
    );
    found.filter(Boolean).forEach((member) => members.push(member));
    const duesRows = await runQuery({
      projectId,
      token,
      collectionId: 'dues',
      limit: 1000
    });
    dues = duesRows;
  } else if (audience.type === 'dues') {
    const ids = Array.isArray(audience.ids) ? audience.ids.slice(0, MAX_RECIPIENTS) : [];
    const allowed = ids.length ? new Set(ids) : null;
    const active = await runQuery({
      projectId,
      token,
      collectionId: 'members',
      filters: [fieldFilter('status', 'EQUAL', 'active')],
      limit: 300
    });
    const duesRows = await runQuery({
      projectId,
      token,
      collectionId: 'dues',
      limit: 1000
    });
    dues = duesRows;
    const withDues = new Set(
      duesRows
        .filter((invoice) => ['due', 'overdue'].includes(invoice.status))
        .map((invoice) => invoice.memberId)
    );
    active
      .filter((member) => (!allowed || allowed.has(member.id)) && withDues.has(member.id))
      .forEach((member) => members.push(member));
  } else if (audience.type === 'load-alerts') {
    const loadId = String(audience.value || audience.loadId || '');
    const load = await getDocument({ projectId, token, collectionId: 'loads', id: loadId });
    if (!load) throw new HttpError(404, 'The selected load could not be found.');
    const alerts = await runQuery({
      projectId,
      token,
      collectionId: 'alerts',
      filters: [fieldFilter('active', 'EQUAL', true)],
      limit: 500
    });
    const matches = alerts.filter((alert) => matchesAlert(load, alert));
    const memberIds = Array.from(new Set(matches.map((alert) => alert.memberId).filter(Boolean)));
    const found = await Promise.all(
      memberIds.slice(0, MAX_RECIPIENTS).map((id) =>
        getDocument({ projectId, token, collectionId: 'members', id })
      )
    );
    found.filter(Boolean).forEach((member) => members.push(member));
    const withDues = await runQuery({
      projectId,
      token,
      collectionId: 'dues',
      limit: 1000
    });
    dues = withDues;
    const recipients = dedupe(
      members.map((member) =>
        toRecipient(
          member,
          settings,
          dues.filter((invoice) => invoice.memberId === member.id),
          loadVars(load)
        )
      )
    );
    return {
      recipients,
      skipped: members.length - recipients.length,
      load,
      label: audienceLabel(audience, settings, load)
    };
  } else {
    const filters = [fieldFilter('status', 'EQUAL', 'active')];
    if (audience.type === 'region') filters.push(fieldFilter('region', 'EQUAL', audience.value));
    if (audience.type === 'tier') filters.push(fieldFilter('tier', 'EQUAL', audience.value));
    const rows = await runQuery({
      projectId,
      token,
      collectionId: 'members',
      filters,
      limit: 300
    });
    rows.forEach((member) => members.push(member));
    dues = await runQuery({
      projectId,
      token,
      collectionId: 'dues',
      limit: 1000
    });
  }

  const recipients = dedupe(
    members.map((member) =>
      toRecipient(
        member,
        settings,
        dues.filter((invoice) => invoice.memberId === member.id)
      )
    )
  );
  return {
    recipients,
    skipped: members.length - recipients.length,
    load: null,
    label: audienceLabel(audience, settings, null)
  };
}

/* ------------------------------------------------------------------
   Arkesel
------------------------------------------------------------------ */

async function postToArkesel({ apiKey, sender, apiUrl, recipients, message }) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sender, message, recipients }),
    signal: AbortSignal.timeout(20000)
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  const failedStatus =
    data && typeof data.status === 'string' && data.status.toLowerCase() !== 'success';
  if (!response.ok || failedStatus) {
    const error = new Error(
      data?.message || data?.error || `Arkesel returned ${response.status}`
    );
    error.status = response.status >= 400 ? response.status : 502;
    error.details = data;
    throw error;
  }
  return data;
}

function chunk(list, size) {
  const chunks = [];
  for (let index = 0; index < list.length; index += size) {
    chunks.push(list.slice(index, index + size));
  }
  return chunks;
}

async function deliver({ recipients, message, env }) {
  const dryRun = String(env.SMS_DRY_RUN || '').toLowerCase() === 'true';
  const apiKey = env.ARKESEL_API_KEY || '';
  const sender = env.ARKESEL_SENDER_ID || 'HAULWAY';
  const apiUrl = env.ARKESEL_API_URL || DEFAULT_API_URL;

  if (!dryRun && !apiKey) {
    throw new HttpError(
      503,
      'SMS is not configured yet. Add ARKESEL_API_KEY and ARKESEL_SENDER_ID to the deployment environment.'
    );
  }

  const groups = new Map();
  recipients.forEach((recipient) => {
    const text = renderTemplate(message, recipient.vars).trim();
    if (!text) return;
    if (!groups.has(text)) groups.set(text, []);
    groups.get(text).push(recipient.phone);
  });

  let sent = 0;
  let failed = 0;
  const errors = [];
  let preview = '';

  for (const [text, phones] of groups.entries()) {
    if (!preview) preview = text;
    for (const batch of chunk(phones, PROVIDER_BATCH)) {
      if (dryRun) {
        sent += batch.length;
        continue;
      }
      try {
        await postToArkesel({ apiKey, sender, apiUrl, recipients: batch, message: text });
        sent += batch.length;
      } catch (error) {
        failed += batch.length;
        errors.push({ phones: batch.length, error: error.message });
      }
    }
  }

  return { sent, failed, errors, preview, sender, dryRun };
}

/* ------------------------------------------------------------------
   Request handler
------------------------------------------------------------------ */

const AUDIENCE_TYPES = ['all', 'region', 'tier', 'dues', 'members', 'load-alerts'];
const KINDS = ['announcement', 'dues', 'status', 'load-alert'];

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'object') return body;
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, 'The request body must be valid JSON.');
  }
}

function validatePayload(payload) {
  const message = String(payload.message || '').trim();
  if (!message) throw new HttpError(400, 'Write a message before sending.');
  if (message.length > SMS_MAX_LENGTH) {
    throw new HttpError(400, `Keep the message under ${SMS_MAX_LENGTH} characters.`);
  }
  const kind = KINDS.includes(payload.kind) ? payload.kind : 'announcement';
  const audience = payload.audience && typeof payload.audience === 'object'
    ? payload.audience
    : { type: 'all' };
  if (!AUDIENCE_TYPES.includes(audience.type)) {
    throw new HttpError(400, 'Choose a valid SMS audience.');
  }
  if (audience.type === 'region' && !String(audience.value || '').trim()) {
    throw new HttpError(400, 'Choose a region for this audience.');
  }
  if (audience.type === 'tier' && !String(audience.value || '').trim()) {
    throw new HttpError(400, 'Choose a membership tier for this audience.');
  }
  if (audience.type === 'members' && !(Array.isArray(audience.ids) && audience.ids.length)) {
    throw new HttpError(400, 'Choose at least one member.');
  }
  if (audience.type === 'load-alerts' && !String(audience.value || audience.loadId || '').trim()) {
    throw new HttpError(400, 'Choose a load to alert members about.');
  }
  return { kind, audience, message };
}

export async function handleSmsRequest({ method = 'GET', headers = {}, body, env = {} }) {
  try {
    const projectId = projectIdFrom(env);
    const token = bearerToken(headers);
    if (!token) throw new HttpError(401, 'Sign in to use the SMS service.');
    const auth = await verifyFirebaseToken(token, projectId);
    const profile = await requireStaff({ projectId, token, uid: auth.sub });

    if (String(method).toUpperCase() === 'GET') {
      return {
        status: 200,
        body: {
          provider: 'arkesel',
          configured: Boolean(env.ARKESEL_API_KEY) || String(env.SMS_DRY_RUN).toLowerCase() === 'true',
          sender: env.ARKESEL_SENDER_ID || 'HAULWAY',
          dryRun: String(env.SMS_DRY_RUN || '').toLowerCase() === 'true'
        }
      };
    }

    if (String(method).toUpperCase() !== 'POST') {
      throw new HttpError(405, 'Use GET or POST for this endpoint.');
    }

    const payload = validatePayload(parseBody(body));
    const settingsDoc = await getDocument({
      projectId,
      token,
      collectionId: 'settings',
      id: 'union'
    });
    const settings = settingsDoc || {};

    const resolved = await resolveRecipients({
      projectId,
      token,
      audience: payload.audience,
      settings
    });

    if (!resolved.recipients.length) {
      throw new HttpError(400, 'No members with a phone number match this audience.');
    }

    const maxRecipients = Number(env.SMS_MAX_RECIPIENTS) || 100;
    if (resolved.recipients.length > maxRecipients) {
      throw new HttpError(
        400,
        `This audience has ${resolved.recipients.length} members. Send to ${maxRecipients} or fewer at a time.`
      );
    }

    const delivery = await deliver({
      recipients: resolved.recipients,
      message: payload.message,
      env
    });

    const segments = smsSegments(delivery.preview);
    const log = {
      kind: payload.kind,
      audience: resolved.label,
      message: payload.message,
      recipients: resolved.recipients.length,
      sent: delivery.sent,
      failed: delivery.failed,
      status: delivery.failed === 0 ? 'sent' : delivery.sent === 0 ? 'failed' : 'partial',
      sender: delivery.sender,
      simulated: delivery.dryRun,
      preview: delivery.preview.slice(0, 200),
      segments: segments.segments,
      createdBy: auth.sub,
      createdByName: profile.name || auth.name || auth.email || 'Staff',
      createdAt: new Date().toISOString()
    };

    let logId = '';
    try {
      const saved = await createDocument({
        projectId,
        token,
        collectionId: 'smsMessages',
        record: log
      });
      logId = saved?.id || '';
    } catch (error) {
      // The messages have already gone out; do not fail the request just
      // because the audit record could not be written.
      console.error('Could not write the SMS log.', error);
    }

    return {
      status: 200,
      body: {
        ok: true,
        ...log,
        logId,
        errors: delivery.errors.slice(0, 10)
      }
    };
  } catch (error) {
    const status =
      error.status && error.status >= 400 && error.status < 600 ? error.status : 500;
    if (status === 500) console.error('SMS request failed.', error);
    return {
      status,
      body: { error: error.message || 'The SMS request failed.' }
    };
  }
}
