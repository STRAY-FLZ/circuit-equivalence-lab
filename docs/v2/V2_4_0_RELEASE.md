# V2.4.0 AC and Filters Release

Authorized 2026-10-23: implement, verify and publicly release V2.4.0; stop before
V2.5. Branch `codex/v2.4-ac-filters`, baseline v2.3.0 / main
`c7eca82e6d62c6479c1599d3cf1469e035054495`. Implementation checkpoint `01286a8`.

Current state: **Implementation Complete → Verified → Application Released**.

Public verification checkpoint **2026-10-23**: production candidate
**`05cda58215d36bc8ad6c6e89e815302473ccdc47`**, [workflow 39825334987](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39825334987)
passed build/deploy including all standard checks. Actual public root loaded
`index-DcMOX3og.js` / `index-BgWpMLp-.css`. Full real Chrome 155 replay passed
13 journeys: all five AC experiments, real phasors/matrix/Bode, stale/rerun,
R doubling halves cutoff, native settings/UUID save/reopen, sampled filtering with
actual input/output/FFT, CSV/project persistence, DC, V1, lessons/MathML and home.
1440/390px light/dark checked; screenshots inspected; zero console/resource errors.
Six public downloaded reports / 1206 points match independent analytic formulas.
RC project reopen is byte-identical; signal datasets/assets, recurrence and CSV
samples match exactly. Writer 2.4.0, schema1; no new dependencies or V1/DC rewrites.

Local full suite: **621 tests / 38 files**; final scoped AC/UI 35 tests passed
after cancellation/display corrections; final lint/typecheck/build passed. Public
CI repeated standard checks successfully. Browser viewport emulation is not a
physical iPad or cross-browser certification.

This is a dated **pre-tag 9/10** documentation checkpoint. F01–F09 are Verified;
F10 final tag/identity/handoff follows the documentation deployment and targeted
live confirmation. The final **Released 10/10**, exact production commit and
workflow are recorded in the [canonical v2.4.0 Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.4.0).
No V2.5 work; next planned module is the competition project workspace. No blocker.

Methods, conventions, compatibility and limits: [AC/filter implementation](AC_FILTER_IMPLEMENTATION.md).
Replay: `tests/browser/ac-analysis.js`; independent download verification:
`node tests/browser/verify-ac-downloads.mjs ac-live`. Generated evidence is in
ignored `output/playwright/ac-live-*`.

The initial real-block residual false failure was fixed with a dedicated complex
solver. Obsolete Atlas/lesson assertions and narrow-axis labels were corrected;
final checks/replays passed. No application defect remains within accepted scope.

## History-preserving rollback

Before release retain a copy of exported user projects and reports. If necessary,
revert only this release's commits from main back to the known v2.3.0 baseline
using `git revert --no-commit c7eca82e6d62c6479c1599d3cf1469e035054495..v2.4.0`
on a focused branch; resolve and inspect the resulting diff, commit the revert,
run standard checks, integrate without force push, monitor Pages and verify live.
Do not reset main or delete historical tags. If later commits depend on AC,
review that dependency before reverting the range. Keep the v2.4 tag as history
and document the rollback. The schema-1 project retains source definitions and
opaque AC settings; V2.3 does not execute AC or sampled RC operations. Original
datasets and materialized derived samples remain portable. No data migration is
required and no dataset is silently deleted.
