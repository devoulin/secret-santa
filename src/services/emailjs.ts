/**
 * Wysyłka maili przez EmailJS (https://www.emailjs.com) — bez własnego serwera.
 * Korzystamy bezpośrednio z REST API, więc nie potrzeba SDK.
 *
 * Szablon w panelu EmailJS powinien używać zmiennych:
 *   To Email: {{to_email}}   Subject: {{subject}}   Content: {{message}}
 * Dostępne są też {{to_name}} i {{receiver_name}} dla własnych, ładniejszych szablonów HTML.
 */
export interface EmailJsConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export interface EmailParams {
  to_email: string;
  to_name: string;
  receiver_name: string;
  subject: string;
  message: string;
}

const ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

/** Odstęp między kolejnymi wysyłkami — EmailJS limituje liczbę żądań na sekundę. */
export const EMAILJS_SEND_DELAY_MS = 1100;

export function isEmailJsConfigured(config: EmailJsConfig): boolean {
  return Boolean(config.serviceId.trim() && config.templateId.trim() && config.publicKey.trim());
}

export async function sendViaEmailJs(config: EmailJsConfig, params: EmailParams): Promise<void> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: config.serviceId.trim(),
      template_id: config.templateId.trim(),
      user_id: config.publicKey.trim(),
      template_params: params,
    }),
  });
  if (!response.ok) {
    const details = (await response.text().catch(() => '')) || response.statusText;
    throw new Error(`EmailJS (${response.status}): ${details}`);
  }
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
