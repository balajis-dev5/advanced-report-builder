import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import ExportMenu from '../components/reports/ExportMenu'
import { deleteReport, exportSaved, fetchReports } from '../lib/reports'
import type { SavedReport } from '../types/reports'

const typeBadges: Record<string, string> = {
  detail: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  summary: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  matrix: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<SavedReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchReports()
      .then((data) => active && setReports(data))
      .catch(() => active && setError('Could not load your reports.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  async function handleDelete(report: SavedReport) {
    if (!window.confirm(`Delete “${report.name}”?`)) return
    const previous = reports
    setReports((r) => r.filter((x) => x.id !== report.id)) // optimistic
    try {
      await deleteReport(report.id)
    } catch {
      setReports(previous) // roll back on failure
      setError('Could not delete that report.')
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">My reports</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Saved report definitions. Open one to run or edit it.
          </p>
        </div>
        <Button onClick={() => navigate('/builder')}>+ New report</Button>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">No saved reports yet.</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Build your first one in the{' '}
            <Link to="/builder" className="font-medium text-indigo-600 dark:text-indigo-400">
              report builder
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <li
              key={report.id}
              className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-700"
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                    typeBadges[report.type] ?? 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {report.type}
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {new Date(report.updated_at).toLocaleDateString()}
                </span>
              </div>
              <Link
                to={`/builder/${report.id}`}
                className="text-base font-semibold text-zinc-900 hover:text-indigo-600 dark:text-zinc-100 dark:hover:text-indigo-400"
              >
                {report.name}
              </Link>
              {report.access !== 'owner' && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Shared by {report.owner?.name ?? 'someone'} ·{' '}
                  {report.access === 'edit' ? 'can edit' : 'view only'}
                </p>
              )}
              {report.description && (
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {report.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <Link
                  to={`/builder/${report.id}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  Open
                </Link>
                <ExportMenu
                  compact
                  onExport={(format) => exportSaved(report.id, format, report.name)}
                />
                {report.access === 'owner' && (
                  <button
                    type="button"
                    onClick={() => handleDelete(report)}
                    className="text-sm font-medium text-zinc-500 transition hover:text-red-600 dark:text-zinc-400"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
