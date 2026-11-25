import type { Assignment, Family, PersonKind } from './types';
import { type Rng, shuffle } from './random';

export const POOL_LABELS: Record<PersonKind, string> = {
  adult: 'Dorośli',
  child: 'Dzieci',
};

export const POOL_KINDS: readonly PersonKind[] = ['adult', 'child'];

export interface Participant {
  id: string;
  name: string;
  familyId: string;
  familyName: string;
}

export interface DrawOptions {
  /** Unikaj par wzajemnych (A → B i B → A), jeśli to możliwe. */
  avoidMutual: boolean;
  rng: Rng;
  /** Ile prób losowania przez odrzucanie przed przejściem na backtracking. */
  rejectionAttempts?: number;
}

export type PoolDrawResult =
  | { ok: true; assignments: Assignment[]; mutualAvoided: boolean }
  | { ok: false; error: string };

export interface DrawOutcome {
  ok: boolean;
  assignments: Assignment[];
  errors: string[];
  warnings: string[];
}

const DEFAULT_REJECTION_ATTEMPTS = 5_000;
const MAX_BACKTRACKING_STEPS = 500_000;

/** Wszystkie osoby danego typu (dorośli / dzieci) ze wszystkich rodzin. */
export function buildPool(families: readonly Family[], kind: PersonKind): Participant[] {
  return families.flatMap((family) =>
    family.members
      .filter((m) => m.kind === kind)
      .map((m) => ({
        id: m.id,
        name: m.name.trim(),
        familyId: family.id,
        familyName: family.name.trim(),
      })),
  );
}

/**
 * Sprawdza, czy w puli da się przeprowadzić losowanie.
 *
 * Każdy musi wylosować kogoś spoza swojej rodziny. Z twierdzenia Halla wynika, że poprawne
 * losowanie istnieje wtedy i tylko wtedy, gdy żadna rodzina nie ma więcej niż połowy osób w puli.
 *
 * @returns komunikat błędu po polsku albo `null`, jeśli losowanie jest możliwe.
 */
export function checkPoolFeasibility(pool: readonly Participant[], kind: PersonKind): string | null {
  const label = POOL_LABELS[kind];
  if (pool.length === 0) return null;
  if (pool.length === 1) {
    const name = pool[0]!.name || 'bez imienia';
    return `Pula „${label}": jest tylko jedna osoba (${name}) — nie ma komu kupić prezentu. Dodaj więcej osób albo przenieś ją do drugiej puli.`;
  }

  const sizes = new Map<string, { name: string; count: number }>();
  for (const p of pool) {
    const entry = sizes.get(p.familyId) ?? { name: p.familyName || 'bez nazwy', count: 0 };
    entry.count++;
    sizes.set(p.familyId, entry);
  }
  const biggest = [...sizes.values()].sort((a, b) => b.count - a.count)[0]!;
  const others = pool.length - biggest.count;
  if (biggest.count > others) {
    if (others === 0) {
      return `Pula „${label}": wszyscy (${pool.length}) są z rodziny „${biggest.name}", a w obrębie rodziny nie losujemy. Dodaj osoby z innych rodzin.`;
    }
    return `Pula „${label}": rodzina „${biggest.name}" ma ${biggest.count} z ${pool.length} osób, a każda z nich musi wylosować kogoś spoza rodziny — takich osób jest tylko ${others}. Dodaj co najmniej ${biggest.count - others} ${pluralPeople(biggest.count - others)} z innych rodzin.`;
  }
  return null;
}

function pluralPeople(n: number): string {
  if (n === 1) return 'osobę';
  const lastTwo = n % 100;
  const last = n % 10;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'osoby';
  return 'osób';
}

function hasMutualPair(receiverOf: ReadonlyMap<string, string>): boolean {
  for (const [giver, receiver] of receiverOf) {
    if (receiverOf.get(receiver) === giver) return true;
  }
  return false;
}

/**
 * Losowanie przez odrzucanie: losowa permutacja, akceptowana tylko jeśli spełnia reguły.
 * Każde poprawne losowanie ma dzięki temu identyczne prawdopodobieństwo.
 */
function tryRejection(
  pool: readonly Participant[],
  avoidMutual: boolean,
  rng: Rng,
  attempts: number,
): Assignment[] | null {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const receivers = shuffle(pool, rng);
    let valid = true;
    for (let i = 0; i < pool.length; i++) {
      if (pool[i]!.familyId === receivers[i]!.familyId) {
        valid = false; // obejmuje też wylosowanie samego siebie
        break;
      }
    }
    if (!valid) continue;

    const receiverOf = new Map(pool.map((g, i) => [g.id, receivers[i]!.id]));
    if (avoidMutual && hasMutualPair(receiverOf)) continue;

    return pool.map((g, i) => ({ giverId: g.id, receiverId: receivers[i]!.id }));
  }
  return null;
}

/**
 * Wyczerpujące przeszukiwanie z nawrotami (losowa kolejność kandydatów).
 * Najpierw przydzielamy osoby z największych rodzin — mają najmniej opcji.
 */
function tryBacktracking(pool: readonly Participant[], avoidMutual: boolean, rng: Rng): Assignment[] | null {
  const familySize = new Map<string, number>();
  for (const p of pool) familySize.set(p.familyId, (familySize.get(p.familyId) ?? 0) + 1);

  const givers = shuffle(pool, rng).sort(
    (a, b) => familySize.get(b.familyId)! - familySize.get(a.familyId)!,
  );
  const taken = new Set<string>();
  const receiverOf = new Map<string, string>();
  let steps = 0;

  const solve = (index: number): boolean => {
    if (index === givers.length) return true;
    if (++steps > MAX_BACKTRACKING_STEPS) return false;
    const giver = givers[index]!;
    for (const receiver of shuffle(pool, rng)) {
      if (taken.has(receiver.id)) continue;
      if (receiver.familyId === giver.familyId) continue;
      if (avoidMutual && receiverOf.get(receiver.id) === giver.id) continue;

      taken.add(receiver.id);
      receiverOf.set(giver.id, receiver.id);
      if (solve(index + 1)) return true;
      taken.delete(receiver.id);
      receiverOf.delete(giver.id);
    }
    return false;
  };

  if (!solve(0)) return null;
  return pool.map((g) => ({ giverId: g.id, receiverId: receiverOf.get(g.id)! }));
}

/** Losowanie w jednej puli. */
export function drawPool(pool: readonly Participant[], kind: PersonKind, options: DrawOptions): PoolDrawResult {
  if (pool.length === 0) return { ok: true, assignments: [], mutualAvoided: true };

  const error = checkPoolFeasibility(pool, kind);
  if (error) return { ok: false, error };

  const attempts = options.rejectionAttempts ?? DEFAULT_REJECTION_ATTEMPTS;
  // Przy 2 osobach para wzajemna jest nieunikniona — nie ma sensu próbować.
  const variants = options.avoidMutual && pool.length > 2 ? [true, false] : [false];

  for (const avoidMutual of variants) {
    const found =
      tryRejection(pool, avoidMutual, options.rng, attempts) ??
      tryBacktracking(pool, avoidMutual, options.rng);
    if (found) return { ok: true, assignments: found, mutualAvoided: avoidMutual };
  }

  return {
    ok: false,
    error: `Pula „${POOL_LABELS[kind]}": nie udało się znaleźć poprawnego losowania. Spróbuj ponownie.`,
  };
}

/** Losowanie dla wszystkich pul (dorośli i dzieci osobno). */
export function drawAll(families: readonly Family[], options: DrawOptions): DrawOutcome {
  const assignments: Assignment[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const kind of POOL_KINDS) {
    const pool = buildPool(families, kind);
    const result = drawPool(pool, kind, options);
    if (!result.ok) {
      errors.push(result.error);
      continue;
    }
    assignments.push(...result.assignments);
    if (options.avoidMutual && !result.mutualAvoided && pool.length > 0) {
      warnings.push(
        `Pula „${POOL_LABELS[kind]}": przy ${pool.length} osobach nie da się uniknąć par wzajemnych — te osoby kupią prezenty sobie nawzajem.`,
      );
    }
  }

  if (assignments.length === 0 && errors.length === 0) {
    errors.push('Brak uczestników — dodaj rodziny i osoby.');
  }

  return { ok: errors.length === 0, assignments: errors.length ? [] : assignments, errors, warnings };
}
