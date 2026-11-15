import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COMMAND_HELP, createCommands, isStaffCommand, parseCommand } from '../src/commands.js';
import { normalizePhone } from '../src/phone.js';

const config = {
  groqModel: 'openai/gpt-oss-120b',
  broadcastMax: 20,
  broadcastDelayMs: 0,
  rateLimitMax: 12,
  rateLimitWindowMs: 600_000
};

const members = [
  {
    id: 'mem-1',
    name: 'Kwamena',
    memberNumber: 'HU-ADZ1RGTC',
    phone: '0557704299',
    status: 'active',
    tier: 'independent',
    vehicleType: 'Tanker',
    region: 'Greater Accra'
  }
];

const invoices = [
  { id: 'due-1', memberId: 'mem-1', period: '2026-10', amount: 120, status: 'due', dueDate: '2026-10-28' }
];

function fakeData(overrides = {}) {
  return {
    findMemberByPhone: async (phone) =>
      members.find((member) => normalizePhone(member.phone) === normalizePhone(phone)) || null,
    duesFor: async (id) => invoices.filter((invoice) => invoice.memberId === id),
    listMembers: async () => members,
    linkedActiveMembers: async () =>
      members.map((member) => ({ chatId: `chat-${member.id}`, memberId: member.id, name: member.name })),
    openLoads: async () => [],
    ...overrides
  };
}

describe('isStaffCommand', () => {
  it('detects the slash prefix and ignores other text', () => {
    assert.equal(isStaffCommand('/dues'), true);
    assert.equal(isStaffCommand('/who 0557704299'), true);
    assert.equal(isStaffCommand('/dues@HaulwayBot'), true);
    assert.equal(isStaffCommand('!dues'), false);
    assert.equal(isStaffCommand('hello'), false);
    assert.equal(isStaffCommand('/start'), false);
  });
});

describe('parseCommand', () => {
  it('reads the command name and argument', () => {
    assert.deepEqual(parseCommand('/who 0557704299'), { name: 'who', argument: '0557704299' });
    assert.deepEqual(parseCommand('/dues@HaulwayBot'), { name: 'dues', argument: '' });
    assert.equal(parseCommand('hello'), null);
  });
});

describe('staff commands', () => {
  const chatId = '900';

  it('refuses commands from non-staff', async () => {
    const commands = createCommands({ data: fakeData(), config, sendTo: async () => {} });
    const result = await commands.run({ chatId, text: '/help', staff: false });
    assert.match(result.reply, /staff only/i);
  });

  it('returns help for staff', async () => {
    const commands = createCommands({ data: fakeData(), config, sendTo: async () => {} });
    const result = await commands.run({ chatId, text: '/help', staff: true });
    assert.ok(result.reply.includes(COMMAND_HELP));
  });

  it('looks up a member by phone', async () => {
    const commands = createCommands({ data: fakeData(), config, sendTo: async () => {} });
    const result = await commands.run({ chatId, text: '/who 0557704299', staff: true });
    assert.match(result.reply, /Kwamena/);
    assert.match(result.reply, /GH₵120/);
    assert.match(result.reply, /HU-ADZ1RGTC/);
  });

  it('reports an unknown member', async () => {
    const commands = createCommands({ data: fakeData(), config, sendTo: async () => {} });
    const result = await commands.run({ chatId, text: '/who 0200000000', staff: true });
    assert.match(result.reply, /No member found/);
  });

  it('totals outstanding dues', async () => {
    const commands = createCommands({ data: fakeData(), config, sendTo: async () => {} });
    const result = await commands.run({ chatId, text: '/dues', staff: true });
    assert.match(result.reply, /1 member\(s\) owe GH₵120/);
  });

  it('previews a broadcast and only sends after confirmation', async () => {
    const sent = [];
    const commands = createCommands({
      data: fakeData(),
      config,
      sendTo: async (id, text) => sent.push({ id, text })
    });

    const preview = await commands.run({ chatId, text: '/broadcast Dues are due Friday', staff: true });
    assert.match(preview.reply, /Ready to send to 1 member/);
    assert.equal(sent.length, 0);

    const confirmed = await commands.run({ chatId, text: '/confirm', staff: true });
    assert.match(confirmed.reply, /Sent 1, failed 0/);
    assert.deepEqual(sent, [{ id: 'chat-mem-1', text: 'Dues are due Friday' }]);
  });

  it('cancels a pending broadcast', async () => {
    const sent = [];
    const commands = createCommands({
      data: fakeData(),
      config,
      sendTo: async (id, text) => sent.push({ id, text })
    });

    await commands.run({ chatId, text: '/broadcast hello', staff: true });
    const cancelled = await commands.run({ chatId, text: '/cancel', staff: true });
    assert.match(cancelled.reply, /cancelled/i);

    const confirmed = await commands.run({ chatId, text: '/confirm', staff: true });
    assert.match(confirmed.reply, /Nothing to confirm/);
    assert.equal(sent.length, 0);
  });

  it('caps the broadcast audience', async () => {
    const many = Array.from({ length: 30 }, (_, index) => ({
      chatId: `chat-${index}`,
      memberId: `mem-${index}`,
      name: `Member ${index}`
    }));

    const commands = createCommands({
      data: fakeData({ linkedActiveMembers: async () => many }),
      config: { ...config, broadcastMax: 5 },
      sendTo: async () => {}
    });

    const result = await commands.run({ chatId, text: '/broadcast test', staff: true });
    assert.match(result.reply, /Ready to send to 5 member/);
    assert.match(result.reply, /capped from 30/);
  });
});
