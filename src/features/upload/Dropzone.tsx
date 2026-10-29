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
        'relative rounded-xl border-2 border-dashed transition-colors shadow-card',
        dragging ? 'border-primary bg-primary-tint' : 'border-field bg-surface hover:border-primary',
        disabled ? 'opacity-60 pointer-events-none' : '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="w-full flex flex-col items-center gap-4 px-6 py-12 sm:py-16 text-center rounded-xl cursor-pointer"
      >
        <DocumentIcon active={dragging} />
        <span className="text-lg font-semibold text-ink">
          {dragging ? 'Pustite súbor sem' : 'Presuňte doklad sem alebo ho vyberte'}
        </span>
        <span className="text-sm text-muted">
          {ACCEPTED_LABEL}, najviac {formatFileSize(MAX_FILE_SIZE)}. Na mobile môžete doklad rovno odfotiť.
        </span>
        <span className="btn btn-primary mt-2">
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
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden className="shrink-0">
      <circle cx="32" cy="32" r="32" fill={active ? '#2870ed' : '#eaf1fd'} />
      <path d="M22 15h14l8 8v25a1.5 1.5 0 0 1-1.5 1.5h-20.5A1.5 1.5 0 0 1 20.5 48V16.5A1.5 1.5 0 0 1 22 15z" fill="#fff" stroke={active ? '#fff' : '#2870ed'} strokeWidth="2" />
      <path d="M36 15v8h8" fill="none" stroke={active ? '#fff' : '#2870ed'} strokeWidth="2" />
      <rect x="26" y="29" width="12" height="2.5" rx="1.25" fill="#2870ed" />
      <rect x="26" y="35" width="9" height="2.5" rx="1.25" fill="#a3b5c9" />
      <rect x="26" y="41" width="12" height="2.5" rx="1.25" fill="#a3b5c9" />
    </svg>
  )
}
