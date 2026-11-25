import { useEffect, useMemo, useRef } from 'react';
import { structureSignature } from '../domain/families';
import { validateFamilies } from '../domain/validation';
import { createBackup, downloadJson, parseBackup } from '../services/backup';
import { type StepId, useAppStore } from '../store/useAppStore';
import { DrawStep } from './DrawStep';
import { FamiliesStep } from './FamiliesStep';
import { MessageStep } from './MessageStep';
import { SendStep } from './SendStep';
import { Snow } from './Snow';
import { Button } from './ui';

const STEPS: ReadonlyArray<{ id: StepId; label: string; icon: string }> = [
  { id: 'families', label: 'Rodziny', icon: '👨‍👩‍👧‍👦' },
  { id: 'message', label: 'Wiadomość', icon: '✉️' },
  { id: 'draw', label: 'Losowanie', icon: '🎲' },
  { id: 'send', label: 'Wysyłka', icon: '📬' },
];

export function Wizard() {
  const step = useAppStore((s) => s.step);
  const setStep = useAppStore((s) => s.setStep);
  const families = useAppStore((s) => s.families);
  const template = useAppStore((s) => s.template);
  const draw = useAppStore((s) => s.draw);
  const sendStatus = useAppStore((s) => s.sendStatus);

  const report = useMemo(() => validateFamilies(families), [families]);
  const drawFresh = draw !== null && draw.signature === structureSignature(families);

  const done: Record<StepId, boolean> = {
    families: report.errors.length === 0,
    message: template.body.trim().length > 0,
    draw: drawFresh,
    send: drawFresh && draw.assignments.every((a) => sendStatus[a.giverId] && sendStatus[a.giverId]?.state !== 'error'),
  };
  const canOpen = (id: StepId) => id !== 'send' || drawFresh;

  const index = STEPS.findIndex((s) => s.id === step);
  const prev = STEPS[index - 1];
  const next = STEPS[index + 1];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="relative mx-auto -mt-10 max-w-5xl px-4 pb-20">
        <nav aria-label="Kroki">
          <ol className="grid grid-cols-4 gap-1.5 rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-slate-200/80">
            {STEPS.map((s, i) => {
              const active = s.id === step;
              const enabled = canOpen(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={!enabled}
                    aria-current={active ? 'step' : undefined}
                    onClick={() => setStep(s.id)}
                    className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2.5 text-xs font-semibold transition sm:flex-row sm:gap-2 sm:text-sm ${
                      active
                        ? 'bg-red-600 text-white shadow-md shadow-red-900/20'
                        : enabled
                          ? 'text-slate-600 hover:bg-slate-100'
                          : 'text-slate-300'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                        active ? 'bg-white/20' : done[s.id] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'
                      }`}
                    >
                      {done[s.id] && !active ? '✓' : i + 1}
                    </span>
                    <span>
                      <span className="hidden sm:inline" aria-hidden>
                        {s.icon}{' '}
                      </span>
                      {s.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div key={step} className="animate-fade-in mt-8">
          {step === 'families' && <FamiliesStep />}
          {step === 'message' && <MessageStep />}
          {step === 'draw' && <DrawStep />}
          {step === 'send' && <SendStep />}
        </div>

        <div className="mt-10 flex items-center justify-between gap-3 border-t border-slate-200 pt-6">
          {prev ? (
            <Button variant="secondary" onClick={() => setStep(prev.id)}>
              ← {prev.label}
            </Button>
          ) : (
            <span />
          )}
          {next && (
            <Button onClick={() => setStep(next.id)} disabled={!canOpen(next.id)}>
              Dalej: {next.label} →
            </Button>
          )}
        </div>
      </main>

      <footer className="pb-8 text-center text-xs text-slate-400">
        Dane zapisują się tylko w Twojej przeglądarce. 🎄 Wesołych Świąt!
      </footer>
    </div>
  );
}

function Header() {
  return (
    <header className="relative overflow-hidden bg-linear-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-white">
      <Snow count={28} fall="300px" />
      <div className="relative mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-4 px-4 pt-8 pb-18">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">🎅 Losowanie Mikołajkowe</h1>
          <p className="mt-2 max-w-lg text-emerald-100/85">
            Rodzinne losowanie prezentów: dorośli dla dorosłych, dzieci dla dzieci — nigdy w obrębie własnej rodziny.
          </p>
        </div>
        <DataMenu />
      </div>
    </header>
  );
}

function DataMenu() {
  const families = useAppStore((s) => s.families);
  const loadSample = useAppStore((s) => s.loadSample);
  const importBackup = useAppStore((s) => s.importBackup);
  const resetAll = useAppStore((s) => s.resetAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasData = families.length > 0;

  const exportData = () => {
    const s = useAppStore.getState();
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(
      `losowanie-mikolajkowe-${date}.json`,
      createBackup({ families: s.families, template: s.template, options: s.options, draw: s.draw }),
    );
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      if (!hasData || window.confirm('Import zastąpi obecne dane. Kontynuować?')) importBackup(backup);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Nie udało się wczytać pliku.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="glass"
        size="sm"
        onClick={() => (!hasData || window.confirm('Zastąpić obecne dane przykładowymi?')) && loadSample()}
      >
        📋 Przykład
      </Button>
      <Button variant="glass" size="sm" onClick={exportData} disabled={!hasData}>
        ⬇️ Eksport
      </Button>
      <Button variant="glass" size="sm" onClick={() => fileRef.current?.click()}>
        ⬆️ Import
      </Button>
      <Button
        variant="glass"
        size="sm"
        disabled={!hasData}
        onClick={() => window.confirm('Usunąć wszystkie rodziny, wiadomość i wyniki losowania?') && resetAll()}
      >
        🗑️ Wyczyść
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}
