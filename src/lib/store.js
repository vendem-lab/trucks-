import { useSyncExternalStore } from 'react';
import { buildSeed } from './seed.js';
import { addDoc, collection, doc, onSnapshot, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { firebaseDb } from './firebase.js';
import {
  claimOpenLoad,
  createJobAlertSecurely,
  deleteEventRegistrationSecurely,
  deleteEventSecurely,
  deleteJobAlertSecurely,
  payDuesSecurely,
  registerForEventSecurely,
  setMemberStatusSecurely,
  updateJobAlertSecurely,
  updateOwnMemberProfile
} from './callables.js';

const STORAGE_KEY = 'haulway_union_v1';
const listeners = new Set();

const DEMO_MODE = import.meta.env.VITE_USE_DEMO_DATA === 'true';

function loadState() {
  if (!DEMO_MODE) {
    return {
      version: 2, members: [], loads: [], dues: [], news: [], events: [], alerts: [],
      messages: [], registrations: [], settings: {}, counters: {}, loading: true
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 2) return parsed;
    }
  } catch (error) {
    console.warn('Union data could not be read; starting from the demo seed.', error);
  }
  const seed = buildSeed();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  } catch (error) {
    console.warn('Union data could not be saved to this browser.', error);
  }
  return seed;
}

let state = loadState();
let liveUnsubscribe = null;

const COLLECTIONS = ['members', 'loads', 'dues', 'news', 'events', 'alerts'];

export function startLiveStore(session = null) {
  if (DEMO_MODE) return () => {};
  if (liveUnsubscribe) liveUnsubscribe();

  state = {
    ...state,
    members: [],
    dues: [],
    alerts: [],
    registrations: [],
    enquiries: [],
    messages: [],
    applications: [],
    settings: {},
    loading: true,
    error: ''
  };

  const isStaff = session?.role === 'staff';
  const privateCollections = ['members', 'dues', 'alerts', 'applications', 'registrations'];
  const allowedCollections = isStaff
    ? [...COLLECTIONS, 'applications', 'registrations']
    : ['loads', 'news', 'events', ...(session?.memberId ? ['members', 'dues', 'alerts', 'applications', 'registrations'] : [])];

  const subscriptions = allowedCollections.map((name) => {
    const ref = collection(firebaseDb, name);
    const selfField = name === 'members' || name === 'applications' ? 'uid' : 'memberId';
    const source = privateCollections.includes(name) && !isStaff
      ? query(ref, where(selfField, '==', session.uid))
      : ref;
    return { name, source, stateKey: name, isDoc: false };
  });

  if (isStaff) {
    subscriptions.push({ name: 'enquiries', source: collection(firebaseDb, 'enquiries'), stateKey: 'messages', isDoc: false });
    subscriptions.push({ name: 'settings', source: doc(firebaseDb, 'settings', 'union'), stateKey: 'settings', isDoc: true });
  } else {
    state = { ...state, settings: { unionName: "Haulway Drivers' Union", duesGraceDays: 14 } };
  }

  let pending = subscriptions.length;
  const markLoaded = () => {
    pending -= 1;
    if (pending <= 0) {
      state = { ...state, loading: false };
      listeners.forEach((listener) => listener());
    }
  };

  const unsubs = subscriptions.map(({ name, source, stateKey, isDoc }) => {
    let firstSnapshot = true;
    return onSnapshot(
      source,
      (snapshot) => {
        if (isDoc) {
          state = { ...state, [stateKey]: snapshot.exists() ? snapshot.data() : {} };
        } else {
          state = { ...state, [stateKey]: snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })) };
        }
        if (firstSnapshot) {
          firstSnapshot = false;
          markLoaded();
        }
        listeners.forEach((listener) => listener());
      },
      (error) => {
        console.error(`Could not load ${name} from Firestore.`, error);
        state = { ...state, error: error.message };
        if (firstSnapshot) {
          firstSnapshot = false;
          markLoaded();
        }
        listeners.forEach((listener) => listener());
      }
    );
  });

  liveUnsubscribe = () => unsubs.forEach((unsubscribe) => unsubscribe());
  return liveUnsubscribe;
}

function persist(next) {
  state = next;
  if (!DEMO_MODE) {
    listeners.forEach((listener) => listener());
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('Union data could not be saved to this browser.', error);
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

function saveRecord(collectionName, record) {
  if (!record?.id) return Promise.resolve();
  if (DEMO_MODE) {
    persist(state);
    return Promise.resolve();
  }
  const { id, ...data } = record;
  return setDoc(doc(firebaseDb, collectionName, id), data).catch((error) => {
    console.error(`Could not save ${collectionName} record.`, error);
    throw error;
  });
}

function removeRecord(collectionName, id) {
  if (DEMO_MODE) {
    persist(state);
    return Promise.resolve();
  }
  return deleteDoc(doc(firebaseDb, collectionName, id)).catch((error) => {
    console.error(`Could not delete ${collectionName} record.`, error);
    throw error;
  });
}

function addRecord(collectionName, record) {
  if (!record?.id) return;
  if (DEMO_MODE) {
    const draft = clone(state);
    draft[collectionName].unshift(record);
    persist(draft);
  } else {
    const { id, ...data } = record;
    setDoc(doc(firebaseDb, collectionName, id), data).catch((error) => console.error(`Could not save ${collectionName} record.`, error));
  }
}

function updateRecord(collectionName, id, patch) {
  const record = { ...getRecord(collectionName, id), ...patch, id };
  if (DEMO_MODE) {
    const draft = clone(state);
    const index = draft[collectionName].findIndex((entry) => entry.id === id);
    if (index >= 0) draft[collectionName][index] = record;
    persist(draft);
    return record;
  }
  return saveRecord(collectionName, record).then(() => record);
}

function getRecord(collectionName, id) {
  return state[collectionName]?.find((entry) => entry.id === id) || null;
}

function uid(prefix) {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function nextReference(draft, type) {
  const year = new Date().getFullYear();
  const value = draft.counters[type] ?? 1;
  draft.counters[type] = value + 1;
  if (type === 'member') return `HU-${year}-${String(value).padStart(4, '0')}`;
  if (type === 'dues') return `DUE-${year}-${String(value).padStart(4, '0')}`;
  return `LD-${year}-${value}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------
   Members
------------------------------------------------------------------ */

export function addMember(payload) {
  if (!DEMO_MODE) {
    console.warn('Add members through the Firebase account provisioning flow.');
    return null;
  }
  return commit((draft) => {
    const member = {
      id: uid('mem'),
      memberNumber: nextReference(draft, 'member'),
      name: String(payload.name || '').trim(),
      email: String(payload.email || '').trim().toLowerCase(),
      phone: String(payload.phone || '').trim(),
      password: String(payload.password || 'driver123'),
      tier: payload.tier || 'independent',
      status: 'pending',
      region: String(payload.region || '').trim(),
      city: String(payload.city || '').trim(),
      vehicleType: payload.vehicleType || 'Dry van',
      vehiclePlate: String(payload.vehiclePlate || '').trim().toUpperCase(),
      licenseNumber: String(payload.licenseNumber || '').trim().toUpperCase(),
      joinedAt: today(),
      notes: String(payload.notes || '').trim(),
      emergencyName: String(payload.emergencyName || '').trim(),
      emergencyPhone: String(payload.emergencyPhone || '').trim(),
      createdAt: new Date().toISOString()
    };
    draft.members.unshift(member);
    return member;
  });
}

export async function createMemberRecord(record) {
  if (DEMO_MODE) return addMember(record);
  const { password: _password, role: _role, id: _id, ...data } = record;
  data.uid = record.uid;
  // The uid is the application id, so a retried submission overwrites the same
  // pending application instead of creating a duplicate.
  await setDoc(doc(firebaseDb, 'applications', record.uid), data, { merge: true });
  return { ...record, applicationId: record.uid };
}

export function updateMember(id, patch) {
  if (!DEMO_MODE) {
    return updateOwnMemberProfile(patch).then(() => {
      const member = { ...getRecord('members', id), ...patch, id };
      state = { ...state, members: state.members.map((entry) => entry.id === id ? member : entry) };
      listeners.forEach((listener) => listener());
      return member;
    });
  }
  return commit((draft) => {
    const member = draft.members.find((entry) => entry.id === id);
    if (!member) return null;
    Object.assign(member, patch, {
      id: member.id,
      memberNumber: member.memberNumber,
      email: String(patch.email ?? member.email).trim().toLowerCase()
    });
    return member;
  });
}

export function setMemberStatus(id, status) {
  if (!DEMO_MODE) {
    return setMemberStatusSecurely(id, status).then(() => {
      const member = { ...getRecord('members', id), id, status };
      state = { ...state, members: state.members.map((entry) => entry.id === id ? member : entry) };
      listeners.forEach((listener) => listener());
      return member;
    });
  }
  return commit((draft) => {
    const member = draft.members.find((entry) => entry.id === id);
    if (!member) return null;
    member.status = status;
    if (status === 'active') member.approvedAt = new Date().toISOString();
    return member;
  });
}

export function approveMember(id) {
  return setMemberStatus(id, 'active');
}

export function deleteMember(id) {
  if (!DEMO_MODE) {
    return Promise.reject(new Error('Deleting member accounts must be handled through a trusted admin workflow.'));
  }
  return commit((draft) => {
    draft.members = draft.members.filter((entry) => entry.id !== id);
    draft.dues = draft.dues.filter((entry) => entry.memberId !== id);
    draft.alerts = draft.alerts.filter((entry) => entry.memberId !== id);
    draft.registrations = draft.registrations.filter((entry) => entry.memberId !== id);
    return true;
  });
}

export function getMemberById(id) {
  return state.members.find((entry) => entry.id === id) || null;
}

export function getMemberByEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  return state.members.find((entry) => entry.email.toLowerCase() === value) || null;
}

/* ------------------------------------------------------------------
   Loads
------------------------------------------------------------------ */

export function addLoad(payload) {
  if (!DEMO_MODE) {
    const load = {
      id: uid('load'), reference: `LD-${Date.now()}`, title: String(payload.title || '').trim(),
      shipper: String(payload.shipper || '').trim(), origin: String(payload.origin || '').trim(),
      destination: String(payload.destination || '').trim(), distanceKm: Number(payload.distanceKm) || 0,
      trailerType: payload.trailerType || 'Dry van', weightTons: Number(payload.weightTons) || 0,
      rate: Number(payload.rate) || 0, pickupDate: payload.pickupDate || '', deliveryDate: payload.deliveryDate || '',
      status: payload.status || 'open', postedAt: new Date().toISOString(),
      requirements: String(payload.requirements || '').trim(), contactName: String(payload.contactName || '').trim(),
      contactPhone: String(payload.contactPhone || '').trim(), contactEmail: String(payload.contactEmail || '').trim(),
      notes: String(payload.notes || '').trim(), filledBy: '', filledById: '', filledAt: ''
    };
    const { id, ...data } = load;
    setDoc(doc(firebaseDb, 'loads', id), data).catch((error) => console.error('Could not create load.', error));
    return load;
  }
  return commit((draft) => {
    const load = {
      id: uid('load'),
      reference: nextReference(draft, 'load'),
      title: String(payload.title || '').trim(),
      shipper: String(payload.shipper || '').trim(),
      origin: String(payload.origin || '').trim(),
      destination: String(payload.destination || '').trim(),
      distanceKm: Number(payload.distanceKm) || 0,
      trailerType: payload.trailerType || 'Dry van',
      weightTons: Number(payload.weightTons) || 0,
      rate: Number(payload.rate) || 0,
      pickupDate: payload.pickupDate || '',
      deliveryDate: payload.deliveryDate || '',
      status: payload.status || 'open',
      postedAt: new Date().toISOString(),
      requirements: String(payload.requirements || '').trim(),
      contactName: String(payload.contactName || '').trim(),
      contactPhone: String(payload.contactPhone || '').trim(),
      contactEmail: String(payload.contactEmail || '').trim(),
      notes: String(payload.notes || '').trim(),
      filledBy: '',
      filledById: '',
      filledAt: ''
    };
    draft.loads.unshift(load);
    return load;
  });
}

export function updateLoad(id, patch) {
  if (!DEMO_MODE) return updateRecord('loads', id, patch);
  return commit((draft) => {
    const load = draft.loads.find((entry) => entry.id === id);
    if (!load) return null;
    Object.assign(load, patch, {
      id: load.id,
      reference: load.reference,
      distanceKm: Number(patch.distanceKm ?? load.distanceKm) || 0,
      weightTons: Number(patch.weightTons ?? load.weightTons) || 0,
      rate: Number(patch.rate ?? load.rate) || 0
    });
    return load;
  });
}

export function deleteLoad(id) {
  if (!DEMO_MODE) return removeRecord('loads', id).then(() => true);
  return commit((draft) => {
    draft.loads = draft.loads.filter((entry) => entry.id !== id);
    return true;
  });
}

export function claimLoad(loadId, member) {
  if (!DEMO_MODE) {
    return claimOpenLoad(loadId).then(() => {
      const updated = { ...getRecord('loads', loadId), status: 'filled', filledBy: member?.name || 'Member', filledById: member?.id || '', filledAt: new Date().toISOString() };
      state = { ...state, loads: state.loads.map((entry) => entry.id === loadId ? updated : entry) };
      listeners.forEach((listener) => listener());
      return updated;
    });
  }
  return commit((draft) => {
    const load = draft.loads.find((entry) => entry.id === loadId);
    if (!load || load.status !== 'open') return null;
    load.status = 'filled';
    load.filledBy = member?.name || 'Member';
    load.filledById = member?.id || '';
    load.filledAt = new Date().toISOString();
    return load;
  });
}

export function reopenLoad(id) {
  if (!DEMO_MODE) return updateLoad(id, { status: 'open', filledBy: '', filledById: '', filledAt: '' });
  return commit((draft) => {
    const load = draft.loads.find((entry) => entry.id === id);
    if (!load) return null;
    load.status = 'open';
    load.filledBy = '';
    load.filledById = '';
    load.filledAt = '';
    return load;
  });
}

export function getOpenLoads() {
  return state.loads.filter((entry) => entry.status === 'open');
}

/* ------------------------------------------------------------------
   Dues
------------------------------------------------------------------ */

export function addDues(payload) {
  if (!DEMO_MODE) {
    const member = getRecord('members', payload.memberId);
    const invoice = { id: uid('due'), reference: `DUE-${Date.now()}`, memberId: payload.memberId,
      memberName: member?.name || payload.memberName || 'Member', period: String(payload.period || '').trim(),
      amount: Number(payload.amount) || 0, dueDate: payload.dueDate || '', status: payload.status || 'due',
      paidAt: '', method: '', note: String(payload.note || '').trim() };
    const { id, ...data } = invoice;
    setDoc(doc(firebaseDb, 'dues', id), data).catch((error) => console.error('Could not create dues invoice.', error));
    return invoice;
  }
  return commit((draft) => {
    const member = draft.members.find((entry) => entry.id === payload.memberId);
    const invoice = {
      id: uid('due'),
      reference: nextReference(draft, 'dues'),
      memberId: payload.memberId,
      memberName: member?.name || payload.memberName || 'Member',
      period: String(payload.period || '').trim(),
      amount: Number(payload.amount) || 0,
      dueDate: payload.dueDate || '',
      status: payload.status || 'due',
      paidAt: '',
      method: '',
      note: String(payload.note || '').trim()
    };
    draft.dues.unshift(invoice);
    return invoice;
  });
}

export function markDuesPaid(id, method = 'momo') {
  if (!DEMO_MODE) {
    return payDuesSecurely(id, method).then(() => {
      const invoice = {
        ...getRecord('dues', id),
        id,
        status: 'paid',
        paidAt: new Date().toISOString(),
        method,
        note: `Payment recorded by ${method}.`
      };
      state = { ...state, dues: state.dues.map((entry) => (entry.id === id ? invoice : entry)) };
      listeners.forEach((listener) => listener());
      return invoice;
    });
  }
  return commit((draft) => {
    const invoice = draft.dues.find((entry) => entry.id === id);
    if (!invoice) return null;
    invoice.status = 'paid';
    invoice.paidAt = new Date().toISOString();
    invoice.method = method;
    invoice.note = `Payment recorded by ${method}.`;
    return invoice;
  });
}

export function setDuesStatus(id, status) {
  if (!DEMO_MODE) return updateRecord('dues', id, { status, paidAt: status === 'paid' ? new Date().toISOString() : '', method: status === 'paid' ? 'manual' : '' });
  return commit((draft) => {
    const invoice = draft.dues.find((entry) => entry.id === id);
    if (!invoice) return null;
    invoice.status = status;
    if (status === 'paid' && !invoice.paidAt) invoice.paidAt = new Date().toISOString();
    if (status !== 'paid') {
      invoice.paidAt = '';
      invoice.method = '';
    }
    return invoice;
  });
}

export function deleteDues(id) {
  if (!DEMO_MODE) return removeRecord('dues', id).then(() => true);
  return commit((draft) => {
    draft.dues = draft.dues.filter((entry) => entry.id !== id);
    return true;
  });
}

export function getMemberDues(memberId) {
  return state.dues
    .filter((entry) => entry.memberId === memberId)
    .sort((a, b) => String(b.period).localeCompare(String(a.period)));
}

export function getMemberAlerts(memberId) {
  return state.alerts
    .filter((entry) => entry.memberId === memberId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/* ------------------------------------------------------------------
   News
------------------------------------------------------------------ */

export function addNews(payload) {
  if (!DEMO_MODE) {
    const article = { id: uid('news'), title: String(payload.title || '').trim(), category: payload.category || 'announcement',
      excerpt: String(payload.excerpt || '').trim(), body: normalizeBody(payload.body), author: String(payload.author || '').trim() || 'Union office',
      publishedAt: payload.publishedAt ? new Date(payload.publishedAt).toISOString() : new Date().toISOString(), featured: Boolean(payload.featured), readMins: Number(payload.readMins) || 2 };
    const { id, ...data } = article;
    setDoc(doc(firebaseDb, 'news', id), data).catch((error) => console.error('Could not create article.', error));
    return article;
  }
  return commit((draft) => {
    const article = {
      id: uid('news'),
      title: String(payload.title || '').trim(),
      category: payload.category || 'announcement',
      excerpt: String(payload.excerpt || '').trim(),
      body: normalizeBody(payload.body),
      author: String(payload.author || '').trim() || 'Union office',
      publishedAt: payload.publishedAt ? new Date(payload.publishedAt).toISOString() : new Date().toISOString(),
      featured: Boolean(payload.featured),
      readMins: Number(payload.readMins) || 2
    };
    if (article.featured) draft.news.forEach((entry) => { entry.featured = false; });
    draft.news.unshift(article);
    return article;
  });
}

export function updateNews(id, patch) {
  if (!DEMO_MODE) return updateRecord('news', id, { ...patch, ...(patch.body !== undefined ? { body: normalizeBody(patch.body) } : {}) });
  return commit((draft) => {
    const article = draft.news.find((entry) => entry.id === id);
    if (!article) return null;
    Object.assign(article, patch, {
      id: article.id,
      body: patch.body !== undefined ? normalizeBody(patch.body) : article.body,
      featured: Boolean(patch.featured ?? article.featured)
    });
    if (article.featured) {
      draft.news.forEach((entry) => {
        if (entry.id !== id) entry.featured = false;
      });
    }
    return article;
  });
}

export function deleteNews(id) {
  if (!DEMO_MODE) return removeRecord('news', id).then(() => true);
  return commit((draft) => {
    draft.news = draft.news.filter((entry) => entry.id !== id);
    return true;
  });
}

function normalizeBody(value) {
  if (Array.isArray(value)) return value.map((line) => String(line).trim()).filter(Boolean);
  return String(value || '')
    .split(/\n\s*\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------
   Events
------------------------------------------------------------------ */

export function addEvent(payload) {
  if (!DEMO_MODE) {
    const event = { id: uid('event'), title: String(payload.title || '').trim(), type: payload.type || 'meeting',
      description: String(payload.description || '').trim(), location: String(payload.location || '').trim(), region: String(payload.region || '').trim(),
      startDate: payload.startDate ? new Date(payload.startDate).toISOString() : new Date().toISOString(), endDate: payload.endDate ? new Date(payload.endDate).toISOString() : '',
      capacity: Number(payload.capacity) || 0, registered: 0, fee: Number(payload.fee) || 0, memberOnly: Boolean(payload.memberOnly), trainer: String(payload.trainer || '').trim() };
    const { id, ...data } = event;
    setDoc(doc(firebaseDb, 'events', id), data).catch((error) => console.error('Could not create event.', error));
    return event;
  }
  return commit((draft) => {
    const event = {
      id: uid('event'),
      title: String(payload.title || '').trim(),
      type: payload.type || 'meeting',
      description: String(payload.description || '').trim(),
      location: String(payload.location || '').trim(),
      region: String(payload.region || '').trim(),
      startDate: payload.startDate ? new Date(payload.startDate).toISOString() : new Date().toISOString(),
      endDate: payload.endDate ? new Date(payload.endDate).toISOString() : '',
      capacity: Number(payload.capacity) || 0,
      registered: 0,
      fee: Number(payload.fee) || 0,
      memberOnly: Boolean(payload.memberOnly),
      trainer: String(payload.trainer || '').trim()
    };
    draft.events.unshift(event);
    return event;
  });
}

export function updateEvent(id, patch) {
  if (!DEMO_MODE) return updateRecord('events', id, patch);
  return commit((draft) => {
    const event = draft.events.find((entry) => entry.id === id);
    if (!event) return null;
    Object.assign(event, patch, {
      id: event.id,
      capacity: Number(patch.capacity ?? event.capacity) || 0,
      fee: Number(patch.fee ?? event.fee) || 0,
      memberOnly: Boolean(patch.memberOnly ?? event.memberOnly),
      registered: Number(patch.registered ?? event.registered) || 0
    });
    return event;
  });
}

export function deleteEvent(id) {
  if (!DEMO_MODE) {
    return deleteEventSecurely(id).then(() => {
      state = {
        ...state,
        events: state.events.filter((entry) => entry.id !== id),
        registrations: state.registrations.filter((entry) => entry.eventId !== id)
      };
      listeners.forEach((listener) => listener());
      return true;
    });
  }
  return commit((draft) => {
    draft.events = draft.events.filter((entry) => entry.id !== id);
    draft.registrations = draft.registrations.filter((entry) => entry.eventId !== id);
    return true;
  });
}

export function registerForEvent(eventId, payload) {
  if (!DEMO_MODE) {
    return registerForEventSecurely(eventId, payload).then((result) => ({ ok: true, registration: result }));
  }
  return commit((draft) => {
    const event = draft.events.find((entry) => entry.id === eventId);
    if (!event) return { ok: false, error: 'Event not found.' };
    const email = String(payload.email || '').trim().toLowerCase();
    const existing = draft.registrations.find(
      (entry) => entry.eventId === eventId && entry.email.toLowerCase() === email
    );
    if (existing) return { ok: false, duplicate: true, registration: existing };
    const registration = {
      id: uid('reg'),
      eventId,
      eventTitle: event.title,
      memberId: payload.memberId || '',
      name: String(payload.name || '').trim(),
      email,
      phone: String(payload.phone || '').trim(),
      createdAt: new Date().toISOString()
    };
    draft.registrations.unshift(registration);
    event.registered = (Number(event.registered) || 0) + 1;
    return { ok: true, registration };
  });
}

export function getEventRegistrations(eventId) {
  return state.registrations.filter((entry) => entry.eventId === eventId);
}

export function deleteRegistration(id) {
  if (!DEMO_MODE) {
    return deleteEventRegistrationSecurely(id).then(() => {
      const registration = getRecord('registrations', id);
      state = {
        ...state,
        registrations: state.registrations.filter((entry) => entry.id !== id),
        events: registration
          ? state.events.map((event) =>
              event.id === registration.eventId
                ? { ...event, registered: Math.max(0, (Number(event.registered) || 0) - 1) }
                : event
            )
          : state.events
      };
      listeners.forEach((listener) => listener());
      return true;
    });
  }
  return commit((draft) => {
    const registration = draft.registrations.find((entry) => entry.id === id);
    if (!registration) return false;
    draft.registrations = draft.registrations.filter((entry) => entry.id !== id);
    const event = draft.events.find((entry) => entry.id === registration.eventId);
    if (event) event.registered = Math.max(0, (Number(event.registered) || 0) - 1);
    return true;
  });
}

export function getUpcomingEvents() {
  return state.events
    .filter((entry) => new Date(entry.startDate).getTime() >= Date.now() - 86400000)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}

/* ------------------------------------------------------------------
   Job alerts
------------------------------------------------------------------ */

export function addAlert(payload) {
  if (!DEMO_MODE) {
    // The callable accepts only the matching criteria; member details are
    // attached server-side from the signed-in account.
    const criteria = {
      origin: String(payload.origin || ''),
      destination: String(payload.destination || ''),
      trailerType: payload.trailerType || 'Any',
      minRate: Number(payload.minRate) || 0,
      frequency: payload.frequency || 'instant'
    };
    return createJobAlertSecurely(criteria).then((alert) => {
      state = { ...state, alerts: [alert, ...state.alerts] };
      listeners.forEach((listener) => listener());
      return alert;
    });
  }
  return commit((draft) => {
    const alert = {
      id: uid('alert'),
      memberId: payload.memberId || '',
      name: String(payload.name || '').trim(),
      email: String(payload.email || '').trim().toLowerCase(),
      phone: String(payload.phone || '').trim(),
      origin: String(payload.origin || '').trim(),
      destination: String(payload.destination || '').trim(),
      trailerType: payload.trailerType || 'Any',
      minRate: Number(payload.minRate) || 0,
      frequency: payload.frequency || 'instant',
      active: true,
      createdAt: new Date().toISOString()
    };
    draft.alerts.unshift(alert);
    return alert;
  });
}

export function updateAlert(id, patch) {
  if (!DEMO_MODE) {
    return updateJobAlertSecurely(id, patch).then(() => {
      state = { ...state, alerts: state.alerts.map((alert) => alert.id === id ? { ...alert, ...patch } : alert) };
      listeners.forEach((listener) => listener());
      return getRecord('alerts', id);
    });
  }
  return commit((draft) => {
    const alert = draft.alerts.find((entry) => entry.id === id);
    if (!alert) return null;
    Object.assign(alert, patch, {
      id: alert.id,
      minRate: Number(patch.minRate ?? alert.minRate) || 0,
      active: Boolean(patch.active ?? alert.active)
    });
    return alert;
  });
}

export function deleteAlert(id) {
  if (!DEMO_MODE) {
    return deleteJobAlertSecurely(id).then(() => {
      state = { ...state, alerts: state.alerts.filter((alert) => alert.id !== id) };
      listeners.forEach((listener) => listener());
      return true;
    });
  }
  return commit((draft) => {
    draft.alerts = draft.alerts.filter((entry) => entry.id !== id);
    return true;
  });
}

/* ------------------------------------------------------------------
   Enquiries
------------------------------------------------------------------ */

export function addMessage(payload) {
  if (!DEMO_MODE) {
    const message = { id: uid('msg'), name: String(payload.name || '').trim(), email: String(payload.email || '').trim().toLowerCase(), phone: String(payload.phone || '').trim(), type: payload.type || 'general', subject: String(payload.subject || '').trim(), message: String(payload.message || '').trim(), read: false, createdAt: new Date().toISOString() };
    return addDoc(collection(firebaseDb, 'enquiries'), Object.fromEntries(Object.entries(message).filter(([key]) => key !== 'id')))
      .then((result) => ({ ...message, id: result.id }));
  }
  return commit((draft) => {
    const message = {
      id: uid('msg'),
      name: String(payload.name || '').trim(),
      email: String(payload.email || '').trim(),
      phone: String(payload.phone || '').trim(),
      type: payload.type || 'general',
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
  if (!DEMO_MODE) {
    const message = { ...getRecord('messages', id), read, id };
    if (message.email) {
      const { id: _id, ...data } = message;
      setDoc(doc(firebaseDb, 'enquiries', id), data, { merge: true }).catch(console.error);
    }
    return message;
  }
  return commit((draft) => {
    const message = draft.messages.find((entry) => entry.id === id);
    if (!message) return null;
    message.read = read;
    return message;
  });
}

export function deleteMessage(id) {
  if (!DEMO_MODE) return removeRecord('enquiries', id).then(() => true);
  return commit((draft) => {
    draft.messages = draft.messages.filter((entry) => entry.id !== id);
    return true;
  });
}

/* ------------------------------------------------------------------
   Settings & demo data
------------------------------------------------------------------ */

export function updateSettings(patch) {
  if (!DEMO_MODE) {
    return setDoc(doc(firebaseDb, 'settings', 'union'), patch, { merge: true }).then(() => {
      state = { ...state, settings: { ...state.settings, ...patch } };
      listeners.forEach((listener) => listener());
      return state.settings;
    });
  }
  return commit((draft) => {
    draft.settings = { ...draft.settings, ...patch };
    return draft.settings;
  });
}

export function isDemoMode() {
  return DEMO_MODE;
}

export function resetDemoData() {
  if (!DEMO_MODE) return state;
  const seed = buildSeed();
  persist(seed);
  return seed;
}
