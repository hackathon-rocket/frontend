import { useRef, useState, type DragEvent } from 'react'
import { ACCEPT_ATTRIBUTE, ACCEPTED_LABEL, MAX_FILE_SIZE, formatFileSize } from './validation'

interface Props {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

/** Oblasť na pretiahnutie súboru alebo jeho výber zo zariadenia (na mobile aj fotoaparát). */
export default function Dropzone({ onFiles, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }
  const onDragLeave = (e: DragEvent) => {
    e.preventDefault()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) setDragging(false)
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    if (!disabled) onFiles(Array.from(e.dataTransfer.files))
  }

  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        'relative rounded-lg border-2 border-dashed transition-colors',
        dragging ? 'border-mark bg-mark/10' : 'border-line bg-surface hover:border-ink-soft',
        disabled ? 'opacity-60 pointer-events-none' : '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="w-full flex flex-col items-center gap-4 px-6 py-12 sm:py-16 text-center rounded-lg cursor-pointer"
      >
        <DocumentIcon active={dragging} />
        <span className="text-lg font-semibold text-ink">
          {dragging ? 'Pustite súbor sem' : 'Presuňte doklad sem alebo ho vyberte'}
        </span>
        <span className="text-sm text-muted">
          {ACCEPTED_LABEL}, najviac {formatFileSize(MAX_FILE_SIZE)}. Na mobile môžete doklad rovno odfotiť.
        </span>
        <span className="mt-2 inline-flex items-center rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">
          Vybrať súbor
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []))
          e.target.value = '' // umožní vybrať ten istý súbor znova
        }}
      />
    </div>
  )
}

function DocumentIcon({ active }: { active: boolean }) {
  return (
    <svg width="56" height="68" viewBox="0 0 56 68" aria-hidden className="shrink-0">
      <path d="M4 2h34l14 14v48a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#fff" stroke="#1d3a5f" strokeWidth="2.5" />
      <path d="M38 2v14h14" fill="none" stroke="#1d3a5f" strokeWidth="2.5" />
      <rect x="11" y="24" width="24" height="3" rx="1.5" fill="#1d3a5f" />
      <rect x="11" y="33" width="32" height="3" rx="1.5" fill="#b7c2cf" />
      <rect x="11" y="41" width="28" height="3" rx="1.5" fill="#b7c2cf" />
      <rect x="9" y="50" width="36" height="7" rx="2" fill={active ? '#e8b84a' : '#e8b84a99'} />
    </svg>
  )
}
