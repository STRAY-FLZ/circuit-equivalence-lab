# Current Development Status

Updated **2026-10-22**. Active authorized module: **Circuit Atlas / V2.2.0**,
**In Progress, 3/8**; branch `codex/v2.2-circuit-atlas`, baseline public
`1b61a74` / v2.1.0 confirmed from remote main/tag/published Release. Clean baseline.
Owner approved V2.2.0 release after acceptance and DC/filters/competition roadmap
shift to V2.3/2.4/2.5, with V3–V6 unchanged. No later-module work authorized.

A01/A02/A05 verified: existing editor integration design, twelve categories /
89 families, 26 real templates; focused catalog 30 and UI 5 cases passed, typecheck
passed. Navigation/animation/accessibility and guarded editor handoff implemented;
real browser/standard checks and release remain pending. No V2.2 push/deployment.
No new dependency, source algorithm, solver model or project schema. Blockers: none.
See [per-version implemented/planned checklist](VERSION_CHECKLIST.md),
[scoped progress](DEVELOPMENT_PROGRESS.md), [Atlas contracts/coverage](v2/CIRCUIT_ATLAS.md).

## Previous release checkpoint — historical V2.1.0

Final V2.1.0 **S01–S10 10/10 Released**, main/tag `1b61a74`, published Release
confirmed 2026-10-22. The following pre-tag documentation snapshot is historical;
its remaining finalization subsequently completed in the canonical Release.

Updated **2026-10-21**. **V2.1.0 application: Released** — implementation complete,
locally verified and actual public signal workflow accepted. Authorized module:
**Signal Measurement & Analysis**, preparation branch `codex/v2.1-signal-lab`,
safely fast-forwarded into `main`; actual baseline V2.0.2 `bd79d6a` is preserved.

This final documentation checkpoint is **S01–S10: 9/10**: S01–S09 Verified;
S10 final documentation deployment, tag/Release and handoff are being finalized.
The [canonical v2.1.0 release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.1.0)
records subsequent **10/10** completion, exact final production SHA and workflow
after that commit is deployed and publicly confirmed. This file does not predict
its own commit/run or claim an uncreated tag.

Final typecheck/lint/test/build passed: **504 tests / 31 files**, including 48 new
numerical/data/UI cases. Actual built and public Chrome workflows passed: 100Hz
sine/RMS/FFT, frequency changes, 65536-point full capture, explicit-unit two-channel
CSV, real exports/reopen, responsive charts and existing circuit navigation.
Raw CSV bytes, all asset hashes and restored IDs/results independently verified.
A real legacy 2.0.1 circuit project retained its graph/geometry/metadata after
open/generate/export. No hardware acquisition, schematic simulation, V2.2 or V2.3.
Final narrow-screen tick-spacing correction passed the same standard checks and
complete local replay, including actual label bounding-box separation in four
size/theme groups. Final JS `index-C5L40b3w.js`; its public replay/identity will
be recorded in the canonical release before tagging.

## Public release

- Application: <https://stray-flz.github.io/circuit-equivalence-lab/>.
- Application/package/lockfile/export writer: **2.1.0**; engineering file
  `formatVersion: 1` and project revision remain independent.
- First verified V2.1.0 production commit: `dfc5d784784bc85d7ad0cf86d5c46f6fcd210f60`.
  [Pages workflow 39614955343](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39614955343)
  completed successfully: build and deploy. Full real public acceptance followed.
- Final identity/tag/S10 handoff: [v2.1.0 release record](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.1.0).
- [Signal methods and limits](v2/SIGNAL_IMPLEMENTATION.md),
  [release evidence and rollback](v2/V2_1_0_RELEASE.md), [changelog](../CHANGELOG.md),
  [scoped progress](DEVELOPMENT_PROGRESS.md). M0–M8 and earlier internal module
  handoffs remain historical records in [DEV_LOG.md](DEV_LOG.md).
- Prior public V2.0.0: `c6e8a9f` / `v2.0.0`; [release evidence](v2/V2_0_0_RELEASE.md).
  This patch preserves its complete history and functionality.
- Prior public V2.0.1: `5b900ef` / `v2.0.1`; [wire release evidence](v2/V2_0_1_WIRE_INTERACTION.md).
- Prior public V2.0.2: `bd79d6a` / `v2.0.2`;
  [movement release evidence](v2/V2_0_2_COMPONENT_MOVEMENT.md).

## Verified behavior

- Five configurable sampled generators; real multi-channel oscilloscope with
  zoom/offset/sample cursor; full-capture min/max/pp/mean/total and AC RMS;
  conservative frequency availability; normalized radix-2 FFT with rectangular
  or periodic Hann windows and optional DC removal. Explicit-unit CSV mapping,
  portable project and measurement-report exports retain real sampled values.
- Public Chrome 155.0.8059.40: 100Hz / 1V peak sine at fs1024/N1024 produced
  RMS 0.7071068V and FFT 100Hz/1V. Both themes at 1440/390px, 65536 samples,
  actual CSV/project round trips, preserved metadata and editor/V1 navigation
  passed without console/resource failures. These are emulated viewports.
- Preserved V2.0.2 placement: one new component per palette activation; dragging
  an existing component moves the same stable instance and never duplicates it.
- Select/wire mode: press and drag a real pin or existing anchor. The SVG shows
  an orthogonal dashed wire from the exact source to the continuously tracked
  pointer; a 14px screen-space target snaps exactly and shows an explicit ring.
  Valid release invokes one existing connect transaction; net derivation,
  undo/redo and JSON persistence retain real stable endpoints. Invalid release,
  Escape, cancellation/capture loss and focus/tool changes leave no drag preview.
  Component-body movement and click/keyboard wire editing remain available.

- Engineering projects with stable UUIDs, pinned component definitions, explicit
  connectivity/derived nets, separate SVG geometry, immutable editing history,
  component properties, portable JSON export/reopen and integrity checks.
- Real user resistor circuits: series, parallel, Δ→Y, Y→Δ discovery, highlighting,
  non-mutating previews, independent numerical evidence and atomic verified
  writeback, undo/redo, and five-stage lessons. Existing observed boundaries are
  protected. Original V1 algorithms and owner-approved D05 are unchanged.
- Prior V2.0.2 local typecheck/lint/build passed; **456 tests / 28 files passed**,
  including the preserved 315-test V1 baseline. Existing production workflow
  independently passed its required checks.
- Inherited V2.0.1 evidence (not repeated for this release): local built preview
  and public Chrome **155.0.8059.40** each passed four
  wire viewport/theme groups plus simulated pen input, explicitly checking three
  intermediate visible paths and snapping, zoom/pan, cancellation, movement,
  undo/redo and actual file reopen. This is browser simulation, not hardware.
  The same builds each passed seven editor/integration
  workflow groups. Public save/reopen/re-export is byte-identical; writer 2.0.1,
  formatVersion 1. Both themes at 1440/390px; screenshots inspected.
- Prior V2.0.0 release evidence: actual personal website → tools → V2.0.0 → return-home passed in four viewport/
  theme combinations, preserving shared theme. V1 examples/previews and a full
  five-stage Δ→Y lesson passed, including 19 visible native MathML expressions
  and three terminal-pair comparisons. No critical console/resource failures;
  all production resources loaded under `/circuit-equivalence-lab/`. This patch
  did not repeat that historical website/MathML acceptance or edit its repository.

## Limits and next module

Transformations require complete eligible resistor-only single sheets. Mixed
devices/cross-sheet conductive nets are unsupported; inconclusive/failed evidence
cannot commit. The editor has single selection, basic wiring and replacement
placement. V1 preview bounds are display limits; full records remain available.
No autosave/cloud, persisted undo, resumed preview/lesson session, arbitrary bend
editing, PCB/EDA or general DC/AC/RLC simulation. Numerical evidence remains
boundary/tolerance-scoped. Narrow-screen checks are emulated Chrome viewports,
not physical-phone or cross-browser certification.

Signal scope: uniform captures, 2–65536 samples, at most four channels. FFT requires
a power-of-two capture; no implicit crop/padding/resampling. CSV requires explicit
units and uniform increasing time; full project JSON preserves provenance, CSV
does not. No spectral power/PSD, calibrated acquisition, filters or arbitrary
schematic waveforms. Existing inline file/asset limits apply; failures are explicit.

Blockers: none. Stop after V2.1.0. Recommended next planning module is V2.2,
requiring separate scope and authorization. No personal-website repository edit
or dependency upgrade occurred.

## Architecture decisions and maintenance

Owner-approved D01–D09 remain in [DECISIONS.md](v2/DECISIONS.md): graph authority,
snapshot net IDs, distinct electrical labels/ground/solver reference, independent
typed engines, original D05 numerical policy, UTF-8 JSON with logically separate
datasets, SVG editing/history, stable pin-to-pad mappings, and release procedures.
External datasets, EDA formats and simulation/hardware backends remain deferred.

Maintain dated actual status here, keep detailed evidence in the release record
and development log, and distinguish internal verification from public release.
Past release authorization does not authorize a new push or deployment.
