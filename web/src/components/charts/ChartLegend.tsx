import { colorAt } from '../../lib/palette'

/** Shared legend row for multi-series charts. */
export default function ChartLegend({ names }: { names: string[] }) {
  if (names.length <= 1) return null
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
      {names.map((name, i) => (
        <li
          key={name}
          className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: colorAt(i) }}
            aria-hidden="true"
          />
          {name}
        </li>
      ))}
    </ul>
  )
}
