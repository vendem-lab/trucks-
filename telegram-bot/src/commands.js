import { formatCedis, formatDate, statusLabel, tierLabel } from './knowledge.js';
import { formatPhone, normalizePhone } from './phone.js';
import { outstandingDues } from './data.js';

export const COMMAND_HELP = [
  'Staff commands:',
  '/who <phone> - look up a member',
  '/dues [phone] - dues for one member, or the union total',
  '/loads - open loads',
  '/broadcast <message> - preview a message to linked members',
  '/confirm - send the previewed broadcast',
  '/cancel - discard the preview',
  '/status - bot health',
  '/help - this list'
].join('\n');

export const MEMBER_HELP = [
  'You can ask me things like:',
  '- How much do I owe?',
  '- When are my dues due?',
  '- Show me open loads',
  '- How do I update my details?',
  '',
  '/link - connect your member record',
  '/unlink - remove the connection',
  '/id - show your Telegram id'
].join('\n');

export function isStaffCommand(text) {
  return /^\/(who|dues|loads|broadcast|confirm|cancel|status)(@\w+)?(\s|$)/i.test(
    String(text || '').trim()
  );
}

export function parseCommand(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed.startsWith('/')) return null;
  const match = trimmed.match(/^\/([a-zA-Z]+)(?:@\w+)?\s*([\s\S]*)$/);
  if (!match) return null;
  return { name: match[1].toLowerCase(), argument: match[2].trim() };
}

function memberSummary(member, dues) {
  const outstanding = outstandingDues(dues);
  const lines = [
    `${member.name || 'Unnamed member'} (${member.memberNumber || 'no number'})`,
    `Status: ${statusLabel(member.status)} | Tier: ${tierLabel(member.tier)}`,
    `Phone: ${formatPhone(member.phone) || 'not recorded'}`,
    `Vehicle: ${member.vehicleType || 'not recorded'} | Region: ${member.region || member.city || 'not recorded'}`
  ];

  if (outstanding.invoices.length) {
    lines.push(`Outstanding: ${formatCedis(outstanding.total)} across ${outstanding.invoices.length} invoice(s)`);
    for (const invoice of outstanding.invoices.slice(0, 4)) {
      lines.push(
        `- ${invoice.period || 'period'} ${formatCedis(invoice.amount)} due ${formatDate(invoice.dueDate)} (${invoice.status})`
      );
    }
  } else {
    lines.push('Outstanding: none recorded');
  }

  return lines.join('\n');
}

/**
 * Staff-only commands. Kept separate from the AI path so operations are
 * deterministic and never depend on a model's judgement.
 */
export function createCommands({ data, config, log, sendTo, now = () => Date.now() }) {
  const pending = new Map();
  const CONFIRM_TTL_MS = 5 * 60_000;

  function prune() {
    const cutoff = now() - CONFIRM_TTL_MS;
    for (const [chatId, entry] of pending) {
      if (entry.at < cutoff) pending.delete(chatId);
    }
  }

  async function run({ chatId, text, staff }) {
    const parsed = parseCommand(text);
    if (!parsed) return null;

    if (!staff) {
      return { reply: 'That command is for union staff only.' };
    }

    const { name, argument } = parsed;
    prune();

    if (name === 'help') return { reply: `${COMMAND_HELP}\n\n${MEMBER_HELP}` };

    if (name === 'status') {
      const linked = await data.linkedActiveMembers();
      return {
        reply: [
          'Bot is online.',
          `Model: ${config.groqModel}`,
          `Linked members: ${linked.length}`,
          `Broadcast cap: ${config.broadcastMax} recipients`,
          `Rate limit: ${config.rateLimitMax} messages per ${Math.round(config.rateLimitWindowMs / 60_000)} min`
        ].join('\n')
      };
    }

    if (name === 'who') {
      const target = normalizePhone(argument);
      if (!target) return { reply: 'Usage: /who 0557704299' };
      const member = await data.findMemberByPhone(target);
      if (!member) return { reply: `No member found for ${formatPhone(target) || target}.` };
      const dues = await data.duesFor(member.id);
      return { reply: memberSummary(member, dues) };
    }

    if (name === 'dues') {
      if (argument) {
        const member = await data.findMemberByPhone(argument);
        if (!member) return { reply: `No member found for ${argument}.` };
        const dues = await data.duesFor(member.id);
        return { reply: memberSummary(member, dues) };
      }

      const members = await data.listMembers(true);
      let total = 0;
      let invoices = 0;
      let owing = 0;

      for (const member of members) {
        const dues = await data.duesFor(member.id);
        const outstanding = outstandingDues(dues);
        if (outstanding.invoices.length) {
          owing += 1;
          invoices += outstanding.invoices.length;
          total += outstanding.total;
        }
      }

      return {
        reply: `${owing} member(s) owe ${formatCedis(total)} across ${invoices} invoice(s).`
      };
    }

    if (name === 'loads') {
      const loads = await data.openLoads(5);
      if (!loads.length) return { reply: 'No open loads right now.' };
      return {
        reply: loads
          .map(
            (load) =>
              `${load.reference || 'Load'} - ${load.origin} to ${load.destination}, ${load.trailerType || 'n/a'}, ${formatCedis(load.rate)}, pickup ${formatDate(load.pickupDate)}`
          )
          .join('\n')
      };
    }

    if (name === 'broadcast') {
      if (!argument) return { reply: 'Usage: /broadcast <message>' };

      const recipients = await data.linkedActiveMembers();
      if (!recipients.length) {
        return { reply: 'No active members have linked Telegram yet. Ask them to send /link to the bot.' };
      }

      const capped = recipients.slice(0, config.broadcastMax);
      pending.set(chatId, { message: argument, recipients: capped, at: now() });

      return {
        reply: [
          `Ready to send to ${capped.length} member(s)${recipients.length > capped.length ? ` (capped from ${recipients.length})` : ''}:`,
          '',
          argument,
          '',
          'Reply /confirm within 5 minutes to send, or /cancel.'
        ].join('\n')
      };
    }

    if (name === 'confirm') {
      const entry = pending.get(chatId);
      if (!entry) return { reply: 'Nothing to confirm. Start with /broadcast <message>.' };
      pending.delete(chatId);

      let sent = 0;
      let failed = 0;

      for (const recipient of entry.recipients) {
        try {
          await sendTo(recipient.chatId, entry.message);
          sent += 1;
        } catch (error) {
          failed += 1;
          log?.error('Broadcast delivery failed', { error: error.message, memberId: recipient.memberId });
        }
        const pause = Number.isFinite(config.broadcastDelayMs) ? config.broadcastDelayMs : 1500;
        if (pause > 0) await new Promise((resolve) => setTimeout(resolve, pause));
      }

      return { reply: `Broadcast finished. Sent ${sent}, failed ${failed}.` };
    }

    if (name === 'cancel') {
      const existed = pending.delete(chatId);
      return { reply: existed ? 'Broadcast cancelled.' : 'Nothing pending.' };
    }

    return { reply: `Unknown command /${name}. Send /help.` };
  }

  return { run, pending };
}
