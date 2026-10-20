# PCB and EDA Interoperability Boundaries

Status: V2.0-A design output (A08). This defines source identity and interchange
boundaries, not a board editor, KiCad reader/writer, or manufacturing capability.
Material decisions: [DECISIONS.md](DECISIONS.md), D08.

## Identity chain and proposed records

Maintain the chain: project → component instance → instance pin → source net
membership → footprint assignment → footprint pad → board-local net/copper.
Reference designators, visual pin labels, and pad numbers are display/library
attributes; they cannot substitute for stable entity IDs.

```ts
import type { Id, ResourceRef, Revision } from './DOMAIN_MODEL'

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
```

BoardArtifactV1 is an intentionally bounded outline/placement/net scaffold; copper
tracks, vias, zones, stackup, differential pairs, and manufacturing rules need
versioned contracts when implemented. It does not claim a complete PCB interchange
format. Root BoardLink is optional in practice via an empty `boards` array; the
V2.0 implementation need not provide board functionality to save other projects.

All project-facing IDs refer to actual project entities. IDs inside a versioned
asset (board-local nets/layers) are asset-scoped and cannot be mistaken for project
IDs. The source netlist asset records source revision/digest plus pin/anchor
membership; it never relies solely on a derived topology/net key.

## Pin/pad and component mapping

Footprint resources are version-pinned with embedded asset bytes; model ports,
schematic symbol pins, and physical pads are separate maps. All electrical instance
pins must be accounted for: one pin can map to several electrically common pads;
mechanical/unconnected pads are explicit footprint metadata, not invented pins.
Distinct pins mapped to one pad require an explicitly supported package rule and
must be checked against source connectivity; never silently introduce a short.

A symbol rotation changes schematic presentation only. Board placement uses its
own mm coordinates, side, and rotation. Mirroring/back-side transforms are defined
by a future validated interchange adapter, never copied from SVG transforms.

Reannotating a component leaves ID mappings intact. Deleting/replacing a component
or changing its pin definition makes related board assignments stale or requires
an explicit reviewed mapping transaction; no dangling pin reference may be saved
as a current association. V1 transform writeback rejects removal of mapped pins
until a rebind workflow exists.

## Schematic-to-board synchronization

Produce a normalized source netlist from resolved electrical connectivity, including
component/pin identities, pinned footprints, pad mappings, and declared no-connects
when that feature is later defined. Compare it with the board artifact using source
revision/digest and member pins, reporting missing components/pads, disconnected
nets, extra shorts, and changed assignments. A renamed derived net key alone is
not a changed electrical net; actual pin membership is the comparison basis.

After a schematic or board edit, earlier check evidence becomes historical unless
its source revision and board digest still match. Checks that were not implemented
or not run remain `not-run`; absence of violations is not automatically `pass`.
Even a passing implemented DRC means only that named rule set passed, not universal
electrical correctness or manufacturability.

## Interoperability strategy

Recommend a neutral internal netlist/assignment boundary first, then a versioned
adapter to an established EDA tool such as KiCad when a concrete workflow requires
it. Do not commit to file versions or claim lossless interchange without official
format documentation, representative fixtures, round-trip comparison, and license
review at that stage. No external tool installation is needed in V2.0-A.

Imports/exports must declare supported objects, versions, units, coordinate
conventions, and intentional losses. Unsupported pad stacks/layers/constraints
must produce explicit diagnostics rather than a success label over dropped data.
Preserve original imported bytes as an asset where appropriate. Component selection,
BOM procurement data, and datasheet sources remain distinct from electrical models.

2D/3D rendering can be delivered independently as a preview, clearly identifying
which checks have run. Manufacturing exports require a later explicit gate covering
outline/stackup/pads/copper/connectivity/rules, supported output formats, and verified
test fixtures. A visually plausible board is not manufacturing evidence.

## Future acceptance cases

- Reannotate `U1` and preserve every instance-pin/pad association.
- Reject missing pad keys, incomplete pin mapping, or an unintended shared-pad short.
- Detect a schematic net split/merge by member pins, even if a display name survives.
- Invalidate old checks after board/source changes and distinguish `not-run`/fail/pass.
- Reimport a supported exported fixture and compare connectivity/units/identity;
  declare all unsupported features and losses before claiming interoperability.
