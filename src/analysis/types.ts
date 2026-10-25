import type {
  AnalysisConfiguration, ComplexValue, EngineeringProject, Id, JsonObject,
  Quantity, ResourceRef, Revision,
} from '../engineering'

export interface Diagnostic {
  readonly code: string
  readonly severity: 'info' | 'warning' | 'error'
  readonly message: string
  readonly entityIds: readonly Id[]
}
export interface EngineDescriptor {
  readonly resource: ResourceRef
  readonly family: 'topology' | 'electrical' | 'digital' | 'signal' | 'pcb' | 'education'
  readonly analysisTypes: readonly string[]
  readonly execution: 'main-thread' | 'worker' | 'external'
  readonly modelVersions: readonly ResourceRef[]
}
export interface AnalysisInput {
  readonly project: EngineeringProject
  readonly configuration: AnalysisConfiguration
  readonly inputDigest: string
}
export type CapabilityReport =
  | { readonly kind: 'supported'; readonly diagnostics: readonly Diagnostic[] }
  | { readonly kind: 'unsupported'; readonly diagnostics: readonly Diagnostic[] }
export interface EngineHost {
  readonly signal: AbortSignal
  readAsset(assetId: Id): Promise<Uint8Array>
  onProgress(completed: number, total?: number): void
}
export interface ResultProvenance {
  readonly engine: ResourceRef
  readonly projectId: Id
  readonly inputRevision: Revision
  readonly inputDigest: string
  readonly analysisId: Id
  readonly options: JsonObject
}
export type AnalysisOutcome<Output> =
  | { readonly kind: 'success'; readonly value: Output }
  | { readonly kind: 'physical-state'; readonly state: 'open-circuit' | 'short-circuit' }
  | { readonly kind: 'unsupported'; readonly diagnostics: readonly Diagnostic[] }
  | { readonly kind: 'failure'; readonly category: 'invalid-input' | 'numerical' | 'resource' | 'io'; readonly diagnostics: readonly Diagnostic[] }
  | { readonly kind: 'inconclusive'; readonly diagnostics: readonly Diagnostic[] }
  | { readonly kind: 'cancelled' }
export interface AnalysisResult<Output> {
  readonly provenance: ResultProvenance
  readonly outcome: AnalysisOutcome<Output>
}
/** Immutable tool-to-workspace handoff; result remains bound to its actual input. */
export interface AnalysisCapture<Output> { readonly project: EngineeringProject; readonly configuration: AnalysisConfiguration; readonly result: AnalysisResult<Output> }
export interface AnalysisEngine<Output> {
  readonly descriptor: EngineDescriptor
  inspect(input: AnalysisInput): CapabilityReport
  run(input: AnalysisInput, host: EngineHost): Promise<AnalysisResult<Output>>
}

export interface ResistanceOutput {
  readonly resistance: Quantity
  readonly diagnostics: JsonObject
}
export interface DcOutput {
  readonly referenceAnchorId: Id
  readonly voltages: readonly { readonly anchorId: Id; readonly volts: number }[]
  readonly currents: readonly { readonly componentId: Id; readonly fromPinId: Id; readonly toPinId: Id; readonly amps: number }[]
}
export interface AcOutput {
  readonly frequencyHz: number
  readonly referenceAnchorId: Id
  readonly phasors: readonly { readonly anchorId: Id; readonly voltsRms: ComplexValue }[]
}
export interface TransientOutput { readonly datasetIds: readonly Id[] }
export interface DigitalOutput { readonly eventAssetIds: readonly Id[] }
export interface SignalOutput { readonly datasetIds: readonly Id[]; readonly measurements: readonly Quantity[] }
export interface PcbCheckOutput {
  readonly status: 'pass' | 'fail' | 'not-run'
  readonly ruleSet: ResourceRef
  readonly diagnostics: readonly Diagnostic[]
}
