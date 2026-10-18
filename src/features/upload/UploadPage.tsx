import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiError, uploadDocument } from '../../api/client'
import Dropzone from './Dropzone'
import { formatFileSize, kindOf, validateFiles } from './validation'

type State =
  | { step: 'empty' }
  | { step: 'invalid'; error: string }
  | { step: 'ready'; file: File }
  | { step: 'uploading'; file: File; progress: number }
  | { step: 'failed'; file: File; error: string }

/** Úloha #9 — obrazovka nahrania dokladu. */
export default function UploadPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ step: 'empty' })

  const handleFiles = (files: File[]) => {
    const result = validateFiles(files)
    setState(result.ok ? { step: 'ready', file: result.file } : { step: 'invalid', error: result.error })
  }

  const handleUpload = async () => {
    if (state.step !== 'ready' && state.step !== 'failed') return
    const file = state.file
    setState({ step: 'uploading', file, progress: 0 })
    try {
      const res = await uploadDocument(file, (progress) =>
        setState((s) => (s.step === 'uploading' ? { ...s, progress } : s)),
      )
      navigate(`/doklady/${res.id}/spracovanie`)
    } catch (e) {
      const error = e instanceof ApiError ? e.message : 'Nahrávanie zlyhalo. Skúste to znova.'
      setState({ step: 'failed', file, error })
    }
  }

  const file = 'file' in state ? state.file : null
  const error = state.step === 'invalid' || state.step === 'failed' ? state.error : null

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight">Nahrajte doklad</h1>
      <p className="mt-3 text-muted leading-relaxed max-w-prose">
        Faktúru, bloček alebo výpis z účtu. Údaje z neho predvyplníme do formulára vyúčtovania a vy ich pred
        uložením skontrolujete. Nič sa neuloží bez vášho potvrdenia.
      </p>

      <div className="mt-8">
        {file ? (
          <SelectedFile
            file={file}
            progress={state.step === 'uploading' ? state.progress : null}
            onRemove={() => setState({ step: 'empty' })}
          />
        ) : (
          <Dropzone onFiles={handleFiles} />
        )}
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {file && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={state.step === 'uploading'}
            className="rounded-md bg-ink px-5 py-2.5 font-medium text-white hover:bg-ink-soft disabled:opacity-60 disabled:cursor-wait"
          >
            {state.step === 'uploading' ? 'Nahrávam…' : state.step === 'failed' ? 'Skúsiť znova' : 'Spracovať doklad'}
          </button>
          {state.step !== 'uploading' && (
            <button
              type="button"
              onClick={() => setState({ step: 'empty' })}
              className="rounded-md px-5 py-2.5 font-medium text-ink hover:bg-ink/5"
            >
              Vybrať iný súbor
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function SelectedFile({ file, progress, onRemove }: { file: File; progress: number | null; onRemove: () => void }) {
  const kind = kindOf(file)
  return (
    <div className="rounded-lg border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded border-2 border-ink text-[11px] font-bold text-ink">
          {kind?.label ?? '?'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium" title={file.name}>{file.name}</p>
          <p className="text-sm text-muted">{formatFileSize(file.size)}</p>
        </div>
        {progress === null && (
          <button type="button" onClick={onRemove} className="text-sm font-medium text-muted hover:text-danger px-2 py-1 rounded">
            Odstrániť
          </button>
        )}
      </div>
      {progress !== null && (
        <div
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Priebeh nahrávania"
        >
          <div className="h-full bg-mark transition-[width] duration-150" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}
