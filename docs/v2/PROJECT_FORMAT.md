# Versioned Project Files and Migration Rules

Status: V2.0-A design (A06), refined by the owner's D06 review on 2026-10-20.
The format below is not an
implemented parser or a published release. Core payload: [DOMAIN_MODEL.md](DOMAIN_MODEL.md).
Waveform payloads: [MEASUREMENT_DATA.md](MEASUREMENT_DATA.md).

## Container and version axes

Use versioned UTF-8 JSON `.straylab.json` for initial engineering projects.
Project structure includes editable entities, dataset descriptors/provenance, and
asset references; sampled measurement arrays/bytes form a logically separate data
payload. Small datasets may be included in the existing inline base64 asset table,
so a complete initial export can reopen without neighboring files or remote access.

This does not require all future captures to be embedded in project JSON. External
dataset containers, archives, and package formats are deferred until actual size,
acquisition, or performance requirements justify their design. Keep the existing
asset-ID boundary without implementing an external format, URI convention, or
package dependency now. Empty measurement collections and small inline fixtures
are sufficient for V2.0-B's foundation.

An initial portable export includes every referenced payload and its manifest
integrity metadata. If a dataset exceeds supported inline/resource limits, report
that limitation and leave the source project/data unchanged; do not silently omit
samples, emit unresolved external paths, or label a partial export as portable.
Future external-data support must define identity/versioning, completeness, portable
transfer, and integrity validation before it is advertised as supported.

```ts
import type { EngineeringProject, Id } from './DOMAIN_MODEL'

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
```

- `writer.version` is the real application semantic version at save time, not the
  file schema. Do not fabricate a V2 app release merely to write a design fixture.
- `formatVersion` is an integer container/project contract version. It advances
  when saved structural semantics change; application patch versions do not force
  project migrations.
- `project.revision` identifies a committed content snapshot; it is neither an app
  version nor a file schema. Pinned component/model/resource versions are separate.
- Namespaced `project.extensions` preserve optional metadata. A semantics-changing
  extension must be listed in `requiredExtensions` and understood before editing
  or analysis. Unknown optional metadata is preserved without interpretation;
  unknown required semantics cannot be silently ignored.

## Minimal complete example

This is a design fixture, not a claim that a writer is implemented today.

```json
{
  "format": "org.stray.electronics.project",
  "formatVersion": 1,
  "writer": { "name": "STRAY Electronics Lab", "version": "0.1.0" },
  "requiredExtensions": [],
  "project": {
    "id": "986ec40a-7e71-4de1-983a-1dd1090a1696",
    "revision": "cbe9c016-9898-4964-9ba3-f64c0376e7d2",
    "title": "Empty design fixture",
    "definitions": [],
    "symbols": [],
    "sheets": [],
    "analyses": [],
    "results": [],
    "measurements": [],
    "boards": [],
    "experiments": [],
    "competitions": [],
    "assets": [],
    "extensions": {}
  },
  "inlineAssets": []
}
```

The example UUIDs are illustrative data, not Git commit IDs or an existing user
project. Empty sheets/projects are valid; lack of external terminals is an analysis
applicability condition, not a file corruption diagnosis.

## Import pipeline and validation boundary

1. Read as UTF-8 with documented input-size limits; parse JSON without executing
   text or treating strings as code. Preserve the original file until success.
2. Identify the literal format and integer version before interpreting payload.
   Return `unrecognized` for another format/newer version; permit raw retention or
   read-only inspection, not editing/resaving through an older schema.
3. Check required extension support. Validate the exact source-version schema,
   finite values, entity-ID uniqueness, foreign references, component pin/parameter
   contracts, units, geometry shapes, label scope, analysis/result associations,
   measurement/board references, and asset tables.
4. Decode assets, verify base64, declared byte length, media type, SHA-256, and
   payload-specific lengths/units/finite samples. Each manifest asset has exactly
   one table entry and vice versa. References use asset IDs, never local absolute
   paths or automatic network fetching. Refuse missing/corrupt assets explicitly.
5. For a supported older format, apply every registered migration sequentially
   with target validation after each step. Never skip a missing migration.
6. Construct immutable domain data only after success. Commit/open atomically;
   failed import leaves the active project and original input unchanged.

Reject unknown core structural keys for a version instead of silently dropping
them; future optional data belongs in the explicit extensions envelope. Report
useful paths/codes, not hundreds of redundant derivative errors from one malformed
collection. Imported strings are plain data for display; no HTML/script execution.

Limits are resource protection, not electrical limits: the implementation must
document maximum file/decoded asset/sample sizes and demonstrate representative
files before choosing them. Do not add an arbitrary engine-size restriction to
the schema. A project may be valid but too large for a particular provider/editor.

## Migration policy

The first V2 schema is version **1**; there is no invented version 0 migration.
V1 CircuitNetwork import is an explicit adapter operation described in
[V1_COMPATIBILITY.md](V1_COMPATIBILITY.md), not automatic legacy JSON detection.

Future migration steps must be pure with respect to the input, deterministic for
the same saved document, and documented with before/after fixtures and compatibility
notes. Preserve entity identities/references wherever semantics survive. If a step
must allocate IDs, specify deterministic collision-checked derivation for that
migration; do not use random/time-dependent IDs during replay. Destructive or
ambiguous conversion returns a diagnostic and requires an explicit conversion
workflow instead of guessing. No downgrade exporter is promised initially.

Migration creates a new current revision while retaining source version and
conversion provenance; revision allocation must follow the step's deterministic
rule rather than introducing replay-dependent data. Keep the original downloadable
file and save a new one. Backend model/asset changes are not silently performed as
a side effect of opening a project.

## Serialization, assets, and local storage

Write only finite JSON values and referenced, verified asset bytes. The project
manifest describes identity/checksums; waveform payloads live outside the structural
DTO in the current inline asset table, or a later explicitly designed data storage
boundary. Result/board artifacts use the same asset identity boundary.
Waveforms use IEEE-754 float64 little-endian byte payloads initially; measurement
contracts state axes/lengths and validity. Base64 is an initial small-payload option,
with size overhead; it is not the mandated storage for large sampled datasets.

Save identity-bearing arrays in deterministic ID order and object keys in a defined
stable order, without changing meaningful sample/pin/endpoint ordering. Store
full-precision numbers; UI rounding/engineering prefixes cannot modify values.
Runtime caches, providers, listeners, selection, preview state, and unbounded undo
history are excluded. Optional cached results retain exact engine/input provenance;
load never assumes they are current merely because they exist.

File download/upload is the portability baseline. Recommend IndexedDB for later
local autosave of validated payloads/assets, with project-level atomic updates;
do not use localStorage for waveforms. Quota/persistence failures preserve the
working in-memory snapshot and offer explicit file export. Theme persistence stays
on `stray-theme`; project storage does not repurpose it. IndexedDB remains an earlier
recommendation, not a backend selected by the D06 review. Choose autosave details
when the editing/persistence workflow requires them; this does not block B's
portable JSON structure and small-fixture serialization.

## Required implementation checks

- Export/import a passive project: IDs, endpoint order, values, definitions, label
  scope, geometry, extensions, and verified asset bytes survive round-trip.
- Unknown newer version/required extension: retain original, no silent downgrade.
- Duplicate IDs, missing pin anchors, invalid quantity units, asset checksum or
  sample-count mismatch: specific invalid result; active project unchanged.
- Optional unknown extension: preserve bytes-as-data semantics across editing.
- Actual future migration fixtures: deterministic conversion and identity mapping;
  missing step is explicit unsupported migration, never a guessed success.
- Local quota or interrupted save: last complete record remains usable, export
  remains available. No storage implementation is added by this document.
