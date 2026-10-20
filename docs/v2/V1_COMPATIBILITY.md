# V1 Compatibility Adapters and Migration Boundaries

Status: V2.0-A design output (A05). All adapter names below are proposed.
No V1 algorithm, source type, example, or lesson is changed by this milestone.

## Adapter directions and scope

```ts
import type { CircuitNetwork } from '../../src/domain'
import type { CircuitLayout } from '../../src/visualization'
import type { TransformMetadata } from '../../src/transforms'
import type { EngineeringProject, Id, Revision } from './DOMAIN_MODEL'

export interface IdentityPair {
  readonly v1Id: string
  readonly projectId: Id
}
export interface V1IdentityMap {
  readonly points: readonly IdentityPair[]
  readonly elements: readonly IdentityPair[]
  readonly terminals: readonly IdentityPair[]
  readonly syntheticWireIds: readonly string[]
  readonly syntheticTerminalIds: readonly string[]
}
export interface Projection {
  readonly projectId: Id
  readonly revision: Revision
  readonly sheetId: Id
  readonly network: CircuitNetwork
  readonly identities: V1IdentityMap
  readonly protectedPointIds: readonly string[]
}
export type ProjectionResult =
  | { readonly kind: 'ready'; readonly projection: Projection }
  | { readonly kind: 'unsupported'; readonly reasons: readonly { readonly code: string; readonly entityIds: readonly Id[] }[] }
  | { readonly kind: 'invalid'; readonly message: string }
export interface TransformWriteback {
  readonly expectedRevision: Revision
  readonly projection: Projection
  readonly transformed: CircuitNetwork
  readonly metadata: TransformMetadata
}
export interface V1Adapter {
  importExample(network: CircuitNetwork, layout?: CircuitLayout): EngineeringProject
  project(project: EngineeringProject, sheetId: Id, protectedAnchorIds: readonly Id[]): ProjectionResult
  writeback(project: EngineeringProject, request: TransformWriteback): EngineeringProject
}
```

Import returns a new project, not a rewrite of the immutable source network.
The writeback example throws a structured application command error for a stale,
invalid, or unsupported request; production implementation may use an explicit
result union instead. In either case it commits no partial state.

## Importing existing examples

1. Assign project/sheet/entity UUIDs. V1 points become anchors, ideal wires become
   Connection records, and resistors become two-pin instances of the pinned
   built-in resistor definition with ordered pin keys `1`, `2`.
2. Each resistor's pin anchors must be distinct instance-owned anchors, even when
   V1 shares one point between several endpoints or uses a self-loop. Allocate
   dedicated pin anchors and add explicit connector edges to the imported V1
   point anchors. Mark these adapter connectors in provenance; do not merge pin IDs.
3. Preserve each original point, element, terminal, endpoint order, label, and
   resistance in a namespaced `org.stray.v1` extension. Store arrays of ID pairs,
   not unsafe object dictionaries keyed by arbitrary legacy IDs. Capture the
   source network ID and original records needed for lossless unedited export.
4. Map terminals to ExternalPort records and preserve duplicate display labels.
   Empty networks, isolated points, wire cycles, parallel wires/resistors, and
   shorted resistor loops retain their explicit identities and physical meaning.
5. Adapt point coordinates separately. Dedicated pin anchors/placements need a
   presentation decision; preserve the original layout for unchanged V1 previews.
   Geometry conversion cannot change electrical connections.

The legacy extension is optional source/provenance, never a second authority for
the edited circuit. Invalidate an exact-source export cache after relevant edits.
Unedited import/export may reproduce the original V1 records using that source
mapping; general edited projection promises equivalent connectivity/parameters
and ID traceability, not byte-identical arrays or layout.

## Projecting V2 to V1

The initial transformation scope is one complete sheet. Resolve project-wide
labels first. Reject any conductive net reaching anchors outside that sheet;
otherwise the projection would omit external connectivity. Do not silently extract
a resistor-only subgraph from a mixed circuit. Other sheets may remain in the
project only when electrically isolated from the selected scope.

The selected sheet must contain only recognized built-in two-pin resistor models
with finite positive `resistance` in `ohm`, explicit connections/anchors, labels,
reference markers, and external ports. Arbitrary models, sources, capacitors,
inductors, transistors, logic gates, buses, or unresolved definitions are unsupported.
Model port order must map to the two instance pin keys, not display position.

Create deterministic namespaced V1 point IDs for all scope anchors, resistor IDs
for components, wire IDs for connections, and terminal IDs for ports. Imported
legacy aliases may be reused when safe within each V1 namespace, but never collapse
two V2 entities. Newly generated aliases avoid V1 `m3:<integer>` allocation IDs.
The map is authoritative for interpreting this projection's output.

For labels, add synthetic ideal wires joining each label group via a deterministic
spanning tree (sorted anchor IDs); they are projection-only with separately
tracked IDs. These edges and imported connector edges participate in topology
and must survive transformations. V1 never sees symbol geometry or PCB data.

Map every externally observable boundary to a V1 external terminal or protected
point. Ports are always protected by V1; additional user probes/reference markers
and anchors used by persisted analyses, experiments, measurements, or board source
mappings must be preserved or cause explicit rejection if protection cannot be
represented. A scoped observation such as a monitored component/pin that would
be removed cannot be rescued merely by protecting a node: reject that operation
until an explicit rebind workflow is designed. Discovery and application receive
the same protected-point policy.

Protection alone does not add a point to `verifyTerminalEquivalence` comparisons.
For observable anchor probes/reference boundaries, create separately tracked
projection-only terminals and include them in all-pairs verification. Their identity
mapping targets the observed anchor. Never write these synthetic terminals back as
new user ports. This verifies the declared observation boundary as well as keeping
it from elimination; comparisons still remain numerical/tolerance-scoped evidence.

## Applying a transformation and writing it back

Use the existing sequence: project exact snapshot → discover/select → apply using
the same protection options → independently verify terminal equivalence → prepare
writeback. Revalidate the candidate on application; a candidate ID is not a revision
lock. Surface `not-applicable`, numerical failure, and inconclusive evidence.

Recommended editor policy: preview any successfully computed operation, but commit
only `equivalent` terminal evidence for the initial integration. Fewer than two
projected terminals, solver failures, or unknown preservation conditions cannot produce a verified
commit. Noncommittable previews keep source data intact. This conservative policy
is a review item D05, not a change to V1's optional verification API.

Writeback is one atomic command with `expectedRevision`:

1. Verify the source revision, projected scope, boundary mappings, and retained
   foreign entities. Validate that output belongs to the same requested operation.
2. Map unselected components/connections/ports back without changing IDs or values.
   Do not import synthetic label wires as new user connections. Keep authoritative
   label semantics, and preserve any original wire/connector edges retained by V1.
3. Remove selected resistor instances and their dedicated pins only after checking
   all project references. If V1 retains old endpoint points through wires, preserve
   corresponding anchors as free anchors; do not delete a retained internal group.
4. Allocate fresh V2 IDs for replacement components, pins, and newly created star
   anchors. Connect replacement pin anchors explicitly to mapped V1 endpoint anchors.
   Record V1 original/replacement IDs and metadata as provenance. V1 `m3:` IDs never
   become permanent V2 pin/instance identity.
5. Reconcile anchors removed by V1 only if no domain or persisted observation
   references them. Preserve unchanged anchor geometry; generate placement geometry
   separately for replacements. V1 layout limits do not invalidate electrical data.
6. Validate the candidate project, re-resolve connectivity, retain verification with
   its source/result snapshots, allocate a new revision, and commit one undo entry.

The education adapter uses the actual V1 source/candidate/applied result/evidence
to call `buildLesson`. Highlight IDs are translated through projection/replacement
maps. V1 bounded `buildDrawing` may show its own unsupported message; the editor
does not inherit that size bound or fabricate a replacement drawing.

## Migration is not legacy file invention

V1 examples and in-memory CircuitNetwork values can be imported explicitly.
The repository currently establishes no general saved-user-project file format.
Do not advertise support for an invented historical V1 JSON schema. A future
legacy-file importer needs an actual documented format and fixtures, then its own
format ID/detection. V2 file migrations are separate from these domain adapters.

## Acceptance cases for V2.0-B/D implementation

| Case | Required behavior |
| --- | --- |
| Existing examples, including wire bypass/crossings/residual groups | Import preserves complete electrical meaning, terminals, and trace mapping |
| Same V1 ID in point/element/terminal namespaces | New V2 IDs remain distinct; aliases resolve without collisions |
| Self-loop resistor or several endpoints on one V1 point | Dedicated pins/anchors preserve instance invariants and equivalent connectivity |
| Unsupported component, even disconnected inside selected sheet | Explicit unsupported report naming it; no silent removal |
| Project label joins another sheet | Reject initial single-sheet transform scope |
| Protected center, stale candidate, stale project revision | No illegal removal or stale writeback |
| Numerical failure or fewer than two terminals | Inconclusive/unavailable evidence, never success |
| Successful supported Δ/Y or series/parallel commit | Same protected boundary behavior, traceable replacements, atomic undo/redo |
| Saved board/probe mapping targets a removed pin | Reject until explicit rebind; do not leave dangling references |

V2.0-B implements import/projection foundations with fixtures; V2.0-D implements
transform/lesson/writeback integration. Do not begin either during V2.0-A.
