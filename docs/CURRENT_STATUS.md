# Current Development Status

Last development handoff: **2026-10-21**. V2.0-D is internally implemented and
verified; the public application was not changed or reverified live this round.

Active task: **V2.0.0 production release**, authorized 2026-10-21, **In Progress,
5/9**. Remote baseline `8fd6e9b` confirmed, accepted V2 history integrated locally
without conflicts. Release branch `codex/release-v2.0.0`; package/lock target
`2.0.0`, file schema unchanged at 1. Final typecheck/lint/build and 438 tests passed;
seven local production-preview browser workflows passed. Production push/deployment/live acceptance
remain pending; [release record](v2/V2_0_0_RELEASE.md). V2.1 is not authorized here.

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

- Latest implementation: **V2.0-D — Editor, Equivalence and Lessons: Verified,
  D-C01–D-C10, 10/10 (100%)**, Implementation Complete, **not Released**.
- Integrated real eligible-sheet projection, protected ports/temporary observations,
  four-category discovery/highlighting, immutable previews and independent V1
  numerical evidence. Equivalent transformations write back as one history entry;
  undo/redo, actual project export/reopen and all five lesson stages use real data.
  Failed/inconclusive previews remain uncommittable; D05 is unchanged.
- APIs, mappings, tests and actual limits:
  [D implementation/acceptance](v2/TRANSFORMATION_INTEGRATION_IMPLEMENTATION.md).
  B/C model/file/editor compatibility remains; original eight V1 examples and
  symmetric-delta teaching input remain. V1 topology/solver/transforms/education
  source is unchanged. A **10/10**, owner review **4/4**, B **9/9**, C **10/10 Verified**.
- Final verification: typecheck/lint/build passed; **438 tests / 27 files passed**
  (404 accepted C baseline + 34 D cases). Chrome **155.0.8059.40** passed seven
  local built-preview workflow groups, including all four categories, real
  save/reopen, one atomic undo/redo, five-stage user-circuit lesson, both themes,
  1440px/390px layouts and V1 previews/navigation. Zero browser errors or resource
  failures; screenshots visually inspected. Re-export is byte-identical.
- Branch: `codex/v2-transform-integration`, clean baseline `296c191` preserved;
  verified implementation `0f3dd6a`, final handoff committed separately. No remote
  push, production merge, deployment, tag, dependency or version change.
- Limits: complete eligible resistor sheets only; mixed devices/cross-sheet nets
  unsupported. Basic replacement placement and existing single-selection routes;
  V1 comparison bounds remain display-only, with full records available. Component/
  pin-bound observations need explicit rebind before removal. No autosave,
  persisted undo or resumed preview/lesson session; numerical evidence remains
  boundary/tolerance-scoped. No physical-phone/cross-browser certification.
  Prior C dev-mode observations remain recorded; D used built preview only.
  Task-started browser/preview services were closed after verification.
- Next: separately authorize **V2.0.0 release engineering and public acceptance**.
  [Release-readiness assessment](v2/V2_0_0_RELEASE_READINESS.md) covers B/C/D status,
  schema-v1 compatibility, version/changelog tasks, Pages verification and
  history-preserving rollback. No core implementation blocker remains; actual
  versioning/publication/live checks are pending. No next module is active.

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
  hardware backends remain deferred until needed. B/C/D are complete; separate
  authorization for V2.0.0 publication has now been granted; the active release
  checklist above records actual execution, not an assumed deployment result.

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
