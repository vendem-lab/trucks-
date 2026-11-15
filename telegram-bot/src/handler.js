import { buildSystemPrompt } from './ai.js';
import { COMMAND_HELP, MEMBER_HELP, isStaffCommand } from './commands.js';
import { outstandingDues } from './data.js';
import { unionFacts } from './knowledge.js';
import { formatPhone, normalizePhone } from './phone.js';
import { contactKeyboard, removeKeyboard } from './telegram.js';

const HISTORY_LIMIT = 8;
const HISTORY_TTL_MS = 30 * 60_000;

export function createHandler({ data, ai, commands, config, log, limiter, now = () => Date.now() }) {
  const history = new Map();

  function historyFor(userId) {
    const entry = history.get(String(userId));
    if (!entry) return [];
    if (now() - entry.at > HISTORY_TTL_MS) {
      history.delete(String(userId));
      return [];
    }
    return entry.messages;
  }

  function remember(userId, userText, replyText) {
    const messages = historyFor(userId);
    messages.push({ role: 'user', content: userText });
    messages.push({ role: 'assistant', content: replyText });
    while (messages.length > HISTORY_LIMIT) messages.shift();
    history.set(String(userId), { at: now(), messages });
  }

  function fallbackReply(facts) {
    return facts.phone
      ? `I could not reach the assistant just now. Please call the union office on ${facts.phone}.`
      : 'I could not reach the assistant just now. Please try again in a few minutes.';
  }

  async function isStaff(userId, link) {
    if (config.staffIds.includes(String(userId))) return true;
    if (!link?.phone) return false;
    const phone = normalizePhone(link.phone);
    const numbers = [...config.staffNumbers, ...(await data.staffNumbers())];
    return numbers.includes(phone);
  }

  async function linkContact({ chatId, userId, contact }) {
    const owner = contact.user_id ? String(contact.user_id) : '';
    if (owner !== String(userId)) {
      return {
        text: 'Please share your own number using the button below.',
        markup: contactKeyboard()
      };
    }

    const phone = normalizePhone(contact.phone_number);
    if (!phone) {
      return { text: 'I could not read that number. Please try again.', markup: contactKeyboard() };
    }

    const member = await data.findMemberByPhone(phone);
    if (!member) {
      return {
        text: [
          `I could not find a member record for ${formatPhone(phone)}.`,
          'If you have applied recently, the office may still be processing it.',
          'Call the union office and we will check, or apply on the website.'
        ].join('\n'),
        markup: removeKeyboard()
      };
    }

    await data.setLink(chatId, { memberId: member.id, phone, name: member.name });
    const firstName = String(member.name || '').split(/\s+/)[0];
    return {
      text: [
        `Thanks ${firstName}. This chat is now linked to ${member.memberNumber || 'your member record'}.`,
        'Ask me about your dues, membership status or open loads.'
      ].join('\n'),
      markup: removeKeyboard()
    };
  }

  function startReply({ member, staff }) {
    const lines = member
      ? [`Hello ${String(member.name || '').split(/\s+/)[0]}. I can check your dues, membership status and open loads.`]
      : [
          "Hello. I am the Haulway Drivers' Union assistant.",
          'Send /link and share the number on your union record so I can check your dues and status. Until then I can answer general questions about the union.'
        ];
    if (staff) lines.push('You are recognised as staff. Send /help for staff commands.');
    return { text: lines.join('\n'), markup: member ? removeKeyboard() : contactKeyboard() };
  }

  return async function handle({ chatId, userId, text, contact }) {
    if (contact) return linkContact({ chatId, userId, contact });

    const message = String(text || '').trim();
    if (!message) return null;

    const link = await data.getLink(chatId);
    const member = link ? await data.memberById(link.memberId) : null;
    const staff = await isStaff(userId, link);

    if (/^\/start(@\w+)?$/i.test(message)) return startReply({ member, staff });

    if (/^\/link(@\w+)?$/i.test(message)) {
      return {
        text: member
          ? `This chat is already linked to ${member.memberNumber || 'your member record'}. Tap the button to link a different number, or send /unlink first.`
          : 'Tap the button below to share the phone number on your union record. Telegram only shares your own verified number.',
        markup: contactKeyboard()
      };
    }

    if (/^\/unlink(@\w+)?$/i.test(message)) {
      if (!link) return { text: 'This chat is not linked to a member record.' };
      await data.removeLink(chatId);
      history.delete(String(userId));
      return { text: 'Unlinked. Send /link whenever you want to reconnect.', markup: removeKeyboard() };
    }

    if (/^\/id(@\w+)?$/i.test(message)) {
      return { text: `Your Telegram id is ${userId}.` };
    }

    if (/^\/help(@\w+)?$/i.test(message)) {
      return { text: staff ? `${COMMAND_HELP}\n\n${MEMBER_HELP}` : MEMBER_HELP };
    }

    if (isStaffCommand(message)) {
      const result = await commands.run({ chatId, text: message, staff });
      return result?.reply ? { text: result.reply } : null;
    }

    const settings = await data.settings();
    const facts = unionFacts(settings);

    if (!staff) {
      const verdict = limiter.check(String(userId));
      if (!verdict.allowed) {
        const minutes = Math.max(1, Math.ceil(verdict.retryInMs / 60_000));
        return { text: `You are sending messages quickly. Please try again in about ${minutes} minute(s).` };
      }
    }

    if (!config.groqApiKey) return { text: fallbackReply(facts) };

    const dues = member ? outstandingDues(await data.duesFor(member.id)) : null;
    const loads = await data.openLoads(4);

    const system = buildSystemPrompt({ facts, member, dues, loads });
    const messages = [
      { role: 'system', content: system },
      ...historyFor(userId),
      { role: 'user', content: message }
    ];

    try {
      const reply = await ai.chat(messages);
      remember(userId, message, reply);
      return { text: reply };
    } catch (error) {
      log?.error('AI reply failed', error.message);
      return { text: fallbackReply(facts) };
    }
  };
}
