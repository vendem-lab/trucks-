import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../src/handler.js';
import { createRateLimiter } from '../src/rateLimit.js';
import { createCommands } from '../src/commands.js';
import { normalizePhone } from '../src/phone.js';

const config = {
  groqApiKey: 'test-key',
  groqModel: 'openai/gpt-oss-120b',
  broadcastMax: 20,
  broadcastDelayMs: 0,
  rateLimitMax: 2,
  rateLimitWindowMs: 600_000,
  staffIds: ['999'],
  staffNumbers: []
};

const member = {
  id: 'mem-1',
  name: 'Kwamena Mensah',
  memberNumber: 'HU-ADZ1RGTC',
  phone: '0557704299',
  status: 'active',
  tier: 'independent'
};

const invoice = {
  id: 'due-1',
  memberId: 'mem-1',
  period: '2026-10',
  amount: 120,
  status: 'due',
  dueDate: '2026-10-28'
};

function fakeData(overrides = {}) {
  const links = new Map();

  return Object.assign(
    {
      links,
      getLink: async (chatId) => links.get(String(chatId)) || null,
      setLink: async (chatId, link) => links.set(String(chatId), { chatId: String(chatId), ...link }),
      removeLink: async (chatId) => links.delete(String(chatId)),
      memberById: async (id) => (id === member.id ? member : null),
      findMemberByPhone: async (phone) =>
        normalizePhone(phone) === normalizePhone(member.phone) ? member : null,
      duesFor: async () => [invoice],
      openLoads: async () => [],
      settings: async () => ({ unionName: "Haulway Drivers' Union", memberLine: '+233 55 770 4299' }),
      staffNumbers: async () => [],
      listMembers: async () => [member],
      linkedActiveMembers: async () => []
    },
    overrides
  );
}

function build({ ai, data = fakeData(), limit = 2 } = {}) {
  const limiter = createRateLimiter({ max: limit, windowMs: config.rateLimitWindowMs });
  const commands = createCommands({ data, config, sendTo: async () => {} });
  const handler = createHandler({ data, ai, commands, config, log: null, limiter });
  return { handler, data };
}

const contact = { phone_number: '+233 55 770 4299', user_id: 10 };

describe('createHandler', () => {
  it('asks unlinked senders to share their number', async () => {
    const { handler } = build({ ai: { chat: async () => 'unused' } });
    const result = await handler({ chatId: '10', userId: 10, text: '/start' });

    assert.match(result.text, /Send \/link/);
    assert.ok(result.markup?.keyboard?.[0]?.[0]?.request_contact);
  });

  it('links a member who shares their own number', async () => {
    const { handler, data } = build({ ai: { chat: async () => 'unused' } });
    const result = await handler({ chatId: '10', userId: 10, contact });

    assert.match(result.text, /Thanks Kwamena/);
    assert.equal(data.links.get('10').memberId, 'mem-1');
    assert.equal(data.links.get('10').phone, '233557704299');
  });

  it('refuses a contact card that belongs to someone else', async () => {
    const { handler, data } = build({ ai: { chat: async () => 'unused' } });
    const result = await handler({
      chatId: '10',
      userId: 10,
      contact: { ...contact, user_id: 11 }
    });

    assert.match(result.text, /your own number/i);
    assert.equal(data.links.size, 0);
  });

  it('refuses a contact card with no Telegram owner', async () => {
    const { handler, data } = build({ ai: { chat: async () => 'unused' } });
    const result = await handler({
      chatId: '10',
      userId: 10,
      contact: { phone_number: '+233 55 770 4299' }
    });

    assert.match(result.text, /your own number/i);
    assert.equal(data.links.size, 0);
  });

  it('explains when the shared number is not on the register', async () => {
    const { handler, data } = build({ ai: { chat: async () => 'unused' } });
    const result = await handler({
      chatId: '10',
      userId: 10,
      contact: { phone_number: '+233 20 000 0000', user_id: 10 }
    });

    assert.match(result.text, /could not find a member record/);
    assert.equal(data.links.size, 0);
  });

  it('sends the linked member context to the model', async () => {
    const calls = [];
    const { handler, data } = build({
      ai: {
        chat: async (messages) => {
          calls.push(messages);
          return 'You owe GH₵120.';
        }
      }
    });

    data.links.set('10', { chatId: '10', memberId: 'mem-1', phone: '233557704299' });
    const result = await handler({ chatId: '10', userId: 10, text: 'How much do I owe?' });

    assert.equal(result.text, 'You owe GH₵120.');
    const system = calls[0][0].content;
    assert.match(system, /MEMBER DATA/);
    assert.match(system, /Kwamena/);
    assert.match(system, /GH₵120/);
  });

  it('withholds member data from unlinked senders', async () => {
    const calls = [];
    const { handler } = build({
      ai: {
        chat: async (messages) => {
          calls.push(messages);
          return 'Please call the office.';
        }
      }
    });

    await handler({ chatId: '20', userId: 20, text: 'What is my balance?' });
    const system = calls[0][0].content;
    assert.match(system, /has not linked a member record/);
    assert.doesNotMatch(system, /MEMBER DATA \(this is the person/);
  });

  it('remembers recent turns', async () => {
    const calls = [];
    const { handler, data } = build({
      ai: {
        chat: async (messages) => {
          calls.push(messages);
          return 'Noted.';
        }
      }
    });

    data.links.set('10', { chatId: '10', memberId: 'mem-1', phone: '233557704299' });
    await handler({ chatId: '10', userId: 10, text: 'Hello' });
    await handler({ chatId: '10', userId: 10, text: 'And my dues?' });

    assert.equal(calls[1].length, 4);
    assert.equal(calls[1][1].content, 'Hello');
  });

  it('rate limits members but not staff', async () => {
    const { handler, data } = build({ ai: { chat: async () => 'ok' } });
    data.links.set('10', { chatId: '10', memberId: 'mem-1', phone: '233557704299' });

    assert.equal((await handler({ chatId: '10', userId: 10, text: 'one' })).text, 'ok');
    assert.equal((await handler({ chatId: '10', userId: 10, text: 'two' })).text, 'ok');
    assert.match((await handler({ chatId: '10', userId: 10, text: 'three' })).text, /sending messages quickly/i);

    assert.equal((await handler({ chatId: '999', userId: 999, text: 'four' })).text, 'ok');
  });

  it('falls back to the office number when the model fails', async () => {
    const { handler, data } = build({
      ai: {
        chat: async () => {
          throw new Error('groq down');
        }
      }
    });

    data.links.set('10', { chatId: '10', memberId: 'mem-1', phone: '233557704299' });
    const result = await handler({ chatId: '10', userId: 10, text: 'Hello' });
    assert.match(result.text, /\+233 55 770 4299/);
  });

  it('runs staff commands without calling the model', async () => {
    let called = false;
    const { handler } = build({
      ai: {
        chat: async () => {
          called = true;
          return 'should not happen';
        }
      }
    });

    const result = await handler({ chatId: '999', userId: 999, text: '/status' });
    assert.match(result.text, /Bot is online/);
    assert.equal(called, false);
  });

  it('unlinks a chat', async () => {
    const { handler, data } = build({ ai: { chat: async () => 'unused' } });
    data.links.set('10', { chatId: '10', memberId: 'mem-1', phone: '233557704299' });

    const result = await handler({ chatId: '10', userId: 10, text: '/unlink' });
    assert.match(result.text, /Unlinked/);
    assert.equal(data.links.size, 0);
  });

  it('reports the Telegram id', async () => {
    const { handler } = build({ ai: { chat: async () => 'unused' } });
    const result = await handler({ chatId: '10', userId: 10, text: '/id' });
    assert.match(result.text, /Telegram id is 10/);
  });
});
