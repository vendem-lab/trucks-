import { normalizePhone } from './phone.js';

const MEMBER_TTL_MS = 5 * 60_000;
const SETTINGS_TTL_MS = 5 * 60_000;

/**
 * Read-only view of the union's Firestore data, plus the Telegram link table.
 * Member records are cached for a few minutes so a busy chat does not re-scan
 * the collection per message.
 *
 * telegramLinks/{chatId} -> { memberId, phone, name, linkedAt }
 */
export function createDataStore(db, log) {
  let memberCache = { at: 0, list: [] };
  let settingsCache = { at: 0, value: null };
  const links = db.collection('telegramLinks');

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
      log?.error('Firestore: could not read members', error.message);
      return memberCache.list;
    }
  }

  async function memberById(memberId) {
    if (!memberId) return null;
    const members = await listMembers();
    return members.find((member) => member.id === memberId) || null;
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
      log?.error('Firestore: could not read union settings', error.message);
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
      log?.error('Firestore: could not read dues', error.message);
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
      log?.error('Firestore: could not read loads', error.message);
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
      log?.error('Firestore: could not read staff users', error.message);
      return [];
    }
  }

  async function getLink(chatId) {
    try {
      const doc = await links.doc(String(chatId)).get();
      return doc.exists ? { chatId: String(chatId), ...doc.data() } : null;
    } catch (error) {
      log?.error('Firestore: could not read the Telegram link', error.message);
      return null;
    }
  }

  async function setLink(chatId, { memberId, phone, name }) {
    await links.doc(String(chatId)).set(
      {
        memberId,
        phone: normalizePhone(phone),
        name: name || '',
        linkedAt: new Date().toISOString()
      },
      { merge: true }
    );
  }

  async function removeLink(chatId) {
    await links.doc(String(chatId)).delete();
  }

  /** Everyone who can receive a Telegram broadcast: linked and still active. */
  async function linkedActiveMembers() {
    try {
      const snapshot = await links.get();
      const members = await listMembers();
      const byId = new Map(members.map((member) => [member.id, member]));

      return snapshot.docs
        .map((doc) => {
          const link = doc.data();
          const member = byId.get(link.memberId);
          if (!member || member.status !== 'active') return null;
          return {
            chatId: doc.id,
            memberId: member.id,
            name: member.name || link.name || ''
          };
        })
        .filter(Boolean);
    } catch (error) {
      log?.error('Firestore: could not read linked members', error.message);
      return [];
    }
  }

  return {
    listMembers,
    memberById,
    findMemberByPhone,
    duesFor,
    openLoads,
    activeMembers,
    staffNumbers,
    settings,
    getLink,
    setLink,
    removeLink,
    linkedActiveMembers
  };
}

export function outstandingDues(dues = []) {
  const open = dues.filter((invoice) => ['due', 'overdue'].includes(invoice.status));
  const total = open.reduce((sum, invoice) => sum + (Number(invoice.amount) || 0), 0);
  return { invoices: open, total };
}
