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
export const createJobAlertSecurely = (alert) => call('createJobAlert', alert);
export const updateJobAlertSecurely = (alertId, patch) => call('updateJobAlert', { alertId, patch });
export const deleteJobAlertSecurely = (alertId) => call('deleteJobAlert', { alertId });
export const payDuesSecurely = (duesId, method) => call('payDues', { duesId, method });
export const deleteEventSecurely = (eventId) => call('deleteEvent', { eventId });
export const deleteEventRegistrationSecurely = (registrationId) => call('deleteEventRegistration', { registrationId });
