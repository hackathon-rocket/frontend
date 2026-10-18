/*
  Falošný backend pre vývoj bez servera. Tvar dát = types.ts.
  Simuluje oneskorenie, priebeh nahrávania a typickú faktúru so zmiešanou istotou.
*/
import type { DocumentSummary, ExtractionResult, UploadResponse } from './types'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const docs = new Map<string, DocumentSummary>()

export async function uploadDocument(file: File, onProgress?: (p: number) => void): Promise<UploadResponse> {
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
  })
  return { id, status: 'uploaded', message: 'Document uploaded successfully' }
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  await wait(300)
  return [...docs.values()].reverse()
}

export async function getDocument(id: string): Promise<ExtractionResult> {
  await wait(400)
  const document = docs.get(id) ?? {
    id,
    original_filename: 'faktura_2026-0142.pdf',
    mime_type: 'application/pdf',
    file_size: 184_320,
    document_type: 'faktúra',
    status: 'extracted' as const,
    created_at: new Date().toISOString(),
  }
  return {
    document: { ...document, status: 'extracted' },
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
            polozka: { tag: 'polozka', label: 'Názov položky', type: 'string', value: 'Papier A4, 80 g, 500 listov', confidence: 0.94 },
            mnozstvo: { tag: 'mnozstvo', label: 'Množstvo', type: 'number', value: 20, confidence: 0.92 },
            suma: { tag: 'suma', label: 'Suma bez DPH', type: 'currency', value: 90.0, confidence: 0.91 },
          },
          {
            polozka: { tag: 'polozka', label: 'Názov položky', type: 'string', value: 'Toner HP 59A', confidence: 0.88 },
            mnozstvo: { tag: 'mnozstvo', label: 'Množstvo', type: 'number', value: 2, confidence: 0.9 },
            suma: { tag: 'suma', label: 'Suma bez DPH', type: 'currency', value: 320.0, confidence: 0.58 },
          },
        ],
      },
    ],
    warnings: ['Dátum splatnosti sa v doklade nenašiel.'],
  }
}
