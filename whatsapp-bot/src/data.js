import { normalizePhone } from './phone.js';

const MEMBER_TTL_MS = 5 * 60_000;
const SETTINGS_TTL_MS = 5 * 60_000;

/**
 * Read-only view of the union's Firestore data. Member records are cached for
 * a few minutes so a busy chat does not re-scan the collection per message.
 */
export function createDataStore(db, log) {
  let memberCache = { at: 0, list: [] };
  let settingsCache = { at: 0, value: null };

  async function listMembers(force = false) {
    if (!force && Date.now() - memberCache.at < MEMBER_TTL_MS && memberCache.list.length) {
      return memberCache.list;
    }
    try {
      const snapshot = await db.collection('members').get();
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      memberCache = { at: Date.now(), list };
      return list;
    } catch (error) {
      log?.error({ error }, 'Firestore: could not read members');
      return memberCache.list;
    }
  }

  async function settings() {
    if (Date.now() - settingsCache.at < SETTINGS_TTL_MS && settingsCache.value) {
      return settingsCache.value;
    }
    try {
      const doc = await db.collection('settings').doc('union').get();
      const value = doc.exists ? doc.data() : {};
      settingsCache = { at: Date.now(), value };
      return value;
    } catch (error) {
      log?.error({ error }, 'Firestore: could not read union settings');
      return settingsCache.value || {};
    }
  }

  async function findMemberByPhone(phone) {
    const target = normalizePhone(phone);
    if (!target) return null;
    const members = await listMembers();
    return members.find((member) => normalizePhone(member.phone) === target) || null;
  }

  async function duesFor(memberId) {
    if (!memberId) return [];
    try {
      const snapshot = await db.collection('dues').where('memberId', '==', memberId).get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      log?.error({ error, memberId }, 'Firestore: could not read dues');
      return [];
    }
  }

  async function openLoads(limit = 5) {
    try {
      const snapshot = await db.collection('loads').where('status', '==', 'open').limit(25).get();
      return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => String(b.postedAt || '').localeCompare(String(a.postedAt || '')))
        .slice(0, limit);
    } catch (error) {
      log?.error({ error }, 'Firestore: could not read loads');
      return [];
    }
  }

  async function activeMembers() {
    const members = await listMembers(true);
    return members.filter((member) => member.status === 'active' && normalizePhone(member.phone));
  }

  async function staffNumbers() {
    try {
      const snapshot = await db.collection('users').where('role', '==', 'staff').get();
      return snapshot.docs
        .map((doc) => normalizePhone(doc.data().phone))
        .filter(Boolean);
    } catch (error) {
      log?.error({ error }, 'Firestore: could not read staff users');
      return [];
    }
  }

  return { listMembers, findMemberByPhone, duesFor, openLoads, activeMembers, staffNumbers, settings };
}

export function outstandingDues(dues = []) {
  const open = dues.filter((invoice) => ['due', 'overdue'].includes(invoice.status));
  const total = open.reduce((sum, invoice) => sum + (Number(invoice.amount) || 0), 0);
  return { invoices: open, total };
}
