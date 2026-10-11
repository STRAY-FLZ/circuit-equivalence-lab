/** Display-only rounding; authoritative values remain in the M3 snapshot. */
export function formatNumber(value: number): string {
  return Number(value.toPrecision(10)).toString()
}
