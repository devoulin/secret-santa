import type { Family, PersonKind } from './types';
import { buildPool, checkPoolFeasibility, POOL_KINDS } from './draw';
import { countPeople, displayFamilyName, isValidEmail, resolveDelivery } from './families';

export interface PoolStatus {
  count: number;
  error: string | null;
}

export interface ValidationReport {
  /** Blokują losowanie. */
  errors: string[];
  /** Nie blokują, ale warto poprawić. */
  warnings: string[];
  pools: Record<PersonKind, PoolStatus>;
  counts: ReturnType<typeof countPeople>;
}

export function validateFamilies(families: readonly Family[]): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const counts = countPeople(families);

  if (counts.total === 0) {
    errors.push('Dodaj co najmniej jedną rodzinę z uczestnikami.');
  }

  const nameCounts = new Map<string, { name: string; count: number }>();

  for (const family of families) {
    const familyName = displayFamilyName(family);
    if (!family.name.trim()) warnings.push('Jedna z rodzin nie ma nazwy.');
    if (family.members.length === 0) warnings.push(`Rodzina „${familyName}" nie ma jeszcze żadnych osób.`);

    for (const person of family.members) {
      const name = person.name.trim();
      if (!name) {
        errors.push(`W rodzinie „${familyName}" jest osoba bez imienia.`);
        continue;
      }
      const key = name.toLocaleLowerCase('pl');
      const entry = nameCounts.get(key) ?? { name, count: 0 };
      entry.count++;
      nameCounts.set(key, entry);

      const email = person.email.trim();
      if (email && !isValidEmail(email)) {
        warnings.push(`${name}: adres „${email}" wygląda na niepoprawny.`);
      } else if (!resolveDelivery({ person, family }).email) {
        warnings.push(
          person.kind === 'child'
            ? `${name}: brak e-maila (ani dziecka, ani rodzica) — wynik trzeba będzie przekazać tajnym linkiem.`
            : `${name}: brak e-maila — wynik trzeba będzie przekazać tajnym linkiem.`,
        );
      }
    }
  }

  for (const { name, count } of nameCounts.values()) {
    if (count > 1) {
      warnings.push(
        `Imię „${name}" występuje ${count} razy — w wiadomościach może być niejasne, o kogo chodzi. Dodaj nazwisko lub inicjał.`,
      );
    }
  }

  const pools = {} as Record<PersonKind, PoolStatus>;
  for (const kind of POOL_KINDS) {
    const pool = buildPool(families, kind);
    const error = checkPoolFeasibility(pool, kind);
    pools[kind] = { count: pool.length, error };
    if (error) errors.push(error);
  }

  return { errors, warnings, pools, counts };
}
