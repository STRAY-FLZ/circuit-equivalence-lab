import { createId, ProjectValidationError } from '../engineering'
import type { AssetEntry, Id, MeasurementDataset, NumericSeriesRef } from '../engineering'
import type { InlineAsset } from './types'

export function formatError(path: string, code: string, message: string): never {
  throw new ProjectValidationError([{ path, code, message }])
}

export function decodeInlineAsset(asset: InlineAsset): Uint8Array {
  if (typeof asset.data !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(asset.data)) formatError(`inlineAsset(${asset.assetId})`, 'base64', 'Expected canonical padded base64.')
  const binary = atob(asset.data)
  if (btoa(binary) !== asset.data) formatError(`inlineAsset(${asset.assetId})`, 'base64', 'Noncanonical base64 padding bits.')
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

export async function sha256(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes.slice().buffer)
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function createInlineAsset(bytes: Uint8Array, mediaType: string, id: Id = createId()): Promise<{ readonly entry: AssetEntry; readonly asset: InlineAsset }> {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return {
    entry: Object.freeze({ id, mediaType, byteLength: bytes.length, sha256: await sha256(bytes) }),
    asset: Object.freeze({ assetId: id, encoding: 'base64', data: btoa(binary) }),
  }
}

/** Validates sample payloads, not measurement/FFT algorithms. */
export function validateSamplePayloads(datasets: readonly MeasurementDataset[], bytes: ReadonlyMap<Id, Uint8Array>): void {
  const read = (series: NumericSeriesRef, axis: 'time' | 'frequency' | undefined) => {
    const data = bytes.get(series.assetId)
    if (!data || data.byteLength !== series.count * 8) formatError(`asset(${series.assetId})`, 'sample-count', 'float64-le bytes must equal 8 × sample count.')
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    let previous = -Infinity
    for (let i = 0; i < series.count; i++) {
      const value = view.getFloat64(i * 8, true)
      if (!Number.isFinite(value)) formatError(`asset(${series.assetId})[${i}]`, 'nonfinite-sample', 'Sample must be finite.')
      if (axis && (value <= previous || (axis === 'frequency' && value < 0))) formatError(`asset(${series.assetId})[${i}]`, 'axis-order', 'Axis samples must increase strictly; frequency must be nonnegative.')
      previous = value
    }
  }
  for (const dataset of datasets) {
    if (dataset.axis.kind === 'explicit-time') read(dataset.axis.times, 'time')
    if (dataset.axis.kind === 'frequency') read(dataset.axis.frequencies, 'frequency')
    for (const channel of dataset.channels) read(channel.samples, undefined)
  }
}
