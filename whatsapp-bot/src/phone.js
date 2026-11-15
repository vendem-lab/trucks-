/**
 * Normalise a phone number to the digits-only international form used by
 * WhatsApp and by the Firestore member records (e.g. 233557704299).
 * Returns an empty string when the number is not plausible.
 */
export function normalizePhone(input) {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return trimPlausible(digits.slice(2));
  if (digits.startsWith('233') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `233${digits.slice(1)}`;
  return trimPlausible(digits);
}

function trimPlausible(digits) {
  return digits.length >= 10 && digits.length <= 15 ? digits : '';
}

/** "233557704299@s.whatsapp.net" -> "233557704299" */
export function jidToPhone(jid) {
  const user = String(jid || '').split('@')[0].split(':')[0];
  return normalizePhone(user);
}

/** "233557704299" -> "+233 55 770 4299" (display only). */
export function formatPhone(phone) {
  const digits = normalizePhone(phone);
  if (!digits) return '';
  if (digits.startsWith('233') && digits.length === 12) {
    return `+233 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return `+${digits}`;
}

export function samePhone(a, b) {
  const left = normalizePhone(a);
  const right = normalizePhone(b);
  return Boolean(left) && left === right;
}
