import dotenv from 'dotenv';

dotenv.config({ quiet: true });

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function phoneList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.replace(/\D/g, ''))
    .filter(Boolean);
}

function idList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const config = {
  telegramToken: String(process.env.TELEGRAM_BOT_TOKEN || '').trim(),
  groqApiKey: String(process.env.GROQ_API_KEY || '').trim(),
  groqModel: String(process.env.GROQ_MODEL || 'openai/gpt-oss-120b').trim(),
  groqUrl: 'https://api.groq.com/openai/v1/chat/completions',
  projectId: String(process.env.FIREBASE_PROJECT_ID || 'hualway').trim(),
  serviceAccount: String(process.env.FIREBASE_SERVICE_ACCOUNT || '').trim(),
  port: positiveInt(process.env.PORT, 8080),
  logLevel: String(process.env.LOG_LEVEL || 'info').trim(),
  rateLimitMax: positiveInt(process.env.RATE_LIMIT_MAX, 12),
  rateLimitWindowMs: positiveInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) * 60_000,
  timezone: String(process.env.BOT_TIMEZONE || 'Africa/Accra').trim(),
  staffIds: idList(process.env.BOT_STAFF_IDS),
  staffNumbers: phoneList(process.env.BOT_STAFF_NUMBERS),
  broadcastMax: positiveInt(process.env.BOT_BROADCAST_MAX, 20),
  broadcastDelayMs: positiveInt(process.env.BOT_BROADCAST_DELAY_MS, 1500),
  pollTimeoutSeconds: positiveInt(process.env.BOT_POLL_TIMEOUT_SECONDS, 30)
};

export function missingConfig() {
  const missing = [];
  if (!config.telegramToken) missing.push('TELEGRAM_BOT_TOKEN');
  if (!config.groqApiKey) missing.push('GROQ_API_KEY');
  if (!config.projectId) missing.push('FIREBASE_PROJECT_ID');
  return missing;
}
