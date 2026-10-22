# V2.3.0 — General DC Analysis Release

Authorized 2026-10-23: implement and publish after functional/numerical/browser
acceptance. Branch `codex/v2.3-dc-analysis`; production starting point
`41e342ac940a28319c1a7cef016f9889f75f6e70` / published v2.2.0, verified against
remote main and GitHub Release. **Implementation Complete → Verified; public release pending**.

**DC01–DC09 Verified, 9/10** at this checkpoint. Core checkpoint `4542174`.
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
Browser replay: `tests/browser/dc-analysis.js`; synthetic artifacts under ignored
`output/playwright/dc-local-*`, completed `dc-local-verification.json`.

Production assets: JS `index-BFZ33V-y.js`, CSS `index-dXs7vrqy.css`.
The existing Vite classic theme-init informational warning is unchanged;
actual theme script/resource loading and both themes pass browser acceptance.
Actual public verification is pending; candidate version is not publication.

See [methods, public APIs, compatibility and limits](DC_ANALYSIS_IMPLEMENTATION.md).
Application/package/export writer 2.3.0, project file schema 1; dependencies,
V1 algorithms, D05 and personal website unchanged. No V2.4 implementation.

## Acceptance and delivery record

Pending: production commit/workflow, full public replay, final tag/Release identity.
Final verified SHA/workflow and completed DC01–DC10 handoff will be recorded in
the [canonical v2.3.0 Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.3.0)
only after actual publication; it does not exist at this checkpoint.

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
