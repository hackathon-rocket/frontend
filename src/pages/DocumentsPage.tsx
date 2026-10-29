import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ApiError, listDocuments } from '../api/client'
import type { DocumentStatus, DocumentSummary } from '../api/types'
import { formatFileSize } from '../features/upload/validation'

/*
  Úloha #17 — zoznam dokladov.
  Viditeľnosť stavu: každý doklad ukazuje, kde v procese je, a ponúka ďalší krok.
  Kým sa niečo spracováva, zoznam sa sám obnovuje.
*/

const REFRESH_MS = 3000

type Filter = 'all' | 'review' | 'processing' | 'confirmed' | 'failed'

const STATUS: Record<DocumentStatus, { label: string; filter: Exclude<Filter, 'all'>; badge: string; action: string; to: (id: string) => string }> = {
  uploaded: { label: 'Čaká na spracovanie', filter: 'processing', badge: 'bg-paper text-muted', action: 'Priebeh', to: (id) => `/doklady/${id}/spracovanie` },
  processing: { label: 'Spracováva sa', filter: 'processing', badge: 'bg-primary-tint text-primary', action: 'Priebeh', to: (id) => `/doklady/${id}/spracovanie` },
  extracted: { label: 'Na kontrolu', filter: 'review', badge: 'bg-mark/15 text-review', action: 'Skontrolovať', to: (id) => `/doklady/${id}` },
  confirmed: { label: 'Potvrdené', filter: 'confirmed', badge: 'bg-ok/10 text-ok', action: 'Zobraziť', to: (id) => `/doklady/${id}` },
  failed: { label: 'Chyba', filter: 'failed', badge: 'bg-danger/10 text-danger', action: 'Detail chyby', to: (id) => `/doklady/${id}/spracovanie` },
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Všetky' },
  { id: 'review', label: 'Na kontrolu' },
  { id: 'processing', label: 'Spracováva sa' },
  { id: 'confirmed', label: 'Potvrdené' },
  { id: 'failed', label: 'Chyba' },
]

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const load = useCallback(async () => {
    try {
      setDocs(await listDocuments())
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Zoznam dokladov sa nepodarilo načítať.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Automatické obnovenie, kým sa niektorý doklad spracováva.
  const anyRunning = docs?.some((d) => d.status === 'uploaded' || d.status === 'processing') ?? false
  useEffect(() => {
    if (!anyRunning) return
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [anyRunning, load])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, review: 0, processing: 0, confirmed: 0, failed: 0 }
    for (const d of docs ?? []) {
      c.all += 1
      c[STATUS[d.status].filter] += 1
    }
    return c
  }, [docs])

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('sk')
    return (docs ?? []).filter(
      (d) => (filter === 'all' || STATUS[d.status].filter === filter) && (!q || d.original_filename.toLocaleLowerCase('sk').includes(q)),
    )
  }, [docs, filter, query])

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] sm:text-[40px] leading-tight font-bold">Doklady</h1>
          <p className="mt-2 text-lg text-muted">Nahraté doklady a stav ich spracovania.</p>
        </div>
        <Link to="/" className="btn btn-primary">
          Nahrať doklad
        </Link>
      </div>

      {error && (
        <div role="alert" className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border-l-4 border-danger bg-danger/5 px-4 py-3 text-sm text-danger">
          <span className="mr-auto">{error}</span>
          <button type="button" onClick={load} className="btn btn-secondary btn-sm">Skúsiť znova</button>
        </div>
      )}

      {docs === null && !error && <p className="mt-8 text-muted" aria-live="polite">Načítavam doklady…</p>}

      {docs && docs.length === 0 && <EmptyState />}

      {docs && docs.length > 0 && (
        <>
          <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative lg:w-80">
              <span className="sr-only">Hľadať doklad</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Hľadať podľa názvu súboru"
                className="input !rounded-full !px-4"
              />
            </label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrovať podľa stavu">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={[
                    'rounded-full border-[1.5px] px-3.5 py-1.5 text-sm font-semibold transition-colors',
                    filter === f.id ? 'border-primary bg-primary text-white' : 'border-field bg-surface text-ink hover:border-primary hover:text-primary',
                  ].join(' ')}
                >
                  {f.label} <span className={`tabular-nums ${filter === f.id ? 'text-white/80' : 'text-muted'}`}>{counts[f.id]}</span>
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="card mt-6 px-5 py-10 text-center">
              <p className="text-muted">Žiadny doklad nezodpovedá hľadaniu.</p>
              <button type="button" onClick={() => { setQuery(''); setFilter('all') }} className="btn btn-ghost btn-sm mt-2">
                Zrušiť filter
              </button>
            </div>
          ) : (
            <ul className="card mt-6 divide-y divide-line">
              {visible.map((d) => <DocumentRow key={d.id} doc={d} />)}
            </ul>
          )}
          {anyRunning && <p className="mt-3 text-sm text-muted" aria-live="polite">Stav sa obnovuje automaticky.</p>}
        </>
      )}
    </div>
  )
}

function DocumentRow({ doc }: { doc: DocumentSummary }) {
  const s = STATUS[doc.status]
  const primary = doc.status === 'extracted'
  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-6">
      <span className="shrink-0 sm:w-40">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${s.badge}`}>
          {doc.status === 'processing' && <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden />}
          {s.label}
        </span>
      </span>
      <div className="min-w-0 flex-1">
 <Link to={s.to(doc.id)} className="block truncate font-semibold text-ink hover:text-primary hover:underline" title={doc.original_filename}>
          {doc.original_filename}
        </Link>
        <p className="mt-0.5 text-sm text-muted">
          {[doc.document_type !== 'unknown' ? doc.document_type : null, formatFileSize(doc.file_size), formatWhen(doc.created_at)].filter(Boolean).join(', ')}
        </p>
      </div>
      <Link
        to={s.to(doc.id)}
        className={[
          'btn btn-sm w-fit shrink-0',
          primary ? 'btn-primary' : 'btn-secondary',
        ].join(' ')}
      >
        {s.action}
      </Link>
    </li>
  )
}

function EmptyState() {
  return (
    <div className="card mt-8 px-6 py-14 text-center">
      <p className="text-xl font-bold text-ink">Zatiaľ tu nie je žiadny doklad</p>
      <p className="mt-2 text-muted">Nahrajte faktúru alebo bloček a údaje z neho predvyplníme za vás.</p>
      <Link to="/" className="btn btn-primary mt-6">
        Nahrať prvý doklad
      </Link>
    </div>
  )
}

/** „dnes 14:05“, „včera 9:12“ alebo „12. 10. 2026“. */
function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const time = d.toLocaleTimeString('sk-SK', { hour: 'numeric', minute: '2-digit' })
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return `dnes ${time}`
  if (d.toDateString() === yesterday.toDateString()) return `včera ${time}`
  return d.toLocaleDateString('sk-SK')
}
