import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Select from '../ui/Select'
import TextField from '../ui/TextField'
import { addShare, fetchShares, removeShare } from '../../lib/reports'
import type { ReportShare } from '../../types/reports'

/**
 * Owner-only dialog for managing who a report is shared with. The server is
 * the authority on permissions; this UI just mirrors the share list and
 * surfaces its validation messages (unknown email, self-share).
 */
export default function ShareDialog({
  reportId,
  open,
  onClose,
}: {
  reportId: number
  open: boolean
  onClose: () => void
}) {
  const [shares, setShares] = useState<ReportShare[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError(null)
    fetchShares(reportId)
      .then((data) => active && setShares(data))
      .catch(() => active && setError('Could not load the share list.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [open, reportId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setAdding(true)
    setError(null)
    try {
      const share = await addShare(reportId, email.trim(), permission)
      // updateOrCreate on the server: replace an existing row for the same user.
      setShares((s) => [...s.filter((x) => x.user_id !== share.user_id), share])
      setEmail('')
    } catch (err) {
      setError(extractShareError(err))
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(share: ReportShare) {
    setRemovingId(share.user_id)
    setError(null)
    try {
      await removeShare(reportId, share.user_id)
      setShares((s) => s.filter((x) => x.user_id !== share.user_id))
    } catch {
      setError('Could not remove that person.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Share report">
      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <div className="flex-1">
          <TextField
            label="Person's email"
            name="share-email"
            type="email"
            placeholder="teammate@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Select
          aria-label="Permission"
          className="w-28"
          value={permission}
          onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
          options={[
            { value: 'view', label: 'Can view' },
            { value: 'edit', label: 'Can edit' },
          ]}
        />
        <Button type="submit" loading={adding} disabled={!email.trim()}>
          Share
        </Button>
      </form>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          People with access
        </h3>
        {loading ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : shares.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Only you can see this report so far.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
            {shares.map((share) => (
              <li key={share.user_id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {share.name}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{share.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      share.permission === 'edit'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    {share.permission === 'edit' ? 'Can edit' : 'Can view'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(share)}
                    disabled={removingId === share.user_id}
                    className="text-xs font-medium text-zinc-400 transition hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
                  >
                    {removingId === share.user_id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

function extractShareError(err: unknown): string {
  // Laravel validation errors arrive as { errors: { email: [msg] } }.
  const res = (err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })
    ?.response?.data
  const first = res?.errors && Object.values(res.errors)[0]?.[0]
  return first ?? res?.message ?? 'Could not share the report.'
}
