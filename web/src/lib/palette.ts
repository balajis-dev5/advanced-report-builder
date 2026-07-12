/**
 * Categorical color palette for charts.
 *
 * Chosen for reasonable contrast in both light and dark themes and to stay
 * distinguishable for the most common forms of color-vision deficiency. The
 * brand indigo leads; the rest are spaced around the hue wheel rather than
 * being a single ramp, so adjacent series never blur together.
 */
export const CATEGORICAL = [
  '#6366f1', // indigo (brand)
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#3b82f6', // blue
] as const

/** Deterministic color for a series/slice index, wrapping if we run out. */
export function colorAt(index: number): string {
  return CATEGORICAL[index % CATEGORICAL.length]
}
