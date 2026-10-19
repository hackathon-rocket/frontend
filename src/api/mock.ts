/*
  Falošný backend pre vývoj bez servera. Tvar dát = types.ts.
  Simuluje nahrávanie, postupné spracovanie (OCR → extrakcia → kontrola) a typickú faktúru.
  Tip na demo: súbor, ktorého názov obsahuje „chyba“, skončí chybou spracovania.
*/
import type {
  ConfirmPayload,
  DocumentStatus,
  DocumentSummary,
  ExtractionResult,
  ProcessingStage,
} from './types'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface MockDoc extends DocumentSummary {
  uploadedAt: number
  confirmed?: ConfirmPayload
}
const docs = new Map<string, MockDoc>()

/** Časová os spracovania v ms od nahratia. */
const TIMELINE: { until: number; status: DocumentStatus; stage: ProcessingStage | null }[] = [
  { until: 1200, status: 'processing', stage: 'ocr' },
  { until: 2800, status: 'processing', stage: 'extraction' },
  { until: 3800, status: 'processing', stage: 'validation' },
]

function currentState(doc: MockDoc): Pick<DocumentSummary, 'status' | 'processing_stage' | 'error_message'> {
  if (doc.confirmed) return { status: 'confirmed', processing_stage: null, error_message: null }
  const elapsed = Date.now() - doc.uploadedAt
  if (doc.original_filename.toLowerCase().includes('chyba') && elapsed > 2000) {
    return {
      status: 'failed',
      processing_stage: null,
      error_message: 'Text dokladu sa nepodarilo rozpoznať. Sken je príliš rozmazaný alebo tmavý.',
    }
  }
  const step = TIMELINE.find((t) => elapsed < t.until)
  return step
    ? { status: step.status, processing_stage: step.stage, error_message: null }
    : { status: 'extracted', processing_stage: null, error_message: null }
}

function summary(doc: MockDoc): DocumentSummary {
  const { uploadedAt: _u, confirmed: _c, ...rest } = doc
  return { ...rest, ...currentState(doc) }
}

/** Dokument, ktorý mock nepozná (napr. po obnovení stránky) — tvárime sa, že je hotový. */
function fallbackDoc(id: string): MockDoc {
  return {
    id,
    original_filename: 'faktura_2026-0142.pdf',
    mime_type: 'application/pdf',
    file_size: 184_320,
    document_type: 'faktúra',
    status: 'extracted',
    created_at: new Date().toISOString(),
    uploadedAt: 0,
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
    original_filename: file.name,
    mime_type: file.type,
    file_size: file.size,
    document_type: 'faktúra',
    status: 'uploaded',
    created_at: new Date().toISOString(),
    uploadedAt: Date.now(),
  })
  return { id, status: 'uploaded' as const, message: 'Document uploaded successfully' }
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  await wait(300)
  return [...docs.values()].reverse().map(summary)
}

export async function confirmDocument(id: string, payload: ConfirmPayload): Promise<DocumentSummary> {
  await wait(500)
  const doc = docs.get(id) ?? fallbackDoc(id)
  doc.confirmed = payload
  docs.set(id, doc)
  return summary(doc)
}

export async function getDocument(id: string): Promise<ExtractionResult> {
  await wait(250)
  const doc = summary(docs.get(id) ?? fallbackDoc(id))
  if (doc.status !== 'extracted' && doc.status !== 'confirmed') {
    return { document: doc, fields: [], tables: [], warnings: [] }
  }
  return { document: doc, ...SAMPLE_INVOICE }
}

const SAMPLE_INVOICE: Omit<ExtractionResult, 'document'> = {
  fields: [
    { tag: 'cislo_faktury', label: 'Číslo faktúry', type: 'string', value: '2026-0142', confidence: 0.98, evidence: 'Faktúra č. 2026-0142', page: 1 },
    { tag: 'dodavatel.nazov', label: 'Dodávateľ', type: 'string', value: 'Kancelária Plus s.r.o.', confidence: 0.95, evidence: 'Dodávateľ: Kancelária Plus s.r.o.', page: 1 },
    { tag: 'dodavatel.ico', label: 'IČO dodávateľa', type: 'ico', value: '36421928', confidence: 0.93, evidence: 'IČO: 36 421 928', page: 1 },
    { tag: 'dodavatel.dic', label: 'DIČ dodávateľa', type: 'dic', value: '2020183654', confidence: 0.62, evidence: 'DIČ: 202018365?', page: 1 },
    { tag: 'datum_vystavenia', label: 'Dátum vystavenia', type: 'date', value: '2026-09-14', confidence: 0.97, evidence: 'Dátum vystavenia: 14. 9. 2026', page: 1 },
    { tag: 'datum_splatnosti', label: 'Dátum splatnosti', type: 'date', value: null, confidence: 0, evidence: null, page: null },
    { tag: 'suma_bez_dph', label: 'Suma bez DPH', type: 'currency', value: 410.0, confidence: 0.9, evidence: 'Spolu bez DPH 410,00 €', page: 1 },
    { tag: 'suma_s_dph', label: 'Suma s DPH', type: 'currency', value: 492.0, confidence: 0.96, evidence: 'Celkom k úhrade 492,00 €', page: 1 },
  ],
  tables: [
    {
      tag: 'polozky',
      label: 'Položky faktúry',
      columns: [
        { tag: 'polozka', label: 'Názov položky', type: 'string' },
        { tag: 'mnozstvo', label: 'Množstvo', type: 'number' },
        { tag: 'suma', label: 'Suma bez DPH', type: 'currency' },
      ],
      rows: [
        {
          polozka: { tag: 'polozka', label: 'Názov položky', type: 'string', value: 'Papier A4, 80 g, 500 listov', confidence: 0.94, evidence: 'Papier A4 80g 500 l.' },
          mnozstvo: { tag: 'mnozstvo', label: 'Množstvo', type: 'number', value: 20, confidence: 0.92, evidence: '20 ks' },
          suma: { tag: 'suma', label: 'Suma bez DPH', type: 'currency', value: 90.0, confidence: 0.91, evidence: '90,00' },
        },
        {
          polozka: { tag: 'polozka', label: 'Názov položky', type: 'string', value: 'Toner HP 59A', confidence: 0.88, evidence: 'Toner HP 59A' },
          mnozstvo: { tag: 'mnozstvo', label: 'Množstvo', type: 'number', value: 2, confidence: 0.9, evidence: '2 ks' },
          suma: { tag: 'suma', label: 'Suma bez DPH', type: 'currency', value: 320.0, confidence: 0.58, evidence: '32O,00' },
        },
      ],
    },
  ],
  warnings: [],
}
