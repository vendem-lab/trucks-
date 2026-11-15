import {
  assistantFacts,
  buildAssistantPrompt,
  buildPublicAssistantPrompt
} from '../src/lib/assistantPrompt.js';
import {
  HttpError,
  bearerToken,
  fieldFilter,
  getDocument,
  projectIdFrom,
  runQuery,
  verifyFirebaseToken
} from './firebaseRest.js';

/**
 * Member-portal assistant. The browser sends the conversation, this endpoint
 * adds the signed-in member's own record, and Groq writes the reply. Nothing is
 * stored server-side, so it runs unchanged on Vercel and Netlify.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const MAX_TURNS = 8;
const MAX_TURN_CHARS = 600;
const MAX_TOTAL_CHARS = 4000;
const MAX_REQUESTS = 10;
const PUBLIC_MAX_REQUESTS = 6;
const WINDOW_MS = 60_000;

const hits = new Map();

function allowRequest(key, limit, now = Date.now()) {
  const recent = (hits.get(key) || []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/** Visitors are rate limited by address; members by Firebase uid. */
function clientIp(headers = {}) {
  const forwarded = headers['x-forwarded-for'] || headers['X-Forwarded-For'];
  const first = String(forwarded || '').split(',')[0].trim();
  return (
    first ||
    headers['x-nf-client-connection-ip'] ||
    headers['x-real-ip'] ||
    headers['X-Real-IP'] ||
    'unknown'
  );
}

function modelFrom(env) {
  return String(env.GROQ_MODEL || DEFAULT_MODEL).trim();
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'object') return body;
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, 'The request body must be valid JSON.');
  }
}

function sanitiseMessages(raw) {
  if (!Array.isArray(raw) || !raw.length) {
    throw new HttpError(400, 'Send a message to the assistant.');
  }

  const messages = [];
  let total = 0;

  for (const entry of raw.slice(-MAX_TURNS)) {
    if (!entry || typeof entry !== 'object') continue;
    const role = entry.role === 'assistant' ? 'assistant' : entry.role === 'user' ? 'user' : '';
    const content = String(entry.content || '').trim().slice(0, MAX_TURN_CHARS);
    if (!role || !content) continue;
    total += content.length;
    messages.push({ role, content });
  }

  if (!messages.length) throw new HttpError(400, 'Send a message to the assistant.');
  if (messages[messages.length - 1].role !== 'user') {
    throw new HttpError(400, 'The last message must come from the person asking.');
  }
  if (total > MAX_TOTAL_CHARS) {
    throw new HttpError(413, 'That conversation is too long. Start a new chat.');
  }

  return messages;
}

async function loadContext({ projectId, token, uid }) {
  const profile = await getDocument({ projectId, token, collectionId: 'users', id: uid }).catch(
    () => null
  );
  const memberId = profile?.memberId || uid;

  const member = await getDocument({
    projectId,
    token,
    collectionId: 'members',
    id: memberId
  }).catch(() => null);

  const dues = member
    ? await runQuery({
        projectId,
        token,
        collectionId: 'dues',
        filters: [fieldFilter('memberId', 'EQUAL', memberId)],
        limit: 200
      }).catch(() => [])
    : [];

  const loads = await runQuery({
    projectId,
    token,
    collectionId: 'loads',
    filters: [fieldFilter('status', 'EQUAL', 'open')],
    limit: 25
  }).catch(() => []);

  const settings =
    (await getDocument({ projectId, token, collectionId: 'settings', id: 'union' }).catch(
      () => null
    )) || {};

  const sortedLoads = [...loads]
    .sort((a, b) => String(b.postedAt || '').localeCompare(String(a.postedAt || '')))
    .slice(0, 5);

  return { profile, member, dues, loads: sortedLoads, settings };
}

async function callGroq({ env, model, messages }) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 350
    }),
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`Groq returned ${response.status}: ${detail.slice(0, 200)}`);
    error.status = 502;
    throw error;
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply || typeof reply !== 'string') {
    const error = new Error('Groq returned an empty reply.');
    error.status = 502;
    throw error;
  }
  return reply.trim();
}

async function publicReply({ env, model, conversation }) {
  const facts = assistantFacts({});
  const system = buildPublicAssistantPrompt({ facts });

  try {
    const reply = await callGroq({
      env,
      model,
      messages: [{ role: 'system', content: system }, ...conversation]
    });
    return { status: 200, body: { reply, model, mode: 'public' } };
  } catch (error) {
    console.error('Assistant reply failed.', error);
    throw new HttpError(
      502,
      facts.phone
        ? `The assistant is unavailable right now. Please call the union office on ${facts.phone}.`
        : 'The assistant is unavailable right now. Please try again shortly.'
    );
  }
}

export async function handleAssistantRequest({ method = 'GET', headers = {}, body, env = {} }) {
  try {
    const projectId = projectIdFrom(env);
    const token = bearerToken(headers);
    // A bad or expired token must fail loudly rather than quietly downgrade the
    // caller to the public assistant.
    const auth = token ? await verifyFirebaseToken(token, projectId) : null;
    const model = modelFrom(env);
    const verb = String(method).toUpperCase();

    if (verb === 'GET') {
      return {
        status: 200,
        body: {
          configured: Boolean(env.GROQ_API_KEY),
          model,
          mode: auth ? 'member' : 'public'
        }
      };
    }

    if (verb !== 'POST') throw new HttpError(405, 'Use GET or POST for this endpoint.');
    if (!env.GROQ_API_KEY) {
      throw new HttpError(503, 'The union assistant is not switched on yet.');
    }

    const conversation = sanitiseMessages(parseBody(body).messages);

    if (!auth) {
      if (!allowRequest(`ip:${clientIp(headers)}`, PUBLIC_MAX_REQUESTS)) {
        throw new HttpError(429, 'You are sending messages quickly. Try again in a minute.');
      }
      return await publicReply({ env, model, conversation });
    }

    if (!allowRequest(`uid:${auth.sub}`, MAX_REQUESTS)) {
      throw new HttpError(429, 'You are sending messages quickly. Try again in a minute.');
    }

    const { profile, member, dues, loads, settings } = await loadContext({
      projectId,
      token,
      uid: auth.sub
    });

    const facts = assistantFacts(settings);
    const system =
      !member && profile?.role === 'staff'
        ? buildPublicAssistantPrompt({ facts })
        : buildAssistantPrompt({ facts, member, dues, loads });

    let reply;
    try {
      reply = await callGroq({ env, model, messages: [{ role: 'system', content: system }, ...conversation] });
    } catch (error) {
      console.error('Assistant reply failed.', error);
      throw new HttpError(
        502,
        facts.phone
          ? `The assistant is unavailable right now. Please call the union office on ${facts.phone}.`
          : 'The assistant is unavailable right now. Please try again shortly.'
      );
    }

    return { status: 200, body: { reply, model, mode: 'member' } };
  } catch (error) {
    const status =
      error.status && error.status >= 400 && error.status < 600 ? error.status : 500;
    if (status === 500) console.error('Assistant request failed.', error);
    return {
      status,
      body: { error: error.message || 'The assistant request failed.' }
    };
  }
}
