import { describe, expect, it } from 'vitest';
import { buildMessage, DEFAULT_TEMPLATE, renderTemplate } from './message';

const vars = { giver: 'Ania', receiver: 'Wujek Marek', budget: '100 zł', date: '24 grudnia' };

describe('renderTemplate', () => {
  it('podmienia placeholdery', () => {
    expect(renderTemplate('Cześć {imie}, kupujesz dla {osoba} za {budzet} na {data}.', vars)).toBe(
      'Cześć Ania, kupujesz dla Wujek Marek za 100 zł na 24 grudnia.',
    );
  });

  it('akceptuje polskie znaki i wielkie litery w placeholderach', () => {
    expect(renderTemplate('{IMIĘ} → {Osoba} ({budżet})', vars)).toBe('Ania → Wujek Marek (100 zł)');
  });

  it('usuwa linie z pustym placeholderem i nadmiarowe puste linie', () => {
    const text = 'Cześć {imie}!\n\nBudżet: {budzet}\nData: {data}\n\nPa!';
    expect(renderTemplate(text, { ...vars, budget: '', date: '' })).toBe('Cześć Ania!\n\nPa!');
  });

  it('zostawia nieznane klamry bez zmian', () => {
    expect(renderTemplate('{coś} {imie}', vars)).toBe('{coś} Ania');
  });
});

describe('buildMessage', () => {
  it('domyślny szablon zawiera imiona i nie zostawia placeholderów', () => {
    const msg = buildMessage({ ...DEFAULT_TEMPLATE, budget: '' }, 'Ania', 'Kuba');
    expect(msg.body).toContain('Cześć Ania!');
    expect(msg.body).toContain('Kuba');
    expect(msg.body).not.toMatch(/\{\w+\}/);
    expect(msg.body).not.toContain('Budżet');
    expect(msg.subject.length).toBeGreaterThan(0);
  });
});
