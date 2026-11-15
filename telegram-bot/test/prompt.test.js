import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt } from '../src/ai.js';
import { unionFacts } from '../src/knowledge.js';

const facts = unionFacts({
  unionName: "Haulway Drivers' Union",
  memberLine: '+233 24 900 1180',
  email: 'members@haulwayunion.org',
  duesGraceDays: 14
});

describe('buildSystemPrompt', () => {
  it('includes union facts and tier prices', () => {
    const prompt = buildSystemPrompt({ facts, member: null, dues: null, loads: [] });
    assert.match(prompt, /Haulway Drivers' Union/);
    assert.match(prompt, /\+233 24 900 1180/);
    assert.match(prompt, /Independent driver GH₵60 a month/);
    assert.match(prompt, /Fleet member GH₵450 a month/);
  });

  it('includes member balances for linked members', () => {
    const prompt = buildSystemPrompt({
      facts,
      member: {
        name: 'Kwamena',
        memberNumber: 'HU-ADZ1RGTC',
        status: 'active',
        tier: 'independent',
        vehicleType: 'Tanker',
        region: 'Greater Accra'
      },
      dues: {
        invoices: [{ period: '2026-10', amount: 120, dueDate: '2026-10-28', status: 'due' }],
        total: 120
      },
      loads: []
    });

    assert.match(prompt, /MEMBER DATA/);
    assert.match(prompt, /Kwamena/);
    assert.match(prompt, /Outstanding dues: GH₵120 across 1 invoice/);
    assert.match(prompt, /2026-10 GH₵120/);
  });

  it('says when a member has no outstanding dues', () => {
    const prompt = buildSystemPrompt({
      facts,
      member: { name: 'Ama', status: 'active', tier: 'fleet' },
      dues: { invoices: [], total: 0 },
      loads: []
    });
    assert.match(prompt, /Outstanding dues: none recorded/);
  });

  it('withholds account data from unlinked senders', () => {
    const prompt = buildSystemPrompt({ facts, member: null, dues: null, loads: [] });
    assert.match(prompt, /has not linked a member record/);
    assert.doesNotMatch(prompt, /MEMBER DATA \(this is the person/);
  });

  it('lists open loads with rates and routes', () => {
    const prompt = buildSystemPrompt({
      facts,
      member: null,
      dues: null,
      loads: [
        {
          title: 'Palletted building materials',
          reference: 'LD-2026-1042',
          origin: 'Tema',
          destination: 'Kumasi',
          trailerType: 'Flatbed',
          rate: 6200,
          pickupDate: '2026-11-18'
        }
      ]
    });

    assert.match(prompt, /Tema to Kumasi/);
    assert.match(prompt, /GH₵6,200/);
  });
});
