import { config, missingConfig } from './config.js';
import { log } from './logger.js';
import { initFirestore } from './firestore.js';
import { createDataStore } from './data.js';
import { createAi } from './ai.js';
import { createCommands } from './commands.js';
import { createHandler } from './handler.js';
import { createRateLimiter } from './rateLimit.js';
import { createTelegram, splitMessage } from './telegram.js';
import { createServer, listen } from './server.js';

const state = { connected: false, bot: null, startedAt: Date.now() };

const BOT_COMMANDS = [
  { command: 'start', description: 'Start the assistant' },
  { command: 'link', description: 'Link your member record' },
  { command: 'unlink', description: 'Remove the link' },
  { command: 'help', description: 'How to use the bot' },
  { command: 'id', description: 'Show your Telegram id' }
];

async function main() {
  const missing = missingConfig();
  if (missing.length) {
    log.error(`Missing required environment variables: ${missing.join(', ')}`);
    log.error('Copy .env.example to .env and fill it in.');
    process.exitCode = 1;
    return;
  }

  const db = initFirestore(config, log);
  const data = createDataStore(db, log);
  const ai = createAi(config, log);
  const limiter = createRateLimiter({
    max: config.rateLimitMax,
    windowMs: config.rateLimitWindowMs
  });
  const telegram = createTelegram({ token: config.telegramToken, log });

  const bot = await telegram.getMe();
  state.connected = true;
  state.bot = bot;
  log.info(`Connected to Telegram as @${bot.username}`);

  await telegram
    .setMyCommands(BOT_COMMANDS)
    .catch((error) => log.warn('Could not register the command menu', error.message));

  async function sendTo(chatId, text, markup) {
    const chunks = splitMessage(text);
    for (let index = 0; index < chunks.length; index += 1) {
      await telegram.sendMessage(chatId, chunks[index], {
        markup: index === chunks.length - 1 ? markup : undefined
      });
    }
  }

  const commands = createCommands({ data, config, log, sendTo });
  const handle = createHandler({ data, ai, commands, config, log, limiter });

  let running = true;
  let offset = 0;

  async function handleUpdate(update) {
    const message = update.message;
    if (!message?.chat || message.chat.type !== 'private') return;

    const chatId = message.chat.id;
    const userId = message.from?.id;
    if (!userId) return;

    const text = message.text || '';
    const contact = message.contact || null;

    log.info('Incoming message', {
      userId,
      kind: contact ? 'contact' : 'text',
      length: text.length
    });

    await telegram.sendChatAction(chatId, 'typing');

    let result;
    try {
      result = await handle({ chatId, userId, text, contact });
    } catch (error) {
      log.error('Failed to handle message', error);
      result = { text: 'Something went wrong on my side. Please try again, or call the union office.' };
    }

    if (result?.text) await sendTo(chatId, result.text, result.markup);
  }

  async function poll() {
    while (running) {
      try {
        const updates = await telegram.getUpdates({
          offset,
          timeoutSeconds: config.pollTimeoutSeconds
        });

        for (const update of updates) {
          offset = Math.max(offset, update.update_id + 1);
          try {
            await handleUpdate(update);
          } catch (error) {
            log.error('Could not process an update', error);
          }
        }
      } catch (error) {
        if (!running) break;
        // A timed-out long poll is usually a keep-alive socket the network
        // dropped. Retrying immediately opens a fresh one, so the bot is only
        // a few seconds late instead of a whole poll behind.
        const timedOut = error?.name === 'TimeoutError';
        const waitMs = timedOut ? 0 : error.retryAfter ? error.retryAfter * 1000 : 3000;
        if (timedOut) {
          log.debug('Long poll timed out, retrying on a fresh connection');
        } else {
          log.warn(`Polling failed, retrying in ${Math.round(waitMs / 1000)}s`, error.message);
        }
        if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }

  const server = createServer({ config, state });
  await listen(server, config.port, log).catch((error) => {
    log.warn(`Health server could not start on port ${config.port}`, error.message);
  });

  const shutdown = (signal) => {
    log.info(`Shutting down (${signal})`);
    running = false;
    server.close();
    setTimeout(() => process.exit(0), 500).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (error) => log.error('Unhandled rejection', error));

  await poll();
}

main().catch((error) => {
  log.error('Bot failed to start', error);
  process.exit(1);
});
