import { describe, expect, it } from 'vitest';
import type { Assignment, Family } from './types';
import { buildOutbox } from './outbox';
import { DEFAULT_TEMPLATE } from './message';
import { decodeReveal } from './reveal';

const SUBJECT = 'Temat';
const template = { ...DEFAULT_TEMPLATE, subject: SUBJECT, budget: '100 zł' };

function families(emails: { a1: string; a2: string; b1: string; b2: string; kid: string; kid2: string }): Family[] {
  return [
    {
      id: 'A',
      name: 'A',
      members: [
        { id: 'a1', name: 'Ania', email: emails.a1, kind: 'adult' },
        { id: 'a2', name: 'Adam', email: emails.a2, kind: 'adult' },
        { id: 'kid', name: 'Zosia', email: emails.kid, kind: 'child' },
      ],
    },
    {
      id: 'B',
      name: 'B',
      members: [
        { id: 'b1', name: 'Basia', email: emails.b1, kind: 'adult' },
        { id: 'b2', name: 'Bartek', email: emails.b2, kind: 'adult' },
        { id: 'kid2', name: 'Kuba', email: emails.kid2, kind: 'child' },
      ],
    },
  ];
}

const assignments: Assignment[] = [
  { giverId: 'a1', receiverId: 'b1' },
  { giverId: 'b1', receiverId: 'a2' },
  { giverId: 'a2', receiverId: 'b2' },
  { giverId: 'b2', receiverId: 'a1' },
  { giverId: 'kid', receiverId: 'kid2' },
  { giverId: 'kid2', receiverId: 'kid' },
];

const subjectOf = (items: ReturnType<typeof buildOutbox>, id: string) => items.find((i) => i.giverId === id)!.subject;

describe('buildOutbox', () => {
  it('zostawia temat bez zmian, gdy każdy ma własny adres', () => {
    const items = buildOutbox(
      families({ a1: 'a1@x.pl', a2: 'a2@x.pl', b1: 'b1@x.pl', b2: 'b2@x.pl', kid: 'k@x.pl', kid2: 'k2@x.pl' }),
      assignments,
      template,
    );
    expect(items).toHaveLength(6);
    expect(items.every((i) => i.subject === SUBJECT)).toBe(true);
  });

  it('dopisuje imię, gdy kilka osób ma ten sam adres (wielkość liter bez znaczenia)', () => {
    const items = buildOutbox(
      families({ a1: 'dom@x.pl', a2: 'DOM@x.pl ', b1: 'b1@x.pl', b2: 'b2@x.pl', kid: 'k@x.pl', kid2: 'k2@x.pl' }),
      assignments,
      template,
    );
    expect(subjectOf(items, 'a1')).toBe(`${SUBJECT} (dla: Ania)`);
    expect(subjectOf(items, 'a2')).toBe(`${SUBJECT} (dla: Adam)`);
    expect(subjectOf(items, 'b1')).toBe(SUBJECT);
  });

  it('dopisuje imię dziecku, którego mail idzie do rodzica — i samemu rodzicowi', () => {
    const items = buildOutbox(
      families({ a1: 'a1@x.pl', a2: 'a2@x.pl', b1: 'b1@x.pl', b2: 'b2@x.pl', kid: '', kid2: 'k2@x.pl' }),
      assignments,
      template,
    );
    const kid = items.find((i) => i.giverId === 'kid')!;
    expect(kid.delivery.email).toBe('a1@x.pl');
    expect(kid.subject).toBe(`${SUBJECT} (dla: Zosia)`);
    expect(subjectOf(items, 'a1')).toBe(`${SUBJECT} (dla: Ania)`);
    expect(subjectOf(items, 'a2')).toBe(SUBJECT);
  });

  it('wszyscy na jednym adresie → każdy temat jest inny', () => {
    const one = 'test@x.pl';
    const items = buildOutbox(families({ a1: one, a2: one, b1: one, b2: one, kid: one, kid2: one }), assignments, template);
    expect(new Set(items.map((i) => i.subject)).size).toBe(items.length);
  });

  it('koduje w tajnym linku właściwą parę i budżet', () => {
    const items = buildOutbox(
      families({ a1: 'a1@x.pl', a2: 'a2@x.pl', b1: 'b1@x.pl', b2: 'b2@x.pl', kid: 'k@x.pl', kid2: 'k2@x.pl' }),
      assignments,
      template,
    );
    expect(decodeReveal(items.find((i) => i.giverId === 'a1')!.revealCode)).toMatchObject({
      giver: 'Ania',
      receiver: 'Basia',
      budget: '100 zł',
    });
  });
});
