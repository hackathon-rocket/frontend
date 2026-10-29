/*
  Lokálna história nahratých dokladov (v tomto prehliadači).
  Kým backend nemá GET /api/documents, zoznam dokladov skladáme z nej a stav každého
  dokladu dotiahneme cez existujúci GET /api/documents/{id}.
*/
const KEY = 'egrant-extrakcia:doklady'

export function readHistory(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const ids = raw ? JSON.parse(raw) : []
    return Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function addToHistory(id: string) {
  try {
    const ids = [id, ...readHistory().filter((x) => x !== id)].slice(0, 100)
    localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    /* úložisko nie je dostupné — zoznam bude len zo servera */
  }
}
