/*
  Stav kontroly výsledku (úlohy #12–15): čo AI našla, čo používateľ zmenil alebo potvrdil.
  Hodnoty držíme ako text z inputov; na číslo/dátum ich prevádzame až pri odoslaní (buildPayload).
*/
import { useCallback, useMemo, useState } from 'react'
import type { ConfirmPayload, ExtractedField, ExtractedTable, ExtractionResult } from '../../api/types'
import { initialState, type FieldState } from '../../lib/confidence'
import { fromInput, toInput } from '../../lib/format'
import { validate } from '../../lib/validators'

export interface FieldEntry {
  field: ExtractedField
  text: string
  state: FieldState
  error: string | null
}

export interface RowEntry {
  id: string
  cells: Record<string, FieldEntry>
}

export interface TableEntry {
  table: ExtractedTable
  rows: RowEntry[]
}

let rowCounter = 0
const newRowId = () => `row-${++rowCounter}`

function entryFrom(field: ExtractedField): FieldEntry {
  const text = toInput(field.type, field.value)
  return { field, text, state: initialState(field.value, field.confidence), error: validate(field.type, text) }
}

/** Nová hodnota v inpute → nový stav. Ak sa používateľ vráti k pôvodnej hodnote, vrátime pôvodný stav. */
function withText(entry: FieldEntry, text: string): FieldEntry {
  const original = toInput(entry.field.type, entry.field.value)
  const state = text === original ? initialState(entry.field.value, entry.field.confidence) : 'edited'
  return { ...entry, text, state, error: validate(entry.field.type, text) }
}

export function useReviewState(result: ExtractionResult) {
  const [fields, setFields] = useState<FieldEntry[]>(() => result.fields.map(entryFrom))
  const [tables, setTables] = useState<TableEntry[]>(() =>
    result.tables.map((table) => ({
      table,
      rows: table.rows.map((row) => ({
        id: newRowId(),
        cells: Object.fromEntries(
          table.columns.map((c) => [
            c.tag,
            entryFrom(row[c.tag] ?? { tag: c.tag, label: c.label, type: c.type, value: null, confidence: 0 }),
          ]),
        ),
      })),
    })),
  )

  const setFieldText = useCallback((tag: string, text: string) => {
    setFields((fs) => fs.map((f) => (f.field.tag === tag ? withText(f, text) : f)))
  }, [])

  const markFieldChecked = useCallback((tag: string) => {
    setFields((fs) => fs.map((f) => (f.field.tag === tag && f.state === 'review' ? { ...f, state: 'checked' } : f)))
  }, [])

  const updateRows = useCallback((tableTag: string, fn: (rows: RowEntry[], t: ExtractedTable) => RowEntry[]) => {
    setTables((ts) => ts.map((t) => (t.table.tag === tableTag ? { ...t, rows: fn(t.rows, t.table) } : t)))
  }, [])

  const setCellText = useCallback(
    (tableTag: string, rowId: string, colTag: string, text: string) =>
      updateRows(tableTag, (rows) =>
        rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [colTag]: withText(r.cells[colTag], text) } } : r)),
      ),
    [updateRows],
  )

  const markCellChecked = useCallback(
    (tableTag: string, rowId: string, colTag: string) =>
      updateRows(tableTag, (rows) =>
        rows.map((r) =>
          r.id === rowId && r.cells[colTag].state === 'review'
            ? { ...r, cells: { ...r.cells, [colTag]: { ...r.cells[colTag], state: 'checked' } } }
            : r,
        ),
      ),
    [updateRows],
  )

  const addRow = useCallback(
    (tableTag: string) =>
      updateRows(tableTag, (rows, table) => [
        ...rows,
        {
          id: newRowId(),
          cells: Object.fromEntries(
            table.columns.map((c) => [
              c.tag,
              { field: { tag: c.tag, label: c.label, type: c.type, value: null, confidence: 1 }, text: '', state: 'edited', error: null },
            ]),
          ),
        },
      ]),
    [updateRows],
  )

  const removeRow = useCallback(
    (tableTag: string, rowId: string) => updateRows(tableTag, (rows) => rows.filter((r) => r.id !== rowId)),
    [updateRows],
  )

  const summary = useMemo(() => {
    const cells = tables.flatMap((t) => t.rows.flatMap((r) => Object.values(r.cells)))
    const all = [...fields, ...cells]
    return {
      fieldCount: fields.length,
      found: fields.filter((f) => f.state !== 'missing').length,
      missing: fields.filter((f) => f.state === 'missing').length,
      toReview: all.filter((e) => e.state === 'review').length,
      invalid: all.filter((e) => e.error).length,
    }
  }, [fields, tables])

  const buildPayload = useCallback(
    (): ConfirmPayload => ({
      values: Object.fromEntries(fields.map((f) => [f.field.tag, fromInput(f.field.type, f.text)])),
      tables: Object.fromEntries(
        tables.map((t) => [
          t.table.tag,
          t.rows.map((r) =>
            Object.fromEntries(Object.entries(r.cells).map(([tag, c]) => [tag, fromInput(c.field.type, c.text)])),
          ),
        ]),
      ),
    }),
    [fields, tables],
  )

  return {
    fields,
    tables,
    summary,
    setFieldText,
    markFieldChecked,
    setCellText,
    markCellChecked,
    addRow,
    removeRow,
    buildPayload,
  }
}

export type ReviewState = ReturnType<typeof useReviewState>
