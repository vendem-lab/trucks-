import { formatCedis, formatDate, statusLabel, tierLabel, tierPriceList } from './knowledge.js';

export function buildSystemPrompt({ facts, member, dues, loads }) {
  const lines = [
    `You are the WhatsApp assistant for ${facts.name}, a truck drivers' union in Ghana.`,
    '',
    'How to reply:',
    '- Answer in the language the member used (English or Twi). Keep it to 2-4 short sentences, under 90 words.',
    '- Plain text only. No markdown, no asterisks, no bullet lists, no tables.',
    '- Use only the UNION FACTS and MEMBER DATA below. Never invent figures, dates, or policies.',
    '- Never promise payments, refunds, approvals, or legal outcomes. Never reveal another member\'s data.',
    '- If something needs an office decision, tell the member to call the office on the number below.',
    '',
    'UNION FACTS',
    `- Name: ${facts.name}`,
    `- Office phone: ${facts.phone || 'not set'}`,
    `- Email: ${facts.email}`,
    `- Office: ${facts.address}`,
    `- Hours: ${facts.hours}`,
    `- Dues grace period: ${facts.graceDays} days after the due date`,
    `- Membership tiers: ${tierPriceList()}`
  ];

  if (member) {
    lines.push(
      '',
      'MEMBER DATA (this is the person you are talking to, verified by their WhatsApp number)',
      `- Name: ${member.name || 'member'}`,
      `- Member number: ${member.memberNumber || 'not assigned'}`,
      `- Status: ${statusLabel(member.status)}`,
      `- Tier: ${tierLabel(member.tier)}`,
      `- Vehicle: ${member.vehicleType || 'not recorded'}`,
      `- Region: ${member.region || member.city || 'not recorded'}`
    );

    if (dues?.invoices?.length) {
      lines.push(`- Outstanding dues: ${formatCedis(dues.total)} across ${dues.invoices.length} invoice(s)`);
      for (const invoice of dues.invoices.slice(0, 4)) {
        lines.push(
          `  * ${invoice.period || 'period'} ${formatCedis(invoice.amount)} due ${formatDate(invoice.dueDate)} (${invoice.status})`
        );
      }
    } else {
      lines.push('- Outstanding dues: none recorded');
    }
  } else {
    lines.push(
      '',
      'The sender is not a registered member (their number is not in the member register).',
      'You may explain membership, dues, and how to join, but you cannot show any member account data.',
      'Invite them to join or to call the office.'
    );
  }

  if (loads?.length) {
    lines.push('', 'OPEN LOADS (share only if the member asks about work or loads)');
    for (const load of loads.slice(0, 4)) {
      lines.push(
        `- ${load.title || 'Load'} (${load.reference || 'ref n/a'}): ${load.origin} to ${load.destination}, ${load.trailerType || 'trailer n/a'}, ${formatCedis(load.rate)}, pickup ${formatDate(load.pickupDate)}`
      );
    }
  }

  return lines.join('\n');
}

export function createAi(config, log) {
  async function chat(messages, { temperature = 0.3, maxTokens = 400 } = {}) {
    const response = await fetch(config.groqUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.groqModel,
        messages,
        temperature,
        max_tokens: maxTokens
      }),
      signal: AbortSignal.timeout(20_000)
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Groq returned ${response.status}: ${detail.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') throw new Error('Groq returned an empty reply');
    log?.debug({ model: config.groqModel, usage: data.usage }, 'Groq reply');
    return text.trim();
  }

  return { chat };
}
