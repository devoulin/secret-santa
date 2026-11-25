import { useRef } from 'react';
import { buildMessage, PLACEHOLDERS } from '../domain/message';
import { useAppStore } from '../store/useAppStore';
import { Button, Card, Field, inputClass, StepHeader } from './ui';

export const PREVIEW_GIVER = 'Ania';
export const PREVIEW_RECEIVER = 'Wujek Marek';

export function MessageStep() {
  const template = useAppStore((s) => s.template);
  const setTemplate = useAppStore((s) => s.setTemplate);
  const resetTemplate = useAppStore((s) => s.resetTemplate);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const preview = buildMessage(template, PREVIEW_GIVER, PREVIEW_RECEIVER);

  const insertPlaceholder = (token: string) => {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    setTemplate({ body: template.body.slice(0, start) + token + template.body.slice(end) });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <div className="space-y-5">
      <StepHeader
        title="Co napisze Mikołaj?"
        description={
          <>
            Ta wiadomość trafi do każdego uczestnika. Słowa w klamrach, np. <code>{'{osoba}'}</code>, zostaną
            podmienione na imiona. Linia z pustym polem (np. bez budżetu) zniknie z wiadomości automatycznie.
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="💰 Budżet" hint="wstawiany w miejsce {budzet}">
              <input
                className={inputClass}
                value={template.budget}
                onChange={(e) => setTemplate({ budget: e.target.value })}
                placeholder="np. 100 zł"
              />
            </Field>
            <Field label="📅 Data wręczenia" hint="wstawiana w miejsce {data}">
              <input
                className={inputClass}
                value={template.eventDate}
                onChange={(e) => setTemplate({ eventDate: e.target.value })}
                placeholder="np. 24 grudnia"
              />
            </Field>
          </div>

          <Field label="Temat">
            <input
              className={inputClass}
              value={template.subject}
              onChange={(e) => setTemplate({ subject: e.target.value })}
            />
          </Field>

          <Field label="Treść">
            <textarea
              ref={bodyRef}
              rows={16}
              className={`${inputClass} resize-y font-mono text-[13px] leading-relaxed`}
              value={template.body}
              onChange={(e) => setTemplate({ body: e.target.value })}
            />
          </Field>

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">Wstaw w miejscu kursora:</p>
            <div className="flex flex-wrap gap-2">
              {PLACEHOLDERS.map((p) => (
                <button
                  key={p.token}
                  type="button"
                  title={p.description}
                  onClick={() => insertPlaceholder(p.token)}
                  className="rounded-full bg-amber-100 px-3 py-1 font-mono text-xs font-semibold text-amber-900 ring-1 ring-amber-200 transition hover:bg-amber-200"
                >
                  {p.token}
                </button>
              ))}
            </div>
            <ul className="mt-3 space-y-0.5 text-xs text-slate-500">
              {PLACEHOLDERS.map((p) => (
                <li key={p.token}>
                  <code className="font-semibold text-slate-700">{p.token}</code> — {p.description}
                </li>
              ))}
            </ul>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.confirm('Przywrócić domyślny temat i treść wiadomości?') && resetTemplate()}
          >
            ↺ Przywróć domyślną wiadomość
          </Button>
        </Card>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Podgląd (przykładowe imiona)
          </p>
          <EmailPreview to={PREVIEW_GIVER} subject={preview.subject} body={preview.body} />
        </div>
      </div>
    </div>
  );
}

export function EmailPreview({ to, subject, body }: { to: string; subject: string; body: string }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <div className="space-y-1 border-b border-slate-100 bg-slate-50 px-5 py-3 text-sm">
        <p>
          <span className="text-slate-500">Od:</span> <strong>Święty Mikołaj 🎅</strong>
        </p>
        <p>
          <span className="text-slate-500">Do:</span> {to}
        </p>
        <p>
          <span className="text-slate-500">Temat:</span> <strong>{subject || '(brak tematu)'}</strong>
        </p>
      </div>
      <div className="px-5 py-4 text-[15px] leading-relaxed whitespace-pre-wrap text-slate-800">
        {body || <span className="text-slate-400">(pusta wiadomość)</span>}
      </div>
    </div>
  );
}
