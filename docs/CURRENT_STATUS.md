# Current Development Status

**2026-10-29 — V3.3.0 operational-amplifier frequency response: In Progress, O01–O10 7/10.**
The owner authorized implementation and production release after full acceptance.
Public V3.2.0 and remote/main `69c7f04` were verified; the focused branch is
`codex/v3.3-opamp-frequency`. O01–O07 have focused numerical and model checks;
six editable Atlas recipes, UI and schema-1 persistence are integrated but final
browser, compatibility and production acceptance are unfinished. No V3.3 release exists.
See [implementation checkpoint](v3/OPAMP_FREQUENCY_IMPLEMENTATION.md). No blocker.

---

Updated **2026-10-29**. **V3.2.0 — Amplifier frequency response**.
**Implementation Complete → Verified → Released / B01–B10: 10/10**.

Official application/tag `v3.2.0`: **`b2a851f7f623761e32e27cb82559bfd58e6a19c6`**;
[build/deploy40687925759](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/40687925759)
succeeded. [Published Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v3.2.0)
id426942854 and annotated tag were verified against that application commit.
This subsequent documentation-only main handoff does not alter the tagged app;
its exact SHA and workflow are recorded in the canonical Release. Baseline V3.1.0
app0bd1b11 / main e29fa05; development branch `codex/v3.2-amplifier-frequency`,
core checkpoint cfbcfdf. Stop before V3.3/V4; no blocker.

Eight editable CE/CS experiments solve actual current DC bias and derive hybrid-π
or nMOS gm/rπ/gds at that point. Independent complex MNA, explicit R/C and source/
load networks, single RMS excitation, real Bode samples and conservative plateau/
cutoff/bandwidth estimates. Explicit parasitic capacitances are teaching values.
The original V1/D05/DC/AC/transient/analog algorithms are unchanged; a specialized
correction fallback checks the same DC equations in original units.

Typecheck/lint/build and **762 tests / 47 files** passed locally and production CI.
Real built/public Chrome155 confirmed CE/CS operating regions, frequency response,
changes, stale state, file reopens, desktop/narrow themes and keyboard; existing
DC/AC/transient/Signal/V1/analog/competition flows passed. The prior public browser
session was interrupted after saving four project files and four screenshots;
804 actual points /4131 independent checks passed on those files on October29,
and a fresh public session reconfirmed both transistor families and the keyboard.
No app console/resource errors in the fresh acceptance. Schema1 / writer3.2.0;
saved settings/provenance persist but reopening requires explicit recomputation.

[Methods, assumptions and compatibility](v3/AMPLIFIER_FREQUENCY_IMPLEMENTATION.md);
[release, evidence and rollback](v3/V3_2_0_RELEASE.md). Limits: a single introductory
NPN or nMOS stage, no industrial SPICE, nonlinear transient, thermal/noise, full
parasitic device physics or real op-amp dynamics. No new dependency or personal
website change. Next recommendation: separately define V3.3 scope; **not started**.

| ID | Deliverable | Status |
| --- | --- | --- |
| B01 | Typed provider and pinned graph | Verified |
| B02 | Verified current bias and exact linearization | Verified |
| B03 | BJT hybrid-π exact derivatives | Verified |
| B04 | nMOS incremental model and valid regions | Verified |
| B05 | Coupling, bypass and explicit capacitance networks | Verified |
| B06 | Complex MNA, phasors and actual sweep gaps | Verified |
| B07 | Sampled plateau, cutoff and bandwidth estimates | Verified |
| B08 | Eight editor/Atlas experiments and portable records | Verified |
| B09 | Numerical, compatibility and real browser acceptance | Verified |
| B10 | Documentation, production, tag and Release | Released |

---

Updated **2026-10-28**. **V3.1.0 — Analog electronics fundamentals**.
**Implementation Complete → Verified → Released / A01–A10: 10/10**.

Official application/tag `v3.1.0`: **`0bd1b11ccba8a52c54727c2e49433d6d31577027`**;
[build/deploy40627152400](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/40627152400)
succeeded. [Published Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v3.1.0)
id426236213 targets that verified production commit; annotated tag readback checked.
This subsequent documentation-only main handoff preserves the tagged application;
its exact final SHA/workflow is recorded in the canonical Release.
Baseline main41564c9 / v3.0.0 a77a221; branch `codex/v3.1-analog-fundamentals`,
core checkpoint4f67be4. Stop before V3.2/V4; no blocker.

Independent Shockley/NPN/long-channel nMOS nonlinear MNA and validated-negative-
feedback ideal-opamp providers. Exact model derivatives, original-unit residuals,
actual CE/CS gains, I–V/loadline and quasi-static experiments;12 editable Atlas
recipes, existing editor/files and competition source-bound numerical evidence.
733 tests/46 files, typecheck/lint/build and production CI passed. Built/public
Chrome155 accepted8 analog and5 existing integration journeys,1440/390 light/dark,
keyboard, file reopen and invalid models/feedback. Zero app console/resource errors.
Each environment downloaded5 real files:128 actual operating points and1037
independent electrical checks passed. Canonical entry without query confirmed
v3.1.0 and actual inverting output−1V; resources index-CKwkNEom.js / index-8iEHP9Pq.css.

Schema1, writer3.1.0; k uses A/V^2 (older readers may reject the new unit).
Saved original analog records/settings persist; explicit rerun verifies new current
results after reopening. No new dependency; V1/D05/DC/AC/transient numerical code
and personal website unchanged. Teaching models only; no general SPICE/nonlinear
transient, complete semiconductor/thermal/high-frequency physics or op-amp rails.
[Methods/limits/compatibility](v3/ANALOG_IMPLEMENTATION.md);
[acceptance/production/rollback](v3/V3_1_0_RELEASE.md).
Next recommendation: separately scope V3.2 practical amplifier frequency response
with declared dynamic models; **not started**.

| ID | Deliverable | Status |
| --- | --- | --- |
| A01 | Pinned models, independent typed providers and snapshots | Verified |
| A02 | Shockley/NR/MNA/Jacobian and failure diagnostics | Verified |
| A03 | Actual diode bias/loadline/quasi-static experiments | Verified |
| A04 | Simplified NPN bias, three regions and terminal KCL | Verified |
| A05 | Long-channel nMOS square-law regions and boundaries | Verified |
| A06 | Same-model derivatives and real CE/CS local gains | Verified |
| A07 | Validated negative-feedback ideal-opamp MNA | Verified |
| A08 | Existing editor,12 Atlas recipes, files and competition | Verified |
| A09 | Numerical, built/public Chrome and downloaded-data acceptance | Verified |
| A10 | Documentation/version/integration/deploy/tag/Release | Released |

---

Updated **2026-10-26**. **V3.0.0 — Linear circuit transient and dynamic response**.
**Implementation Complete → Verified → Released / T01–T10: 10/10**.

Official application/tag `v3.0.0`: **`a77a22112c9c2de6beeba5bf51ec7b9f1df3c624`**;
[build/deploy 40331268904](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/40331268904) succeeded. The annotated tag and [published Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v3.0.0)
were verified against that production commit. Subsequent documentation-only main
handoff does not change the tagged application; its exact SHA/workflow are recorded
in the canonical Release. Baseline v2.5.0/main99e2ba7; branch `codex/v3.0-transient-lab`,
core checkpoint58e96d7. Stop before V3.1/V4; no blocker.

Independent actual RLC MNA with explicit V/I DC/step/pulse, storage initial states,
adaptive backward Euler, event alignment, KCL/energy and bounded cancellation.
Real RC/RL/series-parallel RLC teaching, ten existing Atlas entries, synchronized
V/A/J scope, Signal/competition handoffs and complete portable schema1 data.
Original parameters/pin directions/revisions/digests/raw assets persist; new runs
receive new IDs. No new dependency or V1/D05/DC/AC numerical rewrite.

Final **685 tests /43 files**, typecheck/lint/build and production CI passed.
Actual built/public Chrome155 accepted11 grouped workflows, 1440/390 light/dark,
keyboard/zoom/cursors, report/native reopen and existing DC/AC/V1/MathML/home.
Four narrow V/A/J SVG text bounds passed after compact signed-axis correction;
nine scoped scope/Signal cases passed. Zero app console/resource errors.
15 actual downloaded project files/9615 sample instants independently matched
analytical fixtures;29646 KCL/34452 scalar checks, exact JSON/CSV/HTML/raw bytes.
Post-tag actual report import restored RC6.31782904V at1ms, distinct from analytic
6.321205588V. Public assets `index-COa4Wnpk.js` / `index-CjMhsG_I.css` verified.

Methods/limits: [transient implementation](v3/TRANSIENT_IMPLEMENTATION.md).
Exact release, acceptance and history-preserving rollback: [release record](v3/V3_0_0_RELEASE.md).
Only scoped finite linear models; no nonlinear/controlled-source transient,
arbitrary switching/impulses/SPICE/hardware/PCB. Local error is not global exactness.
Next recommended module: separately scoped V3.1; **not started**.

| ID | Deliverable | Status |
| --- | --- | --- |
| T01 | Independent immutable transient provider | Verified |
| T02 | Dynamic MNA, adaptive BE and diagnostics | Verified |
| T03 | Explicit C/L states, continuity and energy | Verified |
| T04 | Constant/step/pulse sources and event rules | Verified |
| T05 | RC/RL zero-input/zero-state/complete responses | Verified |
| T06 | Series/parallel RLC damping and energy exchange | Verified |
| T07 | Actual waveform/cursor/teaching workbench | Verified |
| T08 | Atlas/Signal/competition and portable data | Verified |
| T09 | Numerical, integrity and built/public acceptance | Verified |
| T10 | Documentation/version/tag/production release | Released |

Previous dated V2 checkpoints below remain historical evidence.

---

Updated **2026-10-25**. Active authorized module **V2.5.0 — Competition project workspace**.
**Implementation Complete → Verified → Application Released**. Dated pre-tag
checkpoint **E01–E09 Verified, 9/10**; final E10 identity and **Released 10/10**
are recorded in the [canonical V2.5.0 Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.5.0) after this documentation deployment and targeted live confirmation.
Baseline local/remote main and published v2.4.0 verified at
`350a5d0de427d5016456e50a4de8e5ed780f2024`. Clean baseline; branch
`codex/v2.5-competition-workspace`. Owner authorizes implementation, source/data/
browser acceptance and production release after acceptance. Stop before V3.

Design: reuse schema-1 EngineeringProject/CompetitionRecord/ExperimentRecord,
assets and immutable revisions; validated versioned namespaced workspace extension.
Source verification: primary 2019 national statement collection at Shandong
Agricultural University cross-checked with Hunan committee index; Guangdong 2026
G statement downloaded from SCUT regional committee archive and visually read.
National training homepage returned 502, so primary university/committee sources
used. Checkpoint **2026-10-25**: E01–E09 Verified, **9/10**; E10 release In Progress.
Core commit `41a5526`. Final typecheck/lint/test/build passed: **647 tests / 40 files**.
Built Chrome 155 passed 9 grouped full workflows: source publication, national
project/attribution, plans/notebook, actual AC capture and two designs, stale/rerun,
invalid-source/replacement protection, JSON/HTML native save/reopen, regional
signal generation/FFT/RMS/CSV/filter/manual-unit comparison, 1440/390 light/dark,
keyboard tables, printable report and existing Atlas/DC/AC/V1/MathML/home.
Zero app console/resource errors. Supplemental latest-build actual external-editor
R=3000 export/reimport correctly invalidated both old AC attempts; stable experiment
restoration and readable report min/max-envelope axes at 390px passed.
Independent download checks: two project IDs, byte-identical JSON/report round trips,
402 actual AC frequency points vs analytic formula, 3 waveform datasets, original
CSV/float64 retention, exact RC recurrence and 11mV/0.01V comparison. Screenshots
inspected. Package/writer 2.5.0 candidate, schema1; no dependency or V1/DC/AC algorithm
changes. Candidate assets `index-Dtjdmh6Q.js` / `index-BvQK5Hgb.css`.
Public acceptance **2026-10-25**: candidate main
`a9bc62a905ff855631a1b7d00ef28753e1f0ac9c`, [workflow 40177292317](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/40177292317)
completed build/deploy successfully, including all standard checks. Actual public
root loaded 2.5.0 and the candidate assets above. Full public Chrome replay passed
all nine grouped journeys with zero app console/resource errors. Public native
downloads independently passed all numerical, provenance and byte-integrity checks
listed above. Desktop/mobile light/dark screenshots inspected.
Next: deploy this documentation, targeted public external-editor/report confirmation,
then tag/Release on the verified final commit. This is a dated pre-tag checkpoint;
canonical Release records the exact final SHA/workflow and E10 completion. No blocker.
Stop before V3; later work requires separate authorization.


| ID | Deliverable | Status |
| --- | --- | --- |
| E01 | Project/experiment architecture and validation | Verified |
| E02 | At least six primary-source verified problems | Verified |
| E03 | Attributed requirements and engineering metrics | Verified |
| E04 | Independent project/two partial training workflows | Verified |
| E05 | Tasks and traceable design alternatives | Verified |
| E06 | Quantitative acceptance and evidence provenance | Verified |
| E07 | Actual engineering tool/result integration | Verified |
| E08 | Notebook, portable project and printable report | Verified |
| E09 | Source/data tests and actual browser acceptance | Verified |
| E10 | Documentation/version/production release | In Progress |

Prior V2.4.0: **Released / 10/10**; canonical Release confirms final identity.
The dated prior checkpoints below are preserved.

---

Updated **2026-10-23**. Active authorized module **V2.4.0 — AC, filters and frequency response**.
**Implementation Complete → Verified → Application Released**; dated pre-tag
checkpoint **9/10**, final F10 identity/handoff in the canonical Release below.
Baseline local/remote main and published v2.3.0 verified at
`c7eca82e6d62c6479c1599d3cf1469e035054495`. Branch `codex/v2.4-ac-filters`.
Owner explicitly authorizes implementation, numerical/built/public acceptance and
production release of 2.4.0. No V2.5 work. No blocker.

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



| ID | Deliverable | Status |
| --- | --- | --- |
| F01 | Independent AC/provider/configuration | Verified |
| F02 | Complex MNA | Verified |
| F03 | RLC and explicit RMS source models | Verified |
| F04 | Phasors, complex power and equations | Verified |
| F05 | Defined transfer and frequency sweep | Verified |
| F06 | Actual interactive Bode plots | Verified |
| F07 | Editable Atlas filter/resonance experiments | Verified |
| F08 | Sampled RC filtering/provenance | Verified |
| F09 | Numerical and actual browser acceptance | Verified |
| F10 | Docs/version/production release | In Progress |

DC numerical semantics, V1/D05, schema1, original signal data and branding are
preserved. AC uses positive-cosine RMS phasors and strictly positive frequencies;
source settings never silently inherit DC values. Sampled RC processing is a
separate declared ZOH operation, not a general transient circuit solver.

Prior V2.3.0 is **Released (10/10)**; dated pre-tag checkpoint below is retained.

---

Updated **2026-10-23**. Authorized module **V2.3.0 General DC Analysis**:
**Implementation Complete → Verified → Application Released**.
Pre-tag documentation checkpoint **9/10**: DC01–DC09 Verified; DC10 final
records/tag/handoff are being finalized. Completed **Released / 10/10** state,
exact final production commit and workflow are recorded in the
[canonical v2.3.0 Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.3.0)
after this documentation commit deploys and receives a targeted live confirmation.

Production **`12275b32cc9a0790eb11627d4326486741f2bf8e`**;
[workflow 39817263066](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39817263066)
build/deploy succeeded. Actual public root entry and expected JS/CSS verified.
Full Chrome replay passed 15 journeys: real MNA/V/I/P, all four controlled sources,
reference/highlight, resistor/source edits, stale/rerun/undo, native save/reopen,
legacy/unknown-binding boundaries, floating/contradictory/unsupported circuits,
1440/390px light/dark and existing signal/V1/course/home. Zero console/resource
errors; screenshots inspected and native narrow-table horizontal scrolling checked.
Load and controlled-source public export/reopen/re-export are byte-identical.

Final local standard checks passed: **579 tests / 35 files**. Subsequent precise
legacy guard passed 32 scoped cases, lint/typecheck/build and full built/public
Chrome; production CI repeated all standard checks successfully. Package/writer
2.3.0, schema 1, JS `index-CwIG9966.js`, CSS `index-dXs7vrqy.css`.
V1/D05/dependencies/personal website preserved. Core `4542174`, candidate
`e80bbf3`, source guard `12275b3`; branch `codex/v2.3-dc-analysis` safely
fast-forwarded into main. Prior accepted release `41e342a` / v2.2.0.

Limits: single flat sheet, 192 unknowns / 512 components; R/V/I and four ideal
linear controlled sources only. Results/reference dropdown are session-only;
save circuit and rerun, or export full DC report. No AC/transient/nonlinear/SPICE.
Blockers: none. Stop after this authorized release; **V2.4 not started**.
[Methods/APIs/compatibility](v2/DC_ANALYSIS_IMPLEMENTATION.md),
[release and rollback](v2/V2_3_0_RELEASE.md), [version checklist](VERSION_CHECKLIST.md).

Historical V2.2.0 checkpoint follows; its final release identity was confirmed
at V2.3 kickoff via the canonical Release.

---

Updated **2026-10-22**. Active authorized module: **Circuit Atlas / V2.2.0**,
**Application Released; finalization checkpoint 7/8**; branch `codex/v2.2-circuit-atlas`, baseline public
`1b61a74` / v2.1.0 confirmed from remote main/tag/published Release. Clean baseline.
Owner approved V2.2.0 release after acceptance and DC/filters/competition roadmap
shift to V2.3/2.4/2.5, with V3–V6 unchanged. No later-module work authorized.

A01–A07 verified: twelve categories / 89 families / 26 real templates. Final
typecheck/lint/test/build passed, **539 tests / 33 files** (35 new). Actual built
V2.2.0 Chrome 155.0.8059.85 verified category/family animation intermediate frames,
opacity/chevrons/reflow, native keyboard/reduced-motion/ARIA/inert, all 26 editor
opens, native dirty cancel/confirm, real 100→1234 edit/export/reopen (byte-identical),
independent new instances, retained signal/V1 and 1440/390px light/dark. Screenshots
inspected; no console/resource failures. JS `index-Bd8uTY76.js`, CSS
`index-DmkpcxYZ.css`. Standard evidence reused after interruption; only missing
browser acceptance completed. First production **`01e02b4df8af85ddd4d3de47b24d2974918b9f0b`**,
[workflow 39639505538](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39639505538)
build/deploy succeeded. The same full real public workflow passed, including all
26 editor opens, animation/keyboard/reduced motion, native replacement protection,
file round trips and four size/theme groups. Independent public export/re-export
is byte-identical; no console/resource errors. Package/writer 2.2.0, file schema 1.

This documentation checkpoint precedes its own deployment confirmation/tag.
Subsequent A08 / **8/8** completion, exact final SHA/workflow and annotated tag are
recorded in the [canonical v2.2.0 Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.2.0).
It avoids predicting this file's own SHA or claiming an uncreated tag.
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
