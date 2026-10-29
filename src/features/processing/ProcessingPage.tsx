import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError, getDocument } from '../../api/client'
import type { DocumentSummary, ProcessingStage } from '../../api/types'

const POLL_MS = 900
const MAX_NETWORK_ERRORS = 3

const STEPS: { stage: ProcessingStage | 'upload'; title: string; detail: string }[] = [
  { stage: 'upload', title: 'Nahratie súboru', detail: 'Súbor je bezpečne uložený.' },
  { stage: 'ocr', title: 'Rozpoznávanie textu', detail: 'Čítame text zo skenu alebo fotografie.' },
  { stage: 'extraction', title: 'Extrakcia údajov', detail: 'Hľadáme číslo dokladu, dodávateľa, sumy a položky.' },
  { stage: 'validation', title: 'Kontrola hodnôt', detail: 'Overujeme IČO, súčty a dátumy.' },
]

/** Úloha #11 — priebeh spracovania dokladu. */
export default function ProcessingPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<DocumentSummary | null>(null)
  const [networkError, setNetworkError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let errors = 0
    let timer: ReturnType<typeof setTimeout>

    const poll = async () => {
      try {
        const res = await getDocument(id)
        if (cancelled) return
        errors = 0
        setNetworkError(null)
        setDoc(res.document)
        if (res.document.status === 'extracted' || res.document.status === 'confirmed') {
          navigate(`/doklady/${id}`, { replace: true })
          return
        }
        if (res.document.status === 'failed') return
      } catch (e) {
        if (cancelled) return
        errors += 1
        if (errors >= MAX_NETWORK_ERRORS) {
          setNetworkError(e instanceof ApiError ? e.message : 'Stav spracovania sa nepodarilo načítať.')
        }
      }
      timer = setTimeout(poll, POLL_MS)
    }
    poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [id, navigate])

  const failed = doc?.status === 'failed'
  const activeIndex = activeStep(doc)

  return (
    <div className="max-w-2xl">
      <h1 className="text-[32px] sm:text-[40px] leading-tight font-bold">
        {failed ? 'Doklad sa nepodarilo spracovať' : 'Spracovávame doklad'}
      </h1>
      {doc && <p className="mt-3 text-muted truncate">{doc.original_filename}</p>}

      <ol className="card mt-8 divide-y divide-line" aria-live="polite">
        {STEPS.map((step, i) => {
          const state = failed && i === Math.max(activeIndex, 1) ? 'failed' : i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending'
          return (
 <li key={step.stage} className="flex gap-4 px-5 py-4 sm:px-6" aria-current={state === 'active' ? 'step' : undefined}>
              <StepMarker index={i + 1} state={state} />
              <div className={state === 'pending' ? 'text-muted' : ''}>
                <p className={`font-semibold ${state === 'pending' ? 'text-muted' : 'text-ink'}`}>{step.title}</p>
                {(state === 'active' || state === 'failed') && (
                  <p className={`mt-0.5 text-sm ${state === 'failed' ? 'text-danger' : 'text-muted'}`}>
                    {state === 'failed' ? doc?.error_message ?? 'Pri spracovaní nastala chyba.' : step.detail}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {networkError && !failed && (
        <div role="alert" className="mt-4 rounded-lg border-l-4 border-danger bg-danger/5 px-4 py-3 text-sm text-danger">
          {networkError} Skúšame to znova.
        </div>
      )}

      {failed ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/" className="btn btn-primary">
            Nahrať doklad znova
          </Link>
          <Link to="/doklady" className="btn btn-secondary">
            Prejsť na doklady
          </Link>
          <p className="w-full text-sm text-muted">
            Pomôže ostrejšia fotografia pri dobrom svetle alebo sken s rozlíšením aspoň 200 DPI.
          </p>
          {doc?.error_detail && (
            <details className="w-full text-sm text-muted">
              <summary className="cursor-pointer">Technický detail pre podporu</summary>
              <p className="mt-1 break-words">{doc.error_detail}</p>
            </details>
          )}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">
          Spracovanie zvyčajne trvá do pol minúty. Po dokončení sa výsledok otvorí sám.
        </p>
      )}
    </div>
  )
}

function activeStep(doc: DocumentSummary | null): number {
  if (!doc || doc.status === 'uploaded') return 1
  const i = STEPS.findIndex((s) => s.stage === doc.processing_stage)
  return i === -1 ? 1 : i
}

function StepMarker({ index, state }: { index: number; state: 'done' | 'active' | 'pending' | 'failed' }) {
  const base = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold'
  if (state === 'done')
    return (
      <span className={`${base} bg-ok text-white`} aria-label="Hotové">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
      </span>
    )
  if (state === 'failed') return <span className={`${base} bg-danger text-white`} aria-label="Chyba">!</span>
  if (state === 'active')
    return (
      <span className={`${base} relative border-2 border-primary/30 text-primary`}>
        <span className="absolute inset-[-4px] rounded-full border-2 border-transparent border-t-primary animate-spin" aria-hidden />
        {index}
      </span>
    )
  return <span className={`${base} border-2 border-line text-muted`}>{index}</span>
}
