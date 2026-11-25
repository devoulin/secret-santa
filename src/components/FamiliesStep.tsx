import { useMemo, useState } from 'react';
import type { Family, Person, PersonKind } from '../domain/types';
import { displayFamilyName, isValidEmail, structureSignature } from '../domain/families';
import { POOL_KINDS, POOL_LABELS } from '../domain/draw';
import { validateFamilies, type ValidationReport } from '../domain/validation';
import { useAppStore } from '../store/useAppStore';
import { Alert, Button, Card, IconButton, inputClass, StepHeader } from './ui';

export function FamiliesStep() {
  const families = useAppStore((s) => s.families);
  const draw = useAppStore((s) => s.draw);
  const addFamily = useAppStore((s) => s.addFamily);
  const loadSample = useAppStore((s) => s.loadSample);
  const [focusFamilyId, setFocusFamilyId] = useState<string | null>(null);

  const report = useMemo(() => validateFamilies(families), [families]);
  const stale = draw !== null && draw.signature !== structureSignature(families);

  return (
    <div className="space-y-5">
      <StepHeader
        title="Kto bierze udział?"
        description={
          <>
            Dodaj rodziny, czyli gospodarstwa domowe. Osoby z jednej rodziny <strong>nigdy nie wylosują siebie
            nawzajem</strong> — małżonkowie nie kupują prezentów sobie, a rodzeństwo sobie. Dorośli losują dorosłych,
            dzieci losują dzieci.
          </>
        }
      />

      {draw && !stale && (
        <Alert tone="info">
          Losowanie jest już zrobione. Poprawki imion i e-maili są bezpieczne, ale dodanie lub usunięcie osoby albo
          zmiana dorosły ↔ dziecko będzie wymagać ponownego losowania.
        </Alert>
      )}
      {stale && (
        <Alert tone="warning" title="Uczestnicy zmienili się od ostatniego losowania">
          Poprzednie wyniki są nieaktualne — przejdź do kroku „Losowanie" i wylosuj ponownie.
        </Alert>
      )}

      {families.length === 0 ? (
        <Card className="py-12 text-center">
          <div className="text-6xl" aria-hidden>
            🎄
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">Nie ma jeszcze żadnej rodziny</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Zacznij od dodania pierwszej rodziny albo wczytaj przykładowe dane, żeby zobaczyć, jak to działa.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => setFocusFamilyId(addFamily())}>+ Dodaj pierwszą rodzinę</Button>
            <Button variant="secondary" onClick={loadSample}>
              📋 Wczytaj przykładowe dane
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {families.map((family) => (
            <FamilyCard key={family.id} family={family} autoFocus={family.id === focusFamilyId} />
          ))}
          <button
            type="button"
            onClick={() => setFocusFamilyId(addFamily())}
            className="w-full rounded-2xl border-2 border-dashed border-slate-300 py-4 font-semibold text-slate-500 transition hover:border-red-400 hover:bg-white hover:text-red-600"
          >
            + Dodaj rodzinę
          </button>
        </>
      )}

      {families.length > 0 && <Summary report={report} />}
    </div>
  );
}

function FamilyCard({ family, autoFocus }: { family: Family; autoFocus: boolean }) {
  const updateFamily = useAppStore((s) => s.updateFamily);
  const removeFamily = useAppStore((s) => s.removeFamily);
  const addPerson = useAppStore((s) => s.addPerson);
  const [focusPersonId, setFocusPersonId] = useState<string | null>(null);

  const adults = family.members.filter((m) => m.kind === 'adult');
  const children = family.members.filter((m) => m.kind === 'child');

  const remove = () => {
    if (
      family.members.length === 0 ||
      window.confirm(`Usunąć rodzinę „${displayFamilyName(family)}" razem z osobami (${family.members.length})?`)
    ) {
      removeFamily(family.id);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>
          🏠
        </span>
        <input
          autoFocus={autoFocus}
          value={family.name}
          onChange={(e) => updateFamily(family.id, { name: e.target.value })}
          placeholder="Nazwa rodziny, np. Kowalscy"
          aria-label="Nazwa rodziny"
          className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 text-lg font-bold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:bg-slate-50 focus:bg-slate-50 focus:ring-2 focus:ring-red-500"
        />
        <span className="hidden text-xs text-slate-500 sm:inline">
          {adults.length} dor. · {children.length} dz.
        </span>
        <IconButton title="Usuń rodzinę" onClick={remove}>
          🗑️
        </IconButton>
      </div>

      <div className="mt-3 space-y-4">
        {family.members.length === 0 && (
          <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500">
            Dodaj dorosłych i dzieci z tej rodziny przyciskami poniżej.
          </p>
        )}
        <PersonGroup
          title="Dorośli"
          hint="losują innych dorosłych, ale nie siebie nawzajem"
          family={family}
          people={adults}
          focusPersonId={focusPersonId}
        />
        <PersonGroup
          title="Dzieci"
          hint="losują inne dzieci, ale nie rodzeństwo"
          family={family}
          people={children}
          focusPersonId={focusPersonId}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => setFocusPersonId(addPerson(family.id, 'adult'))}>
          + 🧑 Dorosły
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setFocusPersonId(addPerson(family.id, 'child'))}>
          + 🧒 Dziecko
        </Button>
      </div>
    </Card>
  );
}

function PersonGroup(props: {
  title: string;
  hint: string;
  family: Family;
  people: Person[];
  focusPersonId: string | null;
}) {
  if (props.people.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {props.title} <span className="font-normal tracking-normal normal-case">— {props.hint}</span>
      </p>
      <div className="space-y-2">
        {props.people.map((person) => (
          <PersonRow
            key={person.id}
            family={props.family}
            person={person}
            autoFocus={person.id === props.focusPersonId}
          />
        ))}
      </div>
    </div>
  );
}

function PersonRow({ family, person, autoFocus }: { family: Family; person: Person; autoFocus: boolean }) {
  const updatePerson = useAppStore((s) => s.updatePerson);
  const removePerson = useAppStore((s) => s.removePerson);
  const email = person.email.trim();
  const emailInvalid = email !== '' && !isValidEmail(email);
  const isChild = person.kind === 'child';

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2">
      <input
        autoFocus={autoFocus}
        value={person.name}
        onChange={(e) => updatePerson(family.id, person.id, { name: e.target.value })}
        placeholder={isChild ? 'Imię dziecka' : 'Imię (i nazwisko)'}
        aria-label="Imię"
        className={`${inputClass} min-w-40 flex-1`}
      />
      <input
        type="email"
        value={person.email}
        onChange={(e) => updatePerson(family.id, person.id, { email: e.target.value })}
        placeholder={isChild ? 'e-mail (opcjonalnie — inaczej do rodzica)' : 'adres e-mail'}
        aria-label="E-mail"
        aria-invalid={emailInvalid}
        className={`${inputClass} min-w-56 flex-[1.4] ${emailInvalid ? 'ring-red-400' : ''}`}
      />
      <KindToggle value={person.kind} onChange={(kind) => updatePerson(family.id, person.id, { kind })} />
      <IconButton title="Usuń osobę" onClick={() => removePerson(family.id, person.id)}>
        ✕
      </IconButton>
    </div>
  );
}

function KindToggle({ value, onChange }: { value: PersonKind; onChange: (kind: PersonKind) => void }) {
  const options: Array<[PersonKind, string]> = [
    ['adult', '🧑 Dorosły'],
    ['child', '🧒 Dziecko'],
  ];
  return (
    <div role="radiogroup" aria-label="Pula" className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-xs font-semibold">
      {options.map(([kind, label]) => (
        <button
          key={kind}
          type="button"
          role="radio"
          aria-checked={value === kind}
          onClick={() => onChange(kind)}
          className={`rounded-md px-2.5 py-1.5 transition ${
            value === kind ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Summary({ report }: { report: ValidationReport }) {
  const poolErrors = POOL_KINDS.map((k) => report.pools[k].error).filter(Boolean);
  const otherErrors = report.errors.filter((e) => !poolErrors.includes(e));

  return (
    <Card className="space-y-4">
      <h3 className="font-bold text-slate-900">Podsumowanie</h3>
      <div className="grid grid-cols-3 gap-3">
        <Stat icon="🏠" label="Rodziny" value={report.counts.families} />
        <Stat icon="🧑" label="Dorośli" value={report.counts.adults} />
        <Stat icon="🧒" label="Dzieci" value={report.counts.children} />
      </div>

      <ul className="space-y-2 text-sm">
        {POOL_KINDS.map((kind) => {
          const pool = report.pools[kind];
          return (
            <li key={kind} className="flex gap-2">
              <span aria-hidden>{pool.error ? '❌' : pool.count === 0 ? '➖' : '✅'}</span>
              <span className={pool.error ? 'text-red-700' : 'text-slate-700'}>
                {pool.error ??
                  (pool.count === 0
                    ? `Pula „${POOL_LABELS[kind]}": brak osób — ta pula zostanie pominięta.`
                    : `Pula „${POOL_LABELS[kind]}": ${pool.count} os. — losowanie możliwe.`)}
              </span>
            </li>
          );
        })}
        {otherErrors.map((e) => (
          <li key={e} className="flex gap-2 text-red-700">
            <span aria-hidden>❌</span>
            {e}
          </li>
        ))}
      </ul>

      {report.warnings.length > 0 && (
        <Alert tone="warning" title={`Do sprawdzenia (${report.warnings.length})`}>
          <ul className="list-disc space-y-0.5 pl-4">
            {report.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Alert>
      )}
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <div className="text-xl" aria-hidden>
        {icon}
      </div>
      <div className="text-2xl font-extrabold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
