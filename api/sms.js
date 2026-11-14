import { handleSmsRequest } from '../server/sms.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const result = await handleSmsRequest({
    method: req.method,
    headers: req.headers,
    body: req.body,
    env: process.env
  });
  res.statusCode = result.status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(result.body));
}
