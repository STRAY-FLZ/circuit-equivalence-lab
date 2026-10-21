# Current Development Status

Updated **2026-10-21**. **V2.0.1: Released** — node drag-to-connect and the accepted
V2.0.0 workflow are implemented, verified and publicly deployed. V2.1 remains
**Planned**, not started.

Active authorized release **V2.0.2**, 2026-10-21, **In Progress**. The component
movement / placement correction is **Verified, not yet Released**, branch
`codex/fix-component-drag-placement`. Each palette activation
places one component and returns to selection; dragging an existing body moves
its stable instance even if placement was armed. Another new component requires
another palette activation. Typecheck/lint/build and **456 tests / 28 files** passed;
Chrome 1440/390px × light/dark verified 650ms held drags, unchanged count/UUID,
undo/redo and explicit one-shot additions. Owner now authorizes public release;
package/lock/writer target **2.0.2**, schema stays 1. Preserve prior verification;
Versioned build/typecheck/replay lint and four built-preview cases passed;
main push, Pages/public acceptance and tag remain pending (U01–U04: 1/4).
Public release below is the previously verified V2.0.1 build.

## Public release

- Application: <https://stray-flz.github.io/circuit-equivalence-lab/>.
- Application/package/lockfile/export writer: **2.0.1**; engineering file
  `formatVersion: 1` and project revision remain independent.
- First verified patch production commit: `ede35236aab0e80fbfd65fab150f12c0eb946c26`.
  [Pages workflow 39553250543](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39553250543)
  completed successfully: build and deploy. Real public acceptance then passed.
- Final release identity and P01–P06 completion: [v2.0.1 release record](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.0.1).
  It records the exact final production SHA and workflow after this documentation
  commit is deployed and verified. The tag must point to that final verified
  production commit; this document does not predict its own SHA or a future run ID.
- [Patch evidence and rollback](v2/V2_0_1_WIRE_INTERACTION.md), [changelog](../CHANGELOG.md),
  [scoped progress](DEVELOPMENT_PROGRESS.md). M0–M8 and earlier internal module
  handoffs remain historical records in [DEV_LOG.md](DEV_LOG.md).
- Prior public V2.0.0: `c6e8a9f` / `v2.0.0`; [release evidence](v2/V2_0_0_RELEASE.md).
  This patch preserves its complete history and functionality.

## Verified behavior

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
- Final local typecheck/lint/build passed; **454 tests / 28 files passed**,
  including the preserved 315-test V1 baseline. Existing production workflow
  independently passed its required checks.
- Local built preview and public Chrome **155.0.8059.40** each passed four
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

No core blocker prevents proposing **V2.1 signal measurement**. Its scope,
acceptance and release authorization must be established separately. No V2.1 work,
dependency upgrade or personal-website repository edit is part of this release.

## Architecture decisions and maintenance

Owner-approved D01–D09 remain in [DECISIONS.md](v2/DECISIONS.md): graph authority,
snapshot net IDs, distinct electrical labels/ground/solver reference, independent
typed engines, original D05 numerical policy, UTF-8 JSON with logically separate
datasets, SVG editing/history, stable pin-to-pad mappings, and release procedures.
External datasets, EDA formats and simulation/hardware backends remain deferred.

Maintain dated actual status here, keep detailed evidence in the release record
and development log, and distinguish internal verification from public release.
Past release authorization does not authorize a new push or deployment.
