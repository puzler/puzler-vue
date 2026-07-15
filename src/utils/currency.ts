// Format minor units (cents) as a localized currency string. Patreon
// campaigns are not all USD, so callers must pass the campaign currency and
// never hardcode a symbol. Falls back to a bare decimal when the currency
// code is unknown to Intl.
export function formatCents(cents: number, currency?: string | null): string {
  const amount = cents / 100
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      // Whole-unit prices (the common tier shape) render without ".00" noise.
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount)
  } catch {
    return amount.toFixed(2)
  }
}
