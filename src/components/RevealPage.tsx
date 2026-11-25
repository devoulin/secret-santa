import { useMemo, useState } from 'react';
import { decodeReveal } from '../domain/reveal';
import { Snow } from './Snow';
import { buttonClass } from './ui';

/** Strona otwierana z tajnego linku — pokazuje jeden wynik, z animacją otwierania prezentu. */
export function RevealPage({ code }: { code: string }) {
  const data = useMemo(() => decodeReveal(code), [code]);
  const [opened, setOpened] = useState(false);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-b from-emerald-950 via-emerald-900 to-emerald-800 px-4 py-12 text-white">
      <Snow count={45} />
      <div className="relative w-full max-w-lg text-center">
        {!data ? (
          <>
            <div className="text-7xl" aria-hidden>
              🤔
            </div>
            <h1 className="mt-4 text-2xl font-extrabold">Ten link wygląda na uszkodzony</h1>
            <p className="mt-2 text-emerald-100/80">
              Upewnij się, że skopiowano go w całości, albo poproś organizatora o nowy.
            </p>
          </>
        ) : (
          <>
            <p className="text-lg text-emerald-100/90">Ho, ho, ho! 🎄</p>
            <h1 className="mt-1 text-4xl font-extrabold tracking-tight">Cześć {data.giver}!</h1>

            {!opened ? (
              <>
                <button
                  type="button"
                  onClick={() => setOpened(true)}
                  className="animate-wiggle mt-10 inline-block text-[9rem] leading-none drop-shadow-2xl transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-amber-300"
                  aria-label="Otwórz prezent i zobacz wynik"
                >
                  🎁
                </button>
                <p className="mt-6 text-emerald-100/90">Kliknij prezent, żeby zobaczyć, kogo wylosowałeś/aś</p>
                <p className="mt-1 text-sm text-emerald-200/60">(upewnij się, że nikt nie zagląda Ci przez ramię 👀)</p>
              </>
            ) : (
              <div className="animate-pop mt-8 rounded-3xl bg-white/10 p-8 shadow-2xl ring-1 ring-white/20 backdrop-blur">
                <p className="text-emerald-100/90">W tym roku przygotowujesz prezent dla:</p>
                <p className="mt-3 text-5xl font-extrabold break-words text-amber-300 drop-shadow">{data.receiver}</p>
                {(data.budget || data.date) && (
                  <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
                    {data.budget && <span className="rounded-full bg-white/15 px-4 py-1.5">💰 Budżet: {data.budget}</span>}
                    {data.date && <span className="rounded-full bg-white/15 px-4 py-1.5">📅 {data.date}</span>}
                  </div>
                )}
                <p className="mt-6 text-lg">🤫 Ćśś… to tajemnica!</p>
              </div>
            )}
          </>
        )}

        <a href="#/" className={buttonClass('glass', 'sm', 'mt-12')}>
          🎅 Zorganizuj własne losowanie
        </a>
      </div>
    </div>
  );
}
