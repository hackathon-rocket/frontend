/*
  Lokálny náhľad nahratého súboru. Kým backend nevracia súbor späť (GET /documents/{id}/file),
  zobrazujeme priamo súbor, ktorý používateľ vybral — platí do obnovenia stránky.
*/
const previews = new Map<string, { url: string; type: string; name: string }>()

export function rememberPreview(documentId: string, file: File) {
  previews.set(documentId, { url: URL.createObjectURL(file), type: file.type, name: file.name })
}

export function getPreview(documentId: string) {
  return previews.get(documentId) ?? null
}
