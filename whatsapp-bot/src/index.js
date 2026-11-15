import makeWASocket, { Browsers, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';

import { config, missingConfig } from './config.js';
import { baileysLogger, log } from './logger.js';
import { initFirestore } from './firestore.js';
import { useFirestoreAuthState } from './session.js';
import { createDataStore } from './data.js';
import { createAi } from './ai.js';
import { createCommands } from './commands.js';
import { createHandler } from './handler.js';
import { createRateLimiter } from './rateLimit.js';
import { jidToPhone, normalizePhone } from './phone.js';
import { createServer, listen } from './server.js';

const state = { connected: false, socket: null };

function extractText(message) {
  if (!message) return '';
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    ''
  ).trim();
}

function isDirectChat(jid) {
  if (!jid) return false;
  return (
    jid.endsWith('@s.whatsapp.net') &&
    !jid.endsWith('@g.us') &&
    jid !== 'status@broadcast'
  );
}

async function main() {
  const missing = missingConfig();
  if (missing.length) {
    log.error({ missing }, 'Missing required environment variables. Copy .env.example to .env and fill them in.');
    process.exitCode = 1;
    return;
  }

  if (!config.pairingNumber) {
    log.warn('WHATSAPP_PAIRING_NUMBER is empty; a QR code will be printed instead of a pairing code.');
  }

  const db = initFirestore(config, log);
  const { state: authState, saveCreds, flushAll } = await useFirestoreAuthState(db, config.sessionId, log);

  const data = createDataStore(db, log);
  const ai = createAi(config, log);
  const limiter = createRateLimiter({ max: config.rateLimitMax, windowMs: config.rateLimitWindowMs });

  let staffCache = { at: 0, numbers: [] };
  async function staffNumbers() {
    if (Date.now() - staffCache.at < 5 * 60_000) return staffCache.numbers;
    const numbers = await data.staffNumbers();
    staffCache = { at: Date.now(), numbers };
    return numbers;
  }

  let socket = null;
  const sendTo = async (phone, text) => {
    const target = normalizePhone(phone);
    if (!target) throw new Error(`Invalid phone: ${phone}`);
    if (!socket) throw new Error('WhatsApp socket is not connected');
    await socket.sendMessage(`${target}@s.whatsapp.net`, { text });
  };

  const commands = createCommands({ data, config, log, sendTo });
  const handle = createHandler({ data, ai, commands, config, log, limiter });

  let attempts = 0;

  async function start() {
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

    socket = makeWASocket({
      auth: authState,
      version,
      logger: baileysLogger,
      browser: Browsers.ubuntu('Chrome'),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false
    });
    state.socket = socket;

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !config.pairingNumber) {
        log.info('Scan this QR code with WhatsApp > Linked devices');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'open') {
        attempts = 0;
        state.connected = true;
        log.info('WhatsApp connected');
      }

      if (connection === 'close') {
        state.connected = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        if (loggedOut) {
          log.error('WhatsApp session was logged out. Delete the Firestore session document and pair again.');
          return;
        }

        attempts += 1;
        const delay = Math.min(30_000, 2_000 * attempts);
        log.warn({ statusCode, delay }, 'WhatsApp disconnected, reconnecting');
        setTimeout(() => {
          start().catch((error) => log.error({ error }, 'Reconnect failed'));
        }, delay);
      }
    });

    socket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const incoming of messages) {
        try {
          await onMessage(incoming);
        } catch (error) {
          log.error({ error }, 'Failed to handle message');
        }
      }
    });

    if (!authState.creds.registered) {
      if (config.pairingNumber) {
        setTimeout(async () => {
          try {
            const code = await socket.requestPairingCode(config.pairingNumber);
            log.info({ code }, 'Pairing code generated. Enter it in WhatsApp > Linked devices > Link with phone number.');
          } catch (error) {
            log.error({ error }, 'Could not request a pairing code');
          }
        }, 3_000);
      }
    }

    async function onMessage(incoming) {
      if (!incoming.message || incoming.key.fromMe) return;
      const jid = incoming.key.remoteJid;
      if (!isDirectChat(jid)) return;

      const text = extractText(incoming.message);
      if (!text) return;

      const phone = jidToPhone(jid);
      if (!phone) return;

      const staff = config.staffNumbers.includes(phone) || (await staffNumbers()).includes(phone);
      const pushName = incoming.pushName || '';

      log.info({ phone, staff, length: text.length }, 'Incoming message');

      try {
        await socket.sendPresenceUpdate('composing', jid);
      } catch {
        // Presence is cosmetic; ignore failures.
      }

      const reply = await handle({ phone, text, isStaff: staff, name: pushName });

      if (reply) {
        await socket.sendMessage(jid, { text: reply }, { quoted: incoming });
      }

      try {
        await socket.sendPresenceUpdate('paused', jid);
      } catch {
        // Ignore.
      }
    }
  }

  const server = createServer({ config, state, log });
  await listen(server, config.port, log).catch((error) => {
    log.warn({ error, port: config.port }, 'Health server could not start; continuing without it');
  });

  await start();

  const shutdown = async (signal) => {
    log.info({ signal }, 'Shutting down');
    try {
      await flushAll();
    } catch (error) {
      log.error({ error }, 'Could not flush session');
    }
    try {
      socket?.end(undefined);
    } catch {
      // Ignore.
    }
    server.close();
    setTimeout(() => process.exit(0), 500).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (error) => log.error({ error }, 'Unhandled rejection'));
}

main().catch((error) => {
  log.error({ error }, 'Bot failed to start');
  process.exit(1);
});
