/*
  Dátový kontrakt medzi frontendom a backendom.
  Upload zodpovedá existujúcemu POST /api/documents (DocumentController@store).
  Zvyšok je NÁVRH na odsúhlasenie s backendom — mock (mock.ts) ho napĺňa rovnakým tvarom.
*/

export type DocumentStatus = 'uploaded' | 'processing' | 'extracted' | 'failed' | 'confirmed'

/** Odpoveď z POST /api/documents (už implementované v backende). */
export interface UploadResponse {
  id: string
  status: DocumentStatus
  message: string
}

/** Položka zoznamu dokladov — GET /api/documents (návrh). */
export interface DocumentSummary {
  id: string
  original_filename: string
  mime_type: string
  file_size: number
  document_type: string
  status: DocumentStatus
  /** Aktuálny krok spracovania, kým status = processing (návrh). */
  processing_stage?: ProcessingStage | null
  /** Zrozumiteľný dôvod, ak status = failed. */
  error_message?: string | null
  /** Technický detail chyby zo servera (zobrazujeme len rozbalený). */
  error_detail?: string | null
  created_at: string
}

export type ProcessingStage = 'ocr' | 'extraction' | 'validation'

export type FieldType = 'string' | 'number' | 'currency' | 'date' | 'ico' | 'dic' | 'iban'

/** Stav poľa podľa AI orchestrátora (deterministické kontroly na serveri). */
export type ServerFieldStatus = 'verified' | 'needs_review' | 'not_found'

/** Jedna extrahovaná hodnota naviazaná na tag formulára eGrant. */
export interface ExtractedField {
  tag: string
  label: string
  type: FieldType
  /** null = v doklade sa nenašlo; AI nič nedomýšľa */
  value: string | number | null
  /** 0–1, istota extrakcie */
  confidence: number
  /** presný úryvok z dokladu, z ktorého hodnota pochádza */
  evidence?: string | null
  page?: number | null
  /** Stav určený serverom — má prednosť pred prahom istoty na frontende. */
  status?: ServerFieldStatus
  /** Presná hodnota sumy ako text („1230.00“) — pri sumách má prednosť pred value. */
  decimal_value?: string | null
  /** Kódy dôvodov, prečo pole treba skontrolovať (napr. arithmetic_conflict). */
  validation_reasons?: string[]
}

export interface TableColumn {
  tag: string
  label: string
  type: FieldType
}

export interface ExtractedTable {
  tag: string
  label: string
  columns: TableColumn[]
  /** každý riadok: tag stĺpca → hodnota */
  rows: Record<string, ExtractedField>[]
}

/** Výsledok extrakcie — GET /api/documents/{id} (návrh). */
export interface ExtractionResult {
  document: DocumentSummary
  fields: ExtractedField[]
  tables: ExtractedTable[]
  warnings: string[]
  /** Text rozpoznaný OCR (backend: extractions[].text). */
  ocr_text?: string | null
  /** Hodnoty, ktoré používateľ potvrdil (backend: confirmed) — majú prednosť pred návrhom AI. */
  confirmed?: ConfirmPayload | null
}

/** Hodnota pripravená na zápis do formulára eGrant: tag → hodnota. */
export type FieldValue = string | number | null

/**
 * Potvrdené údaje — POST /api/documents/{id}/confirm (návrh).
 * Presne tento tvar by eGrant zapísal do formulára (rovnako ako keby ich vyplnil používateľ).
 */
export interface ConfirmPayload {
  values: Record<string, FieldValue>
  tables: Record<string, Record<string, FieldValue>[]>
}
