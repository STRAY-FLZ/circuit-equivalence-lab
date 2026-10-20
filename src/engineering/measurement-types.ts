import type { Id, JsonObject, Quantity, ResourceRef, Revision } from './types'

export interface NumericSeriesRef {
  readonly assetId: Id
  readonly encoding: 'float64-le'
  readonly count: number
  readonly unit: string
}
export type SamplingAxis =
  | { readonly kind: 'uniform-time'; readonly startSeconds: number; readonly intervalSeconds: number; readonly count: number }
  | { readonly kind: 'explicit-time'; readonly times: NumericSeriesRef }
  | { readonly kind: 'frequency'; readonly frequencies: NumericSeriesRef }
export type DatasetSource =
  | { readonly kind: 'simulated'; readonly engine: ResourceRef; readonly projectRevision: Revision; readonly analysisId: Id; readonly inputDigest: string }
  | { readonly kind: 'imported'; readonly fileName: string; readonly originalAssetId: Id; readonly importedAtUtc: string; readonly columnMap: JsonObject }
  | { readonly kind: 'hardware'; readonly instrument: string; readonly acquisitionId: string; readonly acquiredAtUtc: string; readonly configuration: JsonObject }
  | { readonly kind: 'derived'; readonly inputDatasetIds: readonly Id[]; readonly operation: ResourceRef; readonly options: JsonObject }
export interface Calibration {
  readonly gain: number
  readonly offset: Quantity
  readonly applied: boolean
  readonly sourceNote: string
}
export interface WaveformChannel {
  readonly id: Id
  readonly name: string
  readonly samples: NumericSeriesRef
  readonly probeAnchorId?: Id
  readonly calibration?: Calibration
}
export interface MeasurementDataset {
  readonly id: Id
  readonly title: string
  readonly kind: 'waveform' | 'spectrum'
  readonly source: DatasetSource
  readonly axis: SamplingAxis
  readonly channels: readonly WaveformChannel[]
  readonly metadata: JsonObject
}
export type ScalarMeasurement =
  | { readonly kind: 'available'; readonly name: string; readonly value: Quantity; readonly datasetId: Id; readonly channelId: Id; readonly method: ResourceRef; readonly options: JsonObject; readonly uncertainty?: Quantity }
  | { readonly kind: 'unavailable'; readonly name: string; readonly reason: string; readonly datasetId: Id; readonly channelId: Id }
