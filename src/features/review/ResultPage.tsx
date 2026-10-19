import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { ApiError, confirmDocument, getDocument } from '../../api/client'
import type { ConfirmPayload, ExtractionResult } from '../../api/types'
import { STATE_STYLE } from '../../lib/confidence'
import DocumentPreview from './DocumentPreview'
import FieldRow from './FieldRow'
import ItemsTable from './ItemsTable'
import { sumCheck } from './checks'
import { useReviewState } from './useReviewState'

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
        <h1 className="text-3xl font-bold text-ink">Výsledok sa nepodarilo načítať</h1>
        <p role="alert" className="mt-3 text-danger">{error}</p>
        <Link to="/" className="mt-6 inline-block text-ink underline">Nahrať nový doklad</Link>
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

  const firstProblem = () => {
    const f = review.fields.find((e) => e.state === 'review' || e.error)
    const el = f ? document.getElementById(`row-${f.field.tag}`) : document.querySelector('[aria-invalid="true"], .bg-mark\\/15')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    ;(el?.querySelector('input') ?? (el as HTMLElement | null))?.focus?.()
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight">
            {readOnly ? 'Potvrdené údaje' : 'Skontrolujte údaje'}
          </h1>
          <p className="mt-2 truncate text-muted">
            {result.document.original_filename}
            {result.document.document_type && result.document.document_type !== 'unknown' && <>, rozpoznané ako {result.document.document_type}</>}
          </p>
        </div>
        <Summary {...summary} />
      </div>

      {result.warnings.length > 0 && (
        <ul className="mt-6 space-y-1 rounded-md border border-mark/50 bg-mark/10 px-4 py-3 text-sm text-review">
          {result.warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start" aria-label="Náhľad dokladu">
          <DocumentPreview doc={result.document} />
        </aside>

        <div className="space-y-10 pb-28">
          <section aria-labelledby="fields-title">
            <h2 id="fields-title" className="text-lg font-semibold text-ink">Údaje z dokladu</h2>
            <div className="mt-3 space-y-3">
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

          {review.tables.map((t) => (
            <ItemsTable key={t.table.tag} entry={t} check={sumCheck(t, review.fields)} readOnly={readOnly} review={review} />
          ))}

          {confirmed && <ConfirmedPanel payload={confirmed} />}
        </div>
      </div>

      {!readOnly && (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            {askAgain ? (
              <p role="alert" className="mr-auto text-sm text-review">
                {problems === 1 ? 'Jedna hodnota čaká' : problems < 5 ? `${problems} hodnoty čakajú` : `${problems} hodnôt čaká`} na kontrolu.{' '}
                <button type="button" onClick={firstProblem} className="font-medium text-ink underline underline-offset-2">Ukázať</button>
              </p>
            ) : (
              <p className="mr-auto text-sm text-muted">Po potvrdení sa údaje zapíšu do formulára vyúčtovania.</p>
            )}
            {saveError && <p role="alert" className="w-full text-sm text-danger sm:order-first">{saveError}</p>}
            <button
              type="button"
              onClick={onConfirmClick}
              disabled={saving}
              className="rounded-md bg-ink px-5 py-2.5 font-medium text-white hover:bg-ink-soft disabled:opacity-60"
            >
              {saving ? 'Ukladám…' : askAgain ? 'Potvrdiť aj tak' : 'Potvrdiť údaje'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Summary({ fieldCount, found, toReview, missing }: { fieldCount: number; found: number; toReview: number; missing: number }) {
  return (
    <dl className="flex flex-wrap gap-2 text-sm" aria-label="Prehľad výsledku">
      <Chip tone="ok" label="Vyplnené" value={`${found} z ${fieldCount}`} />
      <Chip tone="review" label="Na kontrolu" value={String(toReview)} />
      <Chip tone="missing" label="Nenájdené" value={String(missing)} />
    </dl>
  )
}

function Chip({ tone, label, value }: { tone: 'ok' | 'review' | 'missing'; label: string; value: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-md border border-line border-l-4 bg-surface px-3 py-1.5 ${STATE_STYLE[tone].bar}`}>
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function ConfirmedPanel({ payload }: { payload: ConfirmPayload }) {
  return (
    <section className="rounded-lg border border-ok/40 bg-ok/5 p-5" aria-live="polite">
      <h2 className="text-lg font-semibold text-ok">Údaje sú potvrdené</h2>
      <p className="mt-1 text-sm text-muted">Takto ich dostane formulár eGrant: hodnota ku každému tagu poľa.</p>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-ink">Zobraziť údaje pre formulár (JSON)</summary>
        <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-surface p-3 text-xs">{JSON.stringify(payload, null, 2)}</pre>
      </details>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link to="/" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink-soft">Nahrať ďalší doklad</Link>
        <Link to="/doklady" className="rounded-md px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5">Zobraziť doklady</Link>
      </div>
    </section>
  )
}
