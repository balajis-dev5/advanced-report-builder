import { useEffect, useState } from 'react'
import { runReport } from '../../lib/reports'
import type { ReportDefinition, ReportResult } from '../../types/reports'
import ReportChart from './ReportChart'
import type { ChartKind } from './chartData'

/**
 * A dashboard tile that runs a report definition against the live API and
 * renders it as a chart. Self-contained: owns its own loading/error state so
 * the dashboard can drop in several without orchestration.
 */
export default function ChartWidget({
  title,
  subtitle,
  definition,
  kind,
}: {
  title: string
  subtitle?: string
  definition: ReportDefinition
  kind: ChartKind
}) {
  const [result, setResult] = useState<ReportResult | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    runReport(definition)
      .then((res) => active && setResult(res))
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
    // The definitions are static module constants, so this runs once per widget.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
        {subtitle && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        )}
      </div>

      {error ? (
        <div className="flex h-56 items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
          Couldn't load this widget.
        </div>
      ) : !result ? (
        <div className="flex h-56 items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
          Loading…
        </div>
      ) : (
        <ReportChart result={result} kind={kind} title={title} />
      )}
    </div>
  )
}
