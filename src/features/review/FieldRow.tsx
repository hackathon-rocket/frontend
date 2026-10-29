import { STATE_STYLE } from '../../lib/confidence'
import StateNote from './StateNote'
import type { FieldEntry } from './useReviewState'

interface Props {
  entry: FieldEntry
  readOnly?: boolean
  /** Jedinečné id v DOM (bunky tabuľky môžu mať rovnaký tag ako pole). */
  domId?: string
  /** Tag zobrazený manažérovi — pri bunke celá cesta tabuľka.stĺpec. */
  tagLabel?: string
  onChange: (text: string) => void
  onCheck: () => void
}

/** Jedno pole formulára (#12, #13): editovateľná hodnota + stav (#14, #15). */
export default function FieldRow({ entry, readOnly, domId, tagLabel, onChange, onCheck }: Props) {
  const { field, text, state, error } = entry
  const key = (domId ?? field.tag).replace(/[^\w-]/g, '_')
  const id = `field-${key}`
  const style = STATE_STYLE[state]
  const isNumeric = field.type === 'currency' || field.type === 'number'
  const attention = state === 'review' || !!error

  return (
    <div
      id={`row-${key}`}
      data-attention={attention || undefined}
      className={`border-l-4 ${style.bar} ${style.tint} rounded-r-lg py-3.5 pl-4 pr-3 scroll-mt-28`}
    >
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <label htmlFor={id} className="font-semibold text-ink">
          {field.label}
        </label>
        <span className="min-w-0 truncate text-xs text-muted" title={`Tag vo formulári eGrant: ${tagLabel ?? field.tag}`}>{tagLabel ?? field.tag}</span>
      </div>
      <div className="relative mt-2">
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
            'input',
            isNumeric ? 'text-right tabular-nums' : '',
            field.type === 'currency' ? 'pr-9' : '',
            error ? '!border-danger' : state === 'missing' ? '!border-dashed' : '',
            readOnly ? '!bg-paper text-muted' : '',
          ].join(' ')}
        />
        {field.type === 'currency' && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">€</span>}
      </div>
      <div className="mt-2">
        <StateNote entry={entry} onCheck={readOnly ? undefined : onCheck} />
      </div>
    </div>
  )
}
