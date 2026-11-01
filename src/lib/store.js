import { useSyncExternalStore } from 'react';
import { buildSeed } from './seed.js';
import { buildDemoFleet, demoFleetEntry, publicFleetFields } from './fleet.js';
import { buildLoadFromRequest, contactFromLoadRequest, validateLoadRequest } from './loadRequests.js';
import { buildDeliveryRecord, normalizeEmail } from './deliveries.js';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { firebaseAuth, firebaseDb } from './firebase.js';

const STORAGE_KEY = 'haulway_union_v1';
const listeners = new Set();

const DEMO_MODE = import.meta.env.VITE_USE_DEMO_DATA === 'true';

function loadState() {
  if (!DEMO_MODE) {
    return {
      version: 5, members: [], loads: [], loadContacts: [], deliveries: [],
      deliveryConfirmations: [], loadRequests: [], dues: [], news: [], events: [],
      alerts: [], messages: [], registrations: [], fleet: [], settings: {}, counters: {}, loading: true
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 5) {
        return {
          ...parsed,
          loadContacts: Array.isArray(parsed.loadContacts) ? parsed.loadContacts : [],
          deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : [],
          deliveryConfirmations: Array.isArray(parsed.deliveryConfirmations)
            ? parsed.deliveryConfirmations
            : [],
          loadRequests: Array.isArray(parsed.loadRequests) ? parsed.loadRequests : [],
          fleet: Array.isArray(parsed.fleet)
            ? parsed.fleet
            : buildDemoFleet(Array.isArray(parsed.members) ? parsed.members : [])
        };
      }
      if (parsed && [2, 3, 4].includes(parsed.version)) {
        const migrated = migrateToVersionFive(parsed);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
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

// Version 5 moves shipper contact details out of the public load document and
// adds the delivery lifecycle. Older demo data is upgraded in place.
function migrateToVersionFive(parsed) {
  const loads = Array.isArray(parsed.loads) ? parsed.loads : [];
  const existingContacts = Array.isArray(parsed.loadContacts) ? parsed.loadContacts : [];
  const loadContacts = existingContacts.length
    ? existingContacts
    : loads.map((load) => ({
        id: load.id,
        loadId: load.id,
        contactName: load.contactName || '',
        contactPhone: load.contactPhone || '',
        contactEmail: load.contactEmail || ''
      }));
  const cleanLoads = loads.map((load) => {
    const { contactName, contactPhone, contactEmail, ...rest } = load;
    return {
      ...rest,
      deliveredAt: rest.deliveredAt || '',
      deliveryConfirmedAt: rest.deliveryConfirmedAt || ''
    };
  });

  return {
    ...parsed,
    version: 5,
    loads: cleanLoads,
    loadContacts,
    deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : [],
    deliveryConfirmations: Array.isArray(parsed.deliveryConfirmations)
      ? parsed.deliveryConfirmations
      : [],
    loadRequests: Array.isArray(parsed.loadRequests) ? parsed.loadRequests : [],
    fleet: Array.isArray(parsed.fleet)
      ? parsed.fleet
      : buildDemoFleet(Array.isArray(parsed.members) ? parsed.members : [])
  };
}

let state = loadState();
let liveUnsubscribe = null;

const COLLECTIONS = [
  'members', 'loads', 'loadContacts', 'loadRequests', 'dues', 'news', 'events', 'alerts', 'fleet'
];

export function startLiveStore(session = null) {
  if (DEMO_MODE) return () => {};
  if (liveUnsubscribe) liveUnsubscribe();

  state = {
    ...state,
    members: [],
    loads: [],
    loadContacts: [],
    deliveries: [],
    deliveryConfirmations: [],
    loadRequests: [],
    dues: [],
    alerts: [],
    fleet: [],
    registrations: [],
    enquiries: [],
    messages: [],
    applications: [],
    settings: {},
    loading: true,
    error: ''
  };

  const isStaff = session?.role === 'staff';
  const privateCollections = ['members', 'dues', 'alerts', 'applications', 'registrations', 'deliveries'];
  const allowedCollections = isStaff
    ? [...COLLECTIONS, 'applications', 'registrations', 'deliveries', 'deliveryConfirmations']
    : ['loads', 'news', 'events', 'fleet', 'loadContacts', ...(session?.memberId ? ['members', 'dues', 'alerts', 'applications', 'registrations', 'deliveries'] : [])];

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
          if (isStaff && stateKey === 'members') {
            syncPublicFleetRecords(state.members, state.fleet);
            state = { ...state, fleet: publicFleetForState(state) };
          } else if (isStaff && stateKey === 'fleet') {
            state = { ...state, fleet: publicFleetForState(state) };
          }
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
  if (type === 'loadRequest') return `LR-${year}-${String(value).padStart(4, '0')}`;
  return `LD-${year}-${value}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------
   Members
------------------------------------------------------------------ */

function syncDemoFleet(draft, member) {
  if (!Array.isArray(draft.fleet)) draft.fleet = [];
  const index = draft.fleet.findIndex((entry) => entry.memberId === member.id);
  if (member.status !== 'active') {
    if (index >= 0) {
      draft.fleet[index] = {
        ...draft.fleet[index],
        active: false,
        updatedAt: new Date().toISOString()
      };
    }
    return;
  }
  const record = demoFleetEntry(member, index >= 0 ? draft.fleet[index] : null);
  if (index >= 0) draft.fleet[index] = record;
  else draft.fleet.unshift(record);
}

function publicFleetForState(current) {
  const published = new Map(
    (current.fleet || []).map((vehicle) => [vehicle.memberId || vehicle.id, vehicle])
  );
  return (current.members || [])
    .filter((member) => member.status === 'active')
    .map((member) => ({
      id: member.id,
      ...publicFleetFields(member, published.get(member.id))
    }));
}

function syncPublicFleetRecords(members, fleet) {
  const current = new Map((fleet || []).map((vehicle) => [vehicle.memberId || vehicle.id, vehicle]));
  const activeIds = new Set();
  const batch = writeBatch(firebaseDb);
  let changes = 0;

  (members || []).forEach((member) => {
    if (member.status !== 'active') return;
    activeIds.add(member.id);
    const previous = current.get(member.id);
    const next = publicFleetFields(member, previous);
    const changed = !previous || Object.entries(next).some(([key, value]) => previous[key] !== value);
    if (changed) {
      batch.set(doc(firebaseDb, 'fleet', member.id), next, { merge: true });
      changes += 1;
    }
  });

  (fleet || []).forEach((vehicle) => {
    const memberId = vehicle.memberId || vehicle.id;
    if (vehicle.active !== false && !activeIds.has(memberId)) {
      batch.set(doc(firebaseDb, 'fleet', memberId), { active: false, updatedAt: new Date().toISOString() }, { merge: true });
      changes += 1;
    }
  });

  if (changes) {
    batch.commit().catch((error) => console.error('Could not sync public fleet listings.', error));
  }
}

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
      status: payload.status || 'pending',
      approvedAt: payload.status === 'active' ? new Date().toISOString() : '',
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
    if (member.status === 'active') syncDemoFleet(draft, member);
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

const PROFILE_FIELDS = [
  'name',
  'phone',
  'region',
  'city',
  'vehicleType',
  'vehiclePlate',
  'licenseNumber',
  'emergencyName',
  'emergencyPhone',
  'notes'
];

function pickFields(patch, fields) {
  return Object.fromEntries(
    Object.entries(patch || {}).filter(([key]) => fields.includes(key))
  );
}

export function updateMember(id, patch) {
  if (!DEMO_MODE) {
    const uid = firebaseAuth.currentUser?.uid;
    if (!uid) return Promise.reject(new Error('Sign in again to update your profile.'));
    if (id !== uid) return Promise.reject(new Error('You can only update your own profile.'));
    const clean = pickFields(patch, PROFILE_FIELDS);
    if (!Object.keys(clean).length) return Promise.reject(new Error('Provide the profile details to save.'));
    const updatedAt = new Date().toISOString();
    const currentMember = getRecord('members', id);
    const member = { ...currentMember, ...clean, updatedAt, id };
    const fleetRecord = getRecord('fleet', id);
    const nextFleet = fleetRecord && member.status === 'active'
      ? { id, ...publicFleetFields(member, fleetRecord), updatedAt }
      : null;
    const batch = writeBatch(firebaseDb);
    batch.set(doc(firebaseDb, 'members', id), { ...clean, updatedAt }, { merge: true });
    if (typeof clean.name === 'string') {
      batch.set(doc(firebaseDb, 'users', uid), { name: clean.name }, { merge: true });
    }
    if (nextFleet) {
      const { id: _fleetId, ...fleetData } = nextFleet;
      batch.set(doc(firebaseDb, 'fleet', id), fleetData, { merge: true });
    }
    return batch.commit().then(() => {
      state = {
        ...state,
        members: state.members.map((entry) => entry.id === id ? member : entry),
        fleet: nextFleet
          ? state.fleet.map((entry) => entry.id === id ? nextFleet : entry)
          : state.fleet
      };
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
    syncDemoFleet(draft, member);
    return member;
  });
}

export function setMemberStatus(id, status) {
  if (!DEMO_MODE) {
    if (!['active', 'suspended', 'expired', 'pending'].includes(status)) {
      return Promise.reject(new Error('Choose a valid membership status.'));
    }
    const fleetRecord = getRecord('fleet', id);
    const fleetUpdatedAt = new Date().toISOString();
    const currentMember = getRecord('members', id);
    const updatedMember = {
      ...currentMember,
      id,
      status,
      ...(status === 'active' ? { approvedAt: fleetUpdatedAt } : {})
    };
    const nextFleet = status === 'active'
      ? { id, ...publicFleetFields(updatedMember, fleetRecord), updatedAt: fleetUpdatedAt }
      : fleetRecord
        ? { ...fleetRecord, active: false, updatedAt: fleetUpdatedAt }
        : null;
    const batch = writeBatch(firebaseDb);
    batch.set(
      doc(firebaseDb, 'members', id),
      { status, ...(status === 'active' ? { approvedAt: fleetUpdatedAt } : {}) },
      { merge: true }
    );
    batch.set(doc(firebaseDb, 'users', id), { memberStatus: status }, { merge: true });
    if (nextFleet) {
      const { id: _fleetId, ...fleetData } = nextFleet;
      batch.set(doc(firebaseDb, 'fleet', id), fleetData, { merge: true });
    }
    return batch.commit().then(() => {
      state = {
        ...state,
        members: state.members.map((entry) => entry.id === id ? updatedMember : entry),
        fleet: nextFleet
          ? [nextFleet, ...state.fleet.filter((entry) => entry.id !== id)]
          : state.fleet
      };
      listeners.forEach((listener) => listener());
      return updatedMember;
    });
  }
  return commit((draft) => {
    const member = draft.members.find((entry) => entry.id === id);
    if (!member) return null;
    member.status = status;
    if (status === 'active') member.approvedAt = new Date().toISOString();
    syncDemoFleet(draft, member);
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
    draft.fleet = draft.fleet.filter((entry) => entry.memberId !== id);
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
   Public fleet
----------------------------------------------------------------- */

const MAX_FLEET_PHOTO_LENGTH = 900000;

function validFleetPhoto(photo) {
  return String(photo || '').startsWith('data:image/');
}

export function getPublicFleet() {
  return (state.fleet || [])
    .filter((entry) => entry.active !== false && entry.photo)
    .sort((a, b) => {
      const updated = new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      if (updated) return updated;
      return String(a.displayName || '').localeCompare(String(b.displayName || ''));
    });
}

export function saveFleetPhoto(memberId, photo) {
  const value = String(photo || '');
  if (!validFleetPhoto(value)) {
    return Promise.reject(new Error('Choose a vehicle photo to publish.'));
  }
  if (value.length > MAX_FLEET_PHOTO_LENGTH) {
    return Promise.reject(new Error('That photo is too large. Try a smaller image.'));
  }

  if (!DEMO_MODE) {
    const uid = firebaseAuth.currentUser?.uid;
    if (!uid) return Promise.reject(new Error('Sign in again to publish your vehicle photo.'));
    if (uid !== memberId) return Promise.reject(new Error('You can only publish a photo for your own vehicle.'));
    const member = getRecord('members', memberId);
    if (!member) return Promise.reject(new Error('Your member record could not be found.'));
    if (member.status !== 'active') {
      return Promise.reject(new Error('Your membership must be active before you can publish a photo.'));
    }
    const existing = getRecord('fleet', memberId);
    const record = {
      id: memberId,
      ...publicFleetFields(member, existing),
      photo: value,
      active: true,
      updatedAt: new Date().toISOString()
    };
    const { id: _id, ...data } = record;
    return setDoc(doc(firebaseDb, 'fleet', memberId), data)
      .then(() => {
        state = {
          ...state,
          fleet: [record, ...state.fleet.filter((entry) => entry.id !== memberId)]
        };
        listeners.forEach((listener) => listener());
        return record;
      })
      .catch((error) => {
        console.error('Could not publish the vehicle photo.', error);
        throw error;
      });
  }

  return commit((draft) => {
    const member = draft.members.find((entry) => entry.id === memberId);
    if (!member) throw new Error('Your member record could not be found.');
    if (member.status !== 'active') {
      throw new Error('Your membership must be active before you can publish a photo.');
    }
    if (!Array.isArray(draft.fleet)) draft.fleet = [];
    const existing = draft.fleet.find((entry) => entry.memberId === memberId) || null;
    const record = { ...demoFleetEntry(member, existing), photo: value };
    draft.fleet = [record, ...draft.fleet.filter((entry) => entry.memberId !== memberId)];
    return record;
  });
}

export function removeFleetPhoto(memberId) {
  if (!DEMO_MODE) {
    if (!firebaseAuth.currentUser?.uid) {
      return Promise.reject(new Error('Sign in again to remove your vehicle photo.'));
    }
    return deleteDoc(doc(firebaseDb, 'fleet', memberId)).then(() => {
      state = {
        ...state,
        fleet: state.fleet.filter((entry) => entry.id !== memberId && entry.memberId !== memberId)
      };
      listeners.forEach((listener) => listener());
      return true;
    });
  }
  return commit((draft) => {
    draft.fleet = (draft.fleet || []).filter((entry) => entry.memberId !== memberId);
    return true;
  });
}

/* ------------------------------------------------------------------
   Loads
------------------------------------------------------------------ */

function loadContactRecord(loadId, payload = {}) {
  return {
    id: loadId,
    loadId,
    contactName: String(payload.contactName || '').trim(),
    contactPhone: String(payload.contactPhone || '').trim(),
    contactEmail: normalizeEmail(payload.contactEmail)
  };
}

function loadContactFrom(current, loadId) {
  return (current.loadContacts || []).find((entry) => entry.loadId === loadId || entry.id === loadId) || null;
}

export async function addLoad(payload) {
  const id = uid('load');
  const load = {
    id,
    reference: '',
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
    notes: String(payload.notes || '').trim(),
    filledBy: '',
    filledById: '',
    filledAt: '',
    deliveredAt: '',
    deliveryConfirmedAt: ''
  };
  const contact = loadContactRecord(id, payload);

  if (!DEMO_MODE) {
    load.reference = `LD-${Date.now()}`;
    const { id: _id, ...data } = load;
    const batch = writeBatch(firebaseDb);
    batch.set(doc(firebaseDb, 'loads', id), data);
    batch.set(doc(firebaseDb, 'loadContacts', id), {
      loadId: id,
      contactName: contact.contactName,
      contactPhone: contact.contactPhone,
      contactEmail: contact.contactEmail
    });
    await batch.commit();
    state = {
      ...state,
      loads: [load, ...state.loads],
      loadContacts: [contact, ...(state.loadContacts || [])]
    };
    listeners.forEach((listener) => listener());
    return load;
  }

  return commit((draft) => {
    load.reference = nextReference(draft, 'load');
    draft.loads.unshift(load);
    draft.loadContacts = [contact, ...(draft.loadContacts || [])];
    return load;
  });
}

export function updateLoad(id, patch) {
  const { contactName, contactPhone, contactEmail, ...loadPatch } = patch || {};
  const hasContact = ['contactName', 'contactPhone', 'contactEmail'].some(
    (key) => Object.prototype.hasOwnProperty.call(patch || {}, key)
  );

  if (!DEMO_MODE) {
    const record = { ...getRecord('loads', id), ...loadPatch, id };
    const batch = writeBatch(firebaseDb);
    const { id: _id, ...data } = record;
    batch.set(doc(firebaseDb, 'loads', id), data);
    let contact = null;
    if (hasContact) {
      const existing = getRecord('loadContacts', id) || loadContactRecord(id, {});
      contact = {
        ...existing,
        id,
        loadId: id,
        contactName: contactName !== undefined ? String(contactName).trim() : existing.contactName,
        contactPhone: contactPhone !== undefined ? String(contactPhone).trim() : existing.contactPhone,
        contactEmail: contactEmail !== undefined ? normalizeEmail(contactEmail) : existing.contactEmail
      };
      const { id: _contactId, loadId: _loadId, ...contactData } = contact;
      batch.set(doc(firebaseDb, 'loadContacts', id), { ...contactData, loadId: id });
    }
    return batch.commit().then(() => {
      state = {
        ...state,
        loads: state.loads.map((entry) => (entry.id === id ? record : entry)),
        loadContacts: contact
          ? [contact, ...(state.loadContacts || []).filter((entry) => entry.loadId !== id)]
          : state.loadContacts
      };
      listeners.forEach((listener) => listener());
      return record;
    });
  }

  return commit((draft) => {
    const load = draft.loads.find((entry) => entry.id === id);
    if (!load) return null;
    Object.assign(load, loadPatch, {
      id: load.id,
      reference: load.reference,
      distanceKm: Number(loadPatch.distanceKm ?? load.distanceKm) || 0,
      weightTons: Number(loadPatch.weightTons ?? load.weightTons) || 0,
      rate: Number(loadPatch.rate ?? load.rate) || 0
    });
    if (hasContact) {
      const existing = loadContactFrom(draft, id) || loadContactRecord(id, {});
      const contact = {
        ...existing,
        id,
        loadId: id,
        contactName: contactName !== undefined ? String(contactName).trim() : existing.contactName,
        contactPhone: contactPhone !== undefined ? String(contactPhone).trim() : existing.contactPhone,
        contactEmail: contactEmail !== undefined ? normalizeEmail(contactEmail) : existing.contactEmail
      };
      draft.loadContacts = [contact, ...(draft.loadContacts || []).filter((entry) => entry.loadId !== id)];
    }
    return load;
  });
}

export function deleteLoad(id) {
  if (!DEMO_MODE) {
    const batch = writeBatch(firebaseDb);
    batch.delete(doc(firebaseDb, 'loads', id));
    batch.delete(doc(firebaseDb, 'loadContacts', id));
    batch.delete(doc(firebaseDb, 'deliveries', id));
    (state.deliveryConfirmations || [])
      .filter((entry) => entry.loadId === id)
      .forEach((entry) => batch.delete(doc(firebaseDb, 'deliveryConfirmations', entry.id)));
    return batch.commit().then(() => {
      state = {
        ...state,
        loads: state.loads.filter((entry) => entry.id !== id),
        loadContacts: (state.loadContacts || []).filter((entry) => entry.loadId !== id),
        deliveries: (state.deliveries || []).filter((entry) => entry.loadId !== id),
        deliveryConfirmations: (state.deliveryConfirmations || []).filter(
          (entry) => entry.loadId !== id
        )
      };
      listeners.forEach((listener) => listener());
      return true;
    });
  }
  return commit((draft) => {
    draft.loads = draft.loads.filter((entry) => entry.id !== id);
    draft.loadContacts = (draft.loadContacts || []).filter((entry) => entry.loadId !== id);
    draft.deliveries = (draft.deliveries || []).filter((entry) => entry.loadId !== id);
    draft.deliveryConfirmations = (draft.deliveryConfirmations || []).filter(
      (entry) => entry.loadId !== id
    );
    return true;
  });
}

export function claimLoad(loadId, member) {
  if (!DEMO_MODE) {
    const uid = firebaseAuth.currentUser?.uid;
    if (!uid) return Promise.reject(new Error('Sign in as a member to claim this load.'));
    const loadRef = doc(firebaseDb, 'loads', loadId);
    return runTransaction(firebaseDb, async (transaction) => {
      const snapshot = await transaction.get(loadRef);
      if (!snapshot.exists()) throw new Error('Load not found.');
      if (snapshot.data().status !== 'open') return null;
      const filledAt = new Date().toISOString();
      const filledBy = member?.name || firebaseAuth.currentUser?.displayName || 'Member';
      transaction.update(loadRef, { status: 'filled', filledBy, filledById: uid, filledAt });
      return {
        ...snapshot.data(),
        id: loadId,
        status: 'filled',
        filledBy,
        filledById: uid,
        filledAt
      };
    }).then((updated) => {
      if (!updated) return null;
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
  const reset = {
    status: 'open',
    filledBy: '',
    filledById: '',
    filledAt: '',
    deliveredAt: '',
    deliveryConfirmedAt: ''
  };

  if (!DEMO_MODE) {
    const batch = writeBatch(firebaseDb);
    const { id: _id, ...current } = getRecord('loads', id);
    batch.set(doc(firebaseDb, 'loads', id), { ...current, ...reset });
    batch.delete(doc(firebaseDb, 'deliveries', id));
    (state.deliveryConfirmations || [])
      .filter((entry) => entry.loadId === id)
      .forEach((entry) => batch.delete(doc(firebaseDb, 'deliveryConfirmations', entry.id)));
    return batch.commit().then(() => {
      state = {
        ...state,
        loads: state.loads.map((entry) => (entry.id === id ? { ...entry, ...reset } : entry)),
        deliveries: (state.deliveries || []).filter((entry) => entry.loadId !== id),
        deliveryConfirmations: (state.deliveryConfirmations || []).filter(
          (entry) => entry.loadId !== id
        )
      };
      listeners.forEach((listener) => listener());
      return true;
    });
  }

  return commit((draft) => {
    const load = draft.loads.find((entry) => entry.id === id);
    if (!load) return null;
    Object.assign(load, reset);
    draft.deliveries = (draft.deliveries || []).filter((entry) => entry.loadId !== id);
    draft.deliveryConfirmations = (draft.deliveryConfirmations || []).filter(
      (entry) => entry.loadId !== id
    );
    return load;
  });
}

/* ------------------------------------------------------------------
   Deliveries
------------------------------------------------------------------ */

export function getLoadContact(loadId) {
  return loadContactFrom(state, loadId);
}

export function getDelivery(loadId) {
  return (state.deliveries || []).find((entry) => entry.loadId === loadId) || null;
}

export function getDeliveryConfirmations() {
  return (state.deliveryConfirmations || []).slice();
}

export function getPendingDeliveryConfirmations() {
  return (state.deliveryConfirmations || []).filter((entry) => entry.status === 'pending');
}

export async function markLoadDelivered(loadId, member, { note, photo } = {}) {
  const deliveredAt = new Date().toISOString();

  if (!DEMO_MODE) {
    const uidValue = firebaseAuth.currentUser?.uid;
    if (!uidValue) throw new Error('Sign in as a member to update this load.');
    const loadRef = doc(firebaseDb, 'loads', loadId);
    return runTransaction(firebaseDb, async (transaction) => {
      const snapshot = await transaction.get(loadRef);
      if (!snapshot.exists()) throw new Error('Load not found.');
      const data = snapshot.data();
      if (data.status !== 'filled') throw new Error('This load is not waiting for a delivery.');
      if (data.filledById !== uidValue) {
        throw new Error('Only the driver who claimed this load can mark it delivered.');
      }
      const delivery = buildDeliveryRecord(
        { id: loadId, reference: data.reference },
        member,
        { note, photo },
        new Date(deliveredAt)
      );
      const { loadId: _loadId, ...deliveryData } = delivery;
      transaction.set(doc(firebaseDb, 'deliveries', loadId), { ...deliveryData, loadId });
      transaction.update(loadRef, { status: 'delivered', deliveredAt });
      return {
        load: { ...data, id: loadId, status: 'delivered', deliveredAt },
        delivery: { ...delivery, id: loadId }
      };
    }).then((result) => {
      state = {
        ...state,
        loads: state.loads.map((entry) => (entry.id === loadId ? result.load : entry)),
        deliveries: [
          result.delivery,
          ...(state.deliveries || []).filter((entry) => entry.loadId !== loadId)
        ]
      };
      listeners.forEach((listener) => listener());
      return result;
    });
  }

  return commit((draft) => {
    const load = draft.loads.find((entry) => entry.id === loadId);
    if (!load) throw new Error('Load not found.');
    if (load.status !== 'filled') throw new Error('This load is not waiting for a delivery.');
    if (load.filledById !== (member?.id || '')) {
      throw new Error('Only the driver who claimed this load can mark it delivered.');
    }
    const delivery = buildDeliveryRecord(load, member, { note, photo }, new Date(deliveredAt));
    load.status = 'delivered';
    load.deliveredAt = deliveredAt;
    draft.deliveries = [
      { ...delivery, id: loadId },
      ...(draft.deliveries || []).filter((entry) => entry.loadId !== loadId)
    ];
    return { load, delivery: { ...delivery, id: loadId } };
  });
}

export async function confirmDelivery(
  loadId,
  { reviewer, outcome = 'delivered', note = '', source = 'staff' } = {}
) {
  const confirmedAt = new Date().toISOString();
  const confirmedBy = String(reviewer || 'Union staff').trim() || 'Union staff';
  const deliveryStatus = outcome === 'problem' ? 'disputed' : 'confirmed';
  const loadStatus = outcome === 'problem' ? 'disputed' : 'closed';
  const shipperNote = String(note || '').trim();

  if (!DEMO_MODE) {
    const delivery = getRecord('deliveries', loadId);
    if (!delivery) throw new Error('There is no delivery record for this load.');
    const patch = {
      status: deliveryStatus,
      confirmedAt,
      confirmedBy,
      confirmationSource: source,
      shipperNote
    };
    const batch = writeBatch(firebaseDb);
    batch.update(doc(firebaseDb, 'deliveries', loadId), patch);
    batch.update(doc(firebaseDb, 'loads', loadId), {
      status: loadStatus,
      deliveryConfirmedAt: confirmedAt
    });
    await batch.commit();
    const updated = { ...delivery, ...patch };
    state = {
      ...state,
      deliveries: state.deliveries.map((entry) => (entry.loadId === loadId ? updated : entry)),
      loads: state.loads.map((entry) =>
        entry.id === loadId
          ? { ...entry, status: loadStatus, deliveryConfirmedAt: confirmedAt }
          : entry
      )
    };
    listeners.forEach((listener) => listener());
    return updated;
  }

  return commit((draft) => {
    const delivery = (draft.deliveries || []).find((entry) => entry.loadId === loadId);
    if (!delivery) throw new Error('There is no delivery record for this load.');
    Object.assign(delivery, {
      status: deliveryStatus,
      confirmedAt,
      confirmedBy,
      confirmationSource: source,
      shipperNote
    });
    const load = draft.loads.find((entry) => entry.id === loadId);
    if (load) {
      load.status = loadStatus;
      load.deliveryConfirmedAt = confirmedAt;
    }
    return delivery;
  });
}

export async function submitDeliveryConfirmation(payload) {
  const reference = String(payload?.reference || '').trim().toUpperCase();
  const contactEmail = normalizeEmail(payload?.contactEmail);
  const outcome = payload?.outcome === 'problem' ? 'problem' : 'delivered';
  const note = String(payload?.note || '').trim();
  const createdAt = new Date().toISOString();

  if (!DEMO_MODE) {
    const snapshot = await getDocs(
      query(collection(firebaseDb, 'loads'), where('reference', '==', reference))
    );
    const load = snapshot.docs
      .map((entry) => ({ id: entry.id, ...entry.data() }))
      .find((entry) => entry.status === 'delivered');
    if (!load) {
      throw new Error(
        'We could not find a delivered load with that reference yet. Check the reference and try again.'
      );
    }
    const record = {
      loadId: load.id,
      loadReference: load.reference,
      outcome,
      note,
      contactEmail,
      status: 'pending',
      createdAt
    };
    try {
      const saved = await addDoc(collection(firebaseDb, 'deliveryConfirmations'), record);
      return { id: saved.id, ...record, load };
    } catch (error) {
      if (error?.code === 'permission-denied') {
        throw new Error('That reference and email did not match our records.');
      }
      throw error;
    }
  }

  return commit((draft) => {
    const load = (draft.loads || []).find(
      (entry) => entry.reference === reference && entry.status === 'delivered'
    );
    if (!load) {
      throw new Error(
        'We could not find a delivered load with that reference yet. Check the reference and try again.'
      );
    }
    const contact = loadContactFrom(draft, load.id);
    if (!contact || normalizeEmail(contact.contactEmail) !== contactEmail) {
      throw new Error('That reference and email did not match our records.');
    }
    const record = {
      id: uid('dc'),
      loadId: load.id,
      loadReference: load.reference,
      outcome,
      note,
      contactEmail,
      status: 'pending',
      createdAt,
      reviewedAt: '',
      reviewedBy: ''
    };
    draft.deliveryConfirmations = [record, ...(draft.deliveryConfirmations || [])];
    return { ...record, load };
  });
}

export async function acceptDeliveryConfirmation(id, reviewer) {
  const reviewedAt = new Date().toISOString();
  const reviewedBy = String(reviewer || 'Union staff').trim() || 'Union staff';

  if (!DEMO_MODE) {
    const confirmation = getRecord('deliveryConfirmations', id);
    if (!confirmation) throw new Error('That confirmation could not be found.');
    if (confirmation.status !== 'pending') throw new Error('That confirmation has already been reviewed.');
    const delivery = getRecord('deliveries', confirmation.loadId);
    if (!delivery) throw new Error('There is no delivery record for this load.');

    const outcome = confirmation.outcome === 'problem' ? 'disputed' : 'confirmed';
    const loadStatus = confirmation.outcome === 'problem' ? 'disputed' : 'closed';
    const batch = writeBatch(firebaseDb);
    batch.update(doc(firebaseDb, 'deliveryConfirmations', id), {
      status: 'accepted',
      reviewedAt,
      reviewedBy
    });
    batch.update(doc(firebaseDb, 'deliveries', confirmation.loadId), {
      status: outcome,
      confirmedAt: reviewedAt,
      confirmedBy: reviewedBy,
      confirmationSource: 'shipper',
      shipperNote: confirmation.note || '',
      shipperContact: confirmation.contactEmail || '',
      shipperConfirmedAt: confirmation.createdAt || ''
    });
    batch.update(doc(firebaseDb, 'loads', confirmation.loadId), {
      status: loadStatus,
      deliveryConfirmedAt: reviewedAt
    });
    await batch.commit();

    state = {
      ...state,
      deliveryConfirmations: state.deliveryConfirmations.map((entry) =>
        entry.id === id ? { ...entry, status: 'accepted', reviewedAt, reviewedBy } : entry
      ),
      deliveries: state.deliveries.map((entry) =>
        entry.loadId === confirmation.loadId
          ? {
              ...entry,
              status: outcome,
              confirmedAt: reviewedAt,
              confirmedBy: reviewedBy,
              confirmationSource: 'shipper',
              shipperNote: confirmation.note || '',
              shipperContact: confirmation.contactEmail || '',
              shipperConfirmedAt: confirmation.createdAt || ''
            }
          : entry
      ),
      loads: state.loads.map((entry) =>
        entry.id === confirmation.loadId
          ? { ...entry, status: loadStatus, deliveryConfirmedAt: reviewedAt }
          : entry
      )
    };
    listeners.forEach((listener) => listener());
    return { loadStatus };
  }

  return commit((draft) => {
    const confirmation = (draft.deliveryConfirmations || []).find((entry) => entry.id === id);
    if (!confirmation) throw new Error('That confirmation could not be found.');
    if (confirmation.status !== 'pending') throw new Error('That confirmation has already been reviewed.');
    const delivery = (draft.deliveries || []).find((entry) => entry.loadId === confirmation.loadId);
    if (!delivery) throw new Error('There is no delivery record for this load.');

    const outcome = confirmation.outcome === 'problem' ? 'disputed' : 'confirmed';
    const loadStatus = confirmation.outcome === 'problem' ? 'disputed' : 'closed';
    Object.assign(confirmation, { status: 'accepted', reviewedAt, reviewedBy });
    Object.assign(delivery, {
      status: outcome,
      confirmedAt: reviewedAt,
      confirmedBy: reviewedBy,
      confirmationSource: 'shipper',
      shipperNote: confirmation.note || '',
      shipperContact: confirmation.contactEmail || '',
      shipperConfirmedAt: confirmation.createdAt || ''
    });
    const load = draft.loads.find((entry) => entry.id === confirmation.loadId);
    if (load) {
      load.status = loadStatus;
      load.deliveryConfirmedAt = reviewedAt;
    }
    return { loadStatus };
  });
}

export function dismissDeliveryConfirmation(id, reviewer) {
  const reviewedAt = new Date().toISOString();
  const reviewedBy = String(reviewer || 'Union staff').trim() || 'Union staff';
  const patch = { status: 'dismissed', reviewedAt, reviewedBy };

  if (!DEMO_MODE) {
    return updateDoc(doc(firebaseDb, 'deliveryConfirmations', id), patch).then(() => {
      state = {
        ...state,
        deliveryConfirmations: state.deliveryConfirmations.map((entry) =>
          entry.id === id ? { ...entry, ...patch } : entry
        )
      };
      listeners.forEach((listener) => listener());
      return true;
    });
  }

  return commit((draft) => {
    const confirmation = (draft.deliveryConfirmations || []).find((entry) => entry.id === id);
    if (!confirmation) return false;
    Object.assign(confirmation, patch);
    return true;
  });
}

export function getOpenLoads() {
  return state.loads.filter((entry) => entry.status === 'open');
}

/* ------------------------------------------------------------------
   Public load requests (moderated)
------------------------------------------------------------------ */

function cleanLoadRequest(payload) {
  return {
    title: String(payload.title || '').trim(),
    shipper: String(payload.shipper || '').trim(),
    contactName: String(payload.contactName || '').trim(),
    contactPhone: String(payload.contactPhone || '').trim(),
    contactEmail: String(payload.contactEmail || '').trim().toLowerCase(),
    origin: String(payload.origin || '').trim(),
    destination: String(payload.destination || '').trim(),
    vehicleType: payload.vehicleType || 'Dry van',
    weightTons: Number(payload.weightTons) || 0,
    rate: Number(payload.rate) || 0,
    pickupDate: payload.pickupDate || '',
    deliveryDate: payload.deliveryDate || '',
    requirements: String(payload.requirements || '').trim(),
    status: 'pending',
    source: 'public',
    createdAt: new Date().toISOString()
  };
}

export async function submitLoadRequest(payload) {
  if (String(payload?.website || '').trim()) {
    throw new Error('Your request could not be submitted. Please try again.');
  }
  const errors = validateLoadRequest(payload);
  if (Object.keys(errors).length) {
    throw new Error(Object.values(errors)[0]);
  }
  const record = cleanLoadRequest(payload);

  if (!DEMO_MODE) {
    const saved = { reference: `LR-${Date.now()}`, ...record };
    const ref = await addDoc(collection(firebaseDb, 'loadRequests'), saved);
    return { id: ref.id, ...saved };
  }

  return commit((draft) => {
    if (!Array.isArray(draft.loadRequests)) draft.loadRequests = [];
    const saved = {
      id: uid('req'),
      reference: nextReference(draft, 'loadRequest'),
      ...record
    };
    draft.loadRequests.unshift(saved);
    return saved;
  });
}

export function getLoadRequests() {
  return (state.loadRequests || []).slice();
}

export function getPendingLoadRequests() {
  return (state.loadRequests || []).filter((request) => request.status === 'pending');
}

export async function approveLoadRequest(id, reviewer, overrides = {}) {
  const reviewedAt = new Date().toISOString();
  const reviewedBy = String(reviewer || 'Union staff').trim() || 'Union staff';

  if (!DEMO_MODE) {
    const request = getRecord('loadRequests', id);
    if (!request) throw new Error('That load request could not be found.');
    if (request.status !== 'pending') throw new Error('That request has already been reviewed.');

    const load = {
      id: uid('load'),
      reference: `LD-${Date.now()}`,
      ...buildLoadFromRequest(request, overrides)
    };
    const contact = loadContactRecord(load.id, contactFromLoadRequest(request));
    const { id: _loadId, ...loadData } = load;
    const updatedRequest = {
      ...request,
      status: 'approved',
      reviewedAt,
      reviewedBy,
      rejectionReason: '',
      loadId: load.id,
      loadReference: load.reference
    };
    const batch = writeBatch(firebaseDb);
    batch.set(doc(firebaseDb, 'loads', load.id), loadData);
    batch.set(doc(firebaseDb, 'loadContacts', load.id), {
      loadId: load.id,
      contactName: contact.contactName,
      contactPhone: contact.contactPhone,
      contactEmail: contact.contactEmail
    });
    batch.update(doc(firebaseDb, 'loadRequests', id), {
      status: 'approved',
      reviewedAt,
      reviewedBy,
      rejectionReason: '',
      loadId: load.id,
      loadReference: load.reference
    });
    await batch.commit();

    state = {
      ...state,
      loads: [load, ...state.loads],
      loadContacts: [contact, ...(state.loadContacts || [])],
      loadRequests: state.loadRequests.map((entry) => (entry.id === id ? updatedRequest : entry))
    };
    listeners.forEach((listener) => listener());
    return { request: updatedRequest, load };
  }

  return commit((draft) => {
    const request = (draft.loadRequests || []).find((entry) => entry.id === id);
    if (!request) throw new Error('That load request could not be found.');
    if (request.status !== 'pending') throw new Error('That request has already been reviewed.');

    const load = {
      id: uid('load'),
      reference: nextReference(draft, 'load'),
      ...buildLoadFromRequest(request, overrides)
    };
    const contact = loadContactRecord(load.id, contactFromLoadRequest(request));
    draft.loads.unshift(load);
    draft.loadContacts = [contact, ...(draft.loadContacts || [])];
    Object.assign(request, {
      status: 'approved',
      reviewedAt,
      reviewedBy,
      rejectionReason: '',
      loadId: load.id,
      loadReference: load.reference
    });
    return { request, load };
  });
}

export async function rejectLoadRequest(id, reason, reviewer) {
  const reviewedAt = new Date().toISOString();
  const reviewedBy = String(reviewer || 'Union staff').trim() || 'Union staff';
  const rejectionReason = String(reason || '').trim();

  if (!DEMO_MODE) {
    const request = getRecord('loadRequests', id);
    if (!request) throw new Error('That load request could not be found.');
    if (request.status !== 'pending') throw new Error('That request has already been reviewed.');

    await updateDoc(doc(firebaseDb, 'loadRequests', id), {
      status: 'rejected',
      rejectionReason,
      reviewedAt,
      reviewedBy
    });
    const updated = { ...request, status: 'rejected', rejectionReason, reviewedAt, reviewedBy };
    state = {
      ...state,
      loadRequests: state.loadRequests.map((entry) => (entry.id === id ? updated : entry))
    };
    listeners.forEach((listener) => listener());
    return updated;
  }

  return commit((draft) => {
    const request = (draft.loadRequests || []).find((entry) => entry.id === id);
    if (!request) throw new Error('That load request could not be found.');
    if (request.status !== 'pending') throw new Error('That request has already been reviewed.');
    Object.assign(request, { status: 'rejected', rejectionReason, reviewedAt, reviewedBy });
    return request;
  });
}

export function deleteLoadRequest(id) {
  if (!DEMO_MODE) {
    return deleteDoc(doc(firebaseDb, 'loadRequests', id)).then(() => {
      state = { ...state, loadRequests: state.loadRequests.filter((entry) => entry.id !== id) };
      listeners.forEach((listener) => listener());
      return true;
    });
  }
  return commit((draft) => {
    draft.loadRequests = (draft.loadRequests || []).filter((entry) => entry.id !== id);
    return true;
  });
}

/* ------------------------------------------------------------------
   Dues
------------------------------------------------------------------ */

export async function addDues(payload) {
  if (!DEMO_MODE) {
    const member = getRecord('members', payload.memberId);
    const invoice = { id: uid('due'), reference: `DUE-${Date.now()}`, memberId: payload.memberId,
      memberName: member?.name || payload.memberName || 'Member', period: String(payload.period || '').trim(),
      amount: Number(payload.amount) || 0, dueDate: payload.dueDate || '', status: payload.status || 'due',
      paidAt: '', method: '', note: String(payload.note || '').trim() };
    const { id, ...data } = invoice;
    await setDoc(doc(firebaseDb, 'dues', id), data);
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
    const methodValue = ['momo', 'bank', 'cash'].includes(method) ? method : 'momo';
    const invoiceRef = doc(firebaseDb, 'dues', id);
    return runTransaction(firebaseDb, async (transaction) => {
      const snapshot = await transaction.get(invoiceRef);
      if (!snapshot.exists()) throw new Error('Dues invoice not found.');
      const invoice = snapshot.data();
      if (invoice.status === 'paid') return { ...invoice, id };
      if (invoice.status === 'waived') throw new Error('This invoice has been waived.');
      const paidAt = new Date().toISOString();
      const note = `Payment recorded by ${methodValue}.`;
      transaction.update(invoiceRef, { status: 'paid', paidAt, method: methodValue, note });
      return { ...invoice, id, status: 'paid', paidAt, method: methodValue, note };
    }).then((invoice) => {
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

export async function addNews(payload) {
  if (!DEMO_MODE) {
    const article = { id: uid('news'), title: String(payload.title || '').trim(), category: payload.category || 'announcement',
      excerpt: String(payload.excerpt || '').trim(), body: normalizeBody(payload.body), author: String(payload.author || '').trim() || 'Union office',
      publishedAt: payload.publishedAt ? new Date(payload.publishedAt).toISOString() : new Date().toISOString(), featured: Boolean(payload.featured), readMins: Number(payload.readMins) || 2 };
    const { id, ...data } = article;
    await setDoc(doc(firebaseDb, 'news', id), data);
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

export async function addEvent(payload) {
  if (!DEMO_MODE) {
    const event = { id: uid('event'), title: String(payload.title || '').trim(), type: payload.type || 'meeting',
      description: String(payload.description || '').trim(), location: String(payload.location || '').trim(), region: String(payload.region || '').trim(),
      startDate: payload.startDate ? new Date(payload.startDate).toISOString() : new Date().toISOString(), endDate: payload.endDate ? new Date(payload.endDate).toISOString() : '',
      capacity: Number(payload.capacity) || 0, registered: 0, fee: Number(payload.fee) || 0, memberOnly: Boolean(payload.memberOnly), trainer: String(payload.trainer || '').trim() };
    const { id, ...data } = event;
    await setDoc(doc(firebaseDb, 'events', id), data);
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

export async function deleteEvent(id) {
  if (!DEMO_MODE) {
    const registrations = await getDocs(
      query(collection(firebaseDb, 'registrations'), where('eventId', '==', id))
    );
    const batch = writeBatch(firebaseDb);
    registrations.forEach((registration) => batch.delete(registration.ref));
    batch.delete(doc(firebaseDb, 'events', id));
    await batch.commit();
    state = {
      ...state,
      events: state.events.filter((entry) => entry.id !== id),
      registrations: state.registrations.filter((entry) => entry.eventId !== id)
    };
    listeners.forEach((listener) => listener());
    return true;
  }
  return commit((draft) => {
    draft.events = draft.events.filter((entry) => entry.id !== id);
    draft.registrations = draft.registrations.filter((entry) => entry.eventId !== id);
    return true;
  });
}

export function registerForEvent(eventId, payload) {
  if (!DEMO_MODE) {
    const uid = firebaseAuth.currentUser?.uid;
    const authEmail = String(firebaseAuth.currentUser?.email || '').trim().toLowerCase();
    if (!uid) return Promise.reject(new Error('Sign in before registering for an event.'));
    const name = String(payload.name || '').trim();
    const phone = String(payload.phone || '').trim();
    const email = authEmail || String(payload.email || '').trim().toLowerCase();
    if (!eventId || !name || !email || !phone) {
      return Promise.reject(new Error('Complete the registration details.'));
    }

    const eventRef = doc(firebaseDb, 'events', eventId);
    const registrationId = `${eventId}_${uid}`;
    const registrationRef = doc(firebaseDb, 'registrations', registrationId);

    return runTransaction(firebaseDb, async (transaction) => {
      const [eventSnapshot, existingSnapshot, memberSnapshot] = await Promise.all([
        transaction.get(eventRef),
        transaction.get(registrationRef),
        transaction.get(doc(firebaseDb, 'members', uid))
      ]);
      if (!eventSnapshot.exists()) throw new Error('This event could not be found. Refresh the page and try again.');
      if (existingSnapshot.exists()) {
        return {
          ok: false,
          duplicate: true,
          registration: { id: registrationId, ...existingSnapshot.data() }
        };
      }
      const event = eventSnapshot.data();
      if (event.memberOnly && (!memberSnapshot.exists() || memberSnapshot.data().status !== 'active')) {
        throw new Error('Your account must have an active membership to register for this event.');
      }
      const capacity = Number(event.capacity) || 0;
      const registered = Number(event.registered) || 0;
      if (capacity > 0 && registered >= capacity) throw new Error('This event is full.');

      const registration = {
        eventId,
        eventTitle: event.title,
        memberId: uid,
        name,
        email,
        phone,
        createdAt: new Date().toISOString()
      };
      transaction.set(registrationRef, registration);
      transaction.update(eventRef, { registered: registered + 1 });
      return { ok: true, registration: { id: registrationId, ...registration } };
    });
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
    return runTransaction(firebaseDb, async (transaction) => {
      const registrationRef = doc(firebaseDb, 'registrations', id);
      const registrationSnapshot = await transaction.get(registrationRef);
      if (!registrationSnapshot.exists()) return false;
      const registration = registrationSnapshot.data();
      const eventRef = doc(firebaseDb, 'events', registration.eventId);
      const eventSnapshot = await transaction.get(eventRef);
      transaction.delete(registrationRef);
      if (eventSnapshot.exists()) {
        const registered = Number(eventSnapshot.data().registered) || 0;
        transaction.update(eventRef, { registered: Math.max(0, registered - 1) });
      }
      return true;
    }).then((removed) => {
      if (!removed) return false;
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
    const uid = firebaseAuth.currentUser?.uid;
    if (!uid) return Promise.reject(new Error('Sign in as a member to create job alerts.'));
    const member = getRecord('members', uid);
    const alert = {
      memberId: uid,
      name: String(member?.name || payload.name || firebaseAuth.currentUser?.displayName || 'Member').trim(),
      email: String(firebaseAuth.currentUser?.email || member?.email || payload.email || '').trim().toLowerCase(),
      phone: String(member?.phone || payload.phone || '').trim(),
      origin: String(payload.origin || '').trim(),
      destination: String(payload.destination || '').trim(),
      trailerType: String(payload.trailerType || 'Any').trim(),
      minRate: Number(payload.minRate) || 0,
      frequency: payload.frequency || 'instant',
      active: true,
      createdAt: new Date().toISOString()
    };
    return addDoc(collection(firebaseDb, 'alerts'), alert).then((ref) => {
      const saved = { id: ref.id, ...alert };
      state = { ...state, alerts: [saved, ...state.alerts] };
      listeners.forEach((listener) => listener());
      return saved;
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

const ALERT_FIELDS = ['origin', 'destination', 'trailerType', 'minRate', 'frequency', 'active'];

export function updateAlert(id, patch) {
  if (!DEMO_MODE) {
    const clean = pickFields(patch, ALERT_FIELDS);
    if (!Object.keys(clean).length) return Promise.reject(new Error('Provide the alert changes to save.'));
    if ('minRate' in clean) clean.minRate = Number(clean.minRate) || 0;
    if ('trailerType' in clean) clean.trailerType = String(clean.trailerType || 'Any').trim();
    if ('origin' in clean) clean.origin = String(clean.origin || '').trim();
    if ('destination' in clean) clean.destination = String(clean.destination || '').trim();
    return updateDoc(doc(firebaseDb, 'alerts', id), { ...clean, updatedAt: new Date().toISOString() })
      .then(() => {
        const alert = { ...getRecord('alerts', id), ...clean, id };
        state = { ...state, alerts: state.alerts.map((entry) => entry.id === id ? alert : entry) };
        listeners.forEach((listener) => listener());
        return alert;
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
    return deleteDoc(doc(firebaseDb, 'alerts', id)).then(() => {
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

export async function markMessageRead(id, read = true) {
  if (!DEMO_MODE) {
    const message = { ...getRecord('messages', id), read, id };
    if (message.email) {
      const { id: _id, ...data } = message;
      await setDoc(doc(firebaseDb, 'enquiries', id), data, { merge: true });
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
