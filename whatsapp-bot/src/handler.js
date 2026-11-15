import { buildSystemPrompt } from './ai.js';
import { unionFacts } from './knowledge.js';
import { isStaffCommand } from './commands.js';
import { outstandingDues } from './data.js';

const HISTORY_LIMIT = 8;
const HISTORY_TTL_MS = 30 * 60_000;

export function createHandler({ data, ai, commands, config, log, limiter, now = () => Date.now() }) {
  const history = new Map();

  function historyFor(phone) {
    const entry = history.get(phone);
    if (!entry) return [];
    if (now() - entry.at > HISTORY_TTL_MS) {
      history.delete(phone);
      return [];
    }
    return entry.messages;
  }

  function remember(phone, userText, replyText) {
    const messages = historyFor(phone);
    messages.push({ role: 'user', content: userText });
    messages.push({ role: 'assistant', content: replyText });
    while (messages.length > HISTORY_LIMIT) messages.shift();
    history.set(phone, { at: now(), messages });
  }

  function fallbackReply(facts) {
    return facts.phone
      ? `I could not reach the assistant just now. Please call the union office on ${facts.phone}.`
      : 'I could not reach the assistant just now. Please try again in a few minutes.';
  }

  return async function handle({ phone, text, isStaff = false }) {
    const message = String(text || '').trim();
    if (!message) return null;

    if (isStaffCommand(message)) {
      const result = await commands.run({ phone, text: message, staff: isStaff });
      return result?.reply || null;
    }

    const settings = await data.settings();
    const facts = unionFacts(settings);

    if (!isStaff) {
      const verdict = limiter.check(phone);
      if (!verdict.allowed) {
        const minutes = Math.max(1, Math.ceil(verdict.retryInMs / 60_000));
        return `You are sending messages quickly. Please try again in about ${minutes} minute(s).`;
      }
    }

    if (!config.groqApiKey) {
      return fallbackReply(facts);
    }

    const member = await data.findMemberByPhone(phone);
    const dues = member ? outstandingDues(await data.duesFor(member.id)) : null;
    const loads = await data.openLoads(4);

    const system = buildSystemPrompt({ facts, member, dues, loads });
    const messages = [
      { role: 'system', content: system },
      ...historyFor(phone),
      { role: 'user', content: message }
    ];

    try {
      const reply = await ai.chat(messages);
      remember(phone, message, reply);
      return reply;
    } catch (error) {
      log?.error({ error, phone }, 'AI reply failed');
      return fallbackReply(facts);
    }
  };
}
