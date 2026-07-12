import Select from '../ui/Select'
import type { Aggregation, Field, Measure } from '../../types/reports'

/**
 * Edits the list of measures for a summary report. Each measure is a
 * (field, aggregation) pair; the field's own `aggregations` list constrains
 * which aggregations may be chosen.
 */
export default function MeasureEditor({
  measureFields,
  measures,
  onChange,
}: {
  measureFields: Field[]
  measures: Measure[]
  onChange: (measures: Measure[]) => void
}) {
  function update(index: number, patch: Partial<Measure>) {
    onChange(measures.map((m, i) => (i === index ? { ...m, ...patch } : m)))
  }

  function addMeasure() {
    const first = measureFields[0]
    if (!first) return
    onChange([...measures, { field: first.key, agg: first.aggregations[0] }])
  }

  return (
    <div className="space-y-3">
      {measures.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Add at least one measure to aggregate.
        </p>
      )}

      {measures.map((measure, index) => {
        const field =
          measureFields.find((f) => f.key === measure.field) ?? measureFields[0]
        return (
          <div
            key={index}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <Select
              aria-label="Aggregation"
              className="min-w-[7rem]"
              value={measure.agg}
              options={field.aggregations.map((agg) => ({
                value: agg,
                label: aggLabels[agg],
              }))}
              onChange={(e) => update(index, { agg: e.target.value as Aggregation })}
            />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">of</span>
            <Select
              aria-label="Measure field"
              className="min-w-[9rem] flex-1"
              value={measure.field}
              options={measureFields.map((f) => ({ value: f.key, label: f.label }))}
              onChange={(e) => {
                const next = measureFields.find((f) => f.key === e.target.value)!
                update(index, {
                  field: next.key,
                  agg: next.aggregations.includes(measure.agg)
                    ? measure.agg
                    : next.aggregations[0],
                })
              }}
            />
            <button
              type="button"
              onClick={() => onChange(measures.filter((_, i) => i !== index))}
              className="ml-auto rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-200 hover:text-red-600 dark:hover:bg-zinc-800"
              aria-label="Remove measure"
            >
              Remove
            </button>
          </div>
        )
      })}

      <button
        type="button"
        onClick={addMeasure}
        disabled={measureFields.length === 0}
        className="text-sm font-medium text-indigo-600 transition hover:text-indigo-500 disabled:opacity-50 dark:text-indigo-400"
      >
        + Add measure
      </button>
    </div>
  )
}

export const aggLabels: Record<Aggregation, string> = {
  sum: 'Sum',
  avg: 'Average',
  min: 'Min',
  max: 'Max',
  count: 'Count',
}
