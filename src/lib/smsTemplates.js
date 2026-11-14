// Pure helpers shared by the browser app and the serverless SMS function.
// Keep this module free of browser, Firebase and Vite-only imports.

export const SMS_MAX_LENGTH = 480;

const STATUS_LABELS = {
  active: 'active',
  pending: 'pending',
  suspended: 'suspended',
  expired: 'expired'
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || String(status || '').replace(/_/g, ' ');
}

export const SMS_TEMPLATES = {
  announcement: {
    label: 'Announcement',
    kind: 'announcement',
    audience: 'all',
    message: '{{unionName}}: '
  },
  dues: {
    label: 'Dues reminder',
    kind: 'dues',
    audience: 'dues',
    message:
      'Hello {{firstName}}, {{unionName}} records show GHS {{amount}} outstanding across {{count}} invoice(s). Pay by MoMo or at the office. Call {{officePhone}}.'
  },
  status: {
    label: 'Membership update',
    kind: 'status',
    audience: 'members',
    message:
      'Hello {{firstName}}, your {{unionName}} membership is now {{status}}. Member no. {{memberNumber}}. Call {{officePhone}} if this is unexpected.'
  },
  loadAlert: {
    label: 'Load alert',
    kind: 'load-alert',
    audience: 'load-alerts',
    message:
      '{{unionName}} load: {{loadTitle}} - {{origin}} to {{destination}} ({{trailerType}}), GHS {{rate}}, ref {{loadReference}}. Call {{officePhone}}.'
  }
};

export function buildStatusMessage(status) {
  if (status === 'active') {
    return 'Hello {{firstName}}, your {{unionName}} membership is active. Member no. {{memberNumber}}. Call {{officePhone}} for help.';
  }
  return SMS_TEMPLATES.status.message;
}

export function renderTemplate(template, vars = {}) {
  const officePhone = String(vars.officePhone ?? '').trim();
  const rendered = String(template || '').replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (match, key) => {
      // An unset office phone must render empty so the clause below can be
      // cleaned up instead of leaking a raw placeholder into a text message.
      if (key === 'officePhone' && !officePhone) return '';
      return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key] ?? '') : match;
    }
  );

  // Without an office phone the "Call {{officePhone}}" clauses render as
  // "Call ." or "Call  if this is unexpected." Point members at the office
  // instead of leaving a broken sentence in a real text message.
  if (officePhone) return rendered;

  return rendered
    .replace(/\s*Call\s+(if|for)\b/gi, ' Contact the union office $1')
    .replace(/\s*Call\s*\./gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();
}

export function normalizePhone(phone) {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('233') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `233${digits.slice(1)}`;
  if (digits.length >= 9 && digits.length <= 15) return digits;
  return '';
}

export function smsSegments(text) {
  const value = String(text || '');
  const length = value.length;
  // GSM-7 covers ASCII plus a small extended set. Anything else needs UCS-2.
  const gsm = /^[\x00-\x7F£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|€]*$/.test(
    value
  );
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  return {
    length,
    encoding: gsm ? 'GSM-7' : 'UCS-2',
    segments: length === 0 ? 0 : length <= single ? 1 : Math.ceil(length / multi)
  };
}

export function smsMoney(value) {
  const amount = Number(value) || 0;
  return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
