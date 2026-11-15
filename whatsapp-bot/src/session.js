import { BufferJSON, initAuthCreds, proto } from '@whiskeysockets/baileys';

/**
 * Baileys auth state persisted in Firestore so a restart (or a redeploy on an
 * ephemeral host) reconnects without asking for a new pairing code.
 *
 * Layout:
 *   whatsappSessions/{sessionId}                 -> { creds, updatedAt }
 *   whatsappSessions/{sessionId}/keys/{type}     -> { entries: { [id]: value } }
 */
export async function useFirestoreAuthState(db, sessionId, log, { debounceMs = 800 } = {}) {
  const root = db.collection('whatsappSessions').doc(sessionId);
  const keysCol = root.collection('keys');

  const snapshot = await root.get();
  const stored = snapshot.exists ? snapshot.data() : null;
  const creds = stored?.creds
    ? JSON.parse(JSON.stringify(stored.creds), BufferJSON.reviver)
    : initAuthCreds();

  if (!stored?.creds) {
    log?.info({ sessionId }, 'WhatsApp: no stored session, a pairing code will be required');
  }

  const cache = new Map();
  const timers = new Map();
  const dirty = new Set();

  async function load(type) {
    if (cache.has(type)) return cache.get(type);
    const doc = await keysCol.doc(type).get();
    const raw = doc.exists ? doc.data().entries : null;
    const entries = raw ? JSON.parse(JSON.stringify(raw), BufferJSON.reviver) : {};
    cache.set(type, entries);
    return entries;
  }

  function scheduleFlush(type) {
    dirty.add(type);
    if (timers.has(type)) return;
    const timer = setTimeout(() => {
      timers.delete(type);
      flush(type).catch((error) => log?.error({ error, type }, 'WhatsApp: could not save session keys'));
    }, debounceMs);
    timer.unref?.();
    timers.set(type, timer);
  }

  async function flush(type) {
    if (!dirty.has(type)) return;
    dirty.delete(type);
    const entries = cache.get(type) || {};
    await keysCol.doc(type).set(
      { entries: JSON.parse(JSON.stringify(entries, BufferJSON.replacer)), updatedAt: new Date().toISOString() },
      { merge: false }
    );
  }

  async function flushAll() {
    for (const type of [...dirty]) await flush(type);
  }

  async function saveCreds() {
    await root.set(
      {
        creds: JSON.parse(JSON.stringify(creds, BufferJSON.replacer)),
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  }

  const keys = {
    get: async (type, ids) => {
      const entries = await load(type);
      const out = {};
      for (const id of ids) {
        let value = entries[id];
        if (type === 'app-state-sync-key' && value) {
          value = proto.Message.AppStateSyncKeyData.fromObject(value);
        }
        out[id] = value ?? null;
      }
      return out;
    },
    set: async (data) => {
      for (const [type, values] of Object.entries(data)) {
        const entries = await load(type);
        for (const [id, value] of Object.entries(values)) {
          if (value === null || value === undefined) delete entries[id];
          else entries[id] = value;
        }
        scheduleFlush(type);
      }
    }
  };

  return { state: { creds, keys }, saveCreds, flushAll };
}
