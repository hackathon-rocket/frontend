import { API_BASE, USE_MOCK } from '../config'
import { addToHistory, readHistory } from '../lib/history'
import { toExtractionResult, toSummary } from './adapter'
import * as mock from './mock'
import type { ConfirmPayload, DocumentSummary, ExtractionResult, UploadResponse } from './types'

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
    if (status === 422 && b.message) return b.message
  }
  if (status === 0) return 'Server neodpovedá. Skontrolujte pripojenie alebo či je backend spustený.'
  if (status === 404) return 'Doklad sa na serveri nenašiel.'
  if (status === 413) return 'Súbor je pre server príliš veľký.'
  if (status >= 500) return 'Na serveri nastala chyba. Skúste to o chvíľu znova.'
  return `Server vrátil chybu ${status}.`
}

/**
 * Nahranie dokladu — POST /api/documents.
 * Používa XMLHttpRequest, aby sme vedeli zobraziť priebeh nahrávania.
 */
export async function uploadDocument(file: File, onProgress?: (percent: number) => void): Promise<UploadResponse> {
  const res = USE_MOCK ? await mock.uploadDocument(file, onProgress) : await uploadReal(file, onProgress)
  addToHistory(res.id)
  return res
}

function uploadReal(file: File, onProgress?: (percent: number) => void): Promise<UploadResponse> {
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

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError(errorMessage(0, null), 0)
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(errorMessage(res.status, body), res.status)
  return body as T
}

/** Stav spracovania a (keď je hotová) výsledok extrakcie — GET /api/documents/{id} (existuje). */
export async function getDocument(id: string): Promise<ExtractionResult> {
  // ?include=ocr → backend pridá rozpoznaný text, ktorý zobrazujeme vedľa formulára.
  const raw = USE_MOCK ? await mock.getDocument(id) : await requestJson(`/documents/${encodeURIComponent(id)}?include=ocr`)
  return toExtractionResult(raw)
}

/**
 * Zoznam dokladov (#17). Backend zatiaľ nemá GET /api/documents — vtedy zoznam zložíme
 * z lokálnej histórie nahratí a stav každého dokladu načítame cez GET /api/documents/{id}.
 */
export async function listDocuments(): Promise<DocumentSummary[]> {
  if (USE_MOCK) return (await mock.listDocuments()).map((d) => toSummary(d))
  try {
    const raw = await requestJson<unknown[] | { data: unknown[] }>('/documents')
    const items = Array.isArray(raw) ? raw : raw.data
    return items.map((d) => toSummary(d))
  } catch (e) {
    if (!(e instanceof ApiError) || (e.status !== 404 && e.status !== 405)) throw e
  }
  const results = await Promise.allSettled(readHistory().map((id) => getDocument(id)))
  return results.flatMap((r) => (r.status === 'fulfilled' ? [r.value.document] : []))
}

/** Odoslanie skontrolovaných a potvrdených údajov — POST /api/documents/{id}/confirm (návrh). */
export async function confirmDocument(id: string, payload: ConfirmPayload): Promise<DocumentSummary> {
  if (USE_MOCK) return mock.confirmDocument(id, payload)
  try {
    return await requestJson(`/documents/${id}/confirm`, { method: 'POST', body: JSON.stringify(payload) })
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 405)) {
      throw new ApiError('Server zatiaľ nevie uložiť potvrdené údaje. Stiahnite si ich cez Excel alebo JSON hore na stránke.', e.status)
    }
    throw e
  }
}
