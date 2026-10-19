import { STATE_LABEL, percent, type FieldState } from '../../lib/confidence'
import type { FieldEntry } from './useReviewState'

/** Riadok pod poľom: stav (#15), zdroj hodnoty z dokladu, chybová hláška. */
export default function StateNote({ entry, onCheck, compact }: { entry: FieldEntry; onCheck?: () => void; compact?: boolean }) {
  const { state, field, error } = entry
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${compact ? 'text-xs' : 'text-sm'}`}>
      <span className={`inline-flex items-center gap-1.5 font-medium ${TEXT[state]}`}>
        <StateIcon state={state} />
        {STATE_LABEL[state]}
        {state === 'review' && <span className="font-normal">(istota {percent(field.confidence)})</span>}
      </span>
      {!compact && field.evidence && (state === 'ok' || state === 'review' || state === 'checked') && (
        <span className="text-muted">
          v doklade: <q className="text-text">{field.evidence}</q>
        </span>
      )}
      {!compact && state === 'missing' && <span className="text-muted">Doplňte ručne, ak ho formulár vyžaduje.</span>}
      {state === 'review' && onCheck && (
        <button type="button" onClick={onCheck} className="font-medium text-ink underline underline-offset-2 hover:text-ink-soft">
          Hodnota je správna
        </button>
      )}
      {error && (
        <span className="basis-full text-danger" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

const TEXT: Record<FieldState, string> = {
  ok: 'text-ok',
  checked: 'text-ok',
  review: 'text-review',
  missing: 'text-missing',
  edited: 'text-ink',
}

export function StateIcon({ state }: { state: FieldState }) {
  const common = { width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': true } as const
  switch (state) {
    case 'ok':
    case 'checked':
      return <svg {...common}><circle cx="7" cy="7" r="6.5" fill="currentColor" /><path d="M4 7.2l2 2 4-4.5" fill="none" stroke="#fff" strokeWidth="1.6" /></svg>
    case 'review':
      return <svg {...common}><path d="M7 1l6.5 12h-13z" fill="currentColor" /><path d="M7 5v3.5M7 10.2v.6" stroke="#fff" strokeWidth="1.5" /></svg>
    case 'missing':
      return <svg {...common}><circle cx="7" cy="7" r="5.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.2 1.8" /></svg>
    case 'edited':
      return <svg {...common}><path d="M2 12l1-3.2L9.6 2.2l2.2 2.2L5.2 11z" fill="currentColor" /></svg>
  }
}
