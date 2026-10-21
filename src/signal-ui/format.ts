export function formatNumber(value: number): string { return Number.isFinite(value) ? Number(value.toPrecision(7)).toString() : '不可用' }
