/*
  Falošný backend pre vývoj a demo bez servera.
  Vracia PRESNE tvar Laravel DocumentResource ({ data: { document, ocr, extracted, validation } })
  a ide cez ten istý adaptér ako skutočný backend — demo sa správa ako ostrá prevádzka.

  - Ukážkový doklad „na kontrolu“ = oficiálna ukážka AI orchestrátora (BBSK formulár 11824,
    riadok tabuľky rozpocet.zoznamuctovnychdokladov namapovaný na tagy).
  - Nové nahratia = stav ako dnes v backende: orchestrátor bez formulára (mapping_status no_form),
    frontend zobrazí univerzálne údaje.
  - Súbor s „chyba“ v názve skončí chybou rozpoznávania.
*/
import sample from './fixtures/orchestrator-sample.json'
import type { ConfirmPayload, DocumentSummary } from './types'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const STORAGE_KEY = 'egrant-extrakcia:mock-v2'
const DAY = 24 * 60 * 60 * 1000

interface MockDoc {
  id: string
  filename: string
  mime_type: string
  file_size: number
  created_at: string
  uploadedAt: number
  mapped: boolean
  confirmed?: ConfirmPayload
}

function seed(): MockDoc[] {
  const at = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()
  return [
    { id: 'demo-potvrdena', filename: 'faktura_2026-0098.pdf', mime_type: 'application/pdf', file_size: 212_480, created_at: at(2 * DAY), uploadedAt: 0, mapped: true, confirmed: { values: {}, tables: {} } },
    { id: 'demo-chyba', filename: 'sken_chyba_0412.jpg', mime_type: 'image/jpeg', file_size: 1_843_200, created_at: at(DAY + 3 * 3600_000), uploadedAt: 0, mapped: false },
    { id: 'demo-kontrola', filename: 'faktura_FA-2026-001.pdf', mime_type: 'application/pdf', file_size: 184_320, created_at: at(40 * 60_000), uploadedAt: 0, mapped: true },
  ]
}

function load(): Map<string, MockDoc> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return new Map((JSON.parse(raw) as MockDoc[]).map((d) => [d.id, d]))
  } catch { /* úložisko nedostupné */ }
  return new Map(seed().map((d) => [d.id, d]))
}

const docs = load()

function save() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...docs.values()]))
  } catch { /* mock pobeží len v pamäti */ }
}

/** Interný stav tak, ako ho backend ukladá (ProcessDocumentOcr → ProcessDocumentExtraction). */
function internalStatus(doc: MockDoc): string {
  if (doc.confirmed) return 'confirmed'
  const elapsed = Date.now() - doc.uploadedAt
  if (doc.filename.toLowerCase().includes('chyba') && elapsed > 2000) return 'ocr_failed'
  if (elapsed < 400) return 'uploaded'
  if (elapsed < 1800) return 'processing'
  if (elapsed < 3800) return 'extracting'
  return 'completed'
}

/** Rovnaký preklad stavov ako DocumentResource::publicStatus v backende. */
function publicStatus(internal: string): [string, string | null] {
  switch (internal) {
    case 'processing': return ['processing', 'ocr']
    case 'ocr_completed':
    case 'extracting': return ['processing', 'extraction']
    case 'completed': return ['extracted', null]
    case 'ocr_failed':
    case 'failed': return ['failed', null]
    default: return [internal, null]
  }
}

function resource(doc: MockDoc) {
  const internal = internalStatus(doc)
  const [status, stage] = publicStatus(internal)
  const done = status === 'extracted' || status === 'confirmed'
  return {
    data: {
      document: {
        id: doc.id,
        filename: doc.filename,
        mime_type: doc.mime_type,
        file_size: doc.file_size,
        created_at: doc.created_at,
        status,
        stage,
        error_message: internal === 'ocr_failed' ? 'OCR service returned HTTP 422: image too blurry' : null,
      },
      ocr: done ? { text: SAMPLE_OCR_TEXT, source: 'ocr-api', language: 'slk+eng' } : undefined,
      extracted: done
        ? {
            document_type: sample.document_type,
            fields: doc.mapped ? sample.fields : [],
            tables: doc.mapped ? sample.tables : [],
            extracted_data: sample.extracted_data,
          }
        : null,
      validation: done
        ? {
            status: 'needs_review',
            mapping_status: doc.mapped ? sample.mapping_status : 'no_form',
            warnings: doc.mapped ? sample.warnings : ['Formulár nebol zadaný — zobrazujú sa univerzálne údaje bez mapovania na tagy.', ...sample.warnings.slice(1, 2)],
          }
        : null,
    },
  }
}

export async function uploadDocument(file: File, onProgress?: (p: number) => void) {
  for (let p = 0; p <= 100; p += 20) {
    onProgress?.(p)
    await wait(120)
  }
  const id = `mock-${Date.now().toString(36)}`
  docs.set(id, {
    id,
    filename: file.name,
    mime_type: file.type,
    file_size: file.size,
    created_at: new Date().toISOString(),
    uploadedAt: Date.now(),
    mapped: false,
  })
  save()
  return { id, status: 'uploaded' as const, message: 'Document uploaded successfully' }
}

export async function getDocument(id: string): Promise<unknown> {
  await wait(250)
  const doc = docs.get(id) ?? { ...seed()[2], id }
  return resource(doc)
}

export async function listDocuments(): Promise<unknown[]> {
  await wait(300)
  return [...docs.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(resource)
}

export async function confirmDocument(id: string, payload: ConfirmPayload): Promise<DocumentSummary> {
  await wait(500)
  const doc = docs.get(id) ?? { ...seed()[2], id }
  doc.confirmed = payload
  docs.set(id, doc)
  save()
  return {
    id: doc.id,
    original_filename: doc.filename,
    mime_type: doc.mime_type,
    file_size: doc.file_size,
    document_type: 'faktúra',
    status: 'confirmed',
    created_at: doc.created_at,
  }
}

/* OCR text zo syntetickej faktúry orchestrátora (tests/fixtures/clean_invoice.json). */
const SAMPLE_OCR_TEXT = `FAKTÚRA č. FA-2026-001
Dodávateľ: Ukážkový dodávateľ s.r.o.
IČO dodávateľa: 12 345 679
DIČ dodávateľa: 2021234567
IČ DPH dodávateľa: SK2021234567
Odberateľ: Ukážkové združenie
Dátum vystavenia: 01.10.2026
Dátum splatnosti: 15.10.2026
Dátum dodania: 30.09.2026
Predmet fakturácie: Tlač informačných materiálov
Spôsob úhrady: prevodom
Základ DPH: 1 000,00 EUR
DPH spolu: 230,00 EUR
Suma spolu: 1 230,00 EUR
Mena: EUR
Položka: Letáky | Množstvo: 100 | Jednotka: ks | Jednotková cena: 4,00 | Bez DPH: 400,00 | DPH: 92,00 | S DPH: 492,00
Položka: Plagáty | Množstvo: 100 | Jednotka: ks | Jednotková cena: 6,00 | Bez DPH: 600,00 | DPH: 138,00 | S DPH: 738,00`
