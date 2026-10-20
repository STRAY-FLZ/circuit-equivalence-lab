# Current Development Status

Last development handoff: **2026-10-20**. V2.0-B is an internally verified
foundation; historical public release evidence was not reverified live this round.

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

- Latest implementation: **V2.0-B — Engineering Project Model: Verified,
  9/9 deliverables (100%)**, Implementation Complete, **not Released**.
- Implemented independent engineering DTOs, pinned multi-pin definitions/instances,
  explicit graph/labels/ground/reference semantics, immutable validated revisions,
  derived net snapshots, version-1 portable JSON/small assets, read-only V1
  import/projection, and minimal async engine-facing types.
- Public APIs and actual limitations: [implementation/acceptance](v2/ENGINEERING_MODEL_IMPLEMENTATION.md).
  History: V2.0-A **10/10 Verified**, owner review **4/4 Verified**; approved contracts
  remain in [design index](v2/ARCHITECTURE.md) and [decision register](v2/DECISIONS.md).
- Verification: typecheck/lint passed; standard full test run **373/373** (including
  all 315 unchanged V1 cases), production build passed with 47 modules. Following
  two final boundary cases, **60/60 new V2 focused tests** passed and typecheck/lint
  passed again. Current inventory is 315 existing + 60 new, not a claimed single
  375-case full run. See [DEVELOPMENT_PROGRESS.md](DEVELOPMENT_PROGRESS.md).
- Branch: `codex/v2-project-model`, HEAD/baseline `8fd6e9b`. Pre-existing uncommitted
  design/context and DEV_LOG changes are preserved; no new commit/tag/push/deploy.
- Active implementation module: **none**. No material blocker. Next recommended
  task: separately authorized **V2.0-C — General Schematic Editor**.
- Deferred: editor/navigation/history UI, new numerical/signal/digital engines,
  hardware/cloud/EDA/PCB behavior, external dataset packaging, and V1 transformation
  writeback (V2.0-D). No production UI, dependency, package version, or live app change.

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
  hardware backends remain deferred until needed. B is now complete; separate
  authorization for C/D or public release has not been granted.

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
