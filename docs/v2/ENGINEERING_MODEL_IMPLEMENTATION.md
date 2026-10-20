# V2.0-B Engineering Project Model — Implementation and Acceptance

Date: 2026-10-20. Status: **Verified (internal foundation), not Released**.
Implements the reviewed V2.0-A contracts; it does not implement V2.0-C/D or expose
a new UI. The existing public app/package remains unchanged at `0.1.0`.

## Implemented modules and public APIs

| Module | Public entry | Implemented behavior |
| --- | --- | --- |
| Engineering domain | [src/engineering/index.ts](../../src/engineering/index.ts) | Project/definition/instance/pin/anchor/label/reference/geometry DTOs; analysis, measurement, asset and board mapping records; immutable creation and revision |
| Connectivity | `deriveElectricalNets(project)` | Explicit edges and scoped labels produce deterministic frozen net snapshots; every isolated anchor/pin remains represented |
| Portable files | [src/project-format/index.ts](../../src/project-format/index.ts) | Version-1 UTF-8 JSON, full schema/reference validation, canonical serialization, small inline assets, checksums and sample integrity |
| Read-only V1 adapter | [src/compatibility/index.ts](../../src/compatibility/index.ts) | Import existing CircuitNetwork, project an eligible complete sheet to V1, identity maps and protected observable boundaries |
| Engine-facing types | [src/analysis/index.ts](../../src/analysis/index.ts) | Typed provider descriptor, capability, async host/input/outcome/provenance contracts; no actual provider/runtime registry |

### Engineering API

- `createId()` generates UUIDs through standard `crypto.randomUUID()`.
- `createEmptyProject(title?)` constructs a valid empty aggregate with a fresh revision.
- `createEngineeringProject(input: unknown)` validates, copies, and deeply freezes
  a snapshot. It neither modifies nor freezes caller-owned objects.
- `validateEngineeringProject(input)` returns an empty list or the first actionable
  `{ path, code, message }` issue. `ProjectValidationError.issues` exposes the same
  structured diagnostics when a constructor/operation rejects input.
- `createResistorDefinition()` creates a pinned embedded positive-resistor definition
  and passive model binding. `RESISTOR_RESOURCE` and `RESISTOR_MODEL` identify version 1.
- `instantiateComponent(definition, reference, parameters)` allocates unique instance
  pins and dedicated anchors; it does not connect them. Owning-project validation
  resolves optional symbol/assets; constructor-local checks do not require a renderer.
- `reviseProject(project, expectedRevision, changes)` validates a replacement of
  selected aggregate sections, preserves the project ID, and allocates a fresh
  revision. Stale or invalid edits produce no partial result. It is not a command
  registry, undo stack, history UI, or V1 transformation writeback.
- `deriveElectricalNets(project)` returns source revision, sorted net membership,
  stable pin/label identities and anchor lookup. Net keys are snapshot identities.
- Shared types, `CANONICAL_UNITS`, and JSON snapshot helpers are exported for the
  format/adapter boundaries; no React, SVG, storage, or solver dependency enters domain.

### Initial domain rules

Global entity IDs are UUID strings; definition pin keys and resource ID/version
pairs have separate namespaces. Referenced entities must exist and have the right
owner/type. All definition pins have one distinct instance pin/anchor, even where
explicit edges make pins electrically common. Unknown but structurally complete
multi-pin definitions remain representable. The resistor rule requires finite
positive `resistance` in `ohm`; it does not pretend to simulate unknown devices.

Pin definitions, parameter kinds/units, resource snapshots, symbols/geometry,
analysis scopes, result/experiment links, measurement provenance, assets, and
pin-to-pad references are structurally validated. Board records are mapping DTOs,
not PCB/DRC behavior. Pin maps must account for all pins; shared pads across distinct
pins require a future explicit supported package rule rather than an implicit short.

Unknown structural fields are rejected; optional metadata belongs in namespaced
`extensions`. Only finite JSON data is accepted; cycles, sparse arrays, executable
values, and nesting beyond 128 levels are rejected. Dictionary keys cannot alter
object prototypes. JSON optional keys must be absent rather than present as undefined.

Electrical wires/junctions are explicit edges/anchors. Crossings and coordinate
overlap do not connect them. Matching sheet-local labels join only on that sheet;
matching project labels join across flat sheets; local/project names are separate
and case-sensitive. Explicit GND label/edge connections conduct; solver reference
markers never merge nets. Symbol/route geometry is validated where supplied, but
missing geometry does not imply an electrical open. No general editor layout limits
are inherited from V1's preview renderer.

### File API and storage boundary

`createProjectDocument(project, writer, inlineAssets?)` validates a portable
ProjectDocumentV1. The caller supplies the real writer name/version; the file module
does not invent a release version. `serializeProject(document, limits?)` returns
JSON text. `deserializeProject(textOrUtf8Bytes, limits?)` returns `ready`, `invalid`,
or `unrecognized` with the original text for another format/newer schema/unknown
required extension. Both creation and reading are async because asset verification
uses standard Web Crypto SHA-256. No hashing/package dependency is installed.

`createInlineAsset(bytes, mediaType, id?)` produces a manifest entry and a base64
payload; `decodeInlineAsset(asset)` returns a new byte array. NumericSeriesRef
connects dataset metadata to float64-le payloads; sample arrays do not enter the
editable circuit graph. Byte count/hash, media type syntax, finite samples, channel
lengths, axis units/order, and representable uniform sample times are checked.
Derived-data provenance is acyclic and validated iteratively, including long chains.

All manifest assets must have one complete inline payload and vice versa for the
initial portable format. There is no automatic network fetch or incomplete export.
Default budgets: 32 MiB UTF-8 JSON, 8 MiB per decoded asset, 16 MiB decoded total,
overridable through explicit FormatLimits. These are initial resource guardrails,
not an electrical limit or a large-capture performance claim. Tested payloads are
small representative captures; external containers, ZIP, autosave/IndexedDB,
localStorage waveform storage, and cloud persistence remain unimplemented.

Identity-bearing collections serialize in ID order; ordered pins/endpoints/routes,
samples, and opaque metadata arrays retain order. Full precision numbers and
optional metadata survive. The only implemented format is version 1: version 0
is explicitly unsupported, newer versions retain the source, and no historical
migration is invented. MigrationStep is a future interface with no registered
conversion step. Unknown optional extensions are retained; no required extension
semantics is currently implemented.

### V1 compatibility API and preservation

`importV1Network(network, layout?)` copies a validated typed V1 network into a new
project. Original point/element/terminal IDs and full source records remain in
`org.stray.v1` metadata. Original namespace collisions, repeated labels, self-loops,
shorted branches, isolated points and residual wires survive. Each resistor gets
dedicated pin anchors and explicit connector edges to the original point anchors.
Optional layout is structural data compatible with V1 CircuitLayout; the adapter
does not import the React/SVG visualization layer.

`projectToV1(project, sheetId, protectedAnchorIds?)` returns ready projection,
unsupported reasons, or invalid scope/reference diagnostics. It processes one
complete sheet, rejects conductive nets escaping that sheet, and never drops an
unsupported component. Eligible models are pinned built-in passive resistors;
RLC/multi-pin structures are stored but not reduced to resistor-only approximations.

The projection uses the current authoritative graph/parameters, not a stale cached
legacy circuit. Safe original aliases preserve terminal/component identity through
maps; new aliases are deterministic and separate from V1 `m3:` generated IDs.
Labels become projection-only synthetic wires; reference markers do not join nets.
User ports, reference markers, explicit protected anchors, measurement probes,
recognized analysis observations, and board pin mappings retain protected boundaries.
Non-port observations gain tracked synthetic terminals under the unchanged approved
compatibility design. These are never written back as user ports.

Currently recognized circuit analysis observation contracts are `topology` and
`resistance-equivalent`, with keys `referenceAnchorId`, `probeAnchorIds`,
`probePinIds`, and `terminalIds`. Unknown analysis/option semantics return unsupported
instead of guessing hidden boundaries. Typed option contents are validated by the
provider/adapter that understands them, not inferred from arbitrary JSON strings.
Read-only projection does not invoke discovery, solve, verification, commit, or
writeback. Zero/fewer-than-two user ports are not fabricated into successful
equivalence evidence. D05 and all V1 numerical/transform algorithms remain unchanged.

The V2.0-A example interface included future writeback. B deliberately exports only
the two implemented free functions, without a fake writeback stub. This follows the
more specific phase boundary: transactional transformation commit belongs to D.
There is no architectural conflict requiring another owner decision.

## Actual verification

| Command/check | Result |
| --- | --- |
| Initial domain/connectivity focus | 22 tests passed in two files |
| File format and V1 compatibility focus | 16 format and 18 compatibility tests passed |
| `npm run typecheck` | Passed; rerun after final validation/test changes |
| `npm run lint` | Passed with zero warnings; rerun after final changes |
| `npm run test` | 373 tests in 23 files passed, including all 315 unchanged V1 tests and the then-current 58 V2 tests |
| `npm run build` | Passed, 47 modules; existing theme-init classic-script bundling notice remains informational |
| Final affected V2 focus | 60 tests in four files passed, covering the last two boundary cases and final validation changes; no second historical full-suite run |
| Final selected-scope adapter check | 18 compatibility cases passed again after explicitly rejecting an analysis reference anchor outside the selected sheet |
| Final documentation/scope check | Four handoff documents and 37 local links passed; tracked/untracked whitespace, 9/9 status, unchanged V1/UI/dependencies/deployment and original D05 specification confirmed |

The final suite inventory is 315 existing plus 60 new cases; the table states the
actual runs rather than claiming a single 375-test full run. Tests cover five-pin
instances, RLC-ready records, label/ground/reference semantics, intersections,
source ID stability, geometry, metadata/reference errors, portability/corruption,
derived source graphs, and V1 import/projection against all eight existing examples.
Original V1 public solvers/verifier provide numerical cross-checks; no replacement
algorithm or extra proof gate was added.

Vitest's first sandbox run failed to rename a temp cache before tests executed.
Authorized outside-sandbox runs passed. Type/lint failures in new tests and the
array-order assumption in a round-trip assertion were fixed before acceptance.
No new dependency, live browser run, production push, or deployment was needed.

## Files, state, and next module

New source is confined to `src/engineering/`, `src/project-format/`,
`src/compatibility/`, `src/analysis/`, plus `tests/v2-fixtures.ts`.
`eslint.config.js` adds these layers without weakening V1 import restrictions.
No V1 algorithm, App/lesson/view/theme source, package/lockfile, or deployment
configuration changes. Existing V2.0-A specifications and uncommitted context work
are preserved; this record supplies the implemented-versus-designed distinction.

Branch: `codex/v2-project-model`, baseline HEAD `8fd6e9b`; no new commit/tag, push,
public release, or history rewrite. Latest public release evidence stays M8
`a7096c7` verified 2026-10-11; this module did not reverify or alter the live app.

**Implementation Complete:** B01–B09 outputs produced.
**Verified:** focused and standard checks recorded above.
**Released:** no; this is an internal foundation and the package remains `0.1.0`.

Ready for a separately authorized V2.0-C editor task using these APIs. Editor
interactions/navigation/history UI, general DC/AC/transient/digital engines,
signals/FFT, external formats/hardware, PCB behavior, and V1 transformation writeback
remain deferred. Do not start C/D or a public V2.0 release automatically.
