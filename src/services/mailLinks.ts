/** Linki otwierające gotowego maila w programie pocztowym lub w Gmailu. */

// RFC 6068: nowe linie w mailto zapisujemy jako CRLF.
const encode = (text: string) => encodeURIComponent(text.replace(/\r?\n/g, '\r\n'));

export function mailtoLink(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to.trim()).replace(/%40/g, '@')}?subject=${encode(subject)}&body=${encode(body)}`;
}

export function gmailLink(to: string, subject: string, body: string): string {
  return (
    'https://mail.google.com/mail/?view=cm&fs=1' +
    `&to=${encodeURIComponent(to.trim())}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  );
}
