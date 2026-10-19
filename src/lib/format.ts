/*
  Prevod hodnôt medzi tvarom z API (číslo, ISO dátum) a tým, čo používateľ píše do inputu
  (slovenský formát: „1 234,50“).
*/
import type { FieldType, FieldValue } from '../api/types'

const numberFormat = new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 4 })
const currencyFormat = new Intl.NumberFormat('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Hodnota z API → text do inputu. */
export function toInput(type: FieldType, value: FieldValue | undefined): string {
  if (value === null || value === undefined) return ''
  if (type === 'currency' && typeof value === 'number') return currencyFormat.format(value)
  if (type === 'number' && typeof value === 'number') return numberFormat.format(value)
  return String(value)
}

/** „1 234,50“ / „1234.5“ / „1 234,50 €“ → 1234.5; nečíselný text → NaN. */
export function parseNumber(text: string): number {
  const cleaned = text.replace(/[\s €]/g, '').replace(',', '.')
  if (cleaned === '' || !/^-?\d+(\.\d+)?$/.test(cleaned)) return Number.NaN
  return Number(cleaned)
}

/** Text z inputu → hodnota na odoslanie (tag → hodnota). Prázdne = null. */
export function fromInput(type: FieldType, text: string): FieldValue {
  const t = text.trim()
  if (t === '') return null
  if (type === 'number' || type === 'currency') {
    const n = parseNumber(t)
    return Number.isNaN(n) ? t : n
  }
  if (type === 'ico' || type === 'dic') return t.replace(/\s/g, '')
  return t
}

export function formatCurrency(n: number): string {
  return `${currencyFormat.format(n)} €`
}
