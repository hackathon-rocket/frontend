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

export function initialState(value: unknown, confidence: number): FieldState {
  if (value === null || value === undefined || value === '') return 'missing'
  return confidence >= CONFIDENT_THRESHOLD ? 'ok' : 'review'
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
  review: { bar: 'border-l-review', text: 'text-review', tint: 'bg-mark/10' },
  missing: { bar: 'border-l-missing border-dashed', text: 'text-missing', tint: 'bg-paper' },
  checked: { bar: 'border-l-ok', text: 'text-ok', tint: '' },
  edited: { bar: 'border-l-ink', text: 'text-ink', tint: '' },
}

export function percent(confidence: number): string {
  return `${Math.round(confidence * 100)} %`
}
