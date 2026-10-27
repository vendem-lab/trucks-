import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  updatePassword as firebaseUpdatePassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseDb } from './firebase.js';
import { createMemberRecord } from './store.js';
import { approveMemberApplicationSecurely } from './callables.js';

export async function approveApplication(applicationId, uid) {
  return approveMemberApplicationSecurely(applicationId, uid);
}

export function subscribeToAuth(callback) {
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
      const data = profile.exists() ? profile.data() : {};
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
  const credential = await signInWithEmailAndPassword(
    firebaseAuth,
    String(email || '').trim().toLowerCase(),
    password
  );
  const profile = await getDoc(doc(firebaseDb, 'users', credential.user.uid));
  if (!profile.exists()) {
    await firebaseSignOut(firebaseAuth);
    throw new Error('Your account profile is missing. Contact the union office.');
  }
  const data = profile.data();
  if (data.memberStatus === 'pending') {
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

export async function createMemberAccount(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email, payload.password);
  await updateProfile(credential.user, { displayName: String(payload.name || '').trim() });
  const accountUid = credential.user.uid;

  const member = {
    ...payload,
    id: accountUid,
    uid: accountUid,
    email,
    name: String(payload.name || '').trim(),
    password: undefined,
    role: 'member',
    status: 'pending',
    memberNumber: `HU-${accountUid.slice(0, 8).toUpperCase()}`,
    createdAt: new Date().toISOString()
  };
  delete member.password;

  try {
    await setDoc(doc(firebaseDb, 'users', accountUid), {
      uid: accountUid,
      email,
      name: member.name,
      role: 'member',
      memberId: accountUid,
      memberStatus: 'pending',
      tier: member.tier,
      createdAt: member.createdAt
    });
    const { password: _password, ...application } = member;
    const result = await createMemberRecord(application);
    return { ...member, applicationId: result.applicationId };
  } catch (error) {
    await firebaseSignOut(firebaseAuth);
    throw error;
  }
}

export function signOut() {
  return firebaseSignOut(firebaseAuth);
}

export function changeMemberPassword(password) {
  if (!firebaseAuth.currentUser) throw new Error('Sign in again before changing your password.');
  return firebaseUpdatePassword(firebaseAuth.currentUser, password);
}
