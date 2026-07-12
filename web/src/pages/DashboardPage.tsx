import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { fetchDataSources, fetchReports } from '../lib/reports'

interface Stat {
  label: string
  value: string
  hint: string
}

interface RoadmapItem {
  slice: string
  title: string
  detail: string
  status: 'done' | 'next' | 'planned'
}

const roadmap: RoadmapItem[] = [
  {
    slice: 'Slice 1',
    title: 'Foundation & authentication',
    detail: 'JWT auth, app shell, seeded demo data, CI-ready API.',
    status: 'done',
  },
  {
    slice: 'Slice 2',
    title: 'Report engine core',
    detail: 'Report definition → safe SQL compiler; detail, summary & matrix reports.',
    status: 'done',
  },
  {
    slice: 'Slice 3',
    title: 'Visual builder',
    detail: 'Drag & drop fields, group-by, aggregates, saved reports, pivot view.',
    status: 'done',
  },
  {
    slice: 'Slice 4',
    title: 'Charts & dashboards',
    detail: 'Bar, line, pie and more, with drill-down and dashboard widgets.',
    status: 'next',
  },
  {
    slice: 'Slice 5',
    title: 'Export, scheduling & sharing',
    detail: 'CSV / Excel / PDF export, scheduled delivery, role-based sharing.',
    status: 'planned',
  },
]

const statusStyles: Record<RoadmapItem['status'], string> = {
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  next: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  planned: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [reportCount, setReportCount] = useState<number | null>(null)
  const [sourceCount, setSourceCount] = useState<number | null>(null)

  // Live counts — the cards reflect the API, not hardcoded numbers.
  useEffect(() => {
    fetchReports()
      .then((reports) => setReportCount(reports.length))
      .catch(() => setReportCount(null))
    fetchDataSources()
      .then((sources) => setSourceCount(sources.length))
      .catch(() => setSourceCount(null))
  }, [])

  const stats: Stat[] = [
    {
      label: 'Saved reports',
      value: reportCount === null ? '—' : String(reportCount),
      hint: reportCount ? 'In your library' : 'Create your first report',
    },
    {
      label: 'Data sources',
      value: sourceCount === null ? '—' : String(sourceCount),
      hint: 'Demo dataset seeded',
    },
    { label: 'Scheduled deliveries', value: '0', hint: 'Coming in slice 5' },
    { label: 'Shared with you', value: '0', hint: 'Coming in slice 5' },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            This is your reporting workspace. Build a report against the demo dataset to see the
            engine in action.
          </p>
        </div>
        <Link
          to="/builder"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          + New report
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Build roadmap
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              This project is built and shipped in vertical slices.
            </p>
          </div>
        </div>

        <ol className="space-y-3">
          {roadmap.map((item) => (
            <li
              key={item.slice}
              className="flex flex-col gap-1 rounded-xl border border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    {item.slice}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusStyles[item.status]}`}
                  >
                    {item.status === 'done'
                      ? 'Shipped'
                      : item.status === 'next'
                        ? 'In progress'
                        : 'Planned'}
                  </span>
                </div>
                <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                  {item.title}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
