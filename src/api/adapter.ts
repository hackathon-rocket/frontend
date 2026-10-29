/*
  Prevod odpovede Laravel backendu (GET /api/documents/{id}) na tvar, s ktorým pracuje frontend.
  Všetky rozdiely medzi backendom a obrazovkami riešime iba tu.

  Aktuálny tvar (DocumentResource, backend-api 7d946dc):
    { data: { document: {id, filename, status, stage, error_message, …},
              ocr?: {text},                      // len s ?include=ocr
              extracted: {document_type, fields, tables, extracted_data} | null,
              validation: {status, mapping_status, warnings, counts} | null } }
  Pole fields/tables pochádzajú priamo z AI orchestrátora (ExtractedField so stavom verified / needs_review / not_found).
*/
import { INVOICE_FIELDS, INVOICE_TABLE } from './invoiceTemplate'
import type { ConfirmPayload, DocumentStatus, DocumentSummary, ExtractedField, ExtractedTable, ExtractionResult, ProcessingStage } from './types'
import { DOCUMENT_TYPE_LABEL, fieldsFromUniversal, tablesFromUniversal, type UniversalData } from './universal'

interface ResourceDocument {
  id?: string
  filename?: string
  original_filename?: string
  mime_type?: string
  file_size?: number
  created_at?: string
  status?: string
  stage?: string | null
  error_message?: string | null
}

interface DocumentResource {
  document: ResourceDocument
  ocr?: { text?: string | null } | null
  extracted?: {
    document_type?: string | null
    fields?: ExtractedField[]
    tables?: ExtractedTable[]
    extracted_data?: UniversalData | null
  } | null
  validation?: { warnings?: string[]; mapping_status?: string | null } | null
  confirmed?: { values?: ConfirmPayload['values']; tables?: ConfirmPayload['tables']; confirmed_at?: string } | null
}

/** Starší tvar (surový Document s reláciou extractions) — ponechané pre spätnú kompatibilitu. */
interface LegacyDocument extends ResourceDocument {
  _id?: string | { $oid: string }
  document_type?: string
  extractions?: { text?: string | null }[]
}

/** Interné stavy backendu aj verejné stavy z DocumentResource → stav pre obrazovky. */
const STATUS_MAP: Record<string, { status: DocumentStatus; stage: ProcessingStage | null }> = {
  uploaded: { status: 'uploaded', stage: null },
  processing: { status: 'processing', stage: 'ocr' },
  ocr_completed: { status: 'processing', stage: 'extraction' },
  extracting: { status: 'processing', stage: 'extraction' },
  completed: { status: 'extracted', stage: null },
  extracted: { status: 'extracted', stage: null },
  ocr_failed: { status: 'failed', stage: null },
  failed: { status: 'failed', stage: null },
  confirmed: { status: 'confirmed', stage: null },
}

const STAGES: ProcessingStage[] = ['ocr', 'extraction', 'validation']

function idOf(raw: LegacyDocument): string {
  if (raw.id) return String(raw.id)
  if (typeof raw._id === 'string') return raw._id
  if (raw._id && typeof raw._id === 'object') return raw._id.$oid
  return ''
}

function summaryOf(raw: LegacyDocument, documentType?: string | null): DocumentSummary {
  const mapped = STATUS_MAP[raw.status ?? ''] ?? { status: 'processing' as const, stage: null }
  const stage = STAGES.includes(raw.stage as ProcessingStage) ? (raw.stage as ProcessingStage) : mapped.stage
  const failed = mapped.status === 'failed'
  const type = documentType ?? raw.document_type ?? 'unknown'
  return {
    id: idOf(raw),
    original_filename: raw.filename ?? raw.original_filename ?? 'doklad',
    mime_type: raw.mime_type ?? '',
    file_size: raw.file_size ?? 0,
    document_type: DOCUMENT_TYPE_LABEL[type] ?? type,
    status: mapped.status,
    processing_stage: mapped.status === 'processing' || mapped.status === 'uploaded' ? stage ?? 'ocr' : null,
    // Chybu servera (často technickú) prekladáme do zrozumiteľnej vety; detail ostáva pre podporu.
    error_message: failed
      ? raw.status === 'ocr_failed'
        ? 'Text dokladu sa nepodarilo rozpoznať. Skúste to znova alebo nahrajte zreteľnejší sken či fotografiu.'
        : 'Doklad sa nepodarilo spracovať. Skúste ho nahrať znova; ak sa to opakuje, údaje vyplňte ručne.'
      : null,
    error_detail: failed ? raw.error_message ?? null : null,
    created_at: raw.created_at ?? new Date().toISOString(),
  }
}

function isResource(raw: unknown): raw is DocumentResource {
  return !!raw && typeof raw === 'object' && 'document' in raw
}

/** Laravel JsonResource štandardne obalí odpoveď do { data: … }. */
function unwrap(raw: unknown): unknown {
  return raw && typeof raw === 'object' && 'data' in raw && !Array.isArray((raw as { data: unknown }).data)
    ? (raw as { data: unknown }).data
    : raw
}

export function toSummary(raw: unknown): DocumentSummary {
  const r = unwrap(raw)
  return isResource(r) ? summaryOf(r.document, r.extracted?.document_type) : summaryOf(r as LegacyDocument)
}

export function toExtractionResult(raw: unknown): ExtractionResult {
  const r = unwrap(raw)
  if (!isResource(r)) return fromLegacy(r as LegacyDocument)

  const document = summaryOf(r.document, r.extracted?.document_type)
  const extracted = r.extracted ?? null
  const warnings = [...(r.validation?.warnings ?? [])]
  let fields = extracted?.fields ?? []
  let tables = (extracted?.tables ?? []).filter((t) => t.columns?.length)

  // Orchestrátor nemal formulár (mapping_status = no_form) → ukážeme univerzálne údaje, ktoré AI našla.
  if (document.status === 'extracted' && fields.length === 0 && tables.length === 0 && extracted?.extracted_data) {
    fields = fieldsFromUniversal(extracted.extracted_data)
    tables = tablesFromUniversal(extracted.extracted_data)
  }
  if (document.status === 'extracted' && fields.length === 0 && tables.length === 0) {
    fields = INVOICE_FIELDS
    tables = [INVOICE_TABLE]
    warnings.unshift('AI z dokladu nevrátila žiadne údaje. Polia doplňte podľa dokladu.')
  }

  const confirmed = r.confirmed ? { values: r.confirmed.values ?? {}, tables: r.confirmed.tables ?? {} } : null
  return { document, fields, tables, warnings: dedupe(warnings), ocr_text: r.ocr?.text ?? null, confirmed }
}

function fromLegacy(raw: LegacyDocument): ExtractionResult {
  const document = summaryOf(raw)
  const ocrText = [...(raw.extractions ?? [])].reverse().find((e) => e.text)?.text ?? null
  const extracted = document.status === 'extracted'
  return {
    document,
    fields: extracted ? INVOICE_FIELDS : [],
    tables: extracted ? [INVOICE_TABLE] : [],
    warnings: extracted ? ['Text dokladu je rozpoznaný, ale automatické vyplnenie polí na serveri ešte nie je zapojené. Polia doplňte podľa rozpoznaného textu.'] : [],
    ocr_text: ocrText,
  }
}

const dedupe = (xs: string[]) => [...new Set(xs.filter(Boolean))]
