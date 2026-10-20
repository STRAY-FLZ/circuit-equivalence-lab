import type { Id, ResourceRef, Revision } from './types'

export interface PinPadMapping {
  readonly instancePinId: Id
  readonly padKeys: readonly string[]
}
export interface FootprintAssignment {
  readonly id: Id
  readonly componentId: Id
  readonly footprint: ResourceRef
  readonly footprintAssetId: Id
  readonly pinPadMappings: readonly PinPadMapping[]
}
export interface BoardCheckRecord {
  readonly id: Id
  readonly kind: 'erc' | 'drc' | 'schematic-consistency' | 'manufacturing'
  readonly status: 'pass' | 'fail' | 'not-run'
  readonly rules: ResourceRef
  readonly sourceRevision: Revision
  readonly boardDigest: string
  readonly reportAssetId?: Id
}
export interface BoardLink {
  readonly id: Id
  readonly title: string
  readonly sourceRevision: Revision
  readonly sourceDigest: string
  readonly assignments: readonly FootprintAssignment[]
  readonly boardAssetId?: Id
  readonly checks: readonly BoardCheckRecord[]
}
export interface BoardNet {
  readonly id: Id
  readonly sourceAnchorIds: readonly Id[]
  readonly sourcePinIds: readonly Id[]
}
export interface BoardArtifactV1 {
  readonly kind: 'org.stray.board'
  readonly version: 1
  readonly boardId: Id
  readonly sourceNetlistAssetId: Id
  readonly unit: 'mm'
  readonly outline: readonly { readonly x: number; readonly y: number }[]
  readonly layers: readonly { readonly id: Id; readonly name: string; readonly kind: 'copper' | 'silkscreen' | 'mask' | 'outline' }[]
  readonly nets: readonly BoardNet[]
  readonly placements: readonly { readonly assignmentId: Id; readonly x: number; readonly y: number; readonly rotationDegrees: number; readonly side: 'front' | 'back' }[]
}
