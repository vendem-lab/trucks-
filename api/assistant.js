import { handleAssistantRequest } from '../server/assistant.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  const result = await handleAssistantRequest({
    method: req.method,
    headers: req.headers,
    body: req.body,
    env: process.env
  });
  res.statusCode = result.status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(result.body));
}
