import { describe, expect, it } from 'vitest';
import type { Assignment, Family, PersonKind } from './types';
import { buildPool, checkPoolFeasibility, drawAll, drawPool } from './draw';
import { seededRng } from './random';
import { createSampleFamilies } from './sample';

let nextId = 0;
function family(name: string, members: Array<[string, PersonKind]>): Family {
  return {
    id: `f-${name}`,
    name,
    members: members.map(([personName, kind]) => ({ id: `p${nextId++}-${personName}`, name: personName, email: '', kind })),
  };
}

/** Sprawdza wszystkie reguły losowania. */
function expectValidDraw(families: Family[], assignments: Assignment[]) {
  const personInfo = new Map<string, { familyId: string; kind: PersonKind }>();
  for (const f of families) for (const m of f.members) personInfo.set(m.id, { familyId: f.id, kind: m.kind });

  const givers = assignments.map((a) => a.giverId);
  const receivers = assignments.map((a) => a.receiverId);

  // każdy uczestnik daje dokładnie raz i dostaje dokładnie raz
  expect(new Set(givers).size).toBe(personInfo.size);
  expect(new Set(receivers).size).toBe(personInfo.size);
  expect(givers.length).toBe(personInfo.size);

  for (const { giverId, receiverId } of assignments) {
    const g = personInfo.get(giverId)!;
    const r = personInfo.get(receiverId)!;
    expect(giverId).not.toBe(receiverId);
    expect(g.kind).toBe(r.kind); // dorosły → dorosły, dziecko → dziecko
    expect(g.familyId).not.toBe(r.familyId); // nie małżonek / nie rodzeństwo
  }
}

function hasMutual(assignments: Assignment[]): boolean {
  const map = new Map(assignments.map((a) => [a.giverId, a.receiverId]));
  return assignments.some((a) => map.get(a.receiverId) === a.giverId);
}

describe('drawAll', () => {
  it('przestrzega wszystkich reguł dla przykładowych rodzin (500 losowań)', () => {
    const families = createSampleFamilies();
    for (let seed = 0; seed < 500; seed++) {
      const outcome = drawAll(families, { avoidMutual: false, rng: seededRng(seed) });
      expect(outcome.ok).toBe(true);
      expect(outcome.errors).toEqual([]);
      expectValidDraw(families, outcome.assignments);
    }
  });

  it('unika par wzajemnych, gdy to możliwe', () => {
    const families = createSampleFamilies();
    for (let seed = 0; seed < 300; seed++) {
      const outcome = drawAll(families, { avoidMutual: true, rng: seededRng(seed) });
      expect(outcome.ok).toBe(true);
      expectValidDraw(families, outcome.assignments);
      expect(hasMutual(outcome.assignments)).toBe(false);
      expect(outcome.warnings).toEqual([]);
    }
  });

  it('ostrzega, gdy para wzajemna jest nieunikniona (2 osoby w puli)', () => {
    const families = [family('A', [['Ala', 'adult']]), family('B', [['Bartek', 'adult']])];
    const outcome = drawAll(families, { avoidMutual: true, rng: seededRng(1) });
    expect(outcome.ok).toBe(true);
    expectValidDraw(families, outcome.assignments);
    expect(outcome.warnings).toHaveLength(1);
  });

  it('nie miesza pul — dorośli i dzieci losowani osobno', () => {
    const families = [
      family('A', [['A1', 'adult'], ['a1', 'child']]),
      family('B', [['B1', 'adult'], ['b1', 'child']]),
      family('C', [['C1', 'adult'], ['c1', 'child']]),
    ];
    for (let seed = 0; seed < 100; seed++) {
      const outcome = drawAll(families, { avoidMutual: true, rng: seededRng(seed) });
      expectValidDraw(families, outcome.assignments);
    }
  });

  it('zwraca błąd, gdy w puli dzieci jest tylko jedno dziecko', () => {
    const families = [
      family('A', [['A1', 'adult'], ['a1', 'child']]),
      family('B', [['B1', 'adult']]),
    ];
    const outcome = drawAll(families, { avoidMutual: false, rng: seededRng(1) });
    expect(outcome.ok).toBe(false);
    expect(outcome.assignments).toEqual([]);
    expect(outcome.errors[0]).toContain('Dzieci');
  });

  it('zwraca błąd, gdy jedna rodzina ma ponad połowę puli', () => {
    const families = [
      family('Duża', [['d1', 'child'], ['d2', 'child'], ['d3', 'child']]),
      family('Mała', [['m1', 'child'], ['m2', 'child']]),
    ];
    const outcome = drawAll(families, { avoidMutual: false, rng: seededRng(1) });
    expect(outcome.ok).toBe(false);
    expect(outcome.errors[0]).toContain('Duża');
  });

  it('zwraca błąd dla pustej listy', () => {
    const outcome = drawAll([], { avoidMutual: true, rng: seededRng(1) });
    expect(outcome.ok).toBe(false);
  });
});

describe('drawPool', () => {
  it('radzi sobie z rodziną mającą dokładnie połowę puli (przypadek graniczny)', () => {
    const families = [
      family('Duża', [['d1', 'adult'], ['d2', 'adult'], ['d3', 'adult'], ['d4', 'adult']]),
      family('X', [['x', 'adult']]),
      family('Y', [['y', 'adult']]),
      family('Z', [['z', 'adult']]),
      family('W', [['w', 'adult']]),
    ];
    const pool = buildPool(families, 'adult');
    for (let seed = 0; seed < 100; seed++) {
      // rejectionAttempts: 0 wymusza ścieżkę backtrackingu
      for (const rejectionAttempts of [0, 5000]) {
        const result = drawPool(pool, 'adult', { avoidMutual: true, rng: seededRng(seed), rejectionAttempts });
        expect(result.ok).toBe(true);
        if (result.ok) {
          expectValidDraw(families, result.assignments);
          expect(hasMutual(result.assignments)).toBe(false);
        }
      }
    }
  });

  it('losuje jednostajnie — oba możliwe cykle 3 osób pojawiają się ~po równo', () => {
    const families = [family('A', [['a', 'adult']]), family('B', [['b', 'adult']]), family('C', [['c', 'adult']])];
    const pool = buildPool(families, 'adult');
    const counts = new Map<string, number>();
    for (let seed = 0; seed < 1000; seed++) {
      const result = drawPool(pool, 'adult', { avoidMutual: true, rng: seededRng(seed) });
      if (!result.ok) throw new Error(result.error);
      const key = result.assignments.map((a) => a.receiverId).join(',');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(2);
    for (const c of counts.values()) expect(c).toBeGreaterThan(400);
  });

  it('jest szybki dla dużej grupy (60 osób)', () => {
    const families = Array.from({ length: 20 }, (_, i) =>
      family(`R${i}`, [[`r${i}a`, 'adult'], [`r${i}b`, 'adult'], [`r${i}c`, 'adult']]),
    );
    const pool = buildPool(families, 'adult');
    const start = performance.now();
    const result = drawPool(pool, 'adult', { avoidMutual: true, rng: seededRng(42) });
    expect(performance.now() - start).toBeLessThan(1000);
    expect(result.ok).toBe(true);
    if (result.ok) expectValidDraw(families, result.assignments);
  });
});

describe('checkPoolFeasibility', () => {
  it('akceptuje pustą pulę', () => {
    expect(checkPoolFeasibility([], 'child')).toBeNull();
  });

  it('odrzuca pulę, w której wszyscy są z jednej rodziny', () => {
    const families = [family('Solo', [['s1', 'child'], ['s2', 'child']])];
    expect(checkPoolFeasibility(buildPool(families, 'child'), 'child')).toContain('Solo');
  });
});
