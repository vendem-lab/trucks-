import { isValidEmail } from './format.js';

export const DELIVERY_NOTE_MIN = 5;
export const DELIVERY_NOTE_MAX = 600;
export const DELIVERY_PHOTO_MAX = 900000;
export const DELIVERY_CONFIRMATION_NOTE_MAX = 600;

export const EMPTY_DELIVERY = {
  note: '',
  photo: ''
};

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function isValidLoadReference(value) {
  return /^LD-\d{4}-\d+$/.test(String(value ?? '').trim().toUpperCase());
}

export function validateDelivery({ note, photo } = {}) {
  const errors = {};
  const text = String(note ?? '').trim();

  if (text.length < DELIVERY_NOTE_MIN) {
    errors.note = 'Add a short note about the delivery.';
  } else if (text.length > DELIVERY_NOTE_MAX) {
    errors.note = `Keep the note under ${DELIVERY_NOTE_MAX} characters.`;
  }

  if (photo) {
    if (typeof photo !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(photo)) {
      errors.photo = 'Choose a JPG, PNG or WebP photo.';
    } else if (photo.length > DELIVERY_PHOTO_MAX) {
      errors.photo = 'That photo is too large. Try a smaller image.';
    }
  }

  return errors;
}

export function validateDeliveryConfirmation({ reference, contactEmail, outcome, note } = {}) {
  const errors = {};

  if (!isValidLoadReference(reference)) {
    errors.reference = 'Enter the load reference, for example LD-2026-1049.';
  }
  if (!isValidEmail(contactEmail)) {
    errors.contactEmail = 'Enter the email address the load was posted with.';
  }
  if (!['delivered', 'problem'].includes(outcome)) {
    errors.outcome = 'Tell us whether the load arrived.';
  }
  if (String(note ?? '').trim().length > DELIVERY_CONFIRMATION_NOTE_MAX) {
    errors.note = `Keep the note under ${DELIVERY_CONFIRMATION_NOTE_MAX} characters.`;
  }

  return errors;
}

export function buildDeliveryRecord(load, member, { note, photo } = {}, now = new Date()) {
  return {
    loadId: load?.id || '',
    loadReference: load?.reference || '',
    memberId: member?.id || '',
    memberName: String(member?.name || '').trim(),
    deliveredAt: now.toISOString(),
    note: String(note ?? '').trim(),
    photo: photo || '',
    status: 'submitted',
    confirmedAt: '',
    confirmedBy: '',
    confirmationSource: '',
    shipperNote: '',
    shipperContact: '',
    shipperConfirmedAt: ''
  };
}

export function deliveryOutcomeLabel(outcome) {
  return outcome === 'problem' ? 'Reported a problem' : 'Confirmed delivery';
}
