# eGrant Extrakcia — frontend

Frontend pre **Zadanie 1: AI extrakcia údajov z nahraných súborov** (eGrant hackathon).
Používateľ nahrá doklad (faktúru, bloček, výpis…), AI z neho vytiahne údaje, formulár sa predvyplní
a používateľ ich skontroluje a potvrdí.

## Spustenie

```bash
npm install
npm run dev
```

Aplikácia beží na http://localhost:5173.

## Režimy

Skopírujte `.env.example` do `.env.local` a nastavte:

| Premenná | Význam |
|---|---|
| `VITE_USE_MOCK=true` | Odpovede servera sú simulované (`src/api/mock.ts`), backend netreba. **Predvolené.** |
| `VITE_USE_MOCK=false` | Volá sa skutočný backend cez `/api` |
| `VITE_BACKEND_URL` | Kam dev server presmeruje `/api` (predvolene `http://localhost:8000`) |

## Štruktúra

```
src/
├── api/
│   ├── types.ts        dátový kontrakt s backendom (tagy, confidence, evidence…)
│   ├── client.ts       volania API (mock alebo skutočný backend)
│   └── mock.ts         falošné dáta pre vývoj
├── features/
│   ├── upload/         #9, #10 — nahratie dokladu a validácia
│   ├── processing/     #11 — priebeh spracovania (polling stavu)
│   └── review/         #12–15 — kontrola, úprava a potvrdenie údajov
├── lib/                istota → stav poľa, formáty čísel/dátumov, kontrola IČO
├── pages/              ostatné obrazovky
└── components/         spoločné komponenty (Layout…)
```

## Stav úloh

- [x] #9 Upload screen
- [x] #10 Validácia na frontende (typ, veľkosť do 20 MB, prázdny súbor, jeden súbor naraz)
- [x] #11 Processing screen
- [x] #12 Result screen
- [x] #13 Editovateľné polia
- [x] #14 Zobrazenie chýbajúcich hodnôt
- [x] #15 Vizuálne označenie istoty
- [ ] #16 Napojenie na backend API
- [ ] #17 Zoznam dokumentov
- [ ] #18 Export JSON
- [ ] #19 Export XLSX

## Demo tipy (mock režim)

- Ľubovoľný PDF/JPG prejde spracovaním a zobrazí ukážkovú faktúru s rôznou istotou polí.
- Súbor, ktorého názov obsahuje `chyba` (napr. `sken_chyba.pdf`), skončí chybou rozpoznávania.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7.
