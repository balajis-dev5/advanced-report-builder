import type { MatrixResult, ReportResult, TableResult } from '../../types/reports'

/**
 * A chart-friendly view of any report result: a list of category labels along
 * the primary axis, and one or more named numeric series. This is the single
 * shape every chart component consumes, so the adapter here is the only place
 * that needs to understand the difference between summary and matrix results.
 */
export interface ChartData {
  categories: string[]
  series: { name: string; values: number[] }[]
  /** Presentation format hint for values (currency / percent / number). */
  format: string | null
}

export type ChartKind = 'bar' | 'line' | 'donut'

/** Which chart kinds make sense for a given result, in preference order. */
export function availableCharts(result: ReportResult): ChartKind[] {
  if (result.type === 'matrix') {
    return ['bar', 'line']
  }
  if (result.type === 'summary') {
    const measureCount = result.columns.filter((c) => c.type === 'measure').length
    // A single-measure summary can also be shown as a donut (part-to-whole).
    return measureCount <= 1 ? ['bar', 'line', 'donut'] : ['bar', 'line']
  }
  return []
}

export function toChartData(result: ReportResult): ChartData | null {
  if (result.type === 'summary') {
    return summaryToChart(result)
  }
  if (result.type === 'matrix') {
    return matrixToChart(result)
  }
  return null // detail reports are row listings, not chartable
}

function summaryToChart(result: TableResult): ChartData | null {
  const dimensions = result.columns.filter((c) => c.type !== 'measure')
  const measures = result.columns.filter((c) => c.type === 'measure')
  if (measures.length === 0 || result.rows.length === 0) return null

  const categories = result.rows.map((row) =>
    dimensions.map((d) => String(row[d.key] ?? '—')).join(' · '),
  )

  const series = measures.map((m) => ({
    name: m.label,
    values: result.rows.map((row) => Number(row[m.key] ?? 0)),
  }))

  return { categories, series, format: measures[0].format ?? null }
}

function matrixToChart(result: MatrixResult): ChartData {
  // Rows become categories; each matrix column becomes a series (grouped bars).
  const categories = result.rows.map((r) => r.row_value)
  const series = result.column_values.map((col) => ({
    name: col,
    values: result.rows.map((r) => r.cells[col] ?? 0),
  }))
  return { categories, series, format: result.measure.format ?? null }
}
