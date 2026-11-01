import { VEHICLE_TYPES } from '../config.js';
import { isValidEmail, isValidPhone } from './format.js';

export const LOAD_REQUEST_RATE_KEY = 'haulway_load_request_times';
export const LOAD_REQUEST_RATE_WINDOW_MS = 10 * 60 * 1000;
export const LOAD_REQUEST_RATE_MAX = 3;

export const EMPTY_LOAD_REQUEST = {
  title: '',
  shipper: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  origin: '',
  destination: '',
  vehicleType: 'Dry van',
  weightTons: '',
  rate: '',
  pickupDate: '',
  deliveryDate: '',
  requirements: '',
  consent: false,
  website: ''
};

function inputDate(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function emptyLoadRequest(now = new Date()) {
  const pickup = new Date(now);
  pickup.setDate(pickup.getDate() + 1);
  return { ...EMPTY_LOAD_REQUEST, pickupDate: inputDate(pickup) };
}

export function validateLoadRequest(form, { now = new Date() } = {}) {
  const errors = {};
  const value = (key) => String(form?.[key] ?? '').trim();

  if (value('title').length < 3) errors.title = 'Describe the cargo in a few words.';
  else if (value('title').length > 120) errors.title = 'Keep the cargo description under 120 characters.';

  if (value('shipper').length < 2) errors.shipper = 'Add the shipper or company name.';
  else if (value('shipper').length > 120) errors.shipper = 'Keep the shipper name under 120 characters.';

  if (value('contactName').length < 2) errors.contactName = 'Add a contact name.';
  if (!isValidPhone(form?.contactPhone)) errors.contactPhone = 'Enter a phone number the office can call.';
  if (!isValidEmail(form?.contactEmail)) errors.contactEmail = 'Enter a valid email address.';

  if (value('origin').length < 2) errors.origin = 'Add the pickup town or city.';
  if (value('destination').length < 2) errors.destination = 'Add the delivery town or city.';

  if (!VEHICLE_TYPES.includes(form?.vehicleType)) {
    errors.vehicleType = 'Choose the vehicle type this load needs.';
  }

  const weight = Number(form?.weightTons);
  if (!(weight > 0) || weight > 100) {
    errors.weightTons = 'Enter a weight between 0.1 and 100 tonnes.';
  }

  const rate = Number(form?.rate);
  if (!(rate > 0) || rate > 1000000) {
    errors.rate = 'Enter the rate you will pay in cedis.';
  }

  const pickupDate = value('pickupDate');
  if (!pickupDate) {
    errors.pickupDate = 'Choose a pickup date.';
  } else if (pickupDate < inputDate(now)) {
    errors.pickupDate = 'Pickup cannot be in the past.';
  }

  const deliveryDate = value('deliveryDate');
  if (deliveryDate && pickupDate && deliveryDate < pickupDate) {
    errors.deliveryDate = 'Delivery must be on or after the pickup date.';
  }

  if (value('requirements').length > 600) {
    errors.requirements = 'Keep the requirements under 600 characters.';
  }

  if (!form?.consent) {
    errors.consent = 'Confirm you are authorised to post this load.';
  }

  return errors;
}

export function checkLoadRequestRate(
  timestamps = [],
  now = Date.now(),
  { max = LOAD_REQUEST_RATE_MAX, windowMs = LOAD_REQUEST_RATE_WINDOW_MS } = {}
) {
  const recent = (Array.isArray(timestamps) ? timestamps : [])
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry <= now && now - entry < windowMs)
    .sort((a, b) => a - b);

  const allowed = recent.length < max;
  return {
    allowed,
    recent,
    remaining: Math.max(0, max - recent.length),
    retryAfterMs: allowed || !recent.length ? 0 : Math.max(0, windowMs - (now - recent[0]))
  };
}

export function readLoadRequestTimes(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(LOAD_REQUEST_RATE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export function recordLoadRequestTime(
  storage = globalThis.localStorage,
  now = Date.now(),
  { max = LOAD_REQUEST_RATE_MAX, windowMs = LOAD_REQUEST_RATE_WINDOW_MS } = {}
) {
  const { recent } = checkLoadRequestRate(readLoadRequestTimes(storage), now, { max, windowMs });
  const next = [...recent, now];
  try {
    storage?.setItem(LOAD_REQUEST_RATE_KEY, JSON.stringify(next));
  } catch (error) {
    // Storage can be unavailable in private browsing; the form still works.
  }
  return next;
}

export function buildLoadFromRequest(request, overrides = {}) {
  const value = (input) => String(input ?? '').trim();
  return {
    title: value(overrides.title ?? request?.title),
    shipper: value(request?.shipper),
    origin: value(request?.origin),
    destination: value(request?.destination),
    distanceKm: Math.max(0, Math.round(Number(overrides.distanceKm) || 0)),
    trailerType: overrides.trailerType || request?.vehicleType || 'Dry van',
    weightTons: Number(overrides.weightTons ?? request?.weightTons) || 0,
    rate: Number(overrides.rate ?? request?.rate) || 0,
    pickupDate: value(overrides.pickupDate ?? request?.pickupDate),
    deliveryDate: value(overrides.deliveryDate ?? request?.deliveryDate),
    status: 'open',
    postedAt: new Date().toISOString(),
    requirements: value(request?.requirements),
    notes: '',
    filledBy: '',
    filledById: '',
    filledAt: '',
    deliveredAt: '',
    deliveryConfirmedAt: ''
  };
}

export function contactFromLoadRequest(request) {
  const value = (input) => String(input ?? '').trim();
  return {
    contactName: value(request?.contactName),
    contactPhone: value(request?.contactPhone),
    contactEmail: value(request?.contactEmail).toLowerCase()
  };
}
