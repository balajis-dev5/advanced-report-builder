import type { Field } from '../../types/reports'

/**
 * A compact checkbox group for picking a set of fields (detail columns or
 * summary group-by dimensions). Selection order is preserved so the report's
 * column order matches the order the user ticked them.
 */
export default function FieldMultiSelect({
  fields,
  selected,
  onChange,
}: {
  fields: Field[]
  selected: string[]
  onChange: (selected: string[]) => void
}) {
  function toggle(key: string) {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key))
    } else {
      onChange([...selected, key])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {fields.map((field) => {
        const isActive = selected.includes(field.key)
        return (
          <button
            key={field.key}
            type="button"
            onClick={() => toggle(field.key)}
            aria-pressed={isActive}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              isActive
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            {field.label}
          </button>
        )
      })}
    </div>
  )
}
