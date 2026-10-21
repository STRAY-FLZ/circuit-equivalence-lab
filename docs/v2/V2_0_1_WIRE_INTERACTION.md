# V2.0.1 — Node drag-to-connect

Authorized 2026-10-21. Baseline `c6e8a9f` / `v2.0.0`; branch
`codex/v2.0.1-wire-drag`. **Implementation Complete / Verified / Released**:
production deployment and public visible-wire acceptance passed on 2026-10-21.

## Interaction contract

In select or wire mode, primary-pointer down on a real pin/anchor selects that
anchor and begins the existing SVG gesture with pointer capture. No preliminary
selection is required. Component-body dragging remains a separate gesture.
Motion beyond 3 screen pixels distinguishes a drag from existing click wiring.
Keyboard activation and existing two-click/free-space wiring remain available.

The temporary SVG path uses existing `wireRoute` orthogonal geometry: exact fixed
source → current pointer (converted through inverse screen CTM). It renders on
every pointer move, uses semantic theme colors, dashed non-scaling ink and ignores
hit testing. It does not change the project, revision or history.

Nearest anchors are detected within 14 screen pixels converted by the current
CTM scale. Source and existing direct-edge destinations are invalid; valid
destinations snap to their exact anchor coordinates and show a ring plus textual
release guidance. Release recomputes the target, preventing a stale preview
endpoint from being committed. Each gesture accepts only its captured pointer ID.

A valid release invokes existing `connect` once with stable anchor IDs. The
authoritative graph, derived nets, routing, history, file serialization and
transformation inputs follow existing contracts. No SVG overlap or wire crossing
creates connectivity. Labels, ground and solver reference semantics are unchanged.

Invalid release/self/duplicate creates no edit. Escape, pointercancel, lost
capture, SVG/window blur, tool/sheet changes, project replacement and undo/redo
discard temporary drag state; post-drag clicks are consumed at SVG capture phase.
No additional routing engine, project schema, dependency, electrical algorithm
or D05 verification policy was introduced.

## Verification checkpoint

- 16 focused `WireInteraction.test.tsx` cases passed; the existing 10 editor UI
  cases also passed. Coverage includes pin/anchor starts, exact intermediate SVG
  path, snapping, one commit, net derivation, cancellation, pointer identity,
  duplicate rejection, undo/redo, zoom/pan, component movement, unconnected
  crossings and actual JSON save/reopen with stable endpoints.
- Real Chrome 155.0.8059.40: `tests/browser/wire-drag.js` passed four combinations
  (1440/390px × light/dark). Each asserts three visible intermediate wire
  positions, rendered ink/dashes, exact snapped endpoint, real graph/history,
  export/reopen, movement, zoom/pan and cancellation. Screenshots inspected.
- Chromium CDP simulated pen press/move/visible-preview/release passed. This is
  browser pointer simulation, not physical pen/phone certification.
- Final standard checks: typecheck, lint, test and build passed. **454 tests /
  28 files**, including 16 new interaction cases and the accepted 438-test baseline.
  Initial typecheck identified a test-only unsupported `exact` query option;
  corrected before the successful final run. No numerical source changed.
- Built production preview repeated all four viewport/theme wire workflows and
  simulated pen successfully, with version 2.0.1, no console/resource errors.
  Existing seven editor/transformation workflow groups also passed: all four
  transformations, observation protection, five-stage lesson, JSON round trip,
  unsupported/inconclusive behavior, original V1 examples and previews.
  JS `index-D44J7e4j.js`, CSS `index-DzAR7cWn.css`; preserved production base.
- Dev-only existing doubled `theme-init.js` base-path 404 was observed on initial
  navigation (previous editor handoffs also distinguish dev observations).
  Interaction listeners reported no errors. Production initialization and asset
  paths must be independently verified on the built preview and public site;
  no unrelated dev-server repair is included.

## Compatibility and release

Application/package/lock/export writer **2.0.1**; engineering file schema
remains **1**. Only version metadata changed in dependency records. Existing
project content remains compatible; no migration is required. Undo history and
temporary gestures remain session-only. Existing resistor-only transformation
scope and editor selection/routing limitations remain unchanged.

## Actual production evidence and resumed finalization

- Implementation/first public patch: **`ede35236aab0e80fbfd65fab150f12c0eb946c26`**.
  Fast-forwarded into main and pushed without rewriting history.
  [Workflow 39553250543](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39553250543)
  finished **success**, build and deploy both passed.
- Actual public `wire-drag.js`: version 2.0.1, four 1440/390px × light/dark groups,
  three visible intermediate pointer paths per group, target snapping/highlight,
  real graph/net inspection, undo/redo, exported-file reopen, movement, zoom/pan,
  Escape and invalid release passed. CDP simulated pen also passed. `errors: []`,
  `failed: []`; public preview screenshots inspected visually.
- Actual public existing editor integration replay passed its seven groups,
  including all four transformations, current-circuit five-stage course, observed
  boundaries, stable files and original V1 examples. Public exported wire file
  confirms writer 2.0.1, formatVersion 1, two components and one real connection
  using the existing stable anchor IDs. No project-schema migration.
- Evidence: ignored `output/playwright/wire-built-verification.txt`,
  `wire-live-verification.txt`, `patch-local-integration-verification.txt`,
  `patch-live-integration-verification.txt`, `wire-local-*` / `wire-live-*` files
  and screenshots. No generated output or dependency cache was committed.
- Resume instruction arrived after these checks. Recovered clean main/remote
  at `ede3523`, successful workflow and actual browser results; confirmed no
  `v2.0.1` tag/release existed. Reused unchanged-code checks and completed only
  missing final documentation/deployment confirmation/tag/release. No repeated
  full suite, implementation or historical seven-group browser run after resume.

This documentation checkpoint precedes its own production deployment/tag.
After that workflow succeeds, freshly verify version 2.0.1, unchanged JS/CSS,
an intermediate visible drag path, snapping/commit and return-home. Only then
tag the final verified production commit. Exact final SHA, workflow URL and
P01–P06 **6/6** completion are retained in the
[canonical v2.0.1 GitHub Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.0.1).
This avoids guessing this document's own commit/run. Stop before V2.1.

Rollback: preserve exported files, review and revert the complete patch range
`v2.0.0..v2.0.1` in reverse order with a new revert commit; run appropriate checks,
deploy and verify the restored app. Reverting only final documentation would not
remove the interaction change. Never force-push or move a published tag.
