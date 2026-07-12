/**
 * Presentation-layer value formatting, driven by the `format` hint each column
 * carries from the API (currency / percent / number / null). Kept dependency-free
 * and locale-aware via Intl.
 */

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

export function formatValue(
  value: string | number | null | undefined,
  format?: string | null,
): string {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  const numeric = typeof value === 'number' ? value : Number(value)
  const isNumeric = !Number.isNaN(numeric) && value !== ''

  switch (format) {
    case 'currency':
      return isNumeric ? currencyFormatter.format(numeric) : String(value)
    case 'percent':
      return isNumeric ? `${numberFormatter.format(numeric)}%` : String(value)
    case 'number':
      return isNumeric ? numberFormatter.format(numeric) : String(value)
    default:
      return String(value)
  }
}
