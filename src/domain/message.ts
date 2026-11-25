import type { MessageTemplate } from './types';

export const DEFAULT_TEMPLATE: MessageTemplate = {
  subject: '🎅 Losowanie Mikołajkowe — sprawdź, komu kupujesz prezent!',
  body: `Cześć {imie}! 🎄

Losowanie świątecznych prezentów za nami!
W tym roku Twoim zadaniem jest przygotować prezent dla:

🎁 {osoba} 🎁

💰 Budżet: {budzet}
📅 Wręczamy prezenty: {data}

Pamiętaj — to tajemnica! 🤫 Nie zdradzaj nikomu, kogo wylosowałeś/aś.

Wesołych Świąt i do zobaczenia przy choince!
Twój Święty Mikołaj 🎅`,
  budget: '',
  eventDate: '24 grudnia',
};

export interface MessageVars {
  /** Kto kupuje (adresat wiadomości). */
  giver: string;
  /** Dla kogo kupuje. */
  receiver: string;
  budget: string;
  date: string;
}

export const PLACEHOLDERS: ReadonlyArray<{ token: string; description: string }> = [
  { token: '{imie}', description: 'imię osoby, która dostaje wiadomość' },
  { token: '{osoba}', description: 'kogo wylosowała (dla kogo kupuje prezent)' },
  { token: '{budzet}', description: 'budżet na prezent' },
  { token: '{data}', description: 'data wręczenia prezentów' },
];

// Akceptujemy też warianty z polskimi znakami: {imię}, {budżet}.
const PLACEHOLDER_RE = /\{(imi[eę]|osoba|bud[zż]et|data)\}/giu;

function varKey(raw: string): keyof MessageVars {
  const k = raw.toLocaleLowerCase('pl').replace('ę', 'e').replace('ż', 'z');
  switch (k) {
    case 'imie':
      return 'giver';
    case 'osoba':
      return 'receiver';
    case 'budzet':
      return 'budget';
    default:
      return 'date';
  }
}

/**
 * Podmienia placeholdery. Linie zawierające placeholder, dla którego nie ma wartości
 * (np. pusty budżet), są usuwane w całości — żeby w mailu nie zostało „Budżet: ".
 */
export function renderTemplate(text: string, vars: MessageVars): string {
  return text
    .split('\n')
    .filter((line) => {
      for (const match of line.matchAll(PLACEHOLDER_RE)) {
        if (!vars[varKey(match[1]!)].trim()) return false;
      }
      return true;
    })
    .map((line) => line.replace(PLACEHOLDER_RE, (_, key: string) => vars[varKey(key)].trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface RenderedMessage {
  subject: string;
  body: string;
}

export function buildMessage(template: MessageTemplate, giver: string, receiver: string): RenderedMessage {
  const vars: MessageVars = { giver, receiver, budget: template.budget, date: template.eventDate };
  return {
    subject: renderTemplate(template.subject, vars),
    body: renderTemplate(template.body, vars),
  };
}
