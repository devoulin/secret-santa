# 🎅 Secret Santa — plan, architektura i zadania

## 1. Cel

Aplikacja do rodzinnego losowania prezentów (Secret Santa / Mikołajki), działająca
**w całości w przeglądarce** (bez własnego backendu).

### Zasady losowania

| Pula     | Kto komu kupuje        | Wykluczenie               |
|----------|------------------------|---------------------------|
| Dorośli  | dorosły → dorosłemu    | nie swojemu małżonkowi (nikomu z własnej rodziny) |
| Dzieci   | dziecko → dziecku      | nie swojemu rodzeństwu (nikomu z własnej rodziny) |

* Nikt nie losuje samego siebie.
* Każdy daje dokładnie jeden prezent i dostaje dokładnie jeden prezent (w obrębie swojej puli).
* „Rodzina" = gospodarstwo domowe. Dorośli z tej samej rodziny traktowani są jak para,
  dzieci z tej samej rodziny — jak rodzeństwo.
* Opcja: **unikaj par wzajemnych** (A → B i jednocześnie B → A), jeśli to możliwe.

### Przepływ użytkownika (kreator w 4 krokach)

1. **Rodziny** — dodajemy rodziny i ich członków (imię, e-mail, dorosły/dziecko).
2. **Wiadomość** — temat + treść maila z placeholderami (domyślny tekst po polsku), budżet, data.
3. **Losowanie** — walidacja i losowanie; wyniki domyślnie **ukryte** (organizator też może brać udział).
4. **Wysyłka** — każdy uczestnik dostaje informację, kogo wylosował:
   * automatycznie przez **EmailJS** (jeśli skonfigurowany),
   * lub ręcznie: przycisk `mailto:` / Gmail z gotową wiadomością,
   * lub **tajny link** (np. do wysłania SMS-em / WhatsAppem), który pokazuje wynik po kliknięciu.

---

## 2. Wybór technologii

| Obszar        | Wybór                         | Dlaczego |
|---------------|-------------------------------|----------|
| Build / dev   | **Vite**                      | błyskawiczny start, zero konfiguracji, statyczny build |
| UI            | **React 19 + TypeScript**     | najpopularniejszy stos — AI pisze go najpewniej; typy łapią błędy |
| Style         | **Tailwind CSS v4**           | style w JSX, brak osobnych plików CSS, jeden import |
| Stan          | **Zustand** + `persist`       | minimalny boilerplate, zapis do `localStorage` za darmo |
| Testy         | **Vitest**                    | ta sama konfiguracja co Vite, testy algorytmu |
| E-mail        | **EmailJS (REST)** + `mailto:` | wysyłka maili bez własnego serwera |
| Hosting (później) | GitHub Pages / Netlify / Vercel | statyczne pliki, darmowe |

---

## 3. Architektura

```
src/
├── domain/                 # czysta logika, bez Reacta — w pełni testowalna
│   ├── types.ts            # Person, Family, Assignment, DrawResult…
│   ├── draw.ts             # algorytm losowania (pule, wykluczenia, walidacja)
│   ├── draw.test.ts
│   ├── message.ts          # szablon wiadomości, placeholdery, domyślny tekst PL
│   ├── message.test.ts
│   ├── reveal.ts           # kodowanie/dekodowanie tajnego linku
│   └── random.ts           # RNG (crypto) + RNG z ziarnem do testów
├── services/
│   ├── emailjs.ts          # wysyłka przez EmailJS REST API
│   └── mailLinks.ts        # generowanie linków mailto: / Gmail
├── store/
│   └── useAppStore.ts      # Zustand: rodziny, wiadomość, ustawienia, wynik (persist)
├── components/             # UI
│   ├── Stepper.tsx
│   ├── FamiliesStep.tsx    # krok 1
│   ├── MessageStep.tsx     # krok 2
│   ├── DrawStep.tsx        # krok 3
│   ├── SendStep.tsx        # krok 4
│   ├── RevealPage.tsx      # strona tajnego linku (#/odkryj/…)
│   └── ui/                 # drobne, wspólne komponenty (Button, Card…)
├── App.tsx                 # routing hash: kreator vs. strona odkrycia
└── main.tsx
```

### Zasady architektury

* **Domena oddzielona od UI.** `src/domain` nie importuje Reacta — algorytm da się
  przetestować i później przenieść na backend bez zmian.
* **Jedno źródło prawdy** — store Zustand, zapisywany w `localStorage`
  (odświeżenie strony niczego nie gubi). Eksport/import JSON do backupu.
* **Losowość:** `crypto.getRandomValues` w produkcji, RNG z ziarnem w testach.
* **Routing:** hash (`#/odkryj/<kod>`) — działa na każdym statycznym hostingu bez konfiguracji.

### Algorytm losowania (`domain/draw.ts`)

Dla każdej puli osobno (dorośli, dzieci):

1. **Walidacja wykonalności** (warunek Halla dla grup): jeśli jakakolwiek rodzina ma
   więcej niż połowę uczestników puli, losowanie jest niemożliwe → czytelny komunikat.
   Pula z 1 osobą (lub pusta z 1 osobą) → komunikat.
2. **Losowanie jednostajne przez odrzucanie:** losowa permutacja odbiorców, akceptujemy
   jeśli spełnia wszystkie reguły. Daje każdemu poprawnemu wynikowi równe szanse.
3. **Fallback — backtracking** z losową kolejnością kandydatów (najpierw najbardziej
   ograniczeni darczyńcy) — gdy odrzucanie nie trafi w limicie prób. Backtracking jest
   wyczerpujący, więc jeśli on nie znajdzie rozwiązania, to rozwiązanie nie istnieje.
4. Opcja „unikaj par wzajemnych" — najpierw próbujemy z tą regułą, a jeśli się nie da,
   losujemy bez niej i pokazujemy ostrzeżenie.

### Tajny link (`domain/reveal.ts`)

`#/odkryj/<base64url(JSON{od, dla, wiadomość})>` — strona pokazuje animowane „otwarcie
prezentu". To **zaciemnienie, nie szyfrowanie** — wystarczające w rodzinie; w wersji
publicznej zastąpione backendem (patrz zadania F3).

### E-mail

* **EmailJS** (darmowy plan ~200 maili/mies.): użytkownik podaje `Service ID`,
  `Template ID`, `Public Key`. Szablon w EmailJS używa zmiennych `{{to_email}}`,
  `{{to_name}}`, `{{subject}}`, `{{message}}`. Wysyłka sekwencyjna z odstępem (limit API).
* **Bez konfiguracji:** przycisk `mailto:` (domyślny klient poczty) i „Otwórz w Gmailu".

---

## 4. Zadania

Legenda: ✅ zrobione w tej iteracji · ⬜ do zrobienia

### Faza 0 — Fundamenty
* ✅ **F0.1** Szkielet projektu: Vite + React + TS + Tailwind + Vitest.
* ✅ **F0.2** Typy domenowe (`Person`, `Family`, `Assignment`, `DrawResult`).
* ✅ **F0.3** Store Zustand z persystencją w `localStorage`.

### Faza 1 — MVP (na tegoroczne Święta)
* ✅ **F1.1** Algorytm losowania z pulami i wykluczeniami + testy jednostkowe.
* ✅ **F1.2** Walidacja wykonalności z czytelnymi komunikatami po polsku.
* ✅ **F1.3** Krok „Rodziny": dodawanie/edycja/usuwanie rodzin i osób, typ dorosły/dziecko.
* ✅ **F1.4** Krok „Wiadomość": temat, treść z placeholderami, budżet, data, podgląd.
* ✅ **F1.5** Krok „Losowanie": losowanie, ukryte wyniki z opcją podglądu, ponowne losowanie.
* ✅ **F1.6** Krok „Wysyłka": `mailto:`, Gmail, tajny link, EmailJS (masowa wysyłka + statusy).
* ✅ **F1.7** Strona tajnego linku z animacją.
* ✅ **F1.8** Eksport/import JSON, przykładowe dane, reset.

### Faza 2 — Jakość i wygoda
* ⬜ **F2.1** Testy komponentów (React Testing Library) i E2E (Playwright).
* ⬜ **F2.2** Dodatkowe wykluczenia per osoba (np. „nie losuj tego samego co w zeszłym roku").
* ⬜ **F2.3** Historia losowań (poprzednie lata) i wykluczanie powtórek.
* ⬜ **F2.4** Lista życzeń dla każdej osoby dołączana do maila.
* ⬜ **F2.5** Dostępność (a11y): nawigacja klawiaturą, kontrast, ARIA — audyt Lighthouse.
* ⬜ **F2.6** PWA (działanie offline, ikona na telefonie).
* ⬜ **F2.7** CI (GitHub Actions): lint, typecheck, testy, build.

### Faza 3 — Wersja publiczna (dla ludzi)
* ⬜ **F3.1** Backend (np. Supabase / Cloudflare Workers): przechowywanie losowań na serwerze,
  organizator **nie widzi** wyników (prawdziwa tajność zamiast zaciemnienia w linku).
* ⬜ **F3.2** Wysyłka maili po stronie serwera (Resend / SendGrid / AWS SES) — bez kluczy w przeglądarce,
  własna domena, SPF/DKIM, ochrona przed spamem i nadużyciami (rate limiting, CAPTCHA).
* ⬜ **F3.3** Konta / magic-link dla organizatorów, wiele grup, zaproszenia uczestników
  (każdy sam wpisuje swój e-mail i listę życzeń).
* ⬜ **F3.4** RODO: polityka prywatności, zgoda na przetwarzanie e-maili, usuwanie danych po wydarzeniu.
* ⬜ **F3.5** i18n (PL/EN), konfigurowalne reguły (więcej pul, dowolne grupy wykluczeń).
* ⬜ **F3.6** Domena, hosting, monitoring błędów (Sentry), analityka bez cookies (Plausible).
* ⬜ **F3.7** Anonimowy czat „zapytaj swojego Mikołaja" (pytania o rozmiar, preferencje).

---

## 5. Uruchomienie

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # testy algorytmu
npm run build    # statyczny build do dist/
```
