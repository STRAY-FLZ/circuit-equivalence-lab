import type { AnalysisConfiguration, EngineeringProject, Quantity } from '../engineering'
import type { ProjectDocumentV1 } from '../project-format'
import type { AnalysisResult } from '../analysis'
import type { DcSolution } from '../dc'
import type { AcResult } from '../ac'

export type Criterion =
  | { readonly kind: 'exact'; readonly expected: number; readonly absoluteTolerance: number; readonly relativeTolerance: number }
  | { readonly kind: 'minimum'; readonly limit: number; readonly inclusive: boolean }
  | { readonly kind: 'maximum'; readonly limit: number; readonly inclusive: boolean }
  | { readonly kind: 'interval'; readonly lower: number; readonly upper: number; readonly includeLower: boolean; readonly includeUpper: boolean }
export type Attribution = 'published' | 'derived' | 'training'
export interface Requirement {
  readonly id: string; readonly title: string; readonly origin: Attribution; readonly sourceSection: string
  readonly classification: 'basic' | 'advanced' | 'unspecified'; readonly unit: string; readonly criterion: Criterion
  readonly conditions: string; readonly method: string; readonly evidenceNeeded: string; readonly topics: readonly string[]
  readonly limitation: string; readonly derivation: string
}
export interface Problem {
  readonly id: string; readonly event: string; readonly classification: 'national' | 'regional'; readonly region: string
  readonly year: number; readonly letter: string; readonly title: string; readonly division: string; readonly category: string
  readonly sourceUrl: string; readonly publicationUrl: string; readonly publisher: string; readonly sourceLocator: string
  readonly verification: 'verified'; readonly verifiedOn: string; readonly summary: string; readonly capabilities: readonly string[]
  readonly limitation: string; readonly publishedRequirement: Omit<Requirement, 'id' | 'origin' | 'derivation'>
}
export interface Task { readonly id: string; readonly title: string; readonly done: boolean }
export interface Alternative {
  readonly id: string; readonly title: string; readonly approach: string; readonly parameters: string
  readonly advantages: string; readonly disadvantages: string; readonly risks: string; readonly rationale: string
  readonly references: string; readonly revisionNote: string; readonly basedOnRevision: string; readonly recordedAtUtc: string
}
export interface Notebook {
  readonly experimentId: string; readonly objective: string; readonly setup: string; readonly parameters: string
  readonly observations: string; readonly problems: string; readonly adjustments: string; readonly conclusion: string
  readonly review: string; readonly nextSteps: string; readonly requirementIds: readonly string[]
}
export interface Metric {
  readonly id: string; readonly requirementId: string; readonly title: string; readonly unit: string
  readonly criterion: Criterion; readonly conditions: string; readonly method: string
}
export interface Datum { readonly key: string; readonly title: string; readonly quantity: Quantity }
export interface Evidence {
  readonly id: string; readonly experimentId: string; readonly title: string
  readonly origin: 'simulation' | 'imported' | 'manual' | 'derived'; readonly acquisition: string; readonly method: string
  readonly conditions: string; readonly recordedAtUtc: string; readonly basisRevision: string
  readonly sourceProjectId: string; readonly sourceRevision: string; readonly inputDigest: string
  readonly analysisId: string; readonly resultId: string; readonly datasetIds: readonly string[]
  readonly artifactAssetIds: readonly string[]; readonly data: readonly Datum[]
}
export interface Attempt { readonly id: string; readonly metricId: string; readonly evidenceId: string; readonly datumKey: string; readonly label: string; readonly recordedAtUtc: string }
export interface WorkspaceState {
  readonly version: 1; readonly catalogVersion: 1; readonly problemId: string; readonly competitionId: string
  readonly engineeringRevision: string; readonly circuitDigest: string; readonly requirements: readonly Requirement[]; readonly tasks: readonly Task[]
  readonly sourceRevisions: readonly { readonly projectId: string; readonly revision: string }[]
  readonly alternatives: readonly Alternative[]; readonly notebooks: readonly Notebook[]; readonly metrics: readonly Metric[]
  readonly evidence: readonly Evidence[]; readonly attempts: readonly Attempt[]
}
export type Judgment = { readonly kind: 'pass' | 'fail'; readonly actual: number; readonly absoluteError: number | null; readonly relativeError: number | null; readonly detail: string } | { readonly kind: 'indeterminate'; readonly detail: string }
export type ToolKind = 'signal' | 'dc' | 'ac' | 'transient' | 'atlas'
export interface AnalysisTransfer { readonly project: EngineeringProject; readonly configuration: AnalysisConfiguration; readonly result: AnalysisResult<DcSolution> | AnalysisResult<AcResult> }
export type ToolTransfer = { readonly kind: 'analysis'; readonly document: ProjectDocumentV1; readonly analysis: AnalysisTransfer } | { readonly kind: 'signal'; readonly document: ProjectDocumentV1; readonly datasetId: string; readonly channelId: string } | { readonly kind: 'snapshot'; readonly document: ProjectDocumentV1 }
export const WORKSPACE_EXTENSION = 'org.stray.competition.workspace'
