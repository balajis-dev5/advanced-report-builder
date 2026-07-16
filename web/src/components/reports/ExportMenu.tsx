import { useEffect, useRef, useState } from 'react'
import type { ExportFormat } from '../../types/reports'

const FORMATS: { value: ExportFormat; label: string; hint: string }[] = [
  { value: 'csv', label: 'CSV', hint: 'Plain text, opens anywhere' },
  { value: 'xlsx', label: 'Excel', hint: 'Native .xlsx workbook' },
  { value: 'pdf', label: 'PDF', hint: 'Print-ready document' },
]

/**
 * Dropdown of download formats. The caller supplies the actual export call;
 * this component owns the open/busy state so a slow download can't be
 * double-triggered. Dependency-free, closes on Escape and outside click.
 */
export default function ExportMenu({
  onExport,
  disabled = false,
  compact = false,
}: {
  onExport: (format: ExportFormat) => Promise<void>
  disabled?: boolean
  /** Compact renders a text-link trigger for tight spots like list cards. */
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [error, setError] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function handlePick(format: ExportFormat) {
    setBusy(format)
    setError(false)
    try {
      await onExport(format)
      setOpen(false)
    } catch {
      setError(true)
    } finally {
      setBusy(null)
    }
  }

  const trigger = compact
    ? 'text-sm font-medium text-zinc-500 transition hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 disabled:cursor-not-allowed disabled:opacity-50'
    : 'inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800'

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        className={trigger}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Export
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
          className={compact ? 'inline-block' : undefined}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="menuitem"
              disabled={busy !== null}
              onClick={() => handlePick(f.value)}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-indigo-50 disabled:opacity-60 dark:hover:bg-indigo-950/40"
            >
              <span>
                <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
                  {f.label}
                </span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">{f.hint}</span>
              </span>
              {busy === f.value && (
                <span
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
          {error && (
            <p className="border-t border-zinc-200 px-4 py-2 text-xs text-red-600 dark:border-zinc-700 dark:text-red-400">
              Export failed — check the report and try again.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
