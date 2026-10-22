# V2.4.0 AC and Filters Release

Authorized 2026-10-23: implement, verify and publicly release V2.4.0; stop before
V2.5. Branch `codex/v2.4-ac-filters`, baseline v2.3.0 / main
`c7eca82e6d62c6479c1599d3cf1469e035054495`. Implementation checkpoint `01286a8`.

Current state: **Implementation Complete → Verified; release in progress**.
F01–F09 verified, 9/10; public deployment/verification/tag remain.
Package and exported writer target 2.4.0; project schema remains 1.
No new dependencies, V1/D05/DC numerical rewrites or personal-site edits.

See [method, conventions, compatibility and bounds](AC_FILTER_IMPLEMENTATION.md).
Focused numerical/UI/catalog/portability checks: 77 tests passed across five files
(one obsolete Atlas capability text assertion corrected, then rerun passed).
Checkpoint: 2026-10-23. Implementation Complete → Verified, F01–F09 9/10.
Full suite 621 tests / 38 files passed. Final scoped AC/UI 35 tests passed after
cancellation and display corrections; final lint/typecheck/build passed. Chrome 155
built preview: 13 journeys, 1440/390 light/dark, all five Atlas AC experiments,
actual phasors/matrix/Bode, parameter stale/rerun, native settings/UUID reopen,
real sampled filter/input/output/FFT/CSV and preserved DC/V1/lesson/MathML/home.
Zero console/resource errors. Six downloaded reports / 1206 frequency points
match analytical formulas; RC project byte-identical on reopen; signal assets,
derived recurrence, original input and CSV exact. Screenshots inspected.
Candidate assets index-DcMOX3og.js / index-BgWpMLp-.css. Release F10 in progress;
authorized integration/push/Pages monitoring and public verification next.
Remote main rechecked at baseline; no deployment yet at this checkpoint.

The first browser replay used an obsolete lesson text assertion; corrected to the
actual lesson region/MathML stage. The final full replay passed. A narrow-axis
tick rounding fix was visually checked. Playwright outputs and real downloads
remain in ignored output/playwright; replay/independent validators are committed.

## History-preserving rollback

Before release retain a copy of exported user projects and reports. If necessary,
revert only this release's commits from main back to the known v2.3.0 baseline
using `git revert --no-commit c7eca82e6d62c6479c1599d3cf1469e035054495..<V2.4_FINAL_SHA>`
on a focused branch; resolve and inspect the resulting diff, commit the revert,
run standard checks, integrate without force push, monitor Pages and verify live.
Do not reset main or delete historical tags. If later commits depend on AC,
review that dependency before reverting the range. Keep the v2.4 tag as history
and document the rollback. The schema-1 project retains source definitions and
opaque AC settings; V2.3 does not execute AC or sampled RC operations. Original
datasets and materialized derived samples remain portable. No data migration is
required and no dataset is silently deleted.
