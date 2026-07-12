import Select from '../ui/Select'
import type { Field, Filter, Operator } from '../../types/reports'

/**
 * Edits the list of filters for a report. Field choice drives which operators
 * are offered; the operator choice drives how many value inputs are shown
 * (`between` → two, everything else → one, `in` → comma-separated list).
 */
export default function FilterEditor({
  fields,
  filters,
  onChange,
}: {
  fields: Field[]
  filters: Filter[]
  onChange: (filters: Filter[]) => void
}) {
  function update(index: number, patch: Partial<Filter>) {
    onChange(filters.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  function addFilter() {
    const first = fields[0]
    if (!first) return
    onChange([
      ...filters,
      { field: first.key, operator: first.operators[0], value: '' },
    ])
  }

  function removeFilter(index: number) {
    onChange(filters.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {filters.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No filters — the report includes all rows.
        </p>
      )}

      {filters.map((filter, index) => {
        const field = fields.find((f) => f.key === filter.field) ?? fields[0]
        return (
          <div
            key={index}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <Select
              aria-label="Filter field"
              className="min-w-[9rem] flex-1"
              value={filter.field}
              options={fields.map((f) => ({ value: f.key, label: f.label }))}
              onChange={(e) => {
                const next = fields.find((f) => f.key === e.target.value)!
                update(index, {
                  field: next.key,
                  operator: next.operators[0],
                  value: '',
                })
              }}
            />
            <Select
              aria-label="Filter operator"
              className="min-w-[8rem]"
              value={filter.operator}
              options={field.operators.map((op) => ({
                value: op,
                label: operatorLabels[op],
              }))}
              onChange={(e) =>
                update(index, { operator: e.target.value as Operator })
              }
            />
            <ValueInput
              filter={filter}
              onChange={(value) => update(index, { value })}
            />
            <button
              type="button"
              onClick={() => removeFilter(index)}
              className="ml-auto rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-200 hover:text-red-600 dark:hover:bg-zinc-800"
              aria-label="Remove filter"
            >
              Remove
            </button>
          </div>
        )
      })}

      <button
        type="button"
        onClick={addFilter}
        disabled={fields.length === 0}
        className="text-sm font-medium text-indigo-600 transition hover:text-indigo-500 disabled:opacity-50 dark:text-indigo-400"
      >
        + Add filter
      </button>
    </div>
  )
}

const inputClass =
  'rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'

function ValueInput({
  filter,
  onChange,
}: {
  filter: Filter
  onChange: (value: Filter['value']) => void
}) {
  if (filter.operator === 'between') {
    const [from, to] = Array.isArray(filter.value) ? filter.value : ['', '']
    return (
      <div className="flex items-center gap-1">
        <input
          className={`${inputClass} w-24`}
          placeholder="From"
          value={String(from ?? '')}
          onChange={(e) => onChange([e.target.value, String(to ?? '')])}
        />
        <span className="text-zinc-400">–</span>
        <input
          className={`${inputClass} w-24`}
          placeholder="To"
          value={String(to ?? '')}
          onChange={(e) => onChange([String(from ?? ''), e.target.value])}
        />
      </div>
    )
  }

  if (filter.operator === 'in') {
    const value = Array.isArray(filter.value) ? filter.value.join(', ') : ''
    return (
      <input
        className={`${inputClass} min-w-[10rem] flex-1`}
        placeholder="Comma-separated values"
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((v) => v.trim())
              .filter((v) => v !== ''),
          )
        }
      />
    )
  }

  return (
    <input
      className={`${inputClass} min-w-[8rem] flex-1`}
      placeholder="Value"
      value={Array.isArray(filter.value) ? '' : String(filter.value ?? '')}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

const operatorLabels: Record<Operator, string> = {
  '=': 'equals',
  '!=': 'not equals',
  '>': 'greater than',
  '>=': 'at least',
  '<': 'less than',
  '<=': 'at most',
  contains: 'contains',
  starts_with: 'starts with',
  in: 'is one of',
  between: 'between',
}
