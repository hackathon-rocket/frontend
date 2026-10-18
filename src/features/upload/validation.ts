/*
  Validácia súboru na frontende (úloha #10).
  Kontroluje: počet súborov, typ (prípona + MIME), prázdny súbor, maximálnu veľkosť.
  Limit 20 MB zodpovedá backendu (DocumentController: max:20480).
*/

export const MAX_FILE_SIZE = 20 * 1024 * 1024

interface FileKind {
  label: string
  extensions: string[]
  mimeTypes: string[]
}

export const ACCEPTED_KINDS: FileKind[] = [
  { label: 'PDF', extensions: ['pdf'], mimeTypes: ['application/pdf'] },
  { label: 'JPG', extensions: ['jpg', 'jpeg'], mimeTypes: ['image/jpeg'] },
  { label: 'PNG', extensions: ['png'], mimeTypes: ['image/png'] },
  {
    label: 'XLSX',
    extensions: ['xlsx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  },
  {
    label: 'DOCX',
    extensions: ['docx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
]

/** Hodnota pre atribút accept na <input type="file">. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_KINDS.flatMap((k) => [
  ...k.extensions.map((e) => `.${e}`),
  ...k.mimeTypes,
]).join(',')

const labels = ACCEPTED_KINDS.map((k) => k.label)
export const ACCEPTED_LABEL = `${labels.slice(0, -1).join(', ')} alebo ${labels.at(-1)}`

// Niektoré systémy (najmä Windows) posielajú prázdny alebo všeobecný MIME typ — vtedy rozhoduje prípona.
const GENERIC_MIME = ['', 'application/octet-stream']

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString('sk-SK', { maximumFractionDigits: 0 })} kB`
  return `${(bytes / 1024 / 1024).toLocaleString('sk-SK', { maximumFractionDigits: 1 })} MB`
}

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

export function kindOf(file: File): FileKind | undefined {
  const ext = fileExtension(file.name)
  return ACCEPTED_KINDS.find((k) => k.extensions.includes(ext))
}

export type ValidationResult = { ok: true; file: File } | { ok: false; error: string }

export function validateFiles(files: File[]): ValidationResult {
  if (files.length === 0) {
    return { ok: false, error: 'Nevybrali ste žiadny súbor.' }
  }
  if (files.length > 1) {
    return {
      ok: false,
      error: `Nahrajte naraz jeden doklad. Vybrali ste ${files.length} súbory — každý spracujeme samostatne.`,
    }
  }
  return validateFile(files[0])
}

export function validateFile(file: File): ValidationResult {
  const kind = kindOf(file)
  if (!kind) {
    const ext = fileExtension(file.name)
    return {
      ok: false,
      error: `Súbor „${file.name}“ ${ext ? `(.${ext}) ` : ''}nevieme spracovať. Nahrajte ${ACCEPTED_LABEL}.`,
    }
  }
  if (!GENERIC_MIME.includes(file.type) && !kind.mimeTypes.includes(file.type)) {
    return {
      ok: false,
      error: `Súbor „${file.name}“ má príponu .${fileExtension(file.name)}, ale jeho obsah zodpovedá inému formátu. Uložte ho znova v správnom formáte.`,
    }
  }
  if (file.size === 0) {
    return { ok: false, error: `Súbor „${file.name}“ je prázdny. Skontrolujte, či sa uložil celý.` }
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      error: `Súbor má ${formatFileSize(file.size)}, najviac môže mať ${formatFileSize(MAX_FILE_SIZE)}. Pri skenoch pomôže nižšie rozlíšenie (napr. 200 DPI).`,
    }
  }
  return { ok: true, file }
}
