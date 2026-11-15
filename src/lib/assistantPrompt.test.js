import { describe, expect, it } from 'vitest';
import { assistantFacts, buildAssistantPrompt } from './assistantPrompt.js';

const facts = assistantFacts({
  unionName: "Haulway Drivers' Union",
  memberLine: '+233 24 900 1180',
  email: 'members@haulwayunion.org',
  duesGraceDays: 14
});

const member = {
  id: 'mem-1',
  name: 'Kwamena',
  memberNumber: 'HU-ADZ1RGTC',
  status: 'active',
  tier: 'owner_operator',
  region: 'Greater Accra',
  vehicleType: 'Dry van',
  vehiclePlate: 'GT 4821-24',
  joinedAt: '2021-04-12'
};

describe('assistantFacts', () => {
  it('prefers live settings and falls back to the site values', () => {
    expect(facts.name).toBe("Haulway Drivers' Union");
    expect(facts.phone).toBe('+233 24 900 1180');
    expect(facts.graceDays).toBe(14);

    const fallback = assistantFacts({});
    expect(fallback.name).toContain('Haulway');
    expect(fallback.phone).toBeTruthy();
  });
});

describe('buildAssistantPrompt', () => {
  it('includes union facts and tier prices', () => {
    const prompt = buildAssistantPrompt({ facts, member: null });
    expect(prompt).toContain("Haulway Drivers' Union");
    expect(prompt).toContain('+233 24 900 1180');
    expect(prompt).toContain('Independent driver GH₵60 a month');
    expect(prompt).toContain('Fleet member GH₵450 a month');
    expect(prompt).toContain('grace period: 14 days');
  });

  it('adds the signed-in member account and outstanding dues', () => {
    const prompt = buildAssistantPrompt({
      facts,
      member,
      dues: [
        { id: 'due-1', memberId: 'mem-1', period: '2026-10', amount: 120, status: 'due', dueDate: '2026-10-28' },
        { id: 'due-2', memberId: 'mem-1', period: '2026-09', amount: 120, status: 'paid', dueDate: '2026-09-28', paidAt: '2026-09-24' }
      ]
    });

    expect(prompt).toContain('MEMBER ACCOUNT');
    expect(prompt).toContain('Kwamena');
    expect(prompt).toContain('Owner-operator');
    expect(prompt).toContain('Outstanding dues: GH₵120 across 1 invoice');
    expect(prompt).toContain('October 2026: GH₵120 due 28 Oct 2026 (due)');
    expect(prompt).toContain('Last payment: September 2026 GH₵120');
  });

  it('says when there is nothing outstanding', () => {
    const prompt = buildAssistantPrompt({ facts, member, dues: [] });
    expect(prompt).toContain('Outstanding dues: none');
  });

  it('flags overdue invoices against the grace period', () => {
    const prompt = buildAssistantPrompt({
      facts,
      member,
      dues: [
        { id: 'due-1', memberId: 'mem-1', period: '2026-08', amount: 120, status: 'overdue', dueDate: '2026-08-28' }
      ]
    });
    expect(prompt).toContain('Overdue invoice: August 2026 GH₵120 (grace period 14 days)');
  });

  it('withholds account data when there is no member record', () => {
    const prompt = buildAssistantPrompt({ facts, member: null, dues: [], loads: [] });
    expect(prompt).toContain('no approved member record');
    expect(prompt).not.toContain('MEMBER ACCOUNT (the person you are talking to');
    expect(prompt).not.toContain('Kwamena');
  });

  it('lists open loads with route and rate', () => {
    const prompt = buildAssistantPrompt({
      facts,
      member,
      dues: [],
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

    expect(prompt).toContain('Tema to Kumasi');
    expect(prompt).toContain('GH₵6,200');
    expect(prompt).toContain('LD-2026-1042');
  });
});
