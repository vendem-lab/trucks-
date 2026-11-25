import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';

let testEnv;

const projectId = 'haulway-rules-test';
const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

const fleetRecord = (photo = 'data:image/jpeg;base64,abc') => ({
  memberId: 'member-1',
  displayName: 'Test Member',
  vehicleType: 'Dry van',
  region: 'Greater Accra',
  city: 'Accra',
  tier: 'independent',
  joinedAt: '2026-01-01',
  photo,
  active: true,
  updatedAt: '2026-11-25T00:00:00.000Z'
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules }
  });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const { setDoc, doc } = await import('firebase/firestore');
    await setDoc(doc(db, 'members/member-1'), {
      uid: 'member-1',
      status: 'active',
      publicProfile: true,
      fleetPhoto: ''
    });
    await setDoc(doc(db, 'members/pending-1'), {
      uid: 'pending-1',
      status: 'pending',
      publicProfile: true,
      fleetPhoto: ''
    });
    await setDoc(doc(db, 'users/staff-1'), { role: 'staff' });
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describe('public fleet photo rules', () => {
  it('allows an active member to publish a sanitized JPEG', async () => {
    const db = testEnv.authenticatedContext('member-1').firestore();
    const { setDoc, doc } = await import('firebase/firestore');
    await assertSucceeds(setDoc(doc(db, 'fleet/member-1'), fleetRecord()));
  });

  it('rejects PNG, WebP, SVG payloads and HTML disguised as images', async () => {
    const db = testEnv.authenticatedContext('member-1').firestore();
    const { setDoc, doc } = await import('firebase/firestore');
    await assertFails(setDoc(doc(db, 'fleet/member-1'), fleetRecord('data:image/png;base64,abc')));
    await assertFails(setDoc(doc(db, 'fleet/member-1'), fleetRecord('data:image/webp;base64,abc')));
    await assertFails(setDoc(doc(db, 'fleet/member-1'), fleetRecord('/fleet/../evil.svg')));
    await assertFails(setDoc(doc(db, 'fleet/member-1'), fleetRecord('data:text/html;base64,PHNjcmlwdD4=')));
  });

  it('rejects publication from a pending member', async () => {
    const db = testEnv.authenticatedContext('pending-1').firestore();
    const { setDoc, doc } = await import('firebase/firestore');
    await assertFails(setDoc(doc(db, 'fleet/pending-1'), {
      ...fleetRecord(),
      memberId: 'pending-1'
    }));
  });

  it('allows staff to remove a suspicious public photo', async () => {
    const db = testEnv.authenticatedContext('staff-1').firestore();
    const { deleteDoc, doc } = await import('firebase/firestore');
    await assertSucceeds(deleteDoc(doc(db, 'fleet/member-1')));
  });
});

describe('private member photo cache', () => {
  it('allows only a JPEG or an empty fleetPhoto value', async () => {
    const db = testEnv.authenticatedContext('member-1').firestore();
    const { updateDoc, doc } = await import('firebase/firestore');
    await assertSucceeds(updateDoc(doc(db, 'members/member-1'), {
      fleetPhoto: 'data:image/jpeg;base64,abc',
      updatedAt: '2026-11-25T00:01:00.000Z'
    }));
    await assertFails(updateDoc(doc(db, 'members/member-1'), {
      fleetPhoto: 'data:image/png;base64,abc',
      updatedAt: '2026-11-25T00:02:00.000Z'
    }));
  });
});
