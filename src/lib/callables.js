import { httpsCallable } from 'firebase/functions';
import { firebaseFunctions } from './firebase.js';

async function call(name, data) {
  const result = await httpsCallable(firebaseFunctions, name)(data);
  return result.data;
}

export const updateOwnMemberProfile = (profile) => call('updateOwnMemberProfile', profile);
export const claimOpenLoad = (loadId) => call('claimOpenLoad', { loadId });
export const registerForEventSecurely = (eventId, contact) => call('registerForEvent', { eventId, ...contact });
export const setMemberStatusSecurely = (memberId, status) => call('setMemberStatus', { memberId, status });
export const approveMemberApplicationSecurely = (applicationId) => call('approveMemberApplication', { applicationId });
