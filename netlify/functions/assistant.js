import { handleAssistantRequest } from '../../server/assistant.js';

export async function handler(event) {
  const result = await handleAssistantRequest({
    method: event.httpMethod,
    headers: event.headers,
    body: event.body,
    env: process.env
  });
  return {
    statusCode: result.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.body)
  };
}
