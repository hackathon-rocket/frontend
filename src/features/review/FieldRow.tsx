import { STATE_STYLE } from '../../lib/confidence'
import StateNote from './StateNote'
import type { FieldEntry } from './useReviewState'

interface Props {
  entry: FieldEntry
  readOnly?: boolean
  onChange: (text: string) => void
  onCheck: () => void
}

/** Jedno pole formulára (#12, #13): editovateľná hodnota + stav (#14, #15). */
export default function FieldRow({ entry, readOnly, onChange, onCheck }: Props) {
  const { field, text, state, error } = entry
  const id = `field-${field.tag}`
  const style = STATE_STYLE[state]
  const isNumeric = field.type === 'currency' || field.type === 'number'

  return (
    <div id={`row-${field.tag}`} className={`border-l-4 ${style.bar} ${style.tint} rounded-r-md py-3 pl-4 pr-3 scroll-mt-24`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-medium">
          {field.label}
        </label>
        <span className="text-xs text-muted" title="Tag poľa vo formulári eGrant">{field.tag}</span>
      </div>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={field.type === 'date' ? 'date' : 'text'}
          inputMode={isNumeric ? 'decimal' : undefined}
          value={text}
          readOnly={readOnly}
          placeholder={state === 'missing' ? 'Nenájdené — doplňte' : undefined}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          className={[
            'w-full rounded-md border bg-surface px-3 py-2 text-base',
            isNumeric ? 'text-right tabular-nums' : '',
            field.type === 'currency' ? 'pr-8' : '',
            error ? 'border-danger' : state === 'missing' ? 'border-dashed border-missing' : 'border-line',
            readOnly ? 'bg-paper text-muted' : '',
          ].join(' ')}
        />
        {field.type === 'currency' && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">€</span>}
      </div>
      <div className="mt-1.5">
        <StateNote entry={entry} onCheck={readOnly ? undefined : onCheck} />
      </div>
    </div>
  )
}
