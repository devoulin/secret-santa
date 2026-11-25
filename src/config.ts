/**
 * Publiczny adres aplikacji (z VITE_PUBLIC_URL w .env). Tajne linki zawsze prowadzą tutaj,
 * więc linki wygenerowane na localhost też działają u innych. `null` = użyj bieżącego adresu.
 */
export const PUBLIC_APP_URL: string | null = import.meta.env.VITE_PUBLIC_URL?.trim() || null;

/** Adres bazowy dla tajnych linków. */
export function revealLinkBase(): string {
  return PUBLIC_APP_URL ?? window.location.href;
}
