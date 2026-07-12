import type { ReportResult } from '../../types/reports'
import BarChart from './BarChart'
import LineChart from './LineChart'
import DonutChart from './DonutChart'
import { toChartData, type ChartKind } from './chartData'

/**
 * Renders a report result as a chart of the requested kind. Returns a friendly
 * message when the result can't be charted (e.g. a detail listing or an empty
 * result set), so callers can drop it in without guarding first.
 */
export default function ReportChart({
  result,
  kind,
  title = 'Report',
}: {
  result: ReportResult
  kind: ChartKind
  title?: string
}) {
  const data = toChartData(result)

  if (!data || data.categories.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        This report can't be charted. Detail listings and empty results have no
        series to plot — try a summary or matrix report.
      </div>
    )
  }

  if (kind === 'donut') return <DonutChart data={data} title={title} />
  if (kind === 'line') return <LineChart data={data} title={title} />
  return <BarChart data={data} title={title} />
}
