import { DEMO_STAFF } from '../config.js';
import { getState } from './store.js';

const SESSION_KEY = 'haulway_union_session';

export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.email || !session.role) return null;
    return session;
  } catch (error) {
    return null;
  }
}

export function signIn(email, password) {
  const value = String(email || '').trim().toLowerCase();

  if (value === DEMO_STAFF.email && password === DEMO_STAFF.password) {
    const session = {
      email: DEMO_STAFF.email,
      name: DEMO_STAFF.name,
      role: 'staff',
      staffRole: DEMO_STAFF.role,
      signedInAt: new Date().toISOString()
    };
    save(session);
    return { ok: true, session };
  }

  const member = getState().members.find((entry) => entry.email.toLowerCase() === value);
  if (!member || member.password !== password) {
    return {
      ok: false,
      error: 'That email and password combination is not recognised. Check your details or call the member line.'
    };
  }

  const session = {
    email: member.email,
    name: member.name,
    role: 'member',
    memberId: member.id,
    memberStatus: member.status,
    signedInAt: new Date().toISOString()
  };
  save(session);
  return { ok: true, session };
}

function save(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn('The member session could not be saved.', error);
  }
}

export function signOut() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    /* ignore */
  }
}
