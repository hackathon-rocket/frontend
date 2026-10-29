/*
  Predvolené polia faktúry (tagy formulára vyúčtovania).
  Používa ich mock a záložne aj skutočný backend, kým AI extrakcia nevracia vlastné polia.
  Neskôr ich nahradí mapovanie z JSON exportu reálneho formulára eGrant.
*/
import type { ExtractedField, ExtractedTable, FieldType } from './types'

const f = (tag: string, label: string, type: FieldType): ExtractedField => ({ tag, label, type, value: null, confidence: 0, evidence: null, page: null })

export const INVOICE_FIELDS: ExtractedField[] = [
  f('cislo_faktury', 'Číslo faktúry', 'string'),
  f('dodavatel.nazov', 'Dodávateľ', 'string'),
  f('dodavatel.ico', 'IČO dodávateľa', 'ico'),
  f('dodavatel.dic', 'DIČ dodávateľa', 'dic'),
  f('datum_vystavenia', 'Dátum vystavenia', 'date'),
  f('datum_splatnosti', 'Dátum splatnosti', 'date'),
  f('suma_bez_dph', 'Suma bez DPH', 'currency'),
  f('suma_s_dph', 'Suma s DPH', 'currency'),
]

export const INVOICE_TABLE: ExtractedTable = {
  tag: 'polozky',
  label: 'Položky faktúry',
  columns: [
    { tag: 'polozka', label: 'Názov položky', type: 'string' },
    { tag: 'mnozstvo', label: 'Množstvo', type: 'number' },
    { tag: 'suma', label: 'Suma bez DPH', type: 'currency' },
  ],
  rows: [],
}
