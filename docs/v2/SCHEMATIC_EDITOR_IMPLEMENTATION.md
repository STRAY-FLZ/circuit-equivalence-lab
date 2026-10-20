# V2.0-C Schematic Editor — Implementation and Acceptance

Status: **Implementation Complete / Verified, 10/10**, 2026-10-21.
Internal local milestone; **not Released**. Package remains `0.1.0`.
Owner scope: C01–C10 only. V2.0-D and public release require separate authorization.

## Boundaries and public APIs

| Layer / file | Responsibility |
| --- | --- |
| [editing/model.ts](../../src/editing/model.ts) | React-free `EditOperation`, `applyEdit`, `newEditorProject`, snapping and geometry operations |
| [editing/history.ts](../../src/editing/history.ts) | `EditorHistory`, `createHistory`, `commitEdit`, `undoEdit`, `redoEdit` |
| [editor/view.ts](../../src/editor/view.ts) | `buildEditorView`, temporary drag geometry, `nearestAnchor`, derived `netInspection` |
| [SchematicEditor.tsx](../../src/editor/SchematicEditor.tsx) | SVG workspace, selection/tools/viewport, pointer/keyboard interaction and actual file workflow |
| [Properties.tsx](../../src/editor/Properties.tsx) / [SymbolBody.tsx](../../src/editor/SymbolBody.tsx) | Definition-driven property controls and minimal electrical symbols |
| [editor.css](../../src/editor/editor.css) | Existing semantic tokens, desktop and narrow layout |
| [App.tsx](../../src/App.tsx) | Workspace entry; retain both mounted workflows after the first editor visit |
| [eslint.config.js](../../eslint.config.js) | Editing depends only on engineering; editor composes editing/engineering/project-format |

`EngineeringProject` is the authoritative immutable aggregate. The editor uses
B creation, validation, revision, net-derivation and file APIs without changing
their signatures or schema. No second electrical graph, React dependency in the
editing layer, runtime plugin framework, solver, or V1 algorithm change is added.

`applyEdit(project, sheetId, operation)` returns a validated new project or throws
without changing its input. Operations are `add`, `move`, `rotate`, `properties`,
`delete`, `connect`, `junction`, `marker`, `remove-marker`, and `title`.
Instance/pin/anchor IDs survive movement, rotation, property changes and file
round trips. Definitions and symbols are pinned project records. No schematic
node/element cap is inherited from the bounded V1 comparison renderer.

History stores immutable before/after snapshots. Every committed edit, undo and
redo receives a fresh revision. Undo restores deleted IDs; redo restores those
same IDs. A new edit clears redo. One pointer drag is one transaction; the drag
preview, selection, zoom, pan and tool changes create no engineering revision.
Pointer cancellation discards the preview. History is session-only.

## Supported editor behavior

- Empty project creation; select existing flat sheets when opening a multi-sheet
  project. Imported geometry-free components remain in an explicit unplaced list.
- R/C/L and independent voltage/current sources, with pinned definitions,
  two distinct pin anchors, unique generated reference labels and editable values.
  A definition-based generic symbol/property path supports imported components;
  a five-pin fixture verifies placement through the same operation.
- Placement on a 20-unit grid, selection, drag or arrow-key movement, 90-degree
  rotation and deletion. Geometry follows saved symbol pin positions; electrical
  endpoints do not change when a symbol is moved or rotated.
- Zoom, pan, reset and fit controls. Screen coordinates use the SVG inverse
  screen matrix; anchor snapping uses a 12 CSS-pixel neighborhood, independent of
  viewport width/zoom. Electrical geometry remains in project coordinates.
- Ref/value editing via actual parameter kinds (quantity, complex, boolean,
  text). Domain validation reports failure and keeps the original project.
  Duplicate/blank reference labels and invalid resistor values are rejected.
- Delete a selected wire, component, free anchor or marker. Component deletion
  removes owned pins/anchors and attached wires/geometry. Known measurement/PCB
  and analysis references are protected; unknown analysis options/types block
  destructive removal instead of dropping their metadata.
- Keyboard controls: V/W/J tools, R rotation, arrows movement, Delete/Backspace
  removal, Esc cancellation, Ctrl/Cmd Z / Shift Z / Y history, S export, O open.
  Text inputs retain their own normal keyboard behavior.

## Electrical semantics

Connections are explicit anchor-to-anchor edges. Ordinary overlapping symbols,
coincident distinct anchors and wire crossings remain electrically separate.
Wires snap to existing pins/anchors; clicking empty space creates free anchors.
Routes are straight or one-bend orthogonal paths, independent of the graph.

The junction tool explicitly joins **all wires passing through the chosen point**
in one transaction, splitting their edges and assigning a common anchor. Distinct
coincident endpoint anchors are joined by explicit edges, retaining pin identity.
Unconnected crossings show an underlay gap; connected junctions show a filled dot.
Selecting a pin/wire displays the derived net and its actual component pins.
Displayed `N1`, `N2`, etc. are current snapshot labels, never saved entity IDs.

Labels, ground, ports and reference markers stay distinct:

- Sheet labels merge exact matching names only in the current sheet.
- Project labels merge exact names across the flat project. Sheet and project
  scope are separate; no implicit hierarchy or case folding is introduced.
- Ground is an explicit **project-scoped `GND` electrical label**. Multiple GND
  labels join their anchors electrically; an intentionally equal project label
  has the same semantics.
- A solver-reference marker is an analog reference declaration, drawn as a dashed
  square. It creates **no electrical connectivity**, and no solver is run here.
- An external port records a boundary anchor/label; it does not merge nets by name.

V1 writeback is absent. D05 remains unchanged: future transactional V1 projection
and writeback preserve observed boundaries, initially commit only transformations
passing the existing independent numerical terminal-equivalence verification,
and allow unverified/inconclusive previews without verified commits. No extra
proof requirement or verification gate is introduced by this module.

## Persistence and compatibility

Export uses `createProjectDocument` and `serializeProject`, downloads UTF-8
`.straylab.json`, and records the actual package version as writer metadata.
Open reads bytes through `deserializeProject` and replaces state only after a
`ready` result. Invalid/newer/unsupported files leave the active project intact;
unexported changes require confirmation before replacement. Opening a valid
aggregate with zero sheets explicitly creates a first sheet as a new dirty revision.

All supported B metadata, extension arrays, definitions, symbols, other sheets,
analysis/result/measurement/PCB records and inline asset bytes remain in the
aggregate/file workflow, even when this UI cannot edit them. Asset hashes and
lengths are validated by B format APIs. Existing format resource budgets still
apply. Export/reopen resets selection/viewport/history, preserving project content.

The V1 educational workspace remains the default and retains its cached state
across workspace changes. Existing previews, independent solver/verification,
five-stage lessons, MathML, shared theme lifecycle, branding and return-home link
remain available. B APIs, JSON format and read-only compatibility adapters are
unchanged. Package/lockfile and deployment workflow are unchanged.

## Verification evidence

| Check | Final result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings |
| `npm run test` | **404 passed, 25 files**: 315 prior V1 + 60 B + 29 C |
| `npm run build` | Passed, 64 modules; classic pre-theme script stays separately served |
| [Editing tests](../../src/editing/model.test.ts) | 19 cases: palette, graph/geometry, crossing/junction, labels/ground/reference, invalid edits, IDs, history, metadata and B format |
| [UI tests](../../src/editor/SchematicEditor.test.tsx) | 10 cases: interaction, errors, shortcuts, actual Blob export/import, cancelled replacement, unplaced imports, metadata/assets and App integration |
| [Browser workflow](../../tests/browser/schematic-editor.js) | Local installed Chrome **155.0.8059.40**, seven workflow groups passed; zero page/console errors or HTTP failures |

The initial standard run passed 403 cases. A final UI asset-preservation case and
screen-scale/readability refinements were then checked in the final 404-case run
above; this is an actual full-suite result, not an inferred historical total.

Actual Chrome checks used the production preview at
`http://127.0.0.1:4173/circuit-equivalence-lab/`, not a public deployment:

1. Create two resistors, wire their pins and inspect the actual derived net.
2. Change resistance, drag with real pointer events, undo/redo once per drag,
   and rotate using the keyboard.
3. Add ground/reference separately, download a real file, start empty, reopen
   that download and check graph, IDs, values, geometry and markers.
4. Switch both themes with `stray-theme`, retain return-home destination, visit
   V1 original/transformed previews and all five lesson stages, return to editor.
5. Inspect desktop **1440×1100** and narrow **390×844** layouts in both themes;
   no page overflow; narrow properties, zoom and pan work without data revisions.
6. Cross two wires without connecting them; explicitly join, undo and redo.
7. Place all five palette kinds using actual pointer coordinates.

Screenshots were visually inspected. Local ignored artifacts are under
`output/playwright/`: `editor-browser-verification.txt`, desktop/mobile light/dark
screenshots, `editor-mobile-detail.png`, `editor-junction.png`,
`editor-palette.png`, `editor-circuit.straylab.json`, `editor-reopened.straylab.json`.
The final two downloaded files are byte-identical with SHA-256
`3c6be39bb4c6108acb9cb0f40c9542347aafff3b74f8f24054e65b6c09d80ff4`.
No browser-testing dependency or application dependency was installed.

## Actual limits and handoff

- Single selection; no multi-select, copy/paste, arbitrary symbol drawing,
  hierarchical-sheet editing, sheet creation/deletion UI, or manual bend handles.
  Delete/reconnect is the current wire-edit workflow. Moving/rotating components
  reroutes attached wires orthogonally and can replace imported manual bends.
- Existing optional parameter values can be edited; absent optional parameters
  are displayed but cannot yet be created in the property panel. Generic imported
  symbols are a basic representation, not a complete device-library renderer.
- No autosave/cloud persistence or persisted undo stack. Download is the durable
  save mechanism; the browser cannot confirm whether a user retains a download.
  Refresh/closing the tab does not restore unexported work.
- Fit gives an overview on narrow screens; zoom/pan exposes readable detail and
  the property inspector shows exact numbers. Verification used desktop Chrome
  and emulated widths, not physical touch-device or cross-browser certification.
- No new simulation or measurement UI, PCB/EDA integration, V1 transformation
  writeback, or new verification requirement. Existing historical result records
  remain historical after revisions; this editor does not rerun them.
- The unchanged development HTML pre-theme script produced a duplicate-base
  request/404 in Vite dev; the built production preview served the script and
  all resources correctly. This module's browser acceptance uses that preview.

Git baseline: accepted A/B/context work was separately checkpointed as local
`b7b53bc`; verified C implementation is `290de9b` on `codex/v2-schematic-editor`.
The final documentation handoff is committed separately. No history rewrite, remote push,
production integration, deployment, tag, release or personal-website edit.

**No material unresolved question blocks planning the separately authorized
V2.0-D module.** D should add transactional projection/writeback and preserve
ports, observations, IDs and history according to the existing D05 contract.
Begin it only after separate owner authorization. The eventual public V2 gate
remains usable and verified B+C+D plus release/compatibility/rollback procedures.
