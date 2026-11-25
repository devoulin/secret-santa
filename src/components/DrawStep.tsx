import { useEffect, useMemo, useState } from 'react';
import { drawAll, POOL_KINDS, POOL_LABELS } from '../domain/draw';
import { displayFamilyName, displayName, findPerson, structureSignature } from '../domain/families';
import { cryptoRng } from '../domain/random';
import { validateFamilies } from '../domain/validation';
import { useAppStore } from '../store/useAppStore';
import { Alert, Button, Card, StepHeader } from './ui';

const ROLL_DURATION_MS = 1800;

export function DrawStep() {
  const families = useAppStore((s) => s.families);
  const options = useAppStore((s) => s.options);
  const setOptions = useAppStore((s) => s.setOptions);
  const draw = useAppStore((s) => s.draw);
  const setDraw = useAppStore((s) => s.setDraw);
  const sendStatus = useAppStore((s) => s.sendStatus);
  const setStep = useAppStore((s) => s.setStep);

  const [rolling, setRolling] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);

  const report = useMemo(() => validateFamilies(families), [families]);
  const signature = structureSignature(families);
  const fresh = draw !== null && draw.signature === signature;
  const stale = draw !== null && !fresh;
  const alreadySent = Object.keys(sendStatus).length > 0;

  const run = () => {
    if (
      alreadySent &&
      !window.confirm(
        'Część wyników została już przekazana uczestnikom. Nowe losowanie unieważni poprzednie wyniki i trzeba będzie wysłać wszystko jeszcze raz. Kontynuować?',
      )
    ) {
      return;
    }
    setShowResults(false);
    setErrors([]);
    setRolling(true);
    window.setTimeout(() => {
      const current = useAppStore.getState().families;
      const outcome = drawAll(current, { avoidMutual: options.avoidMutual, rng: cryptoRng });
      if (outcome.ok) {
        setDraw({
          assignments: outcome.assignments,
          warnings: outcome.warnings,
          createdAt: new Date().toISOString(),
          signature: structureSignature(current),
        });
      } else {
        setErrors(outcome.errors);
      }
      setRolling(false);
    }, ROLL_DURATION_MS);
  };

  const revealResults = () => {
    if (
      window.confirm(
        'Na pewno chcesz zobaczyć wszystkie wyniki?\n\nJeśli sam(a) bierzesz udział w losowaniu, zepsujesz sobie niespodziankę 🙈',
      )
    ) {
      setShowResults(true);
    }
  };

  const pairsPerPool = (kind: 'adult' | 'child') =>
    draw?.assignments.filter((a) => findPerson(families, a.giverId)?.person.kind === kind).length ?? 0;

  return (
    <div className="space-y-5">
      <StepHeader
        title="Czas na losowanie!"
        description="Mikołaj wymiesza karteczki zgodnie z zasadami. Wyniki są domyślnie ukryte — organizator też może brać udział, nie psując sobie niespodzianki."
      />

      {report.errors.length > 0 ? (
        <Alert tone="error" title="Losowanie jest na razie niemożliwe">
          <ul className="list-disc space-y-0.5 pl-4">
            {report.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => setStep('families')}>
            ← Popraw listę rodzin
          </Button>
        </Alert>
      ) : (
        <>
          <Card>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={options.avoidMutual}
                onChange={(e) => setOptions({ avoidMutual: e.target.checked })}
                className="mt-1 h-4 w-4 accent-red-600"
              />
              <span>
                <span className="font-semibold text-slate-900">Unikaj par wzajemnych</span>
                <span className="block text-sm text-slate-600">
                  Jeśli Ania kupuje prezent dla Kuby, to Kuba nie kupuje dla Ani. Ciekawsze losowanie — wszyscy
                  zostają „połączeni w łańcuch".
                </span>
              </span>
            </label>
          </Card>

          {rolling ? (
            <RollingAnimation />
          ) : fresh && draw ? (
            <Card className="text-center">
              <div className="animate-pop text-6xl" aria-hidden>
                🎉
              </div>
              <h3 className="mt-3 text-xl font-extrabold text-slate-900">Losowanie gotowe!</h3>
              <p className="mt-1 text-slate-600">
                {POOL_KINDS.filter((k) => pairsPerPool(k) > 0)
                  .map((k) => `${POOL_LABELS[k]}: ${pairsPerPool(k)} os.`)
                  .join(' · ')}
                <span className="block text-xs text-slate-400">
                  wylosowano {new Date(draw.createdAt).toLocaleString('pl-PL')}
                </span>
              </p>
              {draw.warnings.length > 0 && (
                <div className="mt-4 text-left">
                  <Alert tone="warning">
                    {draw.warnings.map((w) => (
                      <p key={w}>{w}</p>
                    ))}
                  </Alert>
                </div>
              )}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button size="lg" onClick={() => setStep('send')}>
                  📬 Przejdź do wysyłki
                </Button>
                <Button variant="secondary" size="lg" onClick={run}>
                  🔁 Losuj ponownie
                </Button>
              </div>
              <div className="mt-4">
                {showResults ? (
                  <Button variant="ghost" size="sm" onClick={() => setShowResults(false)}>
                    🙈 Ukryj wyniki
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={revealResults}>
                    👀 Pokaż wszystkie wyniki
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <Card className="py-10 text-center">
              {stale && (
                <div className="mb-6 text-left">
                  <Alert tone="warning" title="Poprzednie losowanie jest nieaktualne">
                    Uczestnicy zmienili się od ostatniego losowania — wylosuj ponownie.
                  </Alert>
                </div>
              )}
              <div className="animate-wiggle inline-block text-7xl" aria-hidden>
                🎁
              </div>
              <p className="mt-4 text-slate-600">
                {report.counts.total} uczestników · {report.counts.families} rodzin
              </p>
              <Button size="lg" className="mt-6" onClick={run}>
                🎲 Losuj!
              </Button>
            </Card>
          )}

          {errors.length > 0 && (
            <Alert tone="error" title="Nie udało się wylosować">
              {errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </Alert>
          )}

          {showResults && fresh && draw && <ResultsTable />}
        </>
      )}
    </div>
  );
}

function RollingAnimation() {
  const families = useAppStore((s) => s.families);
  const names = useMemo(
    () => families.flatMap((f) => f.members.map((m) => displayName(m))),
    [families],
  );
  const [name, setName] = useState(names[0] ?? '');

  useEffect(() => {
    const id = window.setInterval(() => {
      setName(names[Math.floor(Math.random() * names.length)] ?? '');
    }, 90);
    return () => window.clearInterval(id);
  }, [names]);

  return (
    <Card className="py-12 text-center">
      <div className="animate-shake inline-block text-7xl" aria-hidden>
        🎅
      </div>
      <p className="mt-4 font-semibold text-slate-700" role="status">
        Mikołaj miesza karteczki w worku…
      </p>
      <p aria-hidden className="mt-2 h-8 text-2xl font-extrabold text-red-600">
        {name}
      </p>
    </Card>
  );
}

function ResultsTable() {
  const families = useAppStore((s) => s.families);
  const draw = useAppStore((s) => s.draw);
  if (!draw) return null;

  return (
    <Card className="animate-fade-in">
      <h3 className="font-bold text-slate-900">Wszystkie wyniki</h3>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        {POOL_KINDS.map((kind) => {
          const rows = draw.assignments
            .map((a) => ({ giver: findPerson(families, a.giverId), receiver: findPerson(families, a.receiverId) }))
            .filter((r) => r.giver?.person.kind === kind);
          if (rows.length === 0) return null;
          return (
            <div key={kind}>
              <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{POOL_LABELS[kind]}</p>
              <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                {rows.map(({ giver, receiver }) => (
                  <li key={giver?.person.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">
                      <strong>{displayName(giver?.person)}</strong>{' '}
                      <span className="text-xs text-slate-400">{displayFamilyName(giver?.family)}</span>
                    </span>
                    <span aria-label="kupuje dla" className="text-red-500">
                      🎁→
                    </span>
                    <span className="min-w-0 flex-1 truncate text-right">
                      <strong>{displayName(receiver?.person)}</strong>{' '}
                      <span className="text-xs text-slate-400">{displayFamilyName(receiver?.family)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
