import { API_BASE, USE_MOCK } from '../config'
import * as mock from './mock'
import type { DocumentSummary, ExtractionResult, UploadResponse } from './types'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Vytiahne zrozumiteľnú správu z Laravel chyby (422 validácia, 500 …). */
function errorMessage(status: number, body: unknown): string {
  if (body && typeof body === 'object') {
    const b = body as { message?: string; errors?: Record<string, string[]> }
    const first = b.errors && Object.values(b.errors)[0]?.[0]
    if (first) return first
    if (b.message) return b.message
  }
  if (status === 0) return 'Server neodpovedá. Skontrolujte, či je backend spustený.'
  if (status === 413) return 'Súbor je pre server príliš veľký.'
  return `Server vrátil chybu ${status}.`
}

/**
 * Nahranie dokladu. Používa XMLHttpRequest, aby sme vedeli zobraziť priebeh nahrávania.
 */
export function uploadDocument(file: File, onProgress?: (percent: number) => void): Promise<UploadResponse> {
  if (USE_MOCK) return mock.uploadDocument(file, onProgress)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/documents`)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      let body: unknown = null
      try { body = JSON.parse(xhr.responseText) } catch { /* nie je JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as UploadResponse)
      else reject(new ApiError(errorMessage(xhr.status, body), xhr.status))
    }
    xhr.onerror = () => reject(new ApiError(errorMessage(0, null), 0))
    const data = new FormData()
    data.append('file', file)
    xhr.send(data)
  })
}

async function getJson<T>(path: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' } })
  } catch {
    throw new ApiError(errorMessage(0, null), 0)
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(errorMessage(res.status, body), res.status)
  return body as T
}

/** Zatiaľ len v mocku — backend endpoint treba doplniť. */
export function getDocument(id: string): Promise<ExtractionResult> {
  return USE_MOCK ? mock.getDocument(id) : getJson(`/documents/${id}`)
}

export function listDocuments(): Promise<DocumentSummary[]> {
  return USE_MOCK ? mock.listDocuments() : getJson('/documents')
}
