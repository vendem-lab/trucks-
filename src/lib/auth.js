import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  updatePassword as firebaseUpdatePassword
} from 'firebase/auth';
import { doc, getDoc, runTransaction, setDoc } from 'firebase/firestore';
import { DEMO_STAFF } from '../config.js';
import { firebaseAuth, firebaseDb } from './firebase.js';
import { addMember, createMemberRecord, getState, updateMember } from './store.js';

const DEMO_MODE = import.meta.env.VITE_USE_DEMO_DATA === 'true';
const SESSION_KEY = 'haulway_union_session';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function memberNumber(uid) {
  return `HU-${String(uid || '').slice(0, 8).toUpperCase()}`;
}

function readDemoSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.email || !session.role) return null;
    if (session.role === 'staff') return session;

    const member = getState().members.find((entry) => entry.id === session.memberId);
    if (!member) return null;
    return {
      ...session,
      name: member.name,
      email: member.email,
      memberStatus: member.status,
      tier: member.tier
    };
  } catch (error) {
    return null;
  }
}

function saveDemoSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn('The member session could not be saved.', error);
  }
}

function clearDemoSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    /* ignore */
  }
}

export async function approveApplication(applicationId) {
  if (DEMO_MODE) throw new Error('Membership application approval is only available in Firebase mode.');
  if (!applicationId) throw new Error('Application id is required.');

  const applicationRef = doc(firebaseDb, 'applications', applicationId);
  return runTransaction(firebaseDb, async (transaction) => {
    const applicationSnapshot = await transaction.get(applicationRef);
    if (!applicationSnapshot.exists()) throw new Error('Application not found.');

    const application = applicationSnapshot.data();
    const uid = String(application.uid || '');
    if (!uid) throw new Error('This application is missing its account id.');

    const memberRef = doc(firebaseDb, 'members', uid);
    const userRef = doc(firebaseDb, 'users', uid);
    const [memberSnapshot, userSnapshot] = await Promise.all([
      transaction.get(memberRef),
      transaction.get(userRef)
    ]);

    if (application.status === 'approved' && memberSnapshot.exists() && userSnapshot.data()?.memberStatus === 'active') {
      return { ok: true, alreadyApproved: true };
    }
    if (application.status !== 'pending') throw new Error('This application is no longer pending.');
    if (memberSnapshot.exists()) throw new Error('A member record already exists for this applicant.');
    if (!userSnapshot.exists()) throw new Error('The applicant account profile is missing.');

    const approvedAt = new Date().toISOString();
    transaction.set(memberRef, { ...application, status: 'active', approvedAt });
    transaction.update(userRef, { memberStatus: 'active' });
    transaction.update(applicationRef, { status: 'approved', approvedAt });
    return { ok: true };
  });
}

export function subscribeToAuth(callback) {
  if (DEMO_MODE) {
    callback(readDemoSession());
    return () => {};
  }

  return onAuthStateChanged(firebaseAuth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }

    try {
      const profile = await getDoc(doc(firebaseDb, 'users', user.uid));
      if (!profile.exists()) {
        callback({
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || 'Member',
          role: 'member',
          memberId: user.uid,
          memberStatus: 'pending',
          tier: 'independent',
          profileMissing: true
        });
        return;
      }
      const data = profile.data();
      callback({
        uid: user.uid,
        email: user.email || '',
        name: data.name || user.displayName || user.email || 'Member',
        role: data.role === 'staff' ? 'staff' : 'member',
        memberId: data.memberId || user.uid,
        memberStatus: data.memberStatus || 'pending',
        tier: data.tier || 'independent',
        staffRole: data.staffRole || ''
      });
    } catch (error) {
      console.error('Could not load account profile.', error);
      callback({
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || 'Member',
        role: 'member',
        memberId: user.uid,
        memberStatus: 'pending',
        tier: 'independent',
        profileError: error.message || 'Could not read your account profile.'
      });
    }
  });
}

export async function signIn(email, password) {
  if (DEMO_MODE) {
    const value = String(email || '').trim().toLowerCase();
    if (value === DEMO_STAFF.email && password === DEMO_STAFF.password) {
      const session = {
        email: DEMO_STAFF.email,
        name: DEMO_STAFF.name,
        role: 'staff',
        staffRole: DEMO_STAFF.role,
        signedInAt: new Date().toISOString()
      };
      saveDemoSession(session);
      return session;
    }

    const member = getState().members.find((entry) => entry.email.toLowerCase() === value);
    if (!member || member.password !== password) {
      throw new Error(
        'That email and password combination is not recognised. Check your details or call the member line.'
      );
    }

    const session = {
      email: member.email,
      name: member.name,
      role: 'member',
      memberId: member.id,
      memberStatus: member.status,
      tier: member.tier,
      signedInAt: new Date().toISOString()
    };
    saveDemoSession(session);
    return session;
  }

  const credential = await signInWithEmailAndPassword(
    firebaseAuth,
    String(email || '').trim().toLowerCase(),
    password
  );

  try {
    const profile = await getDoc(doc(firebaseDb, 'users', credential.user.uid));
    if (!profile.exists()) {
      await firebaseSignOut(firebaseAuth);
      throw new Error('Your account profile is missing. Contact the union office.');
    }
    const data = profile.data();
    if (data.memberStatus === 'pending') {
      await firebaseSignOut(firebaseAuth);
      throw new Error('Your application is awaiting office approval.');
    }
    return {
      uid: credential.user.uid,
      email: credential.user.email || '',
      name: data.name || credential.user.displayName || 'Member',
      role: data.role === 'staff' ? 'staff' : 'member',
      memberId: data.memberId || credential.user.uid,
      memberStatus: data.memberStatus || 'pending',
      tier: data.tier || 'independent',
      staffRole: data.staffRole || ''
    };
  } catch (error) {
    await firebaseSignOut(firebaseAuth).catch(() => {});
    throw error;
  }
}

export async function signInWithGoogle() {
  if (DEMO_MODE) {
    throw new Error('Google sign-in is available in Firebase live mode only.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(firebaseAuth, provider);
  const profile = await getDoc(doc(firebaseDb, 'users', credential.user.uid));

  if (!profile.exists()) {
    // Keep the Google account signed in so the membership form can attach the
    // application to this account. The profile is only created on submission.
    return {
      uid: credential.user.uid,
      email: credential.user.email || '',
      name: credential.user.displayName || 'Member',
      role: 'member',
      memberId: credential.user.uid,
      memberStatus: 'pending',
      tier: 'independent',
      profileMissing: true
    };
  }

  const data = profile.data();
  if (data.memberStatus === 'pending') {
    await firebaseSignOut(firebaseAuth);
    throw new Error('Your application is awaiting office approval.');
  }

  return {
    uid: credential.user.uid,
    email: credential.user.email || '',
    name: data.name || credential.user.displayName || 'Member',
    role: data.role === 'staff' ? 'staff' : 'member',
    memberId: data.memberId || credential.user.uid,
    memberStatus: data.memberStatus || 'pending',
    tier: data.tier || 'independent',
    staffRole: data.staffRole || ''
  };
}

function applicationRecord(payload, uid, email) {
  const member = {
    ...payload,
    id: uid,
    uid,
    email,
    name: String(payload.name || '').trim(),
    role: 'member',
    status: 'pending',
    memberNumber: memberNumber(uid),
    joinedAt: today(),
    createdAt: new Date().toISOString()
  };
  delete member.password;
  return member;
}

function accountProfile(uid, email, member) {
  return {
    uid,
    email,
    name: member.name,
    role: 'member',
    memberId: uid,
    memberStatus: 'pending',
    tier: member.tier,
    createdAt: member.createdAt
  };
}

async function submitApplication(member, uid, email) {
  // Write the application before the account profile. If the second write
  // fails, the office can still approve the application, and a retry is safe
  // because the application document id is the account uid.
  const result = await createMemberRecord(member);
  await setDoc(doc(firebaseDb, 'users', uid), accountProfile(uid, email, member));
  return { ...member, applicationId: result.applicationId };
}

export async function createMemberAccount(payload) {
  if (DEMO_MODE) {
    const member = addMember(payload);
    if (!member) throw new Error('Could not create the member application.');
    return member;
  }

  const email = String(payload.email || '').trim().toLowerCase();
  let credential;
  try {
    credential = await createUserWithEmailAndPassword(firebaseAuth, email, payload.password);
    await updateProfile(credential.user, { displayName: String(payload.name || '').trim() });
  } catch (error) {
    if (error.code !== 'auth/email-already-in-use') throw error;
    // An earlier attempt may have created the account but failed before the
    // application was saved. Let the applicant finish with the same password.
    try {
      credential = await signInWithEmailAndPassword(firebaseAuth, email, payload.password);
    } catch {
      throw error;
    }
    const existing = await getDoc(doc(firebaseDb, 'users', credential.user.uid));
    if (existing.exists()) {
      await firebaseSignOut(firebaseAuth).catch(() => {});
      throw error;
    }
  }

  const accountUid = credential.user.uid;
  const member = applicationRecord(payload, accountUid, email);

  try {
    const submitted = await submitApplication(member, accountUid, email);
    // Applications require office approval; do not leave a pending applicant authenticated.
    await firebaseSignOut(firebaseAuth);
    return submitted;
  } catch (error) {
    await firebaseSignOut(firebaseAuth).catch(() => {});
    throw error;
  }
}

export async function submitMemberApplication(payload) {
  if (DEMO_MODE) throw new Error('Use the standard application form in demo mode.');

  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('Sign in with Google again to finish your application.');

  const email = String(user.email || payload.email || '').trim().toLowerCase();
  const member = applicationRecord(payload, user.uid, email);

  try {
    const submitted = await submitApplication(member, user.uid, email);
    await firebaseSignOut(firebaseAuth);
    return submitted;
  } catch (error) {
    await firebaseSignOut(firebaseAuth).catch(() => {});
    throw error;
  }
}

export function signOut() {
  if (DEMO_MODE) {
    clearDemoSession();
    return Promise.resolve();
  }
  return firebaseSignOut(firebaseAuth);
}

export function changeMemberPassword(password) {
  if (DEMO_MODE) {
    const session = readDemoSession();
    if (!session?.memberId) throw new Error('Sign in again before changing your password.');
    updateMember(session.memberId, { password });
    return Promise.resolve();
  }
  if (!firebaseAuth.currentUser) throw new Error('Sign in again before changing your password.');
  return firebaseUpdatePassword(firebaseAuth.currentUser, password);
}
