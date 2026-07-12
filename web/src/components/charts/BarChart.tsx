import { colorAt } from '../../lib/palette'
import { formatValue } from '../../lib/format'
import type { ChartData } from './chartData'
import ChartLegend from './ChartLegend'
import { compactNumber, niceMax, ticks } from './scale'

const W = 720
const H = 360
const PAD = { top: 16, right: 16, bottom: 64, left: 60 }

/**
 * Grouped vertical bar chart, pure SVG. Renders one bar per series within each
 * category band. Scales responsively via viewBox; the parent controls width.
 */
export default function BarChart({ data, title }: { data: ChartData; title: string }) {
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const max = niceMax(
    Math.max(0, ...data.series.flatMap((s) => s.values)),
  )
  const yTicks = ticks(max, 4)

  const bandW = plotW / data.categories.length
  const groupPad = bandW * 0.2
  const innerW = bandW - groupPad
  const barW = innerW / data.series.length

  const y = (v: number) => PAD.top + plotH - (v / max) * plotH

  return (
    <figure className="text-zinc-500 dark:text-zinc-400">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${title}. Bar chart across ${data.categories.length} categories.`}
      >
        {/* gridlines + y axis labels */}
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className="stroke-zinc-200 dark:stroke-zinc-800"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(t) + 4}
              textAnchor="end"
              className="fill-current text-[11px]"
            >
              {compactNumber(t)}
            </text>
          </g>
        ))}

        {/* bars */}
        {data.categories.map((cat, ci) => {
          const bandX = PAD.left + ci * bandW + groupPad / 2
          return (
            <g key={cat}>
              {data.series.map((s, si) => {
                const v = s.values[ci] ?? 0
                const barH = Math.max(0, PAD.top + plotH - y(v))
                return (
                  <rect
                    key={s.name}
                    x={bandX + si * barW}
                    y={y(v)}
                    width={Math.max(1, barW - 2)}
                    height={barH}
                    rx={2}
                    fill={colorAt(si)}
                  >
                    <title>{`${cat} — ${s.name}: ${formatValue(v, data.format)}`}</title>
                  </rect>
                )
              })}
              <text
                x={bandX + innerW / 2}
                y={H - PAD.bottom + 16}
                textAnchor="middle"
                className="fill-current text-[11px]"
              >
                {truncate(cat, 14)}
              </text>
            </g>
          )
        })}

        {/* x axis baseline */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + plotH}
          y2={PAD.top + plotH}
          className="stroke-zinc-300 dark:stroke-zinc-700"
          strokeWidth={1}
        />
      </svg>
      <ChartLegend names={data.series.map((s) => s.name)} />
    </figure>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}
