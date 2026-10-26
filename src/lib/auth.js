import { DEMO_ADMIN } from '../config.js';

const SESSION_KEY = 'haulway_session';

export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.email) return null;
    return session;
  } catch (error) {
    return null;
  }
}

export function signIn(email, password) {
  const value = String(email || '').trim().toLowerCase();
  if (value !== DEMO_ADMIN.email || password !== DEMO_ADMIN.password) {
    return { ok: false, error: 'That email and password combination is not recognised.' };
  }
  const session = {
    email: DEMO_ADMIN.email,
    name: DEMO_ADMIN.name,
    role: DEMO_ADMIN.role,
    signedInAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn('The admin session could not be saved.', error);
  }
  return { ok: true, session };
}

export function signOut() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    /* ignore */
  }
}
