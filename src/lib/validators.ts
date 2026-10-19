/*
  Kontroly formátu, ktoré bežia priamo pri písaní. Zachytia preklepy používateľa aj chyby OCR.
  Vrátia text problému alebo null.
*/
import type { FieldType } from '../api/types'
import { parseNumber } from './format'

/** IČO (SK/CZ): 8 číslic, posledná je kontrolná (váhy 8…2, modulo 11). */
export function isValidIco(raw: string): boolean {
  const ico = raw.replace(/\s/g, '')
  if (!/^\d{8}$/.test(ico)) return false
  const sum = [...ico.slice(0, 7)].reduce((acc, d, i) => acc + Number(d) * (8 - i), 0)
  const check = (11 - (sum % 11)) % 10
  return check === Number(ico[7])
}

export function validate(type: FieldType, text: string): string | null {
  const t = text.trim()
  if (t === '') return null
  switch (type) {
    case 'ico':
      if (!/^\d{8}$/.test(t.replace(/\s/g, ''))) return 'IČO má mať 8 číslic.'
      return isValidIco(t) ? null : 'IČO nemá platnú kontrolnú číslicu — skontrolujte preklep.'
    case 'dic':
      return /^\d{10}$/.test(t.replace(/\s/g, '')) ? null : 'DIČ má mať 10 číslic.'
    case 'number':
    case 'currency':
      return Number.isNaN(parseNumber(t)) ? 'Zadajte číslo, napr. 1 234,50.' : null
    case 'date':
      return Number.isNaN(Date.parse(t)) ? 'Zadajte platný dátum.' : null
    case 'iban':
      return /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(t.replace(/\s/g, '').toUpperCase()) ? null : 'IBAN nemá správny tvar.'
    default:
      return null
  }
}
