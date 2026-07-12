import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import type { FieldDragData } from './FieldPalette'

/**
 * A drop target in the visual builder. Lights up while a compatible field is
 * being dragged, dims for incompatible ones, so the user always knows where a
 * chip can land before letting go.
 */
export default function DropZone({
  id,
  accepts,
  label,
  emptyHint,
  children,
  isEmpty,
  layout = 'wrap',
}: {
  id: string
  accepts: Array<'dimension' | 'measure'>
  label: string
  emptyHint: string
  children?: ReactNode
  isEmpty: boolean
  /** 'wrap' lays children out as pills; 'stack' for block content like editors. */
  layout?: 'wrap' | 'stack'
}) {
  const { isOver, active, setNodeRef } = useDroppable({ id })

  const dragData = active?.data.current as FieldDragData | undefined
  const dragging = dragData != null
  const compatible = dragging && accepts.includes(dragData.fieldType)

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <div
        ref={setNodeRef}
        data-zone={id}
        className={`min-h-[2.75rem] rounded-lg border-2 border-dashed p-2 transition-colors ${
          isOver && compatible
            ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40'
            : compatible
              ? 'border-indigo-300 bg-indigo-50/40 dark:border-indigo-800 dark:bg-indigo-950/20'
              : dragging
                ? 'border-zinc-200 opacity-40 dark:border-zinc-800'
                : 'border-zinc-200 dark:border-zinc-700'
        }`}
      >
        {isEmpty ? (
          <p className="px-1 py-1 text-xs text-zinc-400 dark:text-zinc-500">{emptyHint}</p>
        ) : layout === 'stack' ? (
          <div className="space-y-2">{children}</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">{children}</div>
        )}
      </div>
    </div>
  )
}

/** A field placed in a zone: label + remove control. */
export function FieldPill({
  label,
  onRemove,
  tone = 'dimension',
}: {
  label: string
  onRemove: () => void
  tone?: 'dimension' | 'measure'
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${
        tone === 'measure'
          ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
          : 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300'
      }`}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="ml-0.5 rounded px-0.5 leading-none text-current opacity-60 transition hover:opacity-100"
      >
        ×
      </button>
    </span>
  )
}
