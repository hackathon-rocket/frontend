/*
  Úloha #15 — jednotné pravidlá, ako sa istota extrakcie premieta do stavu poľa.
  Rovnaké stavy a farby používa formulár aj tabuľka.
*/

/** Od tejto istoty považujeme hodnotu za spoľahlivú (zelená). */
export const CONFIDENT_THRESHOLD = 0.85

export type FieldState =
  | 'ok'        // nájdené s vysokou istotou
  | 'review'    // nájdené, ale treba skontrolovať
  | 'missing'   // v doklade sa nenašlo
  | 'checked'   // používateľ potvrdil, že hodnota je správna
  | 'edited'    // používateľ hodnotu zmenil alebo doplnil

/**
 * Počiatočný stav poľa. Ak server poslal vlastný stav (AI orchestrátor: verified / needs_review /
 * not_found), má prednosť — jeho deterministické kontroly vedia viac než samotná istota.
 * Bez neho rozhoduje prah istoty.
 */
export function initialState(value: unknown, confidence: number, serverStatus?: string): FieldState {
  if (value === null || value === undefined || value === '') return 'missing'
  if (serverStatus === 'verified') return 'ok'
  if (serverStatus === 'needs_review') return 'review'
  if (serverStatus === 'not_found') return 'missing'
  return confidence >= CONFIDENT_THRESHOLD ? 'ok' : 'review'
}

/** Kódy dôvodov z orchestrátora → zrozumiteľný text. Neznámy kód sa nezobrazí (bez žargónu). */
export const REASON_TEXT: Record<string, string> = {
  arithmetic_conflict: 'Sumy v doklade na seba nesedia.',
  currency_missing: 'Mena nie je v doklade uvedená.',
  currency_conflict: 'V doklade sú rôzne meny.',
  role_conflict: 'Hodnota sa v doklade vyskytuje vo viacerých významoch.',
  role_ambiguous: 'Nie je jasné, ktorá hodnota v doklade je tá správna.',
  provider_uncertainty: 'AI si nie je istá.',
  classification_conflict: 'Typ dokladu nie je jednoznačný.',
  classification_document_type_mismatch: 'Typ dokladu sa nezhoduje s očakávaným.',
}

export function reasonTexts(codes: string[] | undefined): string[] {
  return [...new Set((codes ?? []).map((c) => REASON_TEXT[c]).filter(Boolean))]
}

export const STATE_LABEL: Record<FieldState, string> = {
  ok: 'Nájdené v doklade',
  review: 'Skontrolujte',
  missing: 'V doklade sa nenašlo',
  checked: 'Skontrolované',
  edited: 'Upravené vami',
}

/** Tailwind triedy pre ľavý okraj poľa a farbu textu stavu. */
export const STATE_STYLE: Record<FieldState, { bar: string; text: string; tint: string }> = {
  ok: { bar: 'border-l-ok', text: 'text-ok', tint: '' },
  review: { bar: 'border-l-mark', text: 'text-review', tint: 'bg-mark/10' },
  missing: { bar: 'border-l-field border-dashed', text: 'text-missing', tint: '' },
  checked: { bar: 'border-l-ok', text: 'text-ok', tint: '' },
  edited: { bar: 'border-l-primary', text: 'text-primary', tint: '' },
}

export function percent(confidence: number): string {
  return `${Math.round(confidence * 100)} %`
}
