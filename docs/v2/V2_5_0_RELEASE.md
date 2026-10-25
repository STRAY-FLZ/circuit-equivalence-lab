# V2.5.0 competition workspace release

Authorized 2026-10-25: implement, source/numerical/data/browser verify and publish
V2.5.0, stop before V3. Branch `codex/v2.5-competition-workspace`; verified clean
baseline main/v2.4.0 `350a5d0de427d5016456e50a4de8e5ed780f2024`.
Core checkpoint `41a5526`. **Implementation Complete → Verified; not yet Released**.

**E01–E09 Verified / 9-of-10**, E10 publication in progress at this checkpoint.
Six verified problems: national 2019 A/C/D/E/F and regional Guangdong 2026 G.
See [source register](COMPETITION_SOURCES.md) and
[methods, APIs, compatibility and limits](COMPETITION_WORKSPACE_IMPLEMENTATION.md).

Final local standards passed: typecheck, lint, **647 tests / 40 files**, build.
Current assets `index-Dtjdmh6Q.js` / `index-BvQK5Hgb.css`. No new dependency. After the standard run, the asynchronous handoff update guard
passed four focused UI cases, scoped lint, typecheck and build; production CI will
repeat all standard checks before release.
Known informational build notices: existing classic theme initializer is preserved;
bundle is about 557 kB minified/179 kB gzip and triggers Vite's 500 kB advisory.
No unsupported performance or physical-device certification is claimed.

Built Chrome 155 accepted nine grouped journeys covering the full requested
workflow: actual regional original publication; national project/attribution;
tasks, two plans and notebook/review; real AC capture and two R values with
stale/rerun comparison; rejected forged official requirement and cancelled
replacement; native JSON/HTML save/reopen; actual generator/RMS/FFT, mV CSV,
sampled RC with raw retention, custom target/manual-unit comparison; 1440/390
light/dark and keyboard table scrolling; printable report and preserved Atlas,
actual DC plus unsupported boundary, AC, V1 lesson/MathML/home. Zero app console
or resource errors. Screenshots inspected; viewport checks are emulation, not
physical iPad testing. Supplemental latest-build checks accepted actual external
editor R=3000 export/reimport with both prior AC attempts indeterminate, stable
experiment selection and 12px report plot axes/min-max envelope at 390px.

Independent actual native-download validator accepted two distinct project IDs,
JSON and HTML round trips byte-identical after reserialization, 402 AC points
against the RC formula, three waveform datasets, original CSV bytes/float64 input,
exact ZOH recurrence, simulation/import/manual/derived lineage and 11 mV -> 0.011 V
failure against a 0.01 V custom maximum. RMS reference:
`0.07071067811865503 V` for the deterministic software sine, not official hardware.

Replays/validators are committed in `tests/browser/competition-workspace.js`,
`create-competition-fixtures.mjs`, `verify-competition-downloads.mjs`.
Generated synthetic data/screenshots and original PDFs/archive remain ignored;
no original full statement is copied into the repository. Scope stops at V2.5.0.

Pending: authorized production integration/push, Actions/Pages monitoring,
actual public replay/download validation, final records/tag/Release/handoff.

## History-preserving rollback

Retain user project/report copies. If necessary, inspect the exact release range
and revert only V2.5 commits using
`git revert --no-commit 350a5d0de427d5016456e50a4de8e5ed780f2024..v2.5.0`
on a focused branch. Inspect/resolve, commit, run standard checks, integrate
without force push, monitor Pages and verify live. Do not reset main, move/delete
historical tags or silently rewrite the Release. Review later dependent commits
before reverting that range. A pre-tag rollback uses the actual deployed candidate
SHA instead of a nonexistent tag.

V2.4 still reads schema-1 project data/assets and preserves the opaque workbench
extension but does not operate the competition UI/metrics/report import. Retain
the complete JSON and portable report; avoid editing private extension fields.
Ordinary circuit edits made by an older editor are reconciled on return to V2.5.
No migration, raw-data deletion or incompatible second project schema is involved.
