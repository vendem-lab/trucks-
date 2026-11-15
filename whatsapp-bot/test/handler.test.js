import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../src/handler.js';
import { createRateLimiter } from '../src/rateLimit.js';
import { createCommands } from '../src/commands.js';

const config = {
  groqApiKey: 'test-key',
  groqModel: 'llama-3.3-70b-versatile',
  sessionId: 'haulway',
  broadcastMax: 20,
  broadcastDelayMs: 0,
  rateLimitMax: 2,
  rateLimitWindowMs: 600_000
};

const member = {
  id: 'mem-1',
  name: 'Kwamena',
  memberNumber: 'HU-ADZ1RGTC',
  phone: '0557704299',
  status: 'active',
  tier: 'independent'
};

function fakeData() {
  return {
    settings: async () => ({ unionName: "Haulway Drivers' Union", memberLine: '+233 55 770 4299' }),
    findMemberByPhone: async (phone) => (phone === '233557704299' ? member : null),
    duesFor: async () => [
      { id: 'due-1', memberId: 'mem-1', period: '2026-10', amount: 120, status: 'due', dueDate: '2026-10-28' }
    ],
    openLoads: async () => [],
    listMembers: async () => [member],
    activeMembers: async () => [member],
    staffNumbers: async () => []
  };
}

function build({ ai, data = fakeData(), limit = 2 } = {}) {
  const limiter = createRateLimiter({ max: limit, windowMs: config.rateLimitWindowMs });
  const commands = createCommands({ data, config, sendTo: async () => {} });
  const handler = createHandler({ data, ai, commands, config, log: null, limiter });
  return { handler, limiter };
}

describe('createHandler', () => {
  it('sends member context to the model', async () => {
    const calls = [];
    const { handler } = build({
      ai: {
        chat: async (messages) => {
          calls.push(messages);
          return 'You owe GHS 120.';
        }
      }
    });

    const reply = await handler({ phone: '233557704299', text: 'How much do I owe?' });
    assert.equal(reply, 'You owe GHS 120.');
    assert.equal(calls.length, 1);

    const system = calls[0][0].content;
    assert.match(system, /MEMBER DATA/);
    assert.match(system, /Kwamena/);
    assert.match(system, /GHS 120/);
  });

  it('withholds member data from unknown numbers', async () => {
    const calls = [];
    const { handler } = build({
      ai: {
        chat: async (messages) => {
          calls.push(messages);
          return 'Please call the office.';
        }
      }
    });

    await handler({ phone: '233200000000', text: 'What is my balance?' });
    const system = calls[0][0].content;
    assert.match(system, /not a registered member/);
    assert.doesNotMatch(system, /MEMBER DATA \(this is the person/);
  });

  it('remembers recent turns', async () => {
    const calls = [];
    const { handler } = build({
      ai: {
        chat: async (messages) => {
          calls.push(messages);
          return 'Noted.';
        }
      }
    });

    await handler({ phone: '233557704299', text: 'Hello' });
    await handler({ phone: '233557704299', text: 'And my dues?' });

    assert.equal(calls[1].length, 4);
    assert.equal(calls[1][1].content, 'Hello');
  });

  it('rate limits members but not staff', async () => {
    const { handler } = build({ ai: { chat: async () => 'ok' } });

    assert.equal(await handler({ phone: '233557704299', text: 'one' }), 'ok');
    assert.equal(await handler({ phone: '233557704299', text: 'two' }), 'ok');
    assert.match(await handler({ phone: '233557704299', text: 'three' }), /sending messages quickly/i);

    assert.equal(await handler({ phone: '233557704299', text: 'four', isStaff: true }), 'ok');
  });

  it('falls back to the office number when the model fails', async () => {
    const { handler } = build({
      ai: {
        chat: async () => {
          throw new Error('groq down');
        }
      }
    });

    const reply = await handler({ phone: '233557704299', text: 'Hello' });
    assert.match(reply, /\+233 55 770 4299/);
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

    const reply = await handler({ phone: '233200000001', text: '!status', isStaff: true });
    assert.match(reply, /Bot is online/);
    assert.equal(called, false);
  });
});
