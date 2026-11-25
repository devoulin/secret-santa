import type { Family, Person } from './types';

export interface PersonRef {
  person: Person;
  family: Family;
}

export function findPerson(families: readonly Family[], personId: string): PersonRef | null {
  for (const family of families) {
    const person = family.members.find((m) => m.id === personId);
    if (person) return { person, family };
  }
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export interface Delivery {
  /** Adres, na który wyślemy wynik, albo null gdy brak. */
  email: string | null;
  /** Gdy dziecko nie ma własnego adresu — dorosły z rodziny, do którego trafi mail. */
  viaParent: Person | null;
}

/**
 * Dokąd wysłać wynik danej osoby. Dziecko bez własnego adresu dostaje maila „przez rodzica"
 * — pierwszego dorosłego z rodziny, który ma poprawny e-mail.
 */
export function resolveDelivery(ref: PersonRef): Delivery {
  const own = ref.person.email.trim();
  if (isValidEmail(own)) return { email: own, viaParent: null };
  if (ref.person.kind === 'child') {
    const parent = ref.family.members.find((m) => m.kind === 'adult' && isValidEmail(m.email));
    if (parent) return { email: parent.email.trim(), viaParent: parent };
  }
  return { email: null, viaParent: null };
}

/**
 * Odcisk struktury uczestników (kto, w jakiej rodzinie, w jakiej puli). Zmiana imienia czy e-maila
 * go nie zmienia — dzięki temu poprawienie literówki nie unieważnia losowania.
 */
export function structureSignature(families: readonly Family[]): string {
  return families
    .flatMap((f) => f.members.map((m) => `${f.id}/${m.id}/${m.kind}`))
    .sort()
    .join('|');
}

export function countPeople(families: readonly Family[]) {
  let adults = 0;
  let children = 0;
  for (const f of families) {
    for (const m of f.members) {
      if (m.kind === 'adult') adults++;
      else children++;
    }
  }
  return { families: families.length, adults, children, total: adults + children };
}

export function displayName(person: Person | undefined | null): string {
  return person?.name.trim() || '(bez imienia)';
}

export function displayFamilyName(family: Family | undefined | null): string {
  return family?.name.trim() || '(rodzina bez nazwy)';
}
