# 🎅 Losowanie Mikołajkowe (Secret Santa)

Rodzinne losowanie prezentów działające w całości w przeglądarce.

* **Dorośli** losują dorosłych, **dzieci** losują dzieci.
* Nikt nie losuje nikogo z **własnej rodziny** (małżonka / rodzeństwa).
* Opcjonalnie: bez par wzajemnych (A → B i B → A).
* Wyniki rozsyłane przez **EmailJS**, ręcznie (`mailto:` / Gmail) albo **tajnym linkiem**.
* Dziecko bez e-maila dostaje wiadomość przez rodzica.
* Dane zapisują się w `localStorage`. Jest też eksport i import JSON.

## Start

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testy algorytmu i szablonów
npm run build      # statyczny build w dist/ (do wrzucenia na dowolny hosting)
```

## Wysyłka maili (EmailJS)

1. Załóż konto na [emailjs.com](https://www.emailjs.com) (darmowy plan: ok. 200 maili/mies.).
2. **Email Services**: dodaj usługę (np. Gmail) i skopiuj *Service ID*.
3. **Email Templates**: utwórz szablon, w którym *To Email* = `{{to_email}}`, *Subject* = `{{subject}}`, treść = `{{message}}`. Skopiuj *Template ID*.
4. **Account**: skopiuj *Public Key*.
5. Wklej te trzy wartości w kroku „Wysyłka” i wyślij najpierw maila testowego.

## Tajne linki

Link `#/odkryj/<kod>` pokazuje jednej osobie jej wynik. Linki zawsze prowadzą do adresu z
`VITE_PUBLIC_URL` w pliku `.env` (obecnie https://devoulin.github.io/secret-santa/), więc działają u innych
także wtedy, gdy losujesz w wersji lokalnej. Bez tej zmiennej linki prowadzą do bieżącego adresu strony.
Kod jest zaciemniony (base64url), a nie zaszyfrowany.

Gdy kilka osób ma ten sam adres e-mail (np. dziecko przez rodzica albo para ze wspólną skrzynką),
temat wiadomości dostaje dopisek „(dla: imię)”, żeby maile nie skleiły się w jeden wątek.

## Dokumentacja

Plan, architektura i lista zadań do wersji publicznej: [docs/PLAN.md](docs/PLAN.md).
