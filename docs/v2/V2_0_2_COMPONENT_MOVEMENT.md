# V2.0.2 — Move existing components; place once per palette action

Authorized public patch, **2026-10-21**. **Implementation Complete / Verified /
Released**: deployment and actual public movement acceptance passed.
Baseline `5b900ef` / `v2.0.1`; preparation branch
`codex/fix-component-drag-placement`. Public URL and existing Pages workflow stay
unchanged. No V2.1 work or personal-website repository changes.

## Behavior and scope

Each palette activation arms one component insertion, then returns to selection.
Dragging an existing component body moves its original stable instance, even if
placement is armed; it cancels that pending placement. Dragging never duplicates
a component. Another insertion requires another explicit palette activation.
Movement remains one undoable operation; existing pin wire dragging and graph
semantics remain unchanged. No V1/D05/schema/dependency/visual-system redesign.

## Existing evidence and release verification

- Prior local typecheck/lint/build and **456 tests / 28 files passed**, including
  two new regression cases for one-shot inductor placement, stable identity/count,
  movement/undo/redo and moving an existing component during armed placement.
  Reuse this evidence for unchanged implementation; do not repeat full acceptance.
- Chrome 155.0.8059.40 passed 1440/390px × light/dark cases with **650ms held
  drags**, unchanged component count/UUID, movement undo/redo and explicit next
  palette placement. Existing log: ignored
  `output/playwright/component-movement-verification.txt`.
- Release version/package/lock/export writer: **2.0.2**, project schema **1**.
  Lockfile dependency records identical. Versioned `npm run build` (including
  typecheck) and changed browser replay lint passed. Built 2.0.2 preview passed
  all four movement viewport/theme cases with no console/resource failures.
  JS `index-DqDqp3u0.js`, CSS `index-DzAR7cWn.css`. Evidence:
  `output/playwright/component-movement-2.0.2-local.txt` and
  `component-move-local-*`.
- First production commit **`1c51e63ebc63717c4a3ed5b1b32bae03642ad34c`**,
  fast-forward main push. [Workflow 39603301979](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39603301979)
  completed **success**, build/deploy and required checks passed.
- Actual public version 2.0.2 passed all four movement/placement cases: 650ms
  held drag, stable original UUID/count, armed-placement cancellation, undo/redo,
  another palette click for one new component, subsequent empty click adds none.
  Chrome 155.0.8059.40, 1440/390px × light/dark, `errors: []`, `failed: []`.
  Evidence: `output/playwright/component-movement-2.0.2-live.txt` and
  `component-move-live-*` screenshots. No full historical browser replay repeated.
- Resume confirmed clean main/remote, existing v2.0.1 publication and absent
  v2.0.2 tag/release. Reused passing tests/public logs; did not rebuild the fix or
  repeat completed suites. Final documentation/tag publication alone remained.

## Final release identity

This documentation checkpoint is 3/4 before its own deployment/tag. Wait for that
workflow, then verify live version 2.0.2, the unchanged JS/CSS, an actual held
component move, explicit next palette placement, existing pin wire preview/graph
and return-home. Tag only the final verified production commit.

The [canonical v2.0.2 GitHub Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.0.2)
retains final **U01–U04: 4/4**, exact final SHA, workflow/result and tag publication,
avoiding a guessed self-referential SHA in this file. No published tag is moved.

## Compatibility and rollback

Old project files remain compatible; stable component/pin IDs, connection graph
and formatVersion 1 are unchanged. This intentionally removes repeated insertion
from one palette activation; activate the palette for each new component.
Existing single-selection/basic routing and resistor-only transformation scope
remain. Chrome narrow-view/held-pointer tests are simulation, not physical device
or cross-browser certification.

Rollback preserves history: back up exported projects, review and revert the
complete `v2.0.1..v2.0.2` range with a new commit, run appropriate checks, deploy
and verify restored behavior. Reverting only final docs does not remove the fix.
Never force-push or move an existing published tag. Code rollback does not revert
users' project files. Final exact SHA/workflow will be recorded in the canonical
GitHub Release without predicting this document's own commit.
