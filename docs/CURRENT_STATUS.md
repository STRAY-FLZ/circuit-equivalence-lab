# Current Development Status

Last development handoff: **2026-10-21**. V2.0-C is internally implemented and
verified; the public application was not changed or reverified live this round.

## Published baseline

- Product: 电路实验室 / Circuit Equivalence Lab, the V1 foundation of
  STRAY Electronics Lab / STRAY 电子工程综合实验室.
- Application: https://stray-flz.github.io/circuit-equivalence-lab/
- Repository: https://github.com/STRAY-FLZ/circuit-equivalence-lab
- Latest confirmed public release in repository records: **M8, verified 2026-10-11**,
  application commit [`a7096c7`](https://github.com/STRAY-FLZ/circuit-equivalence-lab/commit/a7096c7d4e66c21fdc96c9ecc1d1adbdec2607e8).
  See [release evidence](DEPLOYMENT.md#release-evidence) and the M8 entry in
  [DEV_LOG.md](DEV_LOG.md). Subsequent documentation commits are not a new feature release.
- Actual package version: **`0.1.0`**. “V1” names the completed milestone;
  this handoff does not establish a V1/V2 semantic release tag.
- Completed stages: **M0–M8**: foundation, topology, resistor solver, four
  transformations, SVG previews, guided lessons, integration checks, Stray design,
  and production/website integration. Details: [ROADMAP.md](ROADMAP.md).
- Last recorded regression: 315 passing tests in 19 files plus typecheck/lint/build;
  this is historical acceptance, not a new test run. Browser evidence covers
  Chrome/Chromium and emulated mobile widths, not full cross-browser certification.
- Older architecture/design sections retain stage-specific wording that M8 is
  pending. For the completed deployment state, use the dated M8 release evidence
  above; this context setup preserves those historical documents unchanged.

## Latest completed module and next task

- Latest implementation: **V2.0-C — Interactive Schematic Editor: Verified,
  C01–C10, 10/10 (100%)**, Implementation Complete, **not Released**.
- Implemented actual B-model SVG editing: R/C/L/V/I palette, ground, placement,
  move/rotate/delete, properties, explicit wires/junctions, scoped labels/ports,
  separate solver references, derived net inspection, immutable undo/redo,
  keyboard controls, zoom/pan and real UTF-8 JSON download/open.
- Actual APIs, supported/deferred behavior and evidence:
  [editor implementation/acceptance](v2/SCHEMATIC_EDITOR_IMPLEMENTATION.md).
  B contracts and files remain compatible; V1 algorithms and educational
  workflows are preserved. History: A **10/10**, owner review **4/4**, B **9/9 Verified**.
- Final verification: typecheck/lint/build passed; **404 tests in 25 files passed**
  (315 V1 + 60 B + 29 C). Local installed Chrome 155.0.8059.40 passed seven
  workflow groups on the production preview, including actual save/reopen,
  junctions, drag history, themes, all five V1 lesson stages and 390px layouts.
  Browser errors/HTTP failures: zero. Screenshots visually inspected.
- Branch: `codex/v2-schematic-editor`. Accepted A/B/context work was checkpointed
  locally as `b7b53bc` before C; C implementation and handoff commits are recorded
  in the C progress entry. No remote push, deployment, tag or version bump.
- Limits: basic single selection, automatic orthogonal routes; edit wires by
  deleting/reconnecting; no bend handles, autosave or persisted history. Imported
  metadata/assets are retained, but this editor cannot edit every engineering
  record. Narrow drawings use zoom/pan for detail; physical mobile/cross-browser
  certification is outside this check. Unchanged dev-mode pre-theme request 404
  and a CLI download-cache/dev-watcher EBUSY are recorded; built preview resources
  pass. Task-started browser/dev/preview processes were closed after verification.
- Next recommended module: separately authorize **V2.0-D** transactional V1
  projection/writeback under unchanged D05. No material design blocker identified.
  C is complete; no next phase is active. Public V2 requires usable verified B+C+D
  and release/compatibility/rollback procedures. New engines, cloud/EDA/PCB and
  external data packaging remain deferred.

## Architecture review outcomes and deferred questions

- Approved unchanged: **D01, D04, D05, D07, D08**.
- Approved with clarification: **D02** — editable graph authoritative; derived net
  identifiers are snapshots; probes refer to stable pins/anchors.
- Revised: **D03** — labels/electrical ground/solver reference explicitly distinct;
  **D06** — versioned UTF-8 JSON with logically separate sampled payloads, small
  inline datasets allowed; external dataset containers deferred.
- Conditionally approved: **D09** — package unchanged during documentation;
  target `2.0.0` only for usable verified B/C/D, with versioning/changelog/
  compatibility/rollback procedures established before release; no historical tags invented.
- **Material unresolved architecture questions blocking B: none at this scope.**
  Specific external-data containers, autosave backend, EDA formats, simulation and
  hardware backends remain deferred until needed. B/C are complete; separate
  authorization for D or public release has not been granted.

Exact owner outcomes and remaining release conditions are recorded as D01–D09 in
[v2/DECISIONS.md](v2/DECISIONS.md). No further original V2.0-A deliverable work remains. See
[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for confirmed owner requirements and
[LONG_TERM_ROADMAP.md](LONG_TERM_ROADMAP.md) for planned scope and sequencing.

## Handoff maintenance

After actual development-state changes, update phase/status, decisions, remaining
work, and dated verification here. Record a released version/commit only after
authorized deployment and actual live verification; retain detailed evidence in
DEV_LOG.md and relevant technical documents. Do not advance the phase merely
because a roadmap or proposal exists. Context setup authorizes no push/deployment.
