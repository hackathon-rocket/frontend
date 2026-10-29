import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { ApiError, confirmDocument, getDocument } from '../../api/client'
import type { ConfirmPayload, ExtractionResult } from '../../api/types'
import { STATE_STYLE } from '../../lib/confidence'
import ExportButtons from '../export/ExportButtons'
import DocumentPreview from './DocumentPreview'
import FieldRow from './FieldRow'
import ItemsTable from './ItemsTable'
import { sumCheck } from './checks'
import { isRowForm, useReviewState, type ReviewState, type TableEntry } from './useReviewState'

/** Úlohy #12–15 — kontrola a potvrdenie extrahovaných údajov. */
export default function ResultPage() {
  const { id = '' } = useParams()
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getDocument(id)
      .then((r) => !cancelled && setResult(r))
      .catch((e) => !cancelled && setError(e instanceof ApiError ? e.message : 'Výsledok sa nepodarilo načítať.'))
    return () => {
      cancelled = true
    }
  }, [id])

  if (error) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-[32px] leading-tight font-bold">Výsledok sa nepodarilo načítať</h1>
        <p role="alert" className="mt-3 text-danger">{error}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/doklady" className="btn btn-secondary">Späť na doklady</Link>
          <Link to="/" className="btn btn-primary">Nahrať nový doklad</Link>
        </div>
      </div>
    )
  }
  if (!result) return <p className="text-muted" aria-live="polite">Načítavam výsledok…</p>

  const status = result.document.status
  if (status === 'uploaded' || status === 'processing' || status === 'failed') {
    return <Navigate to={`/doklady/${id}/spracovanie`} replace />
  }
  return <Review result={result} />
}

function Review({ result }: { result: ExtractionResult }) {
  const review = useReviewState(result)
  const { summary } = review
  const [confirmed, setConfirmed] = useState<ConfirmPayload | null>(null)
  const [askAgain, setAskAgain] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const alreadyConfirmed = result.document.status === 'confirmed'
  const readOnly = !!confirmed || alreadyConfirmed
  const problems = summary.toReview + summary.invalid
  const rowForms = review.tables.filter((t) => isRowForm(t.table))
  const itemTables = review.tables.filter((t) => !isRowForm(t.table))

  const doConfirm = async () => {
    setSaving(true)
    setSaveError(null)
    const payload = review.buildPayload()
    try {
      await confirmDocument(result.document.id, payload)
      setConfirmed(payload)
      setAskAgain(false)
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : 'Údaje sa nepodarilo uložiť. Skúste to znova.')
    } finally {
      setSaving(false)
    }
  }

  const onConfirmClick = () => (problems > 0 && !askAgain ? setAskAgain(true) : doConfirm())

  /** Prevencia chýb: jedným klikom k prvej hodnote, ktorá čaká na kontrolu. */
  const firstProblem = () => {
    const el = document.querySelector<HTMLElement>('[data-attention="true"]')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    ;(el?.querySelector('input') ?? el)?.focus?.()
  }

  return (
    <div>
      <Link to="/doklady" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark">
        <span aria-hidden>←</span> Doklady
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[32px] sm:text-[40px] leading-tight font-bold">
            {readOnly ? 'Potvrdené údaje' : 'Skontrolujte údaje'}
          </h1>
          <p className="mt-2 truncate text-muted">
            {result.document.original_filename}
            {result.document.document_type && result.document.document_type !== 'unknown' && <>, rozpoznané ako {result.document.document_type}</>}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Summary {...summary} />
          <Legend />
        </div>
      </div>

      <div className="mt-5">
        <ExportButtons input={{ document: result.document, fields: review.fields, tables: review.tables, confirmed: readOnly }} />
      </div>

      {result.warnings.length > 0 && <Warnings items={result.warnings} />}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start" aria-label="Náhľad dokladu">
          <DocumentPreview doc={result.document} />
          {result.ocr_text && (
            <details className="card overflow-hidden" open={summary.found === 0}>
              <summary className="cursor-pointer px-5 py-3.5 font-semibold text-ink">Rozpoznaný text z dokladu</summary>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-t border-line px-5 py-4 text-xs leading-relaxed text-text">{result.ocr_text}</pre>
            </details>
          )}
        </aside>

        <div className="space-y-6 pb-32">
          {review.fields.length > 0 && (
            <section aria-labelledby="fields-title" className="card p-4 sm:p-6">
              <h2 id="fields-title" className="text-xl font-bold">Údaje z dokladu</h2>
              <div className="mt-4 space-y-3">
                {review.fields.map((entry) => (
                  <FieldRow
                    key={entry.field.tag}
                    entry={entry}
                    readOnly={readOnly}
                    onChange={(t) => review.setFieldText(entry.field.tag, t)}
                    onCheck={() => review.markFieldChecked(entry.field.tag)}
                  />
                ))}
              </div>
            </section>
          )}

          {rowForms.map((t) => (
            <RowForm key={t.table.tag} entry={t} readOnly={readOnly} review={review} />
          ))}

          {itemTables.map((t) => (
            <section key={t.table.tag} className="card p-4 sm:p-6">
              <ItemsTable entry={t} check={sumCheck(t, review.fields)} readOnly={readOnly} review={review} />
            </section>
          ))}

          {confirmed && <ConfirmedPanel payload={confirmed} />}
        </div>
      </div>

      {!readOnly && (
        <div className="fixed inset-x-0 bottom-0 z-10 bg-surface/95 shadow-raised backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3.5 sm:px-6">
            {askAgain ? (
              <p role="alert" className="mr-auto text-sm font-medium text-review">
                {problems === 1 ? 'Jedna hodnota čaká' : problems < 5 ? `${problems} hodnoty čakajú` : `${problems} hodnôt čaká`} na kontrolu.{' '}
                <button type="button" onClick={firstProblem} className="font-semibold text-primary underline underline-offset-2">Ukázať</button>
              </p>
            ) : (
              <p className="mr-auto text-sm text-muted">Po potvrdení sa údaje zapíšu do formulára vyúčtovania.</p>
            )}
            {saveError && <p role="alert" className="w-full text-sm text-danger sm:order-first">{saveError}</p>}
            <button type="button" onClick={onConfirmClick} disabled={saving} className="btn btn-primary">
              {saving ? 'Ukladám…' : askAgain ? 'Potvrdiť aj tak' : 'Potvrdiť údaje'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Jeden riadok tabuľky formulára (napr. BBSK „Zoznam účtovných dokladov“) zobrazený ako formulár. */
function RowForm({ entry, readOnly, review }: { entry: TableEntry; readOnly: boolean; review: ReviewState }) {
  const { table } = entry
  const row = entry.rows[0]
  return (
    <section className="card p-4 sm:p-6" aria-labelledby={`rf-${table.tag}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id={`rf-${table.tag}`} className="text-xl font-bold">{table.label}</h2>
        <span className="text-xs text-muted" title="Tabuľka vo formulári eGrant">{table.tag}</span>
      </div>
      <p className="mt-1 text-sm text-muted">Údaje pribudnú ako nový riadok tejto tabuľky vo formulári.</p>
      <div className="mt-4 space-y-3">
        {table.columns.map((c) => {
          const cell = row.cells[c.tag]
          if (!cell) return null
          return (
            <FieldRow
              key={c.tag}
              entry={cell}
              readOnly={readOnly}
              domId={`${table.tag}-${c.tag}`}
              tagLabel={`${table.tag}.${c.tag}`}
              onChange={(t) => review.setCellText(table.tag, row.id, c.tag, t)}
              onCheck={() => review.markCellChecked(table.tag, row.id, c.tag)}
            />
          )
        })}
      </div>
    </section>
  )
}

/** Upozornenia zo servera — prvé tri hneď, zvyšok po rozbalení (minimalistický dizajn). */
function Warnings({ items }: { items: string[] }) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, 3)
  return (
    <section className="mt-6 rounded-xl border-l-4 border-mark bg-mark/10 px-5 py-4" aria-label="Upozornenia">
      <ul className="space-y-1.5 text-sm text-text">
        {shown.map((w) => (
          <li key={w} className="flex gap-2">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-review" aria-hidden />
            <span>{w}</span>
          </li>
        ))}
      </ul>
      {items.length > 3 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 text-sm font-semibold text-primary underline underline-offset-2">
          {all ? 'Zobraziť menej' : `Zobraziť všetky upozornenia (${items.length})`}
        </button>
      )}
    </section>
  )
}

function Summary({ fieldCount, found, toReview, missing }: { fieldCount: number; found: number; toReview: number; missing: number }) {
  return (
    <dl className="flex flex-wrap gap-2 text-sm" aria-label="Prehľad výsledku">
      <Chip dot="bg-ok" label="Vyplnené" value={`${found} z ${fieldCount}`} />
      <Chip dot="bg-mark" label="Na kontrolu" value={String(toReview)} />
      <Chip dot="bg-field" label="Nenájdené" value={String(missing)} />
    </dl>
  )
}

function Chip({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-surface px-3.5 py-1.5 shadow-card">
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden />
      <dt className="text-muted">{label}</dt>
      <dd className="font-bold tabular-nums text-ink">{value}</dd>
    </div>
  )
}

/** Pomoc (heuristika č. 10): stručné vysvetlenie farieb priamo pri prehľade. */
function Legend() {
  const items: { tone: 'ok' | 'review' | 'missing' | 'edited'; text: string }[] = [
    { tone: 'ok', text: 'AI hodnotu našla v doklade a server ju overil.' },
    { tone: 'review', text: 'AI si nie je istá — porovnajte s dokladom a potvrďte alebo opravte.' },
    { tone: 'missing', text: 'Údaj v doklade nie je. AI ho nedomýšľa, doplňte ho vy.' },
    { tone: 'edited', text: 'Hodnotu ste zmenili alebo doplnili vy.' },
  ]
  return (
    <details className="relative text-sm">
      <summary className="cursor-pointer font-medium text-primary hover:text-primary-dark">Čo znamenajú farby?</summary>
      <ul className="absolute left-0 z-20 mt-2 w-72 space-y-2 rounded-xl bg-surface p-4 shadow-raised sm:left-auto sm:right-0 sm:w-80">
        {items.map((i) => (
          <li key={i.tone} className={`border-l-4 pl-2.5 ${STATE_STYLE[i.tone].bar}`}>{i.text}</li>
        ))}
      </ul>
    </details>
  )
}

function ConfirmedPanel({ payload }: { payload: ConfirmPayload }) {
  return (
    <section className="card border-l-4 border-ok p-5 sm:p-6" aria-live="polite">
      <h2 className="flex items-center gap-2 text-xl font-bold !text-ok">
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden><circle cx="11" cy="11" r="11" fill="currentColor" /><path d="M6.5 11.5l3 3 6-7" fill="none" stroke="#fff" strokeWidth="2" /></svg>
        Údaje sú potvrdené
      </h2>
      <p className="mt-1 text-sm text-muted">Takto ich dostane formulár eGrant: hodnota ku každému tagu poľa.</p>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-primary">Zobraziť údaje pre formulár (JSON)</summary>
        <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-paper p-3 text-xs">{JSON.stringify(payload, null, 2)}</pre>
      </details>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/" className="btn btn-primary">Nahrať ďalší doklad</Link>
        <Link to="/doklady" className="btn btn-secondary">Zobraziť doklady</Link>
      </div>
    </section>
  )
}
