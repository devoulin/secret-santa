import { useMemo, useState } from 'react';
import type { PersonKind } from '../domain/types';
import { displayFamilyName, displayName, findPerson, resolveDelivery, type Delivery } from '../domain/families';
import { buildMessage } from '../domain/message';
import { encodeReveal, revealUrl } from '../domain/reveal';
import { EMAILJS_SEND_DELAY_MS, isEmailJsConfigured, sendViaEmailJs, sleep } from '../services/emailjs';
import { gmailLink, mailtoLink } from '../services/mailLinks';
import { type SendState, useAppStore } from '../store/useAppStore';
import { PREVIEW_GIVER, PREVIEW_RECEIVER } from './MessageStep';
import { Alert, Button, buttonClass, Card, Field, inputClass, StepHeader } from './ui';

interface Row {
  id: string;
  giverName: string;
  receiverName: string;
  kind: PersonKind;
  familyId: string;
  familyName: string;
  delivery: Delivery;
  subject: string;
  body: string;
  link: string;
}

/** Silniejszy status nie jest nadpisywany słabszym (np. „wysłano" przez „skopiowano link"). */
const STATUS_PRIORITY: Record<SendState, number> = { error: 0, copied: 1, opened: 2, sent: 3 };

const BADGES: Record<SendState | 'pending', [label: string, className: string]> = {
  pending: ['⏳ Czeka', 'bg-slate-100 text-slate-600'],
  sent: ['✅ Wysłano', 'bg-emerald-100 text-emerald-800'],
  opened: ['📝 Otwarto w poczcie', 'bg-sky-100 text-sky-800'],
  copied: ['🔗 Link skopiowany', 'bg-violet-100 text-violet-800'],
  error: ['⚠️ Błąd', 'bg-red-100 text-red-800'],
};

const isLocalhost = () =>
  location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

export function SendStep() {
  const families = useAppStore((s) => s.families);
  const template = useAppStore((s) => s.template);
  const draw = useAppStore((s) => s.draw);
  const sendStatus = useAppStore((s) => s.sendStatus);
  const setSendStatus = useAppStore((s) => s.setSendStatus);
  const emailjs = useAppStore((s) => s.emailjs);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const rows = useMemo<Row[]>(() => {
    if (!draw) return [];
    const result: Row[] = [];
    for (const a of draw.assignments) {
      const giver = findPerson(families, a.giverId);
      const receiver = findPerson(families, a.receiverId);
      if (!giver || !receiver) continue;
      const giverName = displayName(giver.person);
      const receiverName = displayName(receiver.person);
      const delivery = resolveDelivery(giver);
      const message = buildMessage(template, giverName, receiverName);
      const code = encodeReveal({ giver: giverName, receiver: receiverName, budget: template.budget, date: template.eventDate });
      result.push({
        id: a.giverId,
        giverName,
        receiverName,
        kind: giver.person.kind,
        familyId: giver.family.id,
        familyName: displayFamilyName(giver.family),
        delivery,
        // Rodzic z kilkorgiem dzieci dostanie kilka maili — temat musi je rozróżniać.
        subject: delivery.viaParent ? `${message.subject} (dla: ${giverName})` : message.subject,
        body: message.body,
        link: revealUrl(code, location.href),
      });
    }
    return result;
  }, [draw, families, template]);

  if (!draw) {
    return <Alert tone="info">Najpierw przeprowadź losowanie w kroku 3.</Alert>;
  }

  const mark = (id: string, state: SendState, error?: string) => {
    const current = useAppStore.getState().sendStatus[id];
    if (state !== 'error' && current && STATUS_PRIORITY[current.state] > STATUS_PRIORITY[state]) return;
    setSendStatus(id, state, error);
  };

  const pendingEmail = rows.filter((r) => r.delivery.email && sendStatus[r.id]?.state !== 'sent');
  const delivered = rows.filter((r) => {
    const s = sendStatus[r.id]?.state;
    return s !== undefined && s !== 'error';
  }).length;

  const sendAll = async () => {
    if (!window.confirm(`Wysłać ${pendingEmail.length} wiadomości przez EmailJS?`)) return;
    const targets = [...pendingEmail];
    setProgress({ done: 0, total: targets.length });
    for (const [i, row] of targets.entries()) {
      try {
        await sendViaEmailJs(emailjs, {
          to_email: row.delivery.email!,
          to_name: row.delivery.viaParent ? displayName(row.delivery.viaParent) : row.giverName,
          receiver_name: row.receiverName,
          subject: row.subject,
          message: row.body,
        });
        mark(row.id, 'sent');
      } catch (e) {
        mark(row.id, 'error', e instanceof Error ? e.message : String(e));
      }
      setProgress({ done: i + 1, total: targets.length });
      if (i < targets.length - 1) await sleep(EMAILJS_SEND_DELAY_MS);
    }
    setProgress(null);
  };

  const groups = families
    .map((f) => ({ family: f, rows: rows.filter((r) => r.familyId === f.id) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-5">
      <StepHeader
        title="Roześlij wyniki"
        description="Każdy uczestnik musi dowiedzieć się, komu kupuje prezent. Wyślij maile automatycznie przez EmailJS, otwórz je ręcznie w swojej poczcie albo skopiuj tajny link (np. na WhatsApp czy SMS)."
      />

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm text-slate-500">Przekazano wyniki</p>
            <p className="text-3xl font-extrabold text-slate-900">
              {delivered} <span className="text-lg font-semibold text-slate-400">/ {rows.length}</span>
            </p>
          </div>
          {delivered === rows.length && rows.length > 0 && (
            <p className="animate-pop font-semibold text-emerald-700">🎄 Wszyscy wiedzą! Wesołych Świąt!</p>
          )}
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-linear-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
            style={{ width: `${rows.length ? (delivered / rows.length) * 100 : 0}%` }}
          />
        </div>
      </Card>

      <EmailJsPanel pendingCount={pendingEmail.length} progress={progress} onSendAll={sendAll} />

      <Alert tone="info" title="Wysyłka ręczna i tajne linki">
        <p>
          <strong>📧 Poczta / Gmail</strong> otwiera gotowego maila — wynik zobaczysz w oknie wiadomości, więc jeśli
          bierzesz udział, lepiej użyj EmailJS albo poproś kogoś o kliknięcie 😉
        </p>
        <p>
          <strong>🔗 Link</strong> kopiuje wiadomość z tajnym linkiem bez pokazywania wyniku.
          {isLocalhost() && (
            <>
              {' '}
              <strong>Uwaga:</strong> aplikacja działa teraz lokalnie ({location.host}), więc linki otworzą się tylko
              na tym komputerze. Żeby działały u innych, aplikację trzeba opublikować (np. GitHub Pages).
            </>
          )}
        </p>
      </Alert>

      {groups.map(({ family, rows: familyRows }) => (
        <Card key={family.id} className="p-0! overflow-hidden">
          <h3 className="border-b border-slate-100 bg-slate-50 px-5 py-3 font-bold text-slate-900">
            🏠 {displayFamilyName(family)}
          </h3>
          <ul className="divide-y divide-slate-100">
            {familyRows.map((row) => (
              <ParticipantRow key={row.id} row={row} state={sendStatus[row.id]?.state} error={sendStatus[row.id]?.error} onMark={mark} />
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function ParticipantRow(props: {
  row: Row;
  state: SendState | undefined;
  error: string | undefined;
  onMark: (id: string, state: SendState) => void;
}) {
  const { row, state, error, onMark } = props;
  const [copied, setCopied] = useState(false);
  const [badgeLabel, badgeClass] = BADGES[state ?? 'pending'];
  const email = row.delivery.email;

  const copyLink = async () => {
    const text = `🎅 Cześć ${row.giverName}! Kliknij, żeby zobaczyć, komu kupujesz prezent: ${row.link}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('Skopiuj ręcznie (Ctrl+C):', text);
    }
    onMark(row.id, 'copied');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-lg" aria-hidden>
        {row.kind === 'child' ? '🧒' : '🧑'}
      </div>
      <div className="min-w-0 flex-1 basis-48">
        <p className="font-semibold text-slate-900">{row.giverName}</p>
        <p className="truncate text-xs text-slate-500">
          {email ? (
            row.delivery.viaParent ? (
              <>
                → do rodzica: {displayName(row.delivery.viaParent)} ({email})
              </>
            ) : (
              <>→ {email}</>
            )
          ) : (
            <span className="text-amber-700">brak e-maila — użyj tajnego linku</span>
          )}
        </p>
        {state === 'error' && error && <p className="mt-0.5 text-xs text-red-700">{error}</p>}
      </div>
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${badgeClass}`}>{badgeLabel}</span>
      <div className="flex flex-wrap gap-1.5">
        {email && (
          <>
            <a
              href={mailtoLink(email, row.subject, row.body)}
              onClick={() => onMark(row.id, 'opened')}
              className={buttonClass('secondary', 'sm')}
            >
              📧 Poczta
            </a>
            <a
              href={gmailLink(email, row.subject, row.body)}
              target="_blank"
              rel="noreferrer"
              onClick={() => onMark(row.id, 'opened')}
              className={buttonClass('secondary', 'sm')}
            >
              Gmail
            </a>
          </>
        )}
        <Button variant="secondary" size="sm" onClick={copyLink}>
          {copied ? '✓ Skopiowano!' : '🔗 Link'}
        </Button>
      </div>
    </li>
  );
}

function EmailJsPanel(props: {
  pendingCount: number;
  progress: { done: number; total: number } | null;
  onSendAll: () => void;
}) {
  const emailjs = useAppStore((s) => s.emailjs);
  const setEmailJs = useAppStore((s) => s.setEmailJs);
  const template = useAppStore((s) => s.template);
  const configured = isEmailJsConfigured(emailjs);
  const [testTo, setTestTo] = useState('');
  const [testState, setTestState] = useState<{ kind: 'idle' | 'sending' | 'ok' } | { kind: 'error'; message: string }>({
    kind: 'idle',
  });

  const sendTest = async () => {
    setTestState({ kind: 'sending' });
    try {
      const msg = buildMessage(template, PREVIEW_GIVER, PREVIEW_RECEIVER);
      await sendViaEmailJs(emailjs, {
        to_email: testTo.trim(),
        to_name: PREVIEW_GIVER,
        receiver_name: PREVIEW_RECEIVER,
        subject: `[TEST] ${msg.subject}`,
        message: msg.body,
      });
      setTestState({ kind: 'ok' });
    } catch (e) {
      setTestState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Card className="p-0! overflow-hidden">
      <details open={!configured} className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50">
          <span>
            <span className="font-bold text-slate-900">⚡ Automatyczna wysyłka (EmailJS)</span>
            <span className="block text-sm text-slate-500">
              {configured
                ? 'Skonfigurowano — wyniki wyślą się bez pokazywania ich organizatorowi.'
                : 'Darmowa usługa do wysyłania maili prosto z przeglądarki. Konfiguracja zajmuje ok. 5 minut.'}
            </span>
          </span>
          <span className="text-slate-400 transition group-open:rotate-180" aria-hidden>
            ▼
          </span>
        </summary>

        <div className="space-y-4 border-t border-slate-100 px-5 py-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>
              Załóż darmowe konto na{' '}
              <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" className="font-semibold text-red-600 underline">
                emailjs.com
              </a>{' '}
              (ok. 200 maili/mies. za darmo).
            </li>
            <li>
              <strong>Email Services</strong> → dodaj usługę (np. Gmail) → skopiuj <strong>Service ID</strong>.
            </li>
            <li>
              <strong>Email Templates</strong> → nowy szablon: w polu <em>To Email</em> wpisz{' '}
              <code className="rounded bg-slate-100 px-1">{'{{to_email}}'}</code>, w <em>Subject</em>{' '}
              <code className="rounded bg-slate-100 px-1">{'{{subject}}'}</code>, a w treści{' '}
              <code className="rounded bg-slate-100 px-1">{'{{message}}'}</code> → skopiuj <strong>Template ID</strong>.
            </li>
            <li>
              <strong>Account</strong> → skopiuj <strong>Public Key</strong>.
            </li>
          </ol>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Service ID">
              <input className={inputClass} value={emailjs.serviceId} onChange={(e) => setEmailJs({ serviceId: e.target.value })} placeholder="service_xxxxxxx" />
            </Field>
            <Field label="Template ID">
              <input className={inputClass} value={emailjs.templateId} onChange={(e) => setEmailJs({ templateId: e.target.value })} placeholder="template_xxxxxxx" />
            </Field>
            <Field label="Public Key">
              <input className={inputClass} value={emailjs.publicKey} onChange={(e) => setEmailJs({ publicKey: e.target.value })} placeholder="xxxxxxxxxxxxxxx" />
            </Field>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-56 flex-1">
              <Field label="Wyślij próbnego maila (z przykładowymi imionami)">
                <input
                  type="email"
                  className={inputClass}
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="twoj@adres.pl"
                />
              </Field>
            </div>
            <Button
              variant="secondary"
              disabled={!configured || !testTo.trim() || testState.kind === 'sending'}
              onClick={sendTest}
            >
              {testState.kind === 'sending' ? 'Wysyłanie…' : '✉️ Wyślij test'}
            </Button>
          </div>
          {testState.kind === 'ok' && <Alert tone="success">Test wysłany — sprawdź skrzynkę (także SPAM).</Alert>}
          {testState.kind === 'error' && <Alert tone="error" title="Nie udało się wysłać testu">{testState.message}</Alert>}
        </div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
        <p className="text-sm text-slate-600">
          {props.progress
            ? `Wysyłanie ${props.progress.done} / ${props.progress.total}…`
            : props.pendingCount > 0
              ? `Do wysłania: ${props.pendingCount} wiadomości.`
              : 'Wszystkie maile zostały wysłane.'}
        </p>
        <Button
          variant="success"
          disabled={!configured || props.pendingCount === 0 || props.progress !== null}
          onClick={props.onSendAll}
        >
          {props.progress ? '⏳ Wysyłanie…' : `🚀 Wyślij wszystkim (${props.pendingCount})`}
        </Button>
      </div>
      {props.progress && (
        <div className="h-1.5 bg-slate-100">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${(props.progress.done / props.progress.total) * 100}%` }}
          />
        </div>
      )}
    </Card>
  );
}
