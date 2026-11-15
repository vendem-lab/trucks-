import { BRAND } from '../config.js';
import { firebaseAuth } from './firebase.js';

/**
 * Browser client for /api/assistant. The Firebase ID token identifies the
 * member, so the server can attach their own record to the prompt.
 */

export const ASSISTANT_GREETING =
  'Hello. I can check your dues, membership status and open loads, or answer questions about the union.';

export const ASSISTANT_SUGGESTIONS = [
  'What do I owe right now?',
  'When are my dues due?',
  'Show me open loads',
  'How do I update my details?'
];

export const ASSISTANT_FALLBACK = `I could not reach the assistant. Please try again, or call the union office on ${BRAND.memberLine}.`;

async function authToken() {
  const user = firebaseAuth.currentUser;
  if (!user) {
    const error = new Error('Sign in again to use the union assistant.');
    error.code = 'not-signed-in';
    throw error;
  }
  return user.getIdToken();
}

function friendlyError(status, message) {
  if (status === 401 || status === 403) return 'Your session expired. Sign in again to use the assistant.';
  if (status === 429) return message || 'You are sending messages quickly. Try again in a minute.';
  if (status === 503) return 'The union assistant is not switched on yet. Call the office for help.';
  return message || ASSISTANT_FALLBACK;
}

export async function fetchAssistantConfig() {
  try {
    const token = await authToken();
    const response = await fetch('/api/assistant', {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return { configured: false };
    return await response.json();
  } catch (error) {
    return { configured: false };
  }
}

export async function askAssistant(messages) {
  const token = await authToken();

  let response;
  try {
    response = await fetch('/api/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ messages })
    });
  } catch (error) {
    throw new Error(ASSISTANT_FALLBACK);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(friendlyError(response.status, data.error));
  if (!data.reply) throw new Error(ASSISTANT_FALLBACK);
  return data.reply;
}
