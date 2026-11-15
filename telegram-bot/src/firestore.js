import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const BOT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * A relative GOOGLE_APPLICATION_CREDENTIALS is resolved against the bot folder,
 * so `npm start` works from the repo root as well as from telegram-bot/.
 */
function resolveCredentialsPath() {
  const value = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!value || path.isAbsolute(value)) return;
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(BOT_ROOT, value);
}

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

  resolveCredentialsPath();

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
