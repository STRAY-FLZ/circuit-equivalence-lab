# Current Development Status

Updated **2026-10-21**. **V2.0.0: Released** — accepted A/B/C/D are implemented,
verified and now publicly deployed. V2.1 remains **Planned**, not started.

## Public release

- Application: <https://stray-flz.github.io/circuit-equivalence-lab/>.
- Application/package/lockfile/export writer: **2.0.0**; engineering file
  `formatVersion: 1` and project revision remain independent.
- First verified production commit: `64850067fc0cf9344efd5e31be31fe3f954079d1`.
  [Pages workflow 39541122926](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39541122926)
  completed successfully: build and deploy. Real public acceptance then passed.
- Final release identity: [v2.0.0 release record](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.0.0).
  It records the exact final production SHA and workflow after this documentation
  commit is deployed and verified. The tag must point to that final verified
  production commit; this document does not predict its own SHA or a future run ID.
- [Detailed evidence and rollback](v2/V2_0_0_RELEASE.md), [changelog](../CHANGELOG.md),
  [scoped progress](DEVELOPMENT_PROGRESS.md). M0–M8 and earlier internal module
  handoffs remain historical records in [DEV_LOG.md](DEV_LOG.md).

## Verified behavior

- Engineering projects with stable UUIDs, pinned component definitions, explicit
  connectivity/derived nets, separate SVG geometry, immutable editing history,
  component properties, portable JSON export/reopen and integrity checks.
- Real user resistor circuits: series, parallel, Δ→Y, Y→Δ discovery, highlighting,
  non-mutating previews, independent numerical evidence and atomic verified
  writeback, undo/redo, and five-stage lessons. Existing observed boundaries are
  protected. Original V1 algorithms and owner-approved D05 are unchanged.
- Final local typecheck/lint/build passed; **438 tests / 27 files passed**,
  including the preserved 315-test V1 baseline. Existing production workflow
  independently passed its required checks.
- Local and public Chrome **155.0.8059.40** each passed seven editor/integration
  workflow groups. Public save/reopen/re-export is byte-identical; writer 2.0.0,
  formatVersion 1. Both themes at 1440/390px; screenshots inspected.
- Actual personal website → tools → V2.0.0 → return-home passed in four viewport/
  theme combinations, preserving shared theme. V1 examples/previews and a full
  five-stage Δ→Y lesson passed, including 19 visible native MathML expressions
  and three terminal-pair comparisons. No critical console/resource failures;
  all production resources loaded under `/circuit-equivalence-lab/`.

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
