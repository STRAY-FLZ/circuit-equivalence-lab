# V2.3.0 — General DC Analysis Release

Authorized 2026-10-23: implement and publish after functional/numerical/browser
acceptance. Branch `codex/v2.3-dc-analysis`; production starting point
`41e342ac940a28319c1a7cef016f9889f75f6e70` / published v2.2.0, verified against
remote main and GitHub Release. **Implementation Complete → Verified → Application Released**.

**DC01–DC09 Verified, pre-tag finalization 9/10** at this checkpoint. Core checkpoint `4542174`.
Final typecheck/lint/test/build passed: **579 tests / 35 files**, 40 more cases
than the accepted 539 baseline (32 core, 4 UI, 4 expanded palette cases).
The first standard run exposed two obsolete two-pin assertions for VCVS/VCCS;
they now verify the correct four pins/control positions. Corrected final suite
passes. No historical algorithm changes or new dependency.

Actual built Chrome 155 (Windows) accepted Atlas direct DC entry, reference,
real V/I/P and equations/matrix, schematic highlighting, resistance/source edits,
stale hiding and rerun, undo, native project download/reopen, controlled-source
UUIDs, all four controlled families, floating/contradictory diagnostics,
unsupported C/L capability/analysis, Signal Lab RMS and V1 transform/lesson/home.
1440x1100 and emulated 390x844 light/dark layouts checked; screenshots inspected.
All resources load from the existing base; **zero console/resource errors**.
Load and controlled-source native save/reopen/re-export files are byte-identical;
writer 2.3.0/schema1. Reports retain complete provenance, matrix and independent
KCL/power checks. These are browser/emulated-viewport checks, not device tests.
Legacy adapter was tightened to require completely empty bindings (including
non-electrical binding rejection); 32 scoped tests, lint/typecheck/build and
the full local Chrome replay passed again on the changed core boundary.
Generate synthetic input with `node tests/browser/create-dc-fixtures.mjs`.
Browser replay: `tests/browser/dc-analysis.js`; synthetic artifacts under ignored
`output/playwright/dc-local-*`, completed `dc-local-verification.json`.

Production assets: JS `index-CwIG9966.js`, CSS `index-dXs7vrqy.css`.
The existing Vite classic theme-init informational warning is unchanged;
actual theme script/resource loading and both themes pass browser acceptance.
Full actual public verification passed on the corrected build; final tag/records follow this documentation deployment.

See [methods, public APIs, compatibility and limits](DC_ANALYSIS_IMPLEMENTATION.md).
Application/package/export writer 2.3.0, project file schema 1; dependencies,
V1 algorithms, D05 and personal website unchanged. No V2.4 implementation.

## Acceptance and delivery record

Production **`12275b32cc9a0790eb11627d4326486741f2bf8e`**, source guard after candidate
`e80bbf3`; [workflow 39817263066](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39817263066)
completed successfully with build/deploy and all standard checks.

Actual root [public application](https://stray-flz.github.io/circuit-equivalence-lab/)
verified after clearing the dedicated browser cache. Expected `index-CwIG9966.js`
and `index-dXs7vrqy.css` loaded; full real Chrome replay **15 journeys passed**.
All four controlled families output 6/−6/2/−6 V as analytically expected. Real
matrix, passive power, reference, highlight, changed R/source stale/rerun/undo,
native saved load/control projects, legacy/unknown binding and singularity
boundaries, 1440/390 light/dark and existing signal/V1/lesson/home all passed.
Public native files re-export byte-identically, writer 2.3.0/schema1. Console and
resource errors **zero**. Public screenshots inspected; supplemental native
ArrowRight scrolling of narrow result tables moves 80/116px within local overflow,
without page overflow. No entity disappearance or invented numerical success.
Evidence: `output/playwright/dc-live-verification.json`, `dc-live-*-report.json`,
`dc-live-mobile-visual.txt` and screenshots (ignored synthetic artifacts).

Pending at this dated checkpoint: final documentation deployment confirmation,
tag and Release identity. Public application is Released; DC10 completion / 10-of-10
handoff is finalized in the canonical Release after those remaining actions.
Final verified SHA/workflow and completed DC01–DC10 handoff will be recorded in
the [canonical v2.3.0 Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.3.0)
after actual tag/Release publication; this document records the preceding application-release checkpoint.

## History-preserving rollback

Accepted previous production is `41e342ac940a28319c1a7cef016f9889f75f6e70`.
Inspect `git log --oneline 41e342a..main` and the final v2.3.0 Release commit
before reverting. Revert only the V2.3 commits, newest first, with
`git revert --no-commit 41e342ac940a28319c1a7cef016f9889f75f6e70..<verified-v2.3-SHA>`,
then commit the rollback, run appropriate checks, push normally, monitor Pages
and verify the actual public app. Never reset/force-push or move an existing
release tag. Saved new controlled-source projects remain schema 1, but prior
versions do not supply their numerical models/symbol rendering; retain backups
and the separate full DC reports. Restore service and publish a corrective
version rather than silently overwriting release history.
