import type { Family, PersonKind } from './types';
import { randomId } from './random';

type SampleFamily = [name: string, members: Array<[name: string, email: string, kind: PersonKind]>];

const SAMPLE: SampleFamily[] = [
  [
    'Kowalscy',
    [
      ['Jan Kowalski', 'jan.kowalski@example.com', 'adult'],
      ['Anna Kowalska', 'anna.kowalska@example.com', 'adult'],
      ['Zosia', '', 'child'],
      ['Kuba', '', 'child'],
    ],
  ],
  [
    'Nowakowie',
    [
      ['Piotr Nowak', 'piotr.nowak@example.com', 'adult'],
      ['Magda Nowak', 'magda.nowak@example.com', 'adult'],
      ['Ola', 'ola.nowak@example.com', 'child'],
    ],
  ],
  [
    'Wiśniewscy',
    [
      ['Tomek Wiśniewski', 'tomek.w@example.com', 'adult'],
      ['Kasia Wiśniewska', 'kasia.w@example.com', 'adult'],
      ['Staś', '', 'child'],
      ['Hania', '', 'child'],
    ],
  ],
  [
    'Babcia i Dziadek',
    [
      ['Babcia Halina', 'halina@example.com', 'adult'],
      ['Dziadek Marek', '', 'adult'],
    ],
  ],
];

export function createSampleFamilies(): Family[] {
  return SAMPLE.map(([name, members]) => ({
    id: randomId(),
    name,
    members: members.map(([personName, email, kind]) => ({ id: randomId(), name: personName, email, kind })),
  }));
}
