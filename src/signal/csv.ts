import { createInlineAsset } from '../project-format'
import type { ProjectDocumentV1 } from '../project-format'
import { appendWaveform } from './data'
import type { LoadedWaveform, SampleChannelInput } from './data'
import { MAX_CHANNELS, MAX_SAMPLES, SignalError, validateAxis } from './numerics'

export const MAX_CSV_BYTES = 8 * 1024 * 1024
export interface CsvTable { readonly headers: readonly string[]; readonly rows: readonly { readonly cells: readonly string[]; readonly line: number }[] }
export interface CsvMapping { readonly timeColumn: number; readonly timeUnit: 's' | 'ms' | 'us'; readonly channels: readonly { readonly column: number; readonly name: string; readonly unit: 'V' | 'mV' | 'A' | 'mA' | '1' }[] }
export function decodeCsv(bytes: Uint8Array): string {
  if (bytes.byteLength > MAX_CSV_BYTES) throw new SignalError('csv-limit', 'CSV 最大 8 MiB，未截断数据。')
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes) } catch { throw new SignalError('csv-utf8', 'CSV 必须为有效 UTF-8。') }
}
/** Comma delimiter, decimal dot, RFC-style quoted fields; retain physical source lines. */
export function parseCsv(text: string): CsvTable {
  if (new TextEncoder().encode(text).byteLength > MAX_CSV_BYTES) throw new SignalError('csv-limit', 'CSV 最大 8 MiB，未截断数据。')
  const records: { cells: string[]; line: number }[] = []
  let cells: string[] = [], field = '', quoted = false, closed = false, line = 1, rowLine = 1
  const fail = (message: string): never => { throw new SignalError('csv-syntax', `第 ${line} 行第 ${cells.length + 1} 列：${message}`, line, cells.length + 1) }
  const pushRow = () => { cells.push(field); if (cells.length > 1 || closed || cells.some(c => c.length > 0)) records.push({ cells, line: rowLine }); cells = []; field = ''; closed = false; rowLine = line + 1 }
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (quoted) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else { quoted = false; closed = true } } else { field += c; if (c === '\n') line++ }; continue }
    if (c === '"') { if (field || closed) fail('引号必须位于字段开头。'); quoted = true }
    else if (c === ',') { cells.push(field); field = ''; closed = false }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; pushRow(); line++ }
    else { if (closed) fail('结束引号后只能是逗号或换行。'); field += c }
    if (records.length > MAX_SAMPLES) throw new SignalError('sample-limit', `CSV 数据超过 ${MAX_SAMPLES} 行，未截断。`)
  }
  if (quoted) fail('引号未闭合。')
  if (field || cells.length || closed) pushRow()
  const header = records.shift(), headers = header?.cells.map(h => h.trim().replace(/^\uFEFF/, ''))
  if (!headers || headers.length < 2 || headers.some(h => !h) || new Set(headers).size !== headers.length) throw new SignalError('csv-header', 'CSV 须有至少两列且列名非空、不重复的表头；分隔符为英文逗号。', header?.line ?? 1)
  if (records.length < 2 || records.length > MAX_SAMPLES) throw new SignalError('csv-rows', `CSV 需要 2–${MAX_SAMPLES} 个数据行。`)
  for (const row of records) if (row.cells.length !== headers.length) throw new SignalError('csv-length', `第 ${row.line} 行第 ${Math.min(row.cells.length, headers.length) + 1} 列：列数与表头不一致。`, row.line, Math.min(row.cells.length, headers.length) + 1)
  return { headers, rows: records }
}
const timeScale = { s: 1, ms: 0.001, us: 0.000001 }
const unitScale = { V: { unit: 'V', scale: 1 }, mV: { unit: 'V', scale: 0.001 }, A: { unit: 'A', scale: 1 }, mA: { unit: 'A', scale: 0.001 }, '1': { unit: '1', scale: 1 } }
function readCell(table: CsvTable, rowIndex: number, column: number): number {
  const row = table.rows[rowIndex]!, text = row.cells[column]?.trim() ?? ''
  const value = Number(text)
  if (!text || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(text) || !Number.isFinite(value)) throw new SignalError('csv-value', `第 ${row.line} 行第 ${column + 1} 列：需要有限十进制数值，不能缺失。`, row.line, column + 1)
  return value
}
export function csvSamples(table: CsvTable, mapping: CsvMapping) {
  const columns = [mapping.timeColumn, ...mapping.channels.map(c => c.column)]
  if (!mapping.channels.length || mapping.channels.length > MAX_CHANNELS || new Set(columns).size !== columns.length || columns.some(c => !Number.isInteger(c) || c < 0 || c >= table.headers.length) || !(mapping.timeUnit in timeScale) || mapping.channels.some(c => !(c.unit in unitScale) || !c.name.trim())) throw new SignalError('csv-map', '请明确选择不同的时间/幅值列、单位及 1–4 个通道名称。')
  const times = table.rows.map((_, i) => readCell(table, i, mapping.timeColumn) * timeScale[mapping.timeUnit])
  const startSeconds = times[0]!, intervalSeconds = (times.at(-1)! - startSeconds) / (times.length - 1)
  for (let i = 0; i < times.length; i++) {
    if (!Number.isFinite(times[i]) || (i > 0 && times[i]! <= times[i - 1]!)) throw new SignalError('csv-time-order', `第 ${table.rows[i]!.line} 行第 ${mapping.timeColumn + 1} 列：时间须有限且严格递增。`, table.rows[i]!.line, mapping.timeColumn + 1)
    const expected = startSeconds + i * intervalSeconds, tolerance = Math.abs(intervalSeconds) * 1e-6 + 32 * Number.EPSILON * Math.max(Math.abs(times[i]!), Math.abs(expected))
    if (Math.abs(times[i]! - expected) > tolerance) throw new SignalError('csv-irregular', `第 ${table.rows[i]!.line} 行第 ${mapping.timeColumn + 1} 列：非均匀时间轴不受此导入器支持；未静默插值或执行 FFT。`, table.rows[i]!.line, mapping.timeColumn + 1)
  }
  const axis = { kind: 'uniform-time' as const, startSeconds, intervalSeconds, count: times.length }; validateAxis(axis)
  const channels: SampleChannelInput[] = mapping.channels.map(c => { const unit = unitScale[c.unit]; return { name: c.name.trim(), unit: unit.unit, values: Float64Array.from(table.rows, (_, i) => readCell(table, i, c.column) * unit.scale) } })
  return { axis, channels }
}
export async function importCsv(document: ProjectDocumentV1, bytes: Uint8Array, fileName: string, mapping: CsvMapping) {
  const table = parseCsv(decodeCsv(bytes)), samples = csvSamples(table, mapping)
  const original = await createInlineAsset(bytes, 'text/csv')
  const columnMap = { timeColumn: mapping.timeColumn, timeHeader: table.headers[mapping.timeColumn]!, timeUnit: mapping.timeUnit, channels: mapping.channels.map(c => ({ ...c, header: table.headers[c.column]! })), delimiter: ',', decimal: '.', encoding: 'UTF-8', uniformRelativeTolerance: 1e-6 }
  return appendWaveform(document, { ...samples, title: fileName, source: { kind: 'imported', fileName, originalAssetId: original.entry.id, importedAtUtc: new Date().toISOString(), columnMap }, metadata: { timePolicy: 'confirmed uniform within tolerance; axis canonicalized to uniform interval', originalRowCount: samples.axis.count, sourceKind: 'imported' }, extraAssets: [original] })
}
function quote(text: string): string { return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text }
export function exportCsv(waveform: LoadedWaveform): string {
  const header = ['time_s', ...waveform.channels.map((c, i) => `CH${i + 1}_${c.channel.samples.unit}`)]
  const rows = [header.map(quote).join(',')]
  for (let i = 0; i < waveform.axis.count; i++) rows.push([String(waveform.axis.startSeconds + i * waveform.axis.intervalSeconds), ...waveform.channels.map(c => String(c.values[i]!))].join(','))
  return rows.join('\r\n') + '\r\n'
}
