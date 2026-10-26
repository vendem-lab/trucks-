import { useSyncExternalStore } from 'react';
import { buildSeed } from './seed.js';
import { calculateEstimate } from './pricing.js';
import { addDays } from './format.js';

const STORAGE_KEY = 'haulway_v1';
const listeners = new Set();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1) return parsed;
    }
  } catch (error) {
    console.warn('Haulway data could not be read; starting from the demo seed.', error);
  }
  const seed = buildSeed();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  } catch (error) {
    console.warn('Haulway data could not be saved to this browser.', error);
  }
  return seed;
}

let state = loadState();

function persist(next) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('Haulway data could not be saved to this browser.', error);
  }
  listeners.forEach((listener) => listener());
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

export function useStore() {
  return useSyncExternalStore(subscribe, getState, getState);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function commit(mutator) {
  const draft = clone(state);
  const result = mutator(draft);
  persist(draft);
  return result;
}

function uid(prefix) {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function nextReference(draft, type) {
  const year = new Date().getFullYear();
  const value = draft.counters[type];
  draft.counters[type] = value + 1;
  return type === 'shipment' ? `HW-${year}-${value}` : `Q-${year}-${value}`;
}

function findOrCreateCustomer(draft, payload) {
  if (payload.customerId) {
    const existing = draft.customers.find((customer) => customer.id === payload.customerId);
    if (existing) return existing;
  }
  const email = String(payload.email || '').trim().toLowerCase();
  const company = String(payload.customer || payload.company || '').trim();
  const match = draft.customers.find((customer) => {
    if (email && customer.email.toLowerCase() === email) return true;
    return company && customer.company.toLowerCase() === company.toLowerCase();
  });
  if (match) return match;

  const customer = {
    id: uid('cus'),
    company: company || payload.name || 'New customer',
    contact: payload.contact || payload.name || company || 'New customer',
    email: String(payload.email || '').trim(),
    phone: String(payload.phone || '').trim(),
    city: String(payload.origin || '').trim(),
    since: new Date().toISOString().slice(0, 10),
    notes: ''
  };
  draft.customers.push(customer);
  return customer;
}

function timelineEntry(status, note) {
  return { status, at: new Date().toISOString(), note: note || '' };
}

export function addQuote(payload) {
  return commit((draft) => {
    const estimate = calculateEstimate(payload);
    const quote = {
      id: uid('quo'),
      reference: nextReference(draft, 'quote'),
      name: String(payload.name || '').trim(),
      company: String(payload.company || '').trim(),
      email: String(payload.email || '').trim(),
      phone: String(payload.phone || '').trim(),
      origin: String(payload.origin || '').trim(),
      destination: String(payload.destination || '').trim(),
      distanceKm: Number(payload.distanceKm) || 0,
      service: payload.service,
      weightTons: Number(payload.weightTons) || 0,
      pickupDate: payload.pickupDate || '',
      notes: String(payload.notes || '').trim(),
      estimate: estimate.total,
      status: 'new',
      createdAt: new Date().toISOString()
    };
    draft.quotes.unshift(quote);
    return quote;
  });
}

export function updateQuoteStatus(id, status) {
  return commit((draft) => {
    const quote = draft.quotes.find((entry) => entry.id === id);
    if (!quote) return null;
    quote.status = status;
    return quote;
  });
}

export function convertQuoteToShipment(quoteId) {
  return commit((draft) => {
    const quote = draft.quotes.find((entry) => entry.id === quoteId);
    if (!quote) return null;
    if (quote.status === 'converted' && quote.convertedShipment) {
      return draft.shipments.find((entry) => entry.reference === quote.convertedShipment) || null;
    }

    const customer = findOrCreateCustomer(draft, quote);
    const pickup = quote.pickupDate || new Date().toISOString().slice(0, 10);
    const delivery = addDays(pickup, 3).toISOString().slice(0, 10);
    const reference = nextReference(draft, 'shipment');

    const shipment = {
      id: uid('shp'),
      reference,
      customerId: customer.id,
      customer: customer.company,
      email: quote.email || customer.email,
      phone: quote.phone || customer.phone,
      origin: quote.origin,
      destination: quote.destination,
      distanceKm: quote.distanceKm,
      service: quote.service,
      weightTons: quote.weightTons,
      pickupDate: pickup,
      deliveryDate: delivery,
      status: 'booked',
      price: quote.estimate,
      driver: 'Unassigned',
      vehicle: '—',
      notes: quote.notes,
      createdAt: new Date().toISOString(),
      timeline: [timelineEntry('booked', `Converted from quote ${quote.reference}`)]
    };

    draft.shipments.unshift(shipment);
    quote.status = 'converted';
    quote.convertedShipment = reference;
    return shipment;
  });
}

export function addShipment(payload) {
  return commit((draft) => {
    const customer = findOrCreateCustomer(draft, payload);
    const estimate = calculateEstimate(payload);
    const reference = nextReference(draft, 'shipment');
    const shipment = {
      id: uid('shp'),
      reference,
      customerId: customer.id,
      customer: String(payload.customer || customer.company || '').trim(),
      email: String(payload.email || customer.email || '').trim(),
      phone: String(payload.phone || customer.phone || '').trim(),
      origin: String(payload.origin || '').trim(),
      destination: String(payload.destination || '').trim(),
      distanceKm: Number(payload.distanceKm) || 0,
      service: payload.service,
      weightTons: Number(payload.weightTons) || 0,
      pickupDate: payload.pickupDate || '',
      deliveryDate: payload.deliveryDate || '',
      status: payload.status || 'booked',
      price: payload.price !== '' && payload.price !== undefined && payload.price !== null
        ? Number(payload.price)
        : estimate.total,
      driver: String(payload.driver || 'Unassigned').trim(),
      vehicle: String(payload.vehicle || '—').trim(),
      notes: String(payload.notes || '').trim(),
      createdAt: new Date().toISOString(),
      timeline: [timelineEntry(payload.status || 'booked', 'Shipment created')]
    };
    draft.shipments.unshift(shipment);
    return shipment;
  });
}

export function updateShipment(id, patch) {
  return commit((draft) => {
    const shipment = draft.shipments.find((entry) => entry.id === id);
    if (!shipment) return null;
    Object.assign(shipment, patch, {
      id: shipment.id,
      reference: shipment.reference,
      distanceKm: Number(patch.distanceKm ?? shipment.distanceKm) || 0,
      weightTons: Number(patch.weightTons ?? shipment.weightTons) || 0,
      price: Number(patch.price ?? shipment.price) || 0
    });
    return shipment;
  });
}

export function setShipmentStatus(id, status, note) {
  return commit((draft) => {
    const shipment = draft.shipments.find((entry) => entry.id === id);
    if (!shipment) return null;
    const changed = shipment.status !== status;
    shipment.status = status;
    if (changed || note) {
      shipment.timeline = Array.isArray(shipment.timeline) ? shipment.timeline : [];
      shipment.timeline.push(timelineEntry(status, note));
    }
    return shipment;
  });
}

export function deleteShipment(id) {
  return commit((draft) => {
    draft.shipments = draft.shipments.filter((entry) => entry.id !== id);
    return true;
  });
}

export function addVehicle(payload) {
  return commit((draft) => {
    const vehicle = {
      id: uid('veh'),
      unit: String(payload.unit || '').trim().toUpperCase(),
      make: String(payload.make || '').trim(),
      year: Number(payload.year) || new Date().getFullYear(),
      type: payload.type,
      plate: String(payload.plate || '').trim().toUpperCase(),
      capacityTons: Number(payload.capacityTons) || 0,
      status: payload.status || 'available',
      driver: String(payload.driver || 'Unassigned').trim(),
      odometer: Number(payload.odometer) || 0,
      nextService: payload.nextService || ''
    };
    draft.fleet.push(vehicle);
    return vehicle;
  });
}

export function updateVehicle(id, patch) {
  return commit((draft) => {
    const vehicle = draft.fleet.find((entry) => entry.id === id);
    if (!vehicle) return null;
    Object.assign(vehicle, patch, {
      id: vehicle.id,
      year: Number(patch.year ?? vehicle.year) || vehicle.year,
      capacityTons: Number(patch.capacityTons ?? vehicle.capacityTons) || 0,
      odometer: Number(patch.odometer ?? vehicle.odometer) || 0
    });
    return vehicle;
  });
}

export function deleteVehicle(id) {
  return commit((draft) => {
    draft.fleet = draft.fleet.filter((entry) => entry.id !== id);
    return true;
  });
}

export function addCustomer(payload) {
  return commit((draft) => {
    const customer = {
      id: uid('cus'),
      company: String(payload.company || '').trim(),
      contact: String(payload.contact || '').trim(),
      email: String(payload.email || '').trim(),
      phone: String(payload.phone || '').trim(),
      city: String(payload.city || '').trim(),
      since: payload.since || new Date().toISOString().slice(0, 10),
      notes: String(payload.notes || '').trim()
    };
    draft.customers.push(customer);
    return customer;
  });
}

export function updateCustomer(id, patch) {
  return commit((draft) => {
    const customer = draft.customers.find((entry) => entry.id === id);
    if (!customer) return null;
    Object.assign(customer, patch, { id: customer.id });
    return customer;
  });
}

export function deleteCustomer(id) {
  return commit((draft) => {
    draft.customers = draft.customers.filter((entry) => entry.id !== id);
    return true;
  });
}

export function addMessage(payload) {
  return commit((draft) => {
    const message = {
      id: uid('msg'),
      name: String(payload.name || '').trim(),
      email: String(payload.email || '').trim(),
      subject: String(payload.subject || '').trim(),
      message: String(payload.message || '').trim(),
      read: false,
      createdAt: new Date().toISOString()
    };
    draft.messages.unshift(message);
    return message;
  });
}

export function markMessageRead(id, read = true) {
  return commit((draft) => {
    const message = draft.messages.find((entry) => entry.id === id);
    if (!message) return null;
    message.read = read;
    return message;
  });
}

export function deleteMessage(id) {
  return commit((draft) => {
    draft.messages = draft.messages.filter((entry) => entry.id !== id);
    return true;
  });
}

export function updateSettings(patch) {
  return commit((draft) => {
    draft.settings = { ...draft.settings, ...patch };
    return draft.settings;
  });
}

export function resetDemoData() {
  const seed = buildSeed();
  persist(seed);
  return seed;
}

export function findShipmentByReference(reference) {
  const value = String(reference || '').trim().toUpperCase();
  if (!value) return null;
  return state.shipments.find((entry) => String(entry.reference).toUpperCase() === value) || null;
}

export function getSampleReferences() {
  return state.shipments.slice(0, 3).map((entry) => entry.reference);
}
