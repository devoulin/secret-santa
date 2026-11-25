/**
 * Tajny link z wynikiem losowania, np. do wysłania SMS-em lub WhatsAppem.
 *
 * UWAGA: to zaciemnienie (base64url), a nie szyfrowanie — wystarczy, żeby wynik nie był widoczny
 * „na pierwszy rzut oka" w adresie. W wersji publicznej zastąpić identyfikatorem z backendu.
 */
export interface RevealData {
  giver: string;
  receiver: string;
  budget?: string;
  date?: string;
}

interface Wire {
  g: string;
  r: string;
  b?: string;
  d?: string;
}

export const REVEAL_ROUTE = '#/odkryj/';

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): Uint8Array {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function encodeReveal(data: RevealData): string {
  const wire: Wire = { g: data.giver, r: data.receiver };
  if (data.budget?.trim()) wire.b = data.budget.trim();
  if (data.date?.trim()) wire.d = data.date.trim();
  return toBase64Url(new TextEncoder().encode(JSON.stringify(wire)));
}

export function decodeReveal(code: string): RevealData | null {
  try {
    const wire = JSON.parse(new TextDecoder().decode(fromBase64Url(code))) as Partial<Wire>;
    if (typeof wire.g !== 'string' || typeof wire.r !== 'string') return null;
    return {
      giver: wire.g,
      receiver: wire.r,
      budget: typeof wire.b === 'string' ? wire.b : undefined,
      date: typeof wire.d === 'string' ? wire.d : undefined,
    };
  } catch {
    return null;
  }
}

/** Pełny adres strony z wynikiem, liczony względem bieżącego adresu aplikacji. */
export function revealUrl(code: string, pageUrl: string): string {
  return pageUrl.split('#')[0] + REVEAL_ROUTE + code;
}
