import { formatCurrency } from '../../lib/format'
import { STATE_LABEL, percent } from '../../lib/confidence'
import { StateIcon } from './StateNote'
import type { SumCheck } from './checks'
import type { FieldEntry, ReviewState, TableEntry } from './useReviewState'

interface Props {
  entry: TableEntry
  check: SumCheck | null
  readOnly?: boolean
  review: Pick<ReviewState, 'setCellText' | 'markCellChecked' | 'addRow' | 'removeRow'>
}

/** Tabuľka položiek (#12, #13): editovateľné bunky, pridanie a odstránenie riadkov, kontrola súčtu. */
export default function ItemsTable({ entry, check, readOnly, review }: Props) {
  const { table, rows } = entry

  return (
    <section aria-labelledby={`t-${table.tag}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`t-${table.tag}`} className="text-lg font-semibold text-ink">{table.label}</h2>
        <span className="text-xs text-muted" title="Tag tabuľky vo formulári eGrant">{table.tag}</span>
      </div>

      <div className="relative mt-3 overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th scope="col" className="w-8 px-2 py-2 font-medium">#</th>
              {table.columns.map((c) => (
                <th key={c.tag} scope="col" className={`px-2 py-2 font-medium ${COL_WIDTH[c.type] ?? ''} ${c.type === 'currency' || c.type === 'number' ? 'text-right' : ''}`}>
                  {c.label}
                </th>
              ))}
              {!readOnly && <th scope="col" className="w-10"><span className="sr-only">Akcie</span></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className="border-b border-line last:border-b-0 align-top">
                <td className="px-2 py-2.5 text-muted tabular-nums">{i + 1}</td>
                {table.columns.map((c) => (
                  <td key={c.tag} className="px-1.5 py-1.5">
                    <Cell
                      cell={row.cells[c.tag]}
                      label={`${c.label}, riadok ${i + 1}`}
                      readOnly={readOnly}
                      onChange={(text) => review.setCellText(table.tag, row.id, c.tag, text)}
                      onCheck={() => review.markCellChecked(table.tag, row.id, c.tag)}
                    />
                  </td>
                ))}
                {!readOnly && (
                  <td className="px-1 py-1.5">
                    <button
                      type="button"
                      onClick={() => review.removeRow(table.tag, row.id)}
                      className="rounded p-2 text-muted hover:bg-danger/10 hover:text-danger"
                      aria-label={`Odstrániť riadok ${i + 1}`}
                      title="Odstrániť riadok"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.8" /></svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={table.columns.length + 2} className="px-3 py-6 text-center text-muted">
                  V doklade sme nenašli žiadne položky. Pridajte ich ručne.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        {!readOnly ? (
          <button type="button" onClick={() => review.addRow(table.tag)} className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:border-ink-soft">
            + Pridať položku
          </button>
        ) : <span />}
        {check && <SumCheckNote check={check} />}
      </div>
    </section>
  )
}

/** Šírky stĺpcov podľa typu — textu necháme najviac miesta. */
const COL_WIDTH: Partial<Record<string, string>> = { number: 'w-24', currency: 'w-36', date: 'w-40', ico: 'w-32' }

function Cell({ cell, label, readOnly, onChange, onCheck }: {
  cell: FieldEntry
  label: string
  readOnly?: boolean
  onChange: (t: string) => void
  onCheck: () => void
}) {
  const numeric = cell.field.type === 'currency' || cell.field.type === 'number'
  const tone =
    cell.error ? 'border-danger bg-danger/5'
    : cell.state === 'review' ? 'border-review/60 bg-mark/15'
    : cell.state === 'missing' ? 'border-dashed border-missing bg-paper'
    : cell.state === 'edited' ? 'border-ink/40'
    : 'border-transparent hover:border-line focus:border-line'
  const hint =
    cell.error ??
    (cell.state === 'review'
      ? `${STATE_LABEL.review} (istota ${percent(cell.field.confidence)})${cell.field.evidence ? ` — v doklade: „${cell.field.evidence}“` : ''}`
      : cell.state === 'missing' || cell.state === 'edited' ? STATE_LABEL[cell.state] : undefined)

  return (
    <div>
      <input
        value={cell.text}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        aria-label={label}
        aria-invalid={!!cell.error}
        title={hint}
        inputMode={numeric ? 'decimal' : undefined}
        className={`w-full rounded border px-2 py-1.5 ${numeric ? 'text-right tabular-nums' : ''} ${tone}`}
      />
      {cell.state === 'review' && !readOnly && (
        <div className="mt-1 flex items-center justify-end gap-2 text-xs text-review">
          <StateIcon state="review" />
          <span>{cell.field.evidence ? <>v doklade „{cell.field.evidence}“</> : `istota ${percent(cell.field.confidence)}`}</span>
          <button type="button" onClick={onCheck} className="font-medium text-ink underline underline-offset-2">OK</button>
        </div>
      )}
      {cell.error && <p className="mt-1 text-xs text-danger">{cell.error}</p>}
    </div>
  )
}

function SumCheckNote({ check }: { check: SumCheck }) {
  if (check.total === null) {
    return <p className="text-sm text-muted">Súčet položiek: <strong className="text-text">{formatCurrency(check.sum)}</strong></p>
  }
  return check.matches ? (
    <p className="flex items-center gap-1.5 text-sm text-ok">
      <StateIcon state="ok" /> Súčet položiek {formatCurrency(check.sum)} sedí s poľom {check.totalLabel}.
    </p>
  ) : (
    <p role="alert" className="flex items-start gap-1.5 text-sm text-review">
      <span className="mt-0.5"><StateIcon state="review" /></span>
      <span>
        Súčet položiek je {formatCurrency(check.sum)}, ale {check.totalLabel} je {formatCurrency(check.total)}
        {' '}(rozdiel {formatCurrency(Math.abs(check.sum - check.total))}).
      </span>
    </p>
  )
}
