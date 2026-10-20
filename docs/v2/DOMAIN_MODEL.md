# Engineering Project, Components, and Connectivity

Status: V2.0-A proposed contracts (A02–A03). TypeScript blocks are design examples,
not production modules. See [DECISIONS.md](DECISIONS.md), especially D01–D03.

## Project aggregate and common values

These examples define the core vocabulary used by the other specifications.
Cross-document imports denote specification modules, not files to add to `src/`.

```ts
import type { MeasurementDataset } from './MEASUREMENT_DATA'
import type { BoardLink } from './PCB_INTEROPERABILITY'

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
```

All `number` values are finite; no NaN, Infinity, functions, Maps, or runtime typed
arrays in these persisted DTOs. Units use a controlled canonical registry with SI
values (`ohm`, `V`, `A`, `s`, `Hz`, `F`, `H`, `1`, `rad`, etc.); reject unknown units
until registered. Engineering prefixes and displayed precision are presentation
metadata. A resistor definition requires quantity parameter `resistance` in `ohm`,
finite and strictly positive. Other models define their own ranges and dimensions.
There is no universal rule that all quantities are positive. Complex values are
rectangular, with the engine documenting phasor amplitude/sign conventions.

Under owner-revised D06, `measurements` contains dataset descriptors, provenance,
axes, and sample-asset references; `assets` is their manifest, not the sample arrays
or bytes. Sampled payloads remain logically separate from editable project structure.
Small payloads may travel inline in the initial portable JSON envelope. This does
not commit the project model to embedding large captures or to an external format;
see [PROJECT_FORMAT.md](PROJECT_FORMAT.md#container-and-version-axes).

Definitions embedded in the project are the resolution authority: a pinned
resource ID/version plus a local immutable definition. External library URLs do
not silently replace it on load. Changing a definition requires an explicit
instance-pin mapping, including symbol/model/footprint checks. `kind` is not an
implicit solver model; a compatible engine recognizes a pinned model binding and
validates its parameters and port map.

`ModelBinding.portMap` maps each model port name to a definition pin key;
`SymbolDefinition.pinPositions` is keyed by definition pin key. Referenced keys
must exist and required model ports must be mapped. Model-specific ordered ports
come from the pinned model definition, never object enumeration or symbol position.

## Stable identity and references

Allocate opaque UUID strings for new project entities. All entity IDs are unique
within a project across collections, including instance pins, anchors, assets,
definitions, and nested records. Resource IDs/versions and definition pin keys
have their own namespaces. The project ID identifies the aggregate; revision is
an opaque token allocated on every committed transaction, including undo/redo.
Renaming `R1`, moving a symbol, or reordering arrays does not change entity IDs.
Forking a project allocates a new project ID; references remain project-qualified.

Every instance pin maps exactly once to a definition pin key and a declared anchor
on its owning sheet. Every definition pin has one instance pin; do not deduplicate
pins by label or package pin number. Unconnected pins retain their own anchors.
Distinct pins use distinct anchors even if explicitly connected by a wire.
Two instances of the same three-pin definition have six distinct instance pin IDs.
Wire endpoints, labels, ports, and reference markers must reference anchors on
their owning sheet. A component belongs to exactly one sheet. Board mappings use
instance pin IDs; simulation bindings use definition pin keys.

## Authoritative connectivity and derived nets

**Owner-approved D02:** persist explicit anchors, connections, and label semantics;
derive `ConnectivitySnapshot`. Do not persist an independently editable second
net-membership table. Connections are ideal conductive graph edges. Components
do not merge pin anchors; engines model what happens between their ports.

Resolution operates over all project sheets, then an engine selects an explicit
supported scope. Initialize every anchor, union connection endpoints, and union
labels with equal `(scope, sheetId-if-local, name)`. Names compare exactly after
requiring nonempty, trimmed input; there is no hidden case folding. A local label
never implicitly matches a project label. Different names on a physically joined
net remain aliases and produce an ERC warning when appropriate, not a disconnected
fiction. No synthetic wires are stored for label connections.

Net keys are derived, snapshot-scoped identifiers: `net:` plus the lexicographically
smallest anchor ID in the resolved group (UTF-16 order, same rule across engines).
Stable entity/label IDs survive edits; a net key is not promised to survive net
split/merge. Persist selections/analysis references using anchors or pins, then
resolve again for the specified revision. Never save a bare derived net key as a
permanent measurement probe or PCB source identity.

Hierarchical sheet instances and bus expansion are deferred. Flat multi-sheet
data can be represented, but the first editor/V1 projection is explicitly
single-sheet and must reject project-global connections escaping that scope.

### Labels, electrical ground, and solver reference (D03)

| Concept | Initial representation | Connectivity effect |
| --- | --- | --- |
| Electrical net label | `NetLabel` attached to a stable anchor | Equal explicit `(scope, sheetId-if-local, name)` groups connect electrically |
| Electrical ground connection | Explicit Connection edges to the intended common ground net, or deliberately assigned matching NetLabels | Conductive connection comes from those edges/labels; a ground glyph or the name `GND` alone has no additional rule |
| Solver reference-node selection | Analysis options and/or a `ReferenceMarker` for the engine's analysis domain | Chooses zero potential; adds no edges and never unions distinct nets |

Ground does not require a new entity type in the initial graph. To connect distant
ground anchors through labels, explicitly create equal project-scoped `GND` labels
(or equal sheet-local labels within one sheet). Different ground names such as
`AGND` and `DGND` stay separate unless a declared wire or label connection joins
them. Equal sheet-local `GND` labels on different sheets do not connect; local
`GND` and project-scoped `GND` also remain separate unless explicitly wired.
Case-sensitive exact label matching applies equally to ground labels. No ground
name implies an actual protective-earth connection or a physical voltage source.

`ReferenceMarker.domain` identifies an analysis purpose, not an electrical label
namespace. Two markers with equal domain/text on disconnected anchors do not
connect those anchors. Selecting an ungrounded anchor as the numerical reference
also does not make it electrically part of a named ground net. Providers resolve
options/markers and diagnose conflicting references according to
[ENGINE_CONTRACTS.md](ENGINE_CONTRACTS.md#solver-reference-selection-d03).

A future UI action that creates an electrical ground connection must visibly mean
an electrical edit and create explicit edges/labels. Selecting a solver reference
creates/updates only its analysis option or reference marker. If an action offers
both, make both effects explicit in one transaction; never hide the electrical
join behind a reference-marker placement.

## Geometry and connectivity editing

Geometry uses schematic grid units with x right/y down. It has no physical PCB
unit. Symbol pin coordinates transform through placement; anchor positions and
route endpoints for attached pins must match that transform. Missing geometry is
allowed for nonvisual imports and must be reported by the editor, not treated as
an electrical open. Routes and placements never determine graph connectivity.

- Connect-to-pin creates a connection to that pin's anchor, not a nearby coordinate.
- Inserting a junction on a wire creates an anchor and splits the connection in one
  command. A wire crossing stays separate unless a junction command creates edges.
- Moving a component preserves anchors/connections and updates attached geometry.
- Deleting a wire removes only its connection; deleting a component removes its
  pins and explicitly handles attached edges/labels/ports. No dangling references
  may be committed. Unused free anchors may be retained for V1 round-trip fidelity.
- Undo/redo restore identities and content with a fresh revision token. Loading
  does not reconstruct connectivity from symbol positions.

## Validation ownership

File boundary: validate shape/version, finite numeric data, unique IDs, references,
definitions, units, asset manifest, and supported extension namespaces. Domain
commands enforce graph/instance invariants. Connectivity resolution validates
connection scope and derives all anchors, including isolated ones. Engine capability
checks handle model support, limits, options, references, and analysis assumptions.
ERC handles engineering advisories (unconnected pins, reference conflicts, label
aliases); do not mistake an advisory for a numerical result.

Do not reject every unknown component at file load if its embedded definition is
structurally understood. Preserve it and explain engine limitations. Unknown file
versions or unknown structural semantics require read-only retention or rejection,
as specified in [PROJECT_FORMAT.md](PROJECT_FORMAT.md).

## Concrete design examples and acceptance

- An op-amp can have five or more pins with distinct IDs, symbol positions, model
  port names, and optional later footprint pads. It need not be simulated in V2.0.
- Two isolated anchors at identical positions remain separate nets.
- Equal sheet-local `OUT` labels on different sheets remain separate; equal
  project-scoped `BUS_OUT` labels explicitly join them.
- Splitting a connected net may change a derived key; probes bound to surviving
  anchors remain resolvable and see the revised connectivity.
- Renaming a reference designator does not invalidate pin-to-pad identity.
- A resistor with `resistance = 0 ohm` is not a valid V1 resistor. A short is an
  explicit conductive connection; physical open/short states are tagged outcomes.

V2.0-B acceptance must instantiate a resistor, an opaque multi-pin definition,
isolated pins, label scope cases, geometry-independent connectivity, and valid
round-trip serialization. This document is the design output, not those tests.
