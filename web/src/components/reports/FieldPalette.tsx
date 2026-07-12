import { useDraggable } from '@dnd-kit/core'
import type { Field } from '../../types/reports'

/** Payload attached to every palette drag; drop zones use it to accept/reject. */
export interface FieldDragData {
  fieldKey: string
  fieldType: 'dimension' | 'measure'
}

/**
 * The field list of the visual builder: every dimension and measure of the
 * active data source as a draggable chip. Dragging is the primary interaction;
 * clicking a chip adds it to the most sensible slot, which keeps the builder
 * fully usable with a keyboard, screen reader, or touch device.
 */
export default function FieldPalette({
  dimensions,
  measures,
  onAdd,
}: {
  dimensions: Field[]
  measures: Field[]
  onAdd: (field: Field) => void
}) {
  return (
    <div className="space-y-5 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Fields</h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Drag into the report — or click to add.
        </p>
      </div>

      <PaletteGroup label="Dimensions" fields={dimensions} onAdd={onAdd} />
      <PaletteGroup label="Measures" fields={measures} onAdd={onAdd} />
    </div>
  )
}

function PaletteGroup({
  label,
  fields,
  onAdd,
}: {
  label: string
  fields: Field[]
  onAdd: (field: Field) => void
}) {
  if (fields.length === 0) return null
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        {label}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {fields.map((field) => (
          <PaletteChip key={field.key} field={field} onAdd={onAdd} />
        ))}
      </div>
    </div>
  )
}

function PaletteChip({ field, onAdd }: { field: Field; onAdd: (field: Field) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette:${field.key}`,
    data: { fieldKey: field.key, fieldType: field.type } satisfies FieldDragData,
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onAdd(field)}
      title={`${field.label} — drag into the report, or click to add`}
      {...listeners}
      {...attributes}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
          : undefined
      }
      className={`inline-flex cursor-grab touch-none items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition active:cursor-grabbing ${
        field.type === 'measure'
          ? 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
          : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300'
      } ${isDragging ? 'relative z-50 opacity-90 shadow-lg ring-2 ring-indigo-400' : ''}`}
    >
      <span aria-hidden="true" className="text-zinc-400 dark:text-zinc-500">
        ⠿
      </span>
      {field.label}
    </button>
  )
}
