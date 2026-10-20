import type { EngineeringProject, Id } from '../engineering'

export interface InlineAsset {
  readonly assetId: Id
  readonly encoding: 'base64'
  readonly data: string
}
export interface ProjectDocumentV1 {
  readonly format: 'org.stray.electronics.project'
  readonly formatVersion: 1
  readonly writer: { readonly name: string; readonly version: string }
  readonly requiredExtensions: readonly string[]
  readonly project: EngineeringProject
  readonly inlineAssets: readonly InlineAsset[]
}
export type ImportResult =
  | { readonly kind: 'ready'; readonly document: ProjectDocumentV1; readonly migratedFrom?: number }
  | { readonly kind: 'unrecognized'; readonly reason: 'format' | 'newer-version' | 'required-extension'; readonly originalText: string }
  | { readonly kind: 'invalid'; readonly issues: readonly { readonly path: string; readonly code: string; readonly message: string }[] }
export interface MigrationStep {
  readonly from: number
  readonly to: number
  migrate(validatedSource: unknown): unknown
}
