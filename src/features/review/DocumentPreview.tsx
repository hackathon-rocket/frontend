import type { DocumentSummary } from '../../api/types'
import { getPreview } from '../../lib/previewStore'
import { formatFileSize } from '../upload/validation'

/** Náhľad dokladu vedľa formulára, aby sa hodnoty dali porovnať s originálom. */
export default function DocumentPreview({ doc }: { doc: DocumentSummary }) {
  const preview = getPreview(doc.id)
  const frame = 'w-full h-[60vh] lg:h-[calc(100vh-11rem)] rounded-md border border-line bg-surface'

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
    <div className={`${frame} flex flex-col items-center justify-center gap-2 p-6 text-center`}>
      <p className="font-medium text-ink">{doc.original_filename}</p>
      <p className="text-sm text-muted">{formatFileSize(doc.file_size)}</p>
      <p className="mt-2 max-w-xs text-sm text-muted">
        {preview
          ? 'Náhľad tohto formátu sa v prehliadači nezobrazuje. Hodnoty porovnajte s pôvodným súborom.'
          : 'Náhľad je dostupný hneď po nahratí. Po obnovení stránky ho zatiaľ nevieme načítať.'}
      </p>
    </div>
  )
}
