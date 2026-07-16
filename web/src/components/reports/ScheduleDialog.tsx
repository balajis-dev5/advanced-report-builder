import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Select from '../ui/Select'
import TextField from '../ui/TextField'
import {
  createSchedule,
  deleteSchedule,
  fetchSchedules,
  runScheduleNow,
} from '../../lib/reports'
import type { ExportFormat, ReportSchedule, ScheduleFrequency } from '../../types/reports'

const FREQUENCIES: { value: ScheduleFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly (Mondays)' },
  { value: 'monthly', label: 'Monthly (1st)' },
]

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel' },
  { value: 'pdf', label: 'PDF' },
]

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: `${String(h).padStart(2, '0')}:00`,
}))

/**
 * Owner-only dialog for a report's delivery schedules. Creating a schedule
 * asks the server to compute next_run_at; "Run now" generates a delivery
 * immediately and shows the outcome so the feature is demoable without
 * waiting for the scheduler to tick.
 */
export default function ScheduleDialog({
  reportId,
  open,
  onClose,
}: {
  reportId: number
  open: boolean
  onClose: () => void
}) {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [frequency, setFrequency] = useState<ScheduleFrequency>('daily')
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [hour, setHour] = useState('8')
  const [recipients, setRecipients] = useState('')
  const [creating, setCreating] = useState(false)

  const [busyId, setBusyId] = useState<number | null>(null)
  const [runMessage, setRunMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError(null)
    setRunMessage(null)
    fetchSchedules(reportId)
      .then((data) => active && setSchedules(data))
      .catch(() => active && setError('Could not load schedules.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [open, reportId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const emails = recipients
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
      const created = await createSchedule(reportId, {
        frequency,
        format,
        hour: Number(hour),
        recipients: emails,
        is_active: true,
      })
      setSchedules((s) => [created, ...s])
      setRecipients('')
    } catch (err) {
      setError(extractScheduleError(err))
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(schedule: ReportSchedule) {
    setBusyId(schedule.id)
    setError(null)
    try {
      await deleteSchedule(schedule.id)
      setSchedules((s) => s.filter((x) => x.id !== schedule.id))
    } catch {
      setError('Could not delete that schedule.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRunNow(schedule: ReportSchedule) {
    setBusyId(schedule.id)
    setError(null)
    setRunMessage(null)
    try {
      const delivery = await runScheduleNow(schedule.id)
      setRunMessage(
        delivery.status === 'sent' || delivery.status === 'generated'
          ? `Delivery generated (${formatBytes(delivery.bytes)}) — ${delivery.message}`
          : `Delivery ${delivery.status}: ${delivery.message}`,
      )
    } catch {
      setError('Could not run that schedule.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Schedule delivery">
      <form onSubmit={handleCreate} className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Select
            label="Frequency"
            name="schedule-frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
            options={FREQUENCIES}
          />
          <Select
            label="Format"
            name="schedule-format"
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            options={FORMATS}
          />
          <Select
            label="At (server time)"
            name="schedule-hour"
            value={hour}
            onChange={(e) => setHour(e.target.value)}
            options={HOURS}
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextField
              label="Email recipients (optional, comma-separated)"
              name="schedule-recipients"
              placeholder="boss@example.com, team@example.com"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
            />
          </div>
          <Button type="submit" loading={creating}>
            Add schedule
          </Button>
        </div>
      </form>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {runMessage && (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {runMessage}
        </p>
      )}

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Existing schedules
        </h3>
        {loading ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : schedules.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No schedules yet — this report only runs when you open it.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
            {schedules.map((schedule) => (
              <li key={schedule.id} className="py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {FREQUENCIES.find((f) => f.value === schedule.frequency)?.label}{' '}
                    at {String(schedule.hour).padStart(2, '0')}:00 ·{' '}
                    {schedule.format.toUpperCase()}
                    {!schedule.is_active && (
                      <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        paused
                      </span>
                    )}
                  </p>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleRunNow(schedule)}
                      disabled={busyId === schedule.id}
                      className="text-xs font-medium text-indigo-600 transition hover:text-indigo-500 disabled:opacity-50 dark:text-indigo-400"
                    >
                      {busyId === schedule.id ? 'Working…' : 'Run now'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(schedule)}
                      disabled={busyId === schedule.id}
                      className="text-xs font-medium text-zinc-400 transition hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {schedule.recipients.length > 0
                    ? `To ${schedule.recipients.join(', ')}`
                    : 'No email recipients — file is generated and stored.'}
                  {schedule.next_run_at &&
                    ` · next run ${new Date(schedule.next_run_at).toLocaleString()}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function extractScheduleError(err: unknown): string {
  const res = (err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })
    ?.response?.data
  const first = res?.errors && Object.values(res.errors)[0]?.[0]
  return first ?? res?.message ?? 'Could not create the schedule.'
}
