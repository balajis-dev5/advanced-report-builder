import { formatValue } from '../../lib/format'
import type { MatrixResult, ReportResult, TableResult } from '../../types/reports'

/**
 * Renders a compiled report result. Detail and summary reports share a plain
 * table renderer (summary adds a totals footer); matrix reports get a pivoted
 * grid with row/column/grand totals.
 */
export default function ResultView({ result }: { result: ReportResult }) {
  if (result.type === 'matrix') {
    return <MatrixTable result={result} />
  }
  return <FlatTable result={result} />
}

const cellClass = 'whitespace-nowrap px-4 py-2.5 text-sm'
const headClass =
  'whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'

function FlatTable({ result }: { result: TableResult }) {
  const totals = result.meta.totals ?? {}
  const hasTotals = Object.keys(totals).length > 0

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900/60">
          <tr>
            {result.columns.map((col) => (
              <th key={col.key} className={headClass}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
          {result.rows.map((row, i) => (
            <tr
              key={i}
              className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
            >
              {result.columns.map((col) => (
                <td
                  key={col.key}
                  className={`${cellClass} ${
                    isNumericFormat(col.format)
                      ? 'text-right tabular-nums text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {formatValue(row[col.key], col.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {hasTotals && (
          <tfoot className="border-t-2 border-zinc-200 bg-zinc-50 font-semibold dark:border-zinc-700 dark:bg-zinc-900/60">
            <tr>
              {result.columns.map((col, idx) => (
                <td
                  key={col.key}
                  className={`${cellClass} ${
                    isNumericFormat(col.format)
                      ? 'text-right tabular-nums'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {idx === 0
                    ? 'Total'
                    : col.key in totals
                      ? formatValue(totals[col.key], col.format)
                      : ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

function MatrixTable({ result }: { result: MatrixResult }) {
  const fmt = result.measure.format

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900/60">
          <tr>
            <th className={headClass}>
              {result.row.label} \ {result.column.label}
            </th>
            {result.column_values.map((col) => (
              <th key={col} className={`${headClass} text-right`}>
                {col}
              </th>
            ))}
            <th className={`${headClass} text-right`}>Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
          {result.rows.map((row) => (
            <tr
              key={row.row_value}
              className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
            >
              <td className={`${cellClass} font-medium text-zinc-800 dark:text-zinc-200`}>
                {row.row_value}
              </td>
              {result.column_values.map((col) => (
                <td
                  key={col}
                  className={`${cellClass} text-right tabular-nums text-zinc-700 dark:text-zinc-300`}
                >
                  {col in row.cells ? formatValue(row.cells[col], fmt) : '—'}
                </td>
              ))}
              <td
                className={`${cellClass} text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100`}
              >
                {formatValue(row.total, fmt)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-zinc-200 bg-zinc-50 font-semibold dark:border-zinc-700 dark:bg-zinc-900/60">
          <tr>
            <td className={`${cellClass} text-zinc-500 dark:text-zinc-400`}>Total</td>
            {result.column_values.map((col) => (
              <td key={col} className={`${cellClass} text-right tabular-nums`}>
                {formatValue(result.column_totals[col] ?? 0, fmt)}
              </td>
            ))}
            <td className={`${cellClass} text-right tabular-nums`}>
              {formatValue(result.grand_total, fmt)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function isNumericFormat(format?: string | null): boolean {
  return format === 'currency' || format === 'percent' || format === 'number'
}
