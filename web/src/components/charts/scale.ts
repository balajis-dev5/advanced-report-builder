/**
 * Small, dependency-free scaling helpers shared by the SVG charts.
 */

/** Round a raw maximum up to a visually "nice" axis bound (1/2/5 × 10ⁿ). */
export function niceMax(rawMax: number): number {
  if (rawMax <= 0) return 1
  const exponent = Math.floor(Math.log10(rawMax))
  const magnitude = Math.pow(10, exponent)
  const fraction = rawMax / magnitude
  let niceFraction: number
  if (fraction <= 1) niceFraction = 1
  else if (fraction <= 2) niceFraction = 2
  else if (fraction <= 5) niceFraction = 5
  else niceFraction = 10
  return niceFraction * magnitude
}

/** Evenly spaced tick values from 0 to `max`, inclusive. */
export function ticks(max: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, i) => (max / count) * i)
}

/** Compact axis labels: 1500000 → "1.5M", 12000 → "12K". */
export function compactNumber(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${trim(value / 1_000_000)}M`
  if (abs >= 1_000) return `${trim(value / 1_000)}K`
  return String(Math.round(value))
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '')
}
