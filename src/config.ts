// Ak VITE_USE_MOCK nie je nastavené, predvolene používame mock (backend ešte nevie extrakciu).
export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false'
export const API_BASE = '/api'
