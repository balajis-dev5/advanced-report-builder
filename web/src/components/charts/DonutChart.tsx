import { colorAt } from '../../lib/palette'
import { formatValue } from '../../lib/format'
import type { ChartData } from './chartData'

const SIZE = 320
const R = 130
const INNER = 78
const CX = SIZE / 2
const CY = SIZE / 2

/**
 * Part-to-whole donut, pure SVG. Uses the first series' values as slices, one
 * per category. Only meaningful for single-measure summaries (guarded by
 * `availableCharts`), so we always read `series[0]`.
 */
export default function DonutChart({ data, title }: { data: ChartData; title: string }) {
  const values = data.series[0]?.values ?? []
  const total = values.reduce((sum, v) => sum + Math.max(0, v), 0)

  let angle = -Math.PI / 2 // start at 12 o'clock
  const slices = values.map((v, i) => {
    const fraction = total > 0 ? Math.max(0, v) / total : 0
    const start = angle
    const end = angle + fraction * Math.PI * 2
    angle = end
    return { label: data.categories[i], value: v, fraction, start, end, color: colorAt(i) }
  })

  return (
    <figure className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-52 shrink-0"
        role="img"
        aria-label={`${title}. Donut chart of ${slices.length} categories, total ${formatValue(total, data.format)}.`}
      >
        {slices.map((s) =>
          s.fraction > 0 ? (
            <path key={s.label} d={arc(s.start, s.end)} fill={s.color}>
              <title>{`${s.label}: ${formatValue(s.value, data.format)} (${Math.round(
                s.fraction * 100,
              )}%)`}</title>
            </path>
          ) : null,
        )}
        <circle cx={CX} cy={CY} r={INNER} className="fill-white dark:fill-zinc-900" />
        <text
          x={CX}
          y={CY - 4}
          textAnchor="middle"
          className="fill-zinc-900 text-[20px] font-bold dark:fill-zinc-50"
        >
          {compact(total)}
        </text>
        <text
          x={CX}
          y={CY + 16}
          textAnchor="middle"
          className="fill-zinc-400 text-[11px] uppercase tracking-wide dark:fill-zinc-500"
        >
          Total
        </text>
      </svg>

      <ul className="grid w-full max-w-xs grid-cols-1 gap-1.5">
        {slices.map((s) => (
          <li
            key={s.label}
            className="flex items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-300"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
              {Math.round(s.fraction * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

/** SVG path for a donut segment between two angles (radians). */
function arc(start: number, end: number): string {
  const large = end - start > Math.PI ? 1 : 0
  const p = (r: number, a: number) => [CX + r * Math.cos(a), CY + r * Math.sin(a)]
  const [ox1, oy1] = p(R, start)
  const [ox2, oy2] = p(R, end)
  const [ix1, iy1] = p(INNER, end)
  const [ix2, iy2] = p(INNER, start)
  return [
    `M ${ox1} ${oy1}`,
    `A ${R} ${R} 0 ${large} 1 ${ox2} ${oy2}`,
    `L ${ix1} ${iy1}`,
    `A ${INNER} ${INNER} 0 ${large} 0 ${ix2} ${iy2}`,
    'Z',
  ].join(' ')
}

function compact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(Math.round(value))
}
