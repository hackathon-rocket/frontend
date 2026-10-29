import { useState } from 'react'
import { downloadJson, downloadXlsx, type ExportInput } from './exporters'

/** Tlačidlá exportu (#18, #19). Exportuje sa aktuálny stav vrátane úprav. */
export default function ExportButtons({ input }: { input: ExportInput }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => void | Promise<void>) => {
    setError(null)
    setBusy(true)
    try {
      await fn()
    } catch {
      setError('Súbor sa nepodarilo vytvoriť. Skúste to znova.')
    } finally {
      setBusy(false)
    }
  }

  const btn = 'btn btn-secondary btn-sm'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">Stiahnuť údaje:</span>
      <button type="button" className={btn} disabled={busy} onClick={() => run(() => downloadXlsx(input))} title="Hárky: údaje, položky, informácie o doklade">
        <DownloadIcon /> Excel
      </button>
      <button type="button" className={btn} disabled={busy} onClick={() => run(() => downloadJson(input))} title="Tag → hodnota, tak ako ich prijme formulár eGrant">
        <DownloadIcon /> JSON
      </button>
      {!input.confirmed && <span className="text-xs text-muted">(ešte nepotvrdené)</span>}
      {error && <span role="alert" className="basis-full text-sm text-danger">{error}</span>}
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M7 1.5v7.5M3.8 6l3.2 3.2L10.2 6M2 12h10" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
