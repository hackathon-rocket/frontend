/*
  Úlohy #18 a #19 — export skontrolovaných údajov do JSON a Excelu (XLSX).
  Exportuje sa aktuálny stav formulára vrátane úprav používateľa.
*/
import type { DocumentSummary, FieldValue } from '../../api/types'
import { STATE_LABEL, percent } from '../../lib/confidence'
import { fromInput } from '../../lib/format'
import { isRowForm, type FieldEntry, type TableEntry } from '../review/useReviewState'

export interface ExportInput {
  document: DocumentSummary
  fields: FieldEntry[]
  tables: TableEntry[]
  confirmed: boolean
}

/** „faktura 2026/0142.pdf“ → „faktura 2026_0142_udaje“ */
export function exportFileName(doc: DocumentSummary): string {
  const base = doc.original_filename.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'doklad'
  return `${base}_udaje`
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ---------------- JSON (#18) ---------------- */

/**
 * values / tables majú presne tvar, ktorý by prijal formulár eGrant (tag → hodnota).
 * review dopĺňa, ako hodnota vznikla — pre audit a kontrolu manažérom.
 */
export function buildJson(input: ExportInput) {
  const value = (e: FieldEntry): FieldValue => fromInput(e.field.type, e.text)
  return {
    format: 'egrant-extrakcia/v1',
    exported_at: new Date().toISOString(),
    confirmed: input.confirmed,
    document: {
      id: input.document.id,
      filename: input.document.original_filename,
      document_type: input.document.document_type,
    },
    values: Object.fromEntries(input.fields.map((e) => [e.field.tag, value(e)])),
    tables: Object.fromEntries(
      input.tables.map((t) => [
        t.table.tag,
        t.rows.map((r) => Object.fromEntries(Object.entries(r.cells).map(([tag, c]) => [tag, value(c)]))),
      ]),
    ),
    review: input.fields.map((e) => ({
      tag: e.field.tag,
      label: e.field.label,
      state: e.state,
      confidence: e.field.confidence,
      evidence: e.field.evidence ?? null,
    })),
  }
}

export function downloadJson(input: ExportInput) {
  const json = JSON.stringify(buildJson(input), null, 2)
  download(new Blob([json], { type: 'application/json' }), `${exportFileName(input.document)}.json`)
}

/* ---------------- Excel (#19) ---------------- */

type Cell = { value?: string | number | Date; type?: StringConstructor | NumberConstructor | DateConstructor | 'Formula'; format?: string; fontWeight?: 'bold' } | null

const CURRENCY_FORMAT = '#,##0.00 "€"'

/** Excel nepozná časové pásma — dátum zapisujeme ako UTC, inak by sa posunul o deň. */
const excelDate = (y: number, m: number, d: number, h = 0, min = 0) => new Date(Date.UTC(y, m - 1, d, h, min))
const DATE_FORMAT = 'd.m.yyyy'

/** Hodnota poľa → bunka Excelu so správnym typom (číslo ostane číslom, dátum dátumom). */
function cellFor(e: FieldEntry): Cell {
  const v = fromInput(e.field.type, e.text)
  if (v === null) return null
  switch (e.field.type) {
    case 'currency':
      return typeof v === 'number' ? { value: v, type: Number, format: CURRENCY_FORMAT } : { value: String(v), type: String }
    case 'number':
      return typeof v === 'number' ? { value: v, type: Number } : { value: String(v), type: String }
    case 'date': {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v))
      return m ? { value: excelDate(Number(m[1]), Number(m[2]), Number(m[3])), type: Date, format: DATE_FORMAT } : { value: String(v), type: String }
    }
    default:
      // IČO, DIČ a pod. ako text — Excel by inak zahodil úvodné nuly.
      return { value: String(v), type: String, format: '@' }
  }
}

const header = (labels: string[]): Cell[] => labels.map((l) => ({ value: l, type: String, fontWeight: 'bold' }))

function columnLetter(index: number): string {
  let n = index + 1
  let s = ''
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/** Názov hárku: max. 31 znakov, bez zakázaných znakov. */
const sheetName = (name: string) => name.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31)

export async function downloadXlsx(input: ExportInput) {
  // Knižnicu načítame až pri prvom exporte, aby nespomaľovala štart aplikácie.
  const { default: writeExcelFile } = await import('write-excel-file/browser')

  // Jednoriadková tabuľka (napr. BBSK zoznam účtovných dokladov) patrí medzi „Údaje“ s plnou cestou tagu.
  const rowFormCells = input.tables
    .filter((t) => isRowForm(t.table))
    .flatMap((t) => t.table.columns.flatMap((c) => (t.rows[0]?.cells[c.tag] ? [{ entry: t.rows[0].cells[c.tag], tag: `${t.table.tag}.${c.tag}` }] : [])))
  const fieldRows = [...input.fields.map((entry) => ({ entry, tag: entry.field.tag })), ...rowFormCells]

  const fieldsSheet: Cell[][] = [
    header(['Pole', 'Tag vo formulári', 'Hodnota', 'Stav', 'Istota', 'Zdroj v doklade']),
    ...fieldRows.map(({ entry: e, tag }): Cell[] => [
      { value: e.field.label, type: String },
      { value: tag, type: String },
      cellFor(e),
      { value: STATE_LABEL[e.state], type: String },
      e.state === 'missing' || e.state === 'edited' ? null : { value: percent(e.field.confidence), type: String },
      e.field.evidence ? { value: e.field.evidence, type: String } : null,
    ]),
  ]

  const tableSheets = input.tables.filter((t) => !isRowForm(t.table)).map((t) => {
    const cols = t.table.columns
    const rows = t.rows.map((r) => cols.map((c) => cellFor(r.cells[c.tag])))
    const data: Cell[][] = [header(cols.map((c) => c.label)), ...rows]
    // Súčtový riadok pre sumy — ako vzorec, aby sa prepočítal pri úprave v Exceli.
    if (rows.length > 0 && cols.some((c) => c.type === 'currency')) {
      data.push(
        cols.map((c, i): Cell =>
          c.type === 'currency'
            ? { value: `SUM(${columnLetter(i)}2:${columnLetter(i)}${rows.length + 1})`, type: 'Formula', format: CURRENCY_FORMAT, fontWeight: 'bold' }
            : i === 0 ? { value: 'Spolu', type: String, fontWeight: 'bold' } : null,
        ),
      )
    }
    return {
      data,
      sheet: sheetName(t.table.label),
      columns: cols.map((c) => ({ width: c.type === 'string' ? 40 : 16 })),
      stickyRowsCount: 1,
    }
  })

  const now = new Date()
  const infoSheet: Cell[][] = [
    header(['Údaj', 'Hodnota']),
    [{ value: 'Súbor', type: String }, { value: input.document.original_filename, type: String }],
    [{ value: 'Typ dokladu', type: String }, { value: input.document.document_type, type: String }],
    [{ value: 'Stav', type: String }, { value: input.confirmed ? 'Potvrdené používateľom' : 'Nepotvrdené — údaje môžu obsahovať chyby', type: String }],
    [{ value: 'Exportované', type: String }, { value: excelDate(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()), type: Date, format: 'd.m.yyyy h:mm' }],
  ]

  // Typy knižnice sú prísnejšie než naše bunky; tvar dát zodpovedá jej dokumentácii.
  const sheets = [
    { data: fieldsSheet, sheet: 'Údaje', columns: [{ width: 22 }, { width: 22 }, { width: 28 }, { width: 22 }, { width: 10 }, { width: 36 }], stickyRowsCount: 1 },
    ...tableSheets,
    { data: infoSheet, sheet: 'Doklad', columns: [{ width: 16 }, { width: 48 }] },
  ] as unknown as Parameters<typeof writeExcelFile>[0]

  const blob = await writeExcelFile(sheets as never).toBlob()
  download(blob, `${exportFileName(input.document)}.xlsx`)
}
