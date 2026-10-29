/*
  Kontroly súladu medzi hodnotami (napr. súčet položiek = suma faktúry).
  Pravidlá sú konfigurovateľné podľa tagov — pre iný formulár stačí zmeniť zoznam.
*/
import { parseNumber } from '../../lib/format'
import type { FieldEntry, TableEntry } from './useReviewState'

export interface SumRule {
  table: string
  column: string
  totalField: string
}

export const SUM_RULES: SumRule[] = [
  { table: 'polozky', column: 'suma', totalField: 'suma_bez_dph' }, // ukážkový formulár faktúry
  { table: 'polozky', column: 'net', totalField: 'total_net' }, // univerzálne údaje orchestrátora
]

export interface SumCheck {
  rule: SumRule
  sum: number
  total: number | null
  totalLabel: string
  matches: boolean
}

export function sumCheck(table: TableEntry, fields: FieldEntry[]): SumCheck | null {
  const rule = SUM_RULES.find(
    (r) => r.table === table.table.tag && table.table.columns.some((c) => c.tag === r.column) && fields.some((f) => f.field.tag === r.totalField),
  )
  if (!rule) return null
  const totalEntry = fields.find((f) => f.field.tag === rule.totalField)
  const sum = table.rows.reduce((acc, r) => {
    const n = parseNumber(r.cells[rule.column]?.text ?? '')
    return Number.isNaN(n) ? acc : acc + n
  }, 0)
  const totalNum = totalEntry ? parseNumber(totalEntry.text) : Number.NaN
  const total = Number.isNaN(totalNum) ? null : totalNum
  return {
    rule,
    sum,
    total,
    totalLabel: totalEntry?.field.label ?? rule.totalField,
    matches: total !== null && Math.abs(sum - total) < 0.005,
  }
}
