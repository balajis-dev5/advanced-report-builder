import { colorAt } from '../../lib/palette'
import { formatValue } from '../../lib/format'
import type { ChartData } from './chartData'
import ChartLegend from './ChartLegend'
import { compactNumber, niceMax, ticks } from './scale'

const W = 720
const H = 360
const PAD = { top: 16, right: 16, bottom: 64, left: 60 }

/** Multi-series line chart, pure SVG. */
export default function LineChart({ data, title }: { data: ChartData; title: string }) {
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const max = niceMax(Math.max(0, ...data.series.flatMap((s) => s.values)))
  const yTicks = ticks(max, 4)

  const n = data.categories.length
  // Points sit at band centers so single-point series still render sensibly.
  const x = (i: number) => PAD.left + (plotW / Math.max(1, n)) * (i + 0.5)
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH

  return (
    <figure className="text-zinc-500 dark:text-zinc-400">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${title}. Line chart across ${n} categories.`}
      >
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

        {data.series.map((s, si) => {
          const d = s.values
            .map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`)
            .join(' ')
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={colorAt(si)} strokeWidth={2.5} />
              {s.values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill={colorAt(si)}>
                  <title>{`${data.categories[i]} — ${s.name}: ${formatValue(v, data.format)}`}</title>
                </circle>
              ))}
            </g>
          )
        })}

        {data.categories.map((cat, i) => (
          <text
            key={cat}
            x={x(i)}
            y={H - PAD.bottom + 16}
            textAnchor="middle"
            className="fill-current text-[11px]"
          >
            {truncate(cat, 14)}
          </text>
        ))}

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
