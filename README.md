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
│   └── export/         #18, #19 — export do JSON a Excelu
├── pages/              DocumentsPage (#17), NotFoundPage
├── lib/                istota → stav poľa, formáty, kontrola IČO, história nahratí
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
- [x] #16 Napojenie na backend API (upload, priebeh, výsledok z AI orchestrátora; zoznam a potvrdenie majú záložné riešenie, kým ich backend nedoplní)
- [x] #17 Zoznam dokumentov
- [x] #18 Export JSON
- [x] #19 Export XLSX

## Demo tipy (mock režim)

- Mock vracia presne tvar Laravel `DocumentResource` a ide cez ten istý adaptér ako ostrý backend.
- Doklad „faktura_FA-2026-001.pdf“ v zozname = oficiálna ukážka AI orchestrátora (BBSK formulár, riadok tabuľky namapovaný na tagy).
- Nový nahratý doklad = stav ako dnes v backende (orchestrátor bez formulára → univerzálne údaje).
- Súbor, ktorého názov obsahuje `chyba` (napr. `sken_chyba.pdf`), skončí chybou rozpoznávania.

## Napojenie na backend (VITE_USE_MOCK=false)

| Endpoint | Stav v backende | Ako ho frontend používa |
|---|---|---|
| `POST /api/documents` | hotové (PDF, JPG, PNG, TIFF, WEBP, BMP; do 20 MB) | nahratie dokladu |
| `GET /api/documents/{id}?include=ocr` | hotové (`DocumentResource`: document + extracted + validation) | priebeh, výsledok AI, rozpoznaný text — prevod v `src/api/adapter.ts` |
| `GET /api/documents` | hotové (stránkovanie po 50) | zoznam dokladov (záložne z histórie v prehliadači) |
| `POST /api/documents/{id}/confirm` | hotové (`{ values, tables }` → `confirmed`) | potvrdenie; po obnovení stránky sa zobrazia potvrdené hodnoty |

Ako frontend číta výsledok AI orchestrátora:

- `extracted.fields` / `extracted.tables` (mapované na tagy formulára) — zobrazia sa priamo; stav poľa berie zo servera (`verified` → zelená, `needs_review` → jantárová, `not_found` → nenájdené), sumy z presného `decimal_value`.
- Jednoriadková tabuľka s mnohými stĺpcami (BBSK `rozpocet.zoznamuctovnychdokladov`) sa zobrazí ako formulár „nový riadok tabuľky“.
- Ak orchestrátor nedostal formulár (`mapping_status: no_form`), frontend zobrazí univerzálne údaje z `extracted.extracted_data` (`src/api/universal.ts`) vrátane položiek a kontroly súčtu.

## Dizajn

V duchu Erste / George (Slovenská sporiteľňa): písmo Inter, tmavomodré nadpisy `#0b1f42`, značková modrá `#2870ed`,
pozadie `#f4f6fa`, biele karty so zaoblením 12 px a jemným modrastým tieňom, tlačidlá v tvare pilulky.
Tokeny a stavebné prvky (`card`, `btn`, `btn-primary`, `btn-secondary`, `input`) sú v `src/index.css`.
Bez loga a názvu Erste — ide len o vizuálny štýl.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7, Inter (@fontsource-variable/inter), write-excel-file (export XLSX, načítava sa až pri exporte).
