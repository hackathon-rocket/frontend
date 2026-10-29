/*
  Univerzálne polia AI orchestrátora (extracted_data) → polia formulára na kontrolu.
  Používa sa, keď backend nepošle orchestrátoru formulár eGrant (mapping_status = no_form)
  a mapované fields/tables sú prázdne: používateľ aj tak vidí všetko, čo AI v doklade našla.
*/
import type { ExtractedField, ExtractedTable, FieldType, ServerFieldStatus } from './types'

export interface Fact {
  value: string | number | null
  status: ServerFieldStatus
  evidence: { page: number | null; quote: string } | null
  confidence: number
  validation_reasons?: string[]
}

export interface UniversalData {
  document_type?: string
  fields?: Record<string, Fact>
  line_items?: Record<string, Fact>[]
}

const UNIVERSAL: { key: string; label: string; type: FieldType; core?: boolean }[] = [
  { key: 'invoice_number', label: 'Číslo faktúry', type: 'string', core: true },
  { key: 'receipt_number', label: 'Číslo bločku', type: 'string' },
  { key: 'contract_number', label: 'Číslo zmluvy', type: 'string' },
  { key: 'supplier_name', label: 'Dodávateľ', type: 'string', core: true },
  { key: 'supplier_ico', label: 'IČO dodávateľa', type: 'ico', core: true },
  { key: 'supplier_dic', label: 'DIČ dodávateľa', type: 'dic', core: true },
  { key: 'supplier_vat_id', label: 'IČ DPH dodávateľa', type: 'string' },
  { key: 'customer_name', label: 'Odberateľ', type: 'string' },
  { key: 'customer_ico', label: 'IČO odberateľa', type: 'ico' },
  { key: 'customer_dic', label: 'DIČ odberateľa', type: 'dic' },
  { key: 'customer_vat_id', label: 'IČ DPH odberateľa', type: 'string' },
  { key: 'issue_date', label: 'Dátum vystavenia', type: 'date', core: true },
  { key: 'due_date', label: 'Dátum splatnosti', type: 'date', core: true },
  { key: 'delivery_date', label: 'Dátum dodania', type: 'date', core: true },
  { key: 'payment_date', label: 'Dátum úhrady', type: 'date', core: true },
  { key: 'total_net', label: 'Suma bez DPH', type: 'currency', core: true },
  { key: 'total_vat', label: 'DPH', type: 'currency', core: true },
  { key: 'total_gross', label: 'Suma s DPH', type: 'currency', core: true },
  { key: 'paid_amount', label: 'Uhradená suma', type: 'currency' },
  { key: 'currency', label: 'Mena', type: 'string' },
  { key: 'iban', label: 'IBAN', type: 'iban' },
  { key: 'payment_method', label: 'Spôsob úhrady', type: 'string', core: true },
  { key: 'expense_description', label: 'Predmet výdavku', type: 'string', core: true },
  { key: 'contract_subject', label: 'Predmet zmluvy', type: 'string' },
  { key: 'contract_date', label: 'Dátum zmluvy', type: 'date' },
  { key: 'contract_amount', label: 'Suma zmluvy', type: 'currency' },
  { key: 'statement_period_start', label: 'Výpis od', type: 'date' },
  { key: 'statement_period_end', label: 'Výpis do', type: 'date' },
  { key: 'opening_balance', label: 'Počiatočný zostatok', type: 'currency' },
  { key: 'closing_balance', label: 'Konečný zostatok', type: 'currency' },
]

const LINE_COLUMNS: { key: string; label: string; type: FieldType }[] = [
  { key: 'description', label: 'Názov položky', type: 'string' },
  { key: 'quantity', label: 'Množstvo', type: 'number' },
  { key: 'unit', label: 'Jednotka', type: 'string' },
  { key: 'unit_price', label: 'Jedn. cena', type: 'currency' },
  { key: 'net', label: 'Bez DPH', type: 'currency' },
  { key: 'vat', label: 'DPH', type: 'currency' },
  { key: 'gross', label: 'S DPH', type: 'currency' },
]

/** Fakt orchestrátora → pole formulára. Sumy prichádzajú ako presný text („1230.00“). */
function toField(key: string, label: string, type: FieldType, fact: Fact | undefined): ExtractedField {
  const raw = fact?.value ?? null
  const numeric = type === 'currency' || type === 'number'
  const value = raw !== null && numeric && typeof raw === 'string' && /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw
  return {
    tag: key,
    label,
    type,
    value,
    decimal_value: type === 'currency' && raw !== null ? String(raw) : null,
    confidence: fact?.confidence ?? 0,
    evidence: fact?.evidence?.quote ?? null,
    page: fact?.evidence?.page ?? null,
    status: fact?.status ?? 'not_found',
    validation_reasons: fact?.validation_reasons ?? [],
  }
}

export function fieldsFromUniversal(data: UniversalData): ExtractedField[] {
  const facts = data.fields ?? {}
  return UNIVERSAL.filter((u) => u.core || facts[u.key]?.value != null).map((u) => toField(u.key, u.label, u.type, facts[u.key]))
}

export function tablesFromUniversal(data: UniversalData): ExtractedTable[] {
  const items = data.line_items ?? []
  if (items.length === 0) return []
  return [
    {
      tag: 'polozky',
      label: 'Položky dokladu',
      columns: LINE_COLUMNS.map((c) => ({ tag: c.key, label: c.label, type: c.type })),
      rows: items.map((item) => Object.fromEntries(LINE_COLUMNS.map((c) => [c.key, toField(c.key, c.label, c.type, item[c.key])]))),
    },
  ]
}

export const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  invoice: 'faktúra',
  receipt: 'bloček',
  contract: 'zmluva',
  bank_statement: 'výpis z účtu',
}
