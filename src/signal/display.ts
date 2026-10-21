/** Display-only min/max envelope. Numerical processing always uses original samples. */
export function displayIndices(values: ArrayLike<number>, first: number, last: number, bins = 512): readonly number[] {
  const step = Math.max(1, Math.ceil((last - first + 1) / bins)), indices: number[] = []
  for (let start = first; start <= last; start += step) {
    const end = Math.min(last, start + step - 1); let minimum = start, maximum = start
    for (let i = start + 1; i <= end; i++) { if (values[i]! < values[minimum]!) minimum = i; if (values[i]! > values[maximum]!) maximum = i }
    indices.push(...[...new Set([start, minimum, maximum, end])].sort((a, b) => a - b))
  }
  return indices
}
