import { decodeProtectedHeader, importX509, jwtVerify } from 'jose';

/**
 * Shared server helpers for the Vercel and Netlify functions.
 *
 * Firebase ID tokens are verified with Google's public certificates, then all
 * Firestore reads and writes use the caller's own token so the security rules
 * in firestore.rules still apply. No service account is used here.
 */

const CERT_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let certCache = { certs: null, expiresAt: 0 };

async function getCertificates() {
  if (certCache.certs && Date.now() < certCache.expiresAt) return certCache.certs;
  const response = await fetch(CERT_URL);
  if (!response.ok) throw new HttpError(503, 'Could not load Firebase signing certificates.');
  const certs = await response.json();
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAge = Number(/max-age=(\d+)/.exec(cacheControl)?.[1] || 3600);
  certCache = { certs, expiresAt: Date.now() + maxAge * 1000 };
  return certs;
}

export function projectIdFrom(env) {
  return env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || 'hualway';
}

export function bearerToken(headers = {}) {
  const raw = headers.authorization || headers.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(raw));
  return match ? match[1].trim() : '';
}

export async function verifyFirebaseToken(token, projectId) {
  let header;
  try {
    header = decodeProtectedHeader(token);
  } catch {
    throw new HttpError(401, 'That sign-in token is not valid.');
  }
  if (!header.kid) throw new HttpError(401, 'The sign-in token is missing a key id.');
  const certs = await getCertificates();
  const pem = certs[header.kid];
  if (!pem) throw new HttpError(401, 'The sign-in token was signed with an unknown key.');
  const key = await importX509(pem, 'RS256');

  let payload;
  try {
    ({ payload } = await jwtVerify(token, key, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      clockTolerance: 5
    }));
  } catch {
    throw new HttpError(401, 'That sign-in token is not valid or has expired.');
  }

  if (!payload.sub) throw new HttpError(401, 'The sign-in token has no subject.');
  return payload;
}

/* ------------------------------------------------------------------
   Firestore REST helpers (caller's token, so security rules apply)
------------------------------------------------------------------ */

function documentsUrl(projectId, path = '') {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents${path}`;
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === 'object') return { mapValue: { fields: toFirestoreFields(value) } };
  return { stringValue: String(value) };
}

function toFirestoreFields(record) {
  return Object.fromEntries(
    Object.entries(record)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, toFirestoreValue(value)])
  );
}

function fromFirestoreValue(value) {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in value) return fromFirestoreFields(value.mapValue.fields || {});
  return null;
}

function fromFirestoreFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)])
  );
}

export function fromFirestoreDoc(document) {
  if (!document?.fields) return null;
  return { id: document.name.split('/').pop(), ...fromFirestoreFields(document.fields) };
}

async function firestoreFetch({ projectId, token, path, method = 'GET', body }) {
  const response = await fetch(documentsUrl(projectId, path), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000)
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  if (!response.ok) {
    const error = new HttpError(
      response.status,
      data?.error?.message || `Firestore returned ${response.status}`
    );
    error.details = data;
    throw error;
  }
  return data;
}

export async function getDocument({ projectId, token, collectionId, id }) {
  try {
    const data = await firestoreFetch({
      projectId,
      token,
      path: `/${collectionId}/${encodeURIComponent(id)}`
    });
    return fromFirestoreDoc(data);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

export function fieldFilter(fieldPath, op, value) {
  return {
    fieldFilter: {
      field: { fieldPath },
      op,
      value: toFirestoreValue(value)
    }
  };
}

export async function runQuery({ projectId, token, collectionId, filters = [], limit = 300 }) {
  const structuredQuery = {
    from: [{ collectionId }],
    limit
  };
  if (filters.length === 1) structuredQuery.where = filters[0];
  else if (filters.length > 1) {
    structuredQuery.where = { compositeFilter: { op: 'AND', filters } };
  }
  const rows = await firestoreFetch({
    projectId,
    token,
    path: ':runQuery',
    method: 'POST',
    body: { structuredQuery }
  });
  return (rows || []).map((row) => fromFirestoreDoc(row.document)).filter(Boolean);
}

export async function createDocument({ projectId, token, collectionId, record }) {
  const data = await firestoreFetch({
    projectId,
    token,
    path: `/${collectionId}`,
    method: 'POST',
    body: { fields: toFirestoreFields(record) }
  });
  return fromFirestoreDoc(data);
}
