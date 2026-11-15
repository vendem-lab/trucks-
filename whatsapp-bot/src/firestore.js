import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function parseServiceAccount(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;

  const json = text.startsWith('{')
    ? text
    : Buffer.from(text, 'base64').toString('utf8');

  const parsed = JSON.parse(json);
  if (typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }
  return parsed;
}

export function initFirestore(config, log) {
  if (getApps().length) return getFirestore();

  const credentials = parseServiceAccount(config.serviceAccount);
  if (credentials) {
    log?.info({ projectId: config.projectId }, 'Firestore: using service account from env');
  } else {
    log?.info({ projectId: config.projectId }, 'Firestore: using application default credentials');
  }

  initializeApp({
    projectId: config.projectId,
    credential: credentials ? cert(credentials) : applicationDefault()
  });

  const db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}
