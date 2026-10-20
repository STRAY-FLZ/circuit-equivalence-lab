import type { MeasurementDataset } from './measurement-types'
import type { BoardLink } from './pcb-types'

export type Id = string
export type Revision = string
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | JsonObject
export interface JsonObject { readonly [key: string]: JsonValue }

export interface Quantity {
  readonly value: number
  readonly unit: string
}
export interface ComplexValue {
  readonly real: number
  readonly imaginary: number
}
export type ParameterValue =
  | { readonly kind: 'quantity'; readonly quantity: Quantity }
  | { readonly kind: 'complex'; readonly value: ComplexValue; readonly unit: string }
  | { readonly kind: 'boolean'; readonly value: boolean }
  | { readonly kind: 'text'; readonly value: string }
export interface ResourceRef {
  readonly id: string
  readonly version: string
}
export interface AssetEntry {
  readonly id: Id
  readonly mediaType: string
  readonly byteLength: number
  readonly sha256: string
}
export interface AnalysisConfiguration {
  readonly id: Id
  readonly analysisType: string
  readonly preferredEngine?: ResourceRef
  readonly scope:
    | { readonly kind: 'circuit'; readonly sheetIds: readonly Id[] }
    | { readonly kind: 'dataset'; readonly datasetIds: readonly Id[] }
    | { readonly kind: 'board'; readonly boardId: Id }
  readonly options: JsonObject
}
export interface ResultRecord {
  readonly id: Id
  readonly analysisId: Id
  readonly engine: ResourceRef
  readonly inputRevision: Revision
  readonly inputDigest: string
  readonly outcome: 'success' | 'physical-state' | 'unsupported' | 'failure' | 'inconclusive' | 'cancelled'
  readonly artifactAssetIds: readonly Id[]
}
export interface ExperimentRecord {
  readonly id: Id
  readonly title: string
  readonly analysisIds: readonly Id[]
  readonly datasetIds: readonly Id[]
  readonly notes: string
}
export interface CompetitionRecord {
  readonly id: Id
  readonly title: string
  readonly sourceUrls: readonly string[]
  readonly experimentIds: readonly Id[]
}
export interface EngineeringProject {
  readonly id: Id
  readonly revision: Revision
  readonly title: string
  readonly definitions: readonly ComponentDefinition[]
  readonly symbols: readonly SymbolDefinition[]
  readonly sheets: readonly SchematicSheet[]
  readonly analyses: readonly AnalysisConfiguration[]
  readonly results: readonly ResultRecord[]
  readonly measurements: readonly MeasurementDataset[]
  readonly boards: readonly BoardLink[]
  readonly experiments: readonly ExperimentRecord[]
  readonly competitions: readonly CompetitionRecord[]
  readonly assets: readonly AssetEntry[]
  readonly extensions: JsonObject
}

export interface PinDefinition {
  readonly key: string
  readonly name: string
  readonly electricalRole: 'passive' | 'input' | 'output' | 'bidirectional' | 'power' | 'unspecified'
}
export interface ParameterDefinition {
  readonly key: string
  readonly kind: ParameterValue['kind']
  readonly unit?: string
  readonly required: boolean
}
export interface ModelBinding {
  readonly analysisFamily: 'electrical' | 'digital'
  readonly model: ResourceRef
  readonly portMap: Readonly<Record<string, string>>
}
export interface ComponentDefinition {
  readonly id: Id
  readonly resource: ResourceRef
  readonly kind: string
  readonly pins: readonly PinDefinition[]
  readonly parameters: readonly ParameterDefinition[]
  readonly defaultSymbolId?: Id
  readonly modelBindings: readonly ModelBinding[]
}
export interface InstancePin {
  readonly id: Id
  readonly definitionPinKey: string
  readonly anchorId: Id
}
export interface ComponentInstance {
  readonly id: Id
  readonly reference: string
  readonly definitionId: Id
  readonly pins: readonly InstancePin[]
  readonly parameters: Readonly<Record<string, ParameterValue>>
}
export interface Anchor { readonly id: Id }
export interface Connection {
  readonly id: Id
  readonly endpoints: readonly [Id, Id]
}
export interface NetLabel {
  readonly id: Id
  readonly anchorId: Id
  readonly name: string
  readonly scope: 'sheet' | 'project'
}
export interface ReferenceMarker {
  readonly id: Id
  readonly anchorId: Id
  readonly domain: string
}
export interface ExternalPort {
  readonly id: Id
  readonly label: string
  readonly anchorId: Id
}
export interface Position { readonly x: number; readonly y: number }
export interface SymbolDefinition {
  readonly id: Id
  readonly resource: ResourceRef
  readonly pinPositions: Readonly<Record<string, Position>>
  readonly bodyAssetId?: Id
}
export interface ComponentPlacement {
  readonly componentId: Id
  readonly symbolId: Id
  readonly origin: Position
  readonly rotationDegrees: 0 | 90 | 180 | 270
  readonly mirrored: boolean
}
export interface SheetGeometry {
  readonly placements: readonly ComponentPlacement[]
  readonly anchorPositions: Readonly<Record<Id, Position>>
  readonly connectionRoutes: Readonly<Record<Id, readonly Position[]>>
}
export interface SchematicSheet {
  readonly id: Id
  readonly title: string
  readonly components: readonly ComponentInstance[]
  readonly anchors: readonly Anchor[]
  readonly connections: readonly Connection[]
  readonly labels: readonly NetLabel[]
  readonly references: readonly ReferenceMarker[]
  readonly ports: readonly ExternalPort[]
  readonly geometry: SheetGeometry
}
export interface ResolvedNet {
  readonly key: string
  readonly anchorIds: readonly Id[]
  readonly pinIds: readonly Id[]
  readonly labelIds: readonly Id[]
}
export interface ConnectivitySnapshot {
  readonly projectId: Id
  readonly projectRevision: Revision
  readonly nets: readonly ResolvedNet[]
  readonly anchorToNet: Readonly<Record<Id, string>>
}
