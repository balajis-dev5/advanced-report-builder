import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import TextField from '../components/ui/TextField'
import DropZone, { FieldPill } from '../components/reports/DropZone'
import FieldPalette, { type FieldDragData } from '../components/reports/FieldPalette'
import FilterEditor from '../components/reports/FilterEditor'
import MeasureEditor, { aggLabels } from '../components/reports/MeasureEditor'
import ResultView from '../components/reports/ResultView'
import {
  createReport,
  fetchDataSources,
  fetchReport,
  runReport,
  updateReport,
} from '../lib/reports'
import type {
  DataSource,
  Field,
  Filter,
  Measure,
  ReportConfig,
  ReportDefinition,
  ReportResult,
  ReportType,
} from '../types/reports'

const REPORT_TYPES: { value: ReportType; label: string; hint: string }[] = [
  { value: 'detail', label: 'Detail', hint: 'Row-level list of records.' },
  { value: 'summary', label: 'Summary', hint: 'Group by dimensions, aggregate measures.' },
  { value: 'matrix', label: 'Matrix', hint: 'Pivot one measure across two dimensions.' },
]

export default function ReportBuilderPage() {
  const params = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const editingId = params.id ? Number(params.id) : null

  const [sources, setSources] = useState<DataSource[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [metaError, setMetaError] = useState<string | null>(null)

  const [sourceKey, setSourceKey] = useState('')
  const [type, setType] = useState<ReportType>('summary')

  // Per-type configuration.
  const [columns, setColumns] = useState<string[]>([])
  const [groupBy, setGroupBy] = useState<string[]>([])
  const [measures, setMeasures] = useState<Measure[]>([])
  const [matrixRow, setMatrixRow] = useState('')
  const [matrixCol, setMatrixCol] = useState('')
  const [matrixMeasure, setMatrixMeasure] = useState<Measure | null>(null)
  const [filters, setFilters] = useState<Filter[]>([])

  const [result, setResult] = useState<ReportResult | null>(null)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // A click on a palette chip must stay a click; dragging starts only after
  // the pointer travels a little, so both interactions coexist on one element.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const source = useMemo(
    () => sources.find((s) => s.key === sourceKey),
    [sources, sourceKey],
  )
  const dimensions = useMemo(
    () => source?.fields.filter((f) => f.type === 'dimension') ?? [],
    [source],
  )
  const measureFields = useMemo(
    () => source?.fields.filter((f) => f.type === 'measure') ?? [],
    [source],
  )
  const fieldByKey = useMemo(
    () => new Map((source?.fields ?? []).map((f) => [f.key, f])),
    [source],
  )

  // The matrix measure picker shows a default selection; mirror that in state so
  // the report is valid without forcing the user to re-pick it. Runs when the
  // source's measures become available and nothing is chosen yet (a hydrated
  // saved report already has one, so this leaves it untouched).
  useEffect(() => {
    if (measureFields.length > 0 && matrixMeasure === null) {
      const first = measureFields[0]
      setMatrixMeasure({ field: first.key, agg: first.aggregations[0] })
    }
  }, [measureFields, matrixMeasure])

  // Load metadata (and, if editing, the saved report) on mount.
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [loadedSources, loaded] = await Promise.all([
          fetchDataSources(),
          editingId ? fetchReport(editingId) : Promise.resolve(null),
        ])
        if (!active) return

        setSources(loadedSources)

        if (loaded) {
          setSourceKey(loaded.data_source)
          setType(loaded.type)
          hydrateConfig(loaded.config)
          setName(loaded.name)
          setDescription(loaded.description ?? '')
        } else {
          setSourceKey(loadedSources[0]?.key ?? '')
        }
      } catch {
        if (active) setMetaError('Could not load reporting metadata. Is the API running?')
      } finally {
        if (active) setLoadingMeta(false)
      }
    })()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId])

  function hydrateConfig(config: ReportConfig) {
    setColumns(config.columns ?? [])
    setGroupBy(config.group_by ?? [])
    setMeasures(config.measures ?? [])
    setMatrixRow(config.row ?? '')
    setMatrixCol(config.column ?? '')
    setMatrixMeasure(config.measure ?? null)
    setFilters(config.filters ?? [])
  }

  // Reset field selections when the data source changes (fields differ).
  function handleSourceChange(nextKey: string) {
    setSourceKey(nextKey)
    setColumns([])
    setGroupBy([])
    setMeasures([])
    setMatrixRow('')
    setMatrixCol('')
    setMatrixMeasure(null)
    setFilters([])
    setResult(null)
  }

  /**
   * Single routing point for a field entering a zone — used by both drag-drop
   * and palette clicks, so the two interactions can never disagree.
   */
  function addField(zone: string, fieldKey: string, fieldType: 'dimension' | 'measure') {
    if (zone === 'columns' && fieldKey !== '__count__') {
      setColumns((c) => (c.includes(fieldKey) ? c : [...c, fieldKey]))
    } else if (zone === 'groupBy' && fieldType === 'dimension') {
      setGroupBy((g) => (g.includes(fieldKey) ? g : [...g, fieldKey]))
    } else if (zone === 'measures' && fieldType === 'measure') {
      const field = measureFields.find((f) => f.key === fieldKey)
      if (field) setMeasures((m) => [...m, { field: field.key, agg: field.aggregations[0] }])
    } else if (zone === 'matrixRow' && fieldType === 'dimension') {
      if (matrixCol === fieldKey) setMatrixCol(matrixRow) // swap instead of duplicating
      setMatrixRow(fieldKey)
    } else if (zone === 'matrixCol' && fieldType === 'dimension') {
      if (matrixRow === fieldKey) setMatrixRow(matrixCol)
      setMatrixCol(fieldKey)
    } else if (zone === 'matrixMeasure' && fieldType === 'measure') {
      const field = measureFields.find((f) => f.key === fieldKey)
      if (field) {
        setMatrixMeasure((prev) => ({
          field: field.key,
          agg: prev && field.aggregations.includes(prev.agg) ? prev.agg : field.aggregations[0],
        }))
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const zone = event.over?.id
    const data = event.active.data.current as FieldDragData | undefined
    if (typeof zone === 'string' && data) addField(zone, data.fieldKey, data.fieldType)
  }

  // Click fallback: send the field to the slot it most likely belongs in.
  function handlePaletteAdd(field: Field) {
    if (type === 'detail') {
      addField('columns', field.key, field.type)
    } else if (type === 'summary') {
      addField(field.type === 'dimension' ? 'groupBy' : 'measures', field.key, field.type)
    } else if (field.type === 'measure') {
      addField('matrixMeasure', field.key, field.type)
    } else if (!matrixRow) {
      addField('matrixRow', field.key, field.type)
    } else {
      addField('matrixCol', field.key, field.type)
    }
  }

  function fieldLabel(key: string) {
    return fieldByKey.get(key)?.label ?? key
  }
  function fieldTone(key: string): 'dimension' | 'measure' {
    return fieldByKey.get(key)?.type === 'measure' ? 'measure' : 'dimension'
  }

  function buildDefinition(): ReportDefinition {
    const config: ReportConfig = { filters }

    if (type === 'detail') {
      config.columns = columns
      config.limit = 100
    } else if (type === 'summary') {
      config.group_by = groupBy
      config.measures = measures
    } else {
      config.row = matrixRow
      config.column = matrixCol
      if (matrixMeasure) config.measure = matrixMeasure
    }

    return { data_source: sourceKey, type, config }
  }

  const validation = validateDefinition(type, {
    columns,
    groupBy,
    measures,
    matrixRow,
    matrixCol,
    matrixMeasure,
  })

  async function handleRun() {
    setRunning(true)
    setRunError(null)
    try {
      const res = await runReport(buildDefinition())
      setResult(res)
    } catch (err) {
      setResult(null)
      setRunError(extractError(err))
    } finally {
      setRunning(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setSaveMessage('Give the report a name first.')
      return
    }
    setSaving(true)
    setSaveMessage(null)
    try {
      const input = { ...buildDefinition(), name: name.trim(), description: description.trim() || null }
      const saved = editingId
        ? await updateReport(editingId, input)
        : await createReport(input)
      setSaveMessage('Saved.')
      if (!editingId) navigate(`/builder/${saved.id}`, { replace: true })
    } catch (err) {
      setSaveMessage(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loadingMeta) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading builder…</p>
  }

  if (metaError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        {metaError}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {editingId ? 'Edit report' : 'Report builder'}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Drag fields into the report, preview it live, then save it to your library.
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/reports')}>
          ← My reports
        </Button>
      </header>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,340px)_1fr]">
          {/* Field palette */}
          <FieldPalette
            dimensions={dimensions}
            measures={measureFields}
            onAdd={handlePaletteAdd}
          />

          {/* Builder panel */}
          <div className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <Select
              label="Data source"
              value={sourceKey}
              onChange={(e) => handleSourceChange(e.target.value)}
              options={sources.map((s) => ({ value: s.key, label: s.label }))}
            />

            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Report type
              </span>
              <div className="grid grid-cols-3 gap-2">
                {REPORT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    aria-pressed={type === t.value}
                    className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${
                      type === t.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                        : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {REPORT_TYPES.find((t) => t.value === type)?.hint}
              </p>
            </div>

            {/* Type-specific drop zones */}
            {type === 'detail' && (
              <DropZone
                id="columns"
                accepts={['dimension', 'measure']}
                label="Columns"
                emptyHint="Drag fields here — each becomes a column."
                isEmpty={columns.length === 0}
              >
                {columns.map((key) => (
                  <FieldPill
                    key={key}
                    label={fieldLabel(key)}
                    tone={fieldTone(key)}
                    onRemove={() => setColumns(columns.filter((k) => k !== key))}
                  />
                ))}
              </DropZone>
            )}

            {type === 'summary' && (
              <>
                <DropZone
                  id="groupBy"
                  accepts={['dimension']}
                  label="Group by"
                  emptyHint="Drag dimensions here to group rows."
                  isEmpty={groupBy.length === 0}
                >
                  {groupBy.map((key) => (
                    <FieldPill
                      key={key}
                      label={fieldLabel(key)}
                      onRemove={() => setGroupBy(groupBy.filter((k) => k !== key))}
                    />
                  ))}
                </DropZone>
                <DropZone
                  id="measures"
                  accepts={['measure']}
                  label="Measures"
                  layout="stack"
                  emptyHint="Drag measures here to aggregate."
                  isEmpty={measures.length === 0}
                >
                  <MeasureEditor
                    measureFields={measureFields}
                    measures={measures}
                    onChange={setMeasures}
                  />
                </DropZone>
              </>
            )}

            {type === 'matrix' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <DropZone
                    id="matrixRow"
                    accepts={['dimension']}
                    label="Rows"
                    emptyHint="Drag a dimension."
                    isEmpty={!matrixRow}
                  >
                    {matrixRow && (
                      <FieldPill label={fieldLabel(matrixRow)} onRemove={() => setMatrixRow('')} />
                    )}
                  </DropZone>
                  <DropZone
                    id="matrixCol"
                    accepts={['dimension']}
                    label="Columns"
                    emptyHint="Drag a dimension."
                    isEmpty={!matrixCol}
                  >
                    {matrixCol && (
                      <FieldPill label={fieldLabel(matrixCol)} onRemove={() => setMatrixCol('')} />
                    )}
                  </DropZone>
                </div>
                <DropZone
                  id="matrixMeasure"
                  accepts={['measure']}
                  label="Measure"
                  layout="stack"
                  emptyHint="Drag a measure to pivot."
                  isEmpty={!matrixMeasure}
                >
                  {matrixMeasure && (
                    <MatrixMeasurePicker
                      measureFields={measureFields}
                      measure={matrixMeasure}
                      onChange={setMatrixMeasure}
                    />
                  )}
                </DropZone>
              </>
            )}

            <Section label="Filters">
              <FilterEditor
                fields={source?.fields ?? []}
                filters={filters}
                onChange={setFilters}
              />
            </Section>

            <div className="flex items-center gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <Button onClick={handleRun} loading={running} disabled={!validation.ok}>
                Run report
              </Button>
              {!validation.ok && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {validation.message}
                </span>
              )}
            </div>
          </div>

          {/* Result panel */}
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1">
                  <TextField
                    label="Report name"
                    name="report-name"
                    placeholder="e.g. Revenue by region"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <Button variant="ghost" onClick={handleSave} loading={saving}>
                  {editingId ? 'Update' : 'Save report'}
                </Button>
              </div>
              {saveMessage && (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{saveMessage}</p>
              )}
            </div>

            <div className="min-h-[16rem] rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              {runError ? (
                <div className="p-5 text-sm text-red-600 dark:text-red-400">{runError}</div>
              ) : result ? (
                <div>
                  <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {result.meta.row_count} row{result.meta.row_count === 1 ? '' : 's'}
                    </span>
                    {'truncated' in result.meta && result.meta.truncated && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        Showing first {result.meta.limit}
                      </span>
                    )}
                  </div>
                  <ResultView result={result} />
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center p-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  Drag fields in from the left and press <b className="mx-1">Run report</b> to
                  preview.
                </div>
              )}
            </div>
          </div>
        </div>
      </DndContext>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      {children}
    </div>
  )
}

function MatrixMeasurePicker({
  measureFields,
  measure,
  onChange,
}: {
  measureFields: Field[]
  measure: Measure | null
  onChange: (m: Measure) => void
}) {
  const field = measureFields.find((f) => f.key === measure?.field) ?? measureFields[0]
  if (!field) return null

  const current = measure ?? { field: field.key, agg: field.aggregations[0] }

  return (
    <div className="flex items-center gap-2">
      <Select
        aria-label="Matrix aggregation"
        className="min-w-[7rem]"
        value={current.agg}
        options={field.aggregations.map((agg) => ({ value: agg, label: aggLabels[agg] }))}
        onChange={(e) => onChange({ ...current, agg: e.target.value as Measure['agg'] })}
      />
      <span className="text-sm text-zinc-500 dark:text-zinc-400">of</span>
      <Select
        aria-label="Matrix measure field"
        className="min-w-[9rem] flex-1"
        value={current.field}
        options={measureFields.map((f) => ({ value: f.key, label: f.label }))}
        onChange={(e) => {
          const next = measureFields.find((f) => f.key === e.target.value)!
          onChange({
            field: next.key,
            agg: next.aggregations.includes(current.agg) ? current.agg : next.aggregations[0],
          })
        }}
      />
    </div>
  )
}

interface ValidationState {
  columns: string[]
  groupBy: string[]
  measures: Measure[]
  matrixRow: string
  matrixCol: string
  matrixMeasure: Measure | null
}

function validateDefinition(
  type: ReportType,
  s: ValidationState,
): { ok: boolean; message: string } {
  if (type === 'detail') {
    return s.columns.length > 0
      ? { ok: true, message: '' }
      : { ok: false, message: 'Pick at least one column.' }
  }
  if (type === 'summary') {
    if (s.groupBy.length === 0) return { ok: false, message: 'Pick a group-by field.' }
    if (s.measures.length === 0) return { ok: false, message: 'Add a measure.' }
    return { ok: true, message: '' }
  }
  // matrix
  if (!s.matrixRow || !s.matrixCol) return { ok: false, message: 'Choose rows and columns.' }
  if (s.matrixRow === s.matrixCol)
    return { ok: false, message: 'Rows and columns must differ.' }
  if (!s.matrixMeasure) return { ok: false, message: 'Choose a measure.' }
  return { ok: true, message: '' }
}

function extractError(err: unknown): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message ===
      'string'
  ) {
    return (err as { response: { data: { message: string } } }).response.data.message
  }
  return 'Something went wrong running the report.'
}
