import { describe, expect, it } from 'vitest';
import { decodeReveal, encodeReveal, revealUrl } from './reveal';

describe('reveal', () => {
  it('koduje i dekoduje dane z polskimi znakami i emoji', () => {
    const data = { giver: 'Zośka Żółć', receiver: 'Staś 🎅', budget: '150 zł', date: '24 grudnia' };
    const code = encodeReveal(data);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/); // bezpieczny w URL
    expect(code).not.toContain('Sta');
    expect(decodeReveal(code)).toEqual(data);
  });

  it('pomija puste pola opcjonalne', () => {
    expect(decodeReveal(encodeReveal({ giver: 'A', receiver: 'B', budget: ' ' }))).toEqual({
      giver: 'A',
      receiver: 'B',
      budget: undefined,
      date: undefined,
    });
  });

  it('zwraca null dla uszkodzonego kodu', () => {
    expect(decodeReveal('to-nie-jest-kod')).toBeNull();
    expect(decodeReveal('')).toBeNull();
  });

  it('buduje adres względem bieżącej strony', () => {
    expect(revealUrl('abc', 'https://x.pl/santa/index.html#/cos')).toBe('https://x.pl/santa/index.html#/odkryj/abc');
  });
});
