import type { DocumentSummary } from '../../api/types'
import { getPreview } from '../../lib/previewStore'
import { formatFileSize } from '../upload/validation'

/** Náhľad dokladu vedľa formulára, aby sa hodnoty dali porovnať s originálom. */
export default function DocumentPreview({ doc }: { doc: DocumentSummary }) {
  const preview = getPreview(doc.id)
  const frame = 'card w-full h-[60vh] lg:h-[calc(100vh-14rem)] overflow-hidden'

  if (preview?.type === 'application/pdf') {
    return <iframe src={`${preview.url}#view=FitH`} title={`Náhľad: ${doc.original_filename}`} className={frame} />
  }
  if (preview?.type.startsWith('image/')) {
    return (
      <div className={`${frame} overflow-auto p-2`}>
        <img src={preview.url} alt={`Náhľad: ${doc.original_filename}`} className="w-full h-auto" />
      </div>
    )
  }
  return (
    <div className="card flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-tint text-xs font-bold text-primary" aria-hidden>{(doc.original_filename.split('.').pop() ?? '').toUpperCase().slice(0, 4)}</span>
      <p className="font-semibold text-ink">{doc.original_filename}</p>
      <p className="text-sm text-muted">{formatFileSize(doc.file_size)}</p>
      <p className="mt-2 max-w-xs text-sm text-muted">
        {preview
          ? 'Náhľad tohto formátu sa v prehliadači nezobrazuje. Hodnoty porovnajte s pôvodným súborom.'
          : 'Náhľad je dostupný hneď po nahratí. Po obnovení stránky ho zatiaľ nevieme načítať.'}
      </p>
    </div>
  )
}
