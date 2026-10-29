# Development Progress

Updated **2026-10-29**. **V3.3.0 — Operational-amplifier dynamics and feedback**.
**Locally Verified / O01–O10: 9/10.** Verified V3.2.0 production baseline and clean
remote/main `69c7f04`; working branch `codex/v3.3-opamp-frequency`. The existing
ideal op-amp remains unchanged. Work is scoped to the explicitly versioned single-
pole model, actual MNA, bounded passive feedback and the owner's acceptance.
See [checkpoint](v3/OPAMP_FREQUENCY_IMPLEMENTATION.md). No blocker.

| ID | Deliverable | Status |
| --- | --- | --- |
| O01 | Typed model, immutable snapshot and provider | Verified |
| O02 | Open-loop gain and single pole | Verified |
| O03 | Finite-gain DC MNA | Verified |
| O04 | Negative feedback and complex closed-loop MNA | Verified |
| O05 | Validated amplifier circuit families | Verified |
| O06 | Bode and gain-bandwidth measurements | Verified |
| O07 | Defined loop gain and phase margin | Verified |
| O08 | Atlas, editor, persistence and education | Verified |
| O09 | Numerical and local real-browser acceptance | Verified |
| O10 | Documentation, release and public verification | In Progress |

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

Updated **2026-10-23**. Active authorized module **V2.3.0 — General DC Analysis**.
**Application Released; pre-tag finalization checkpoint 9/10 (90%)**.
DC01–DC09 Verified. Final DC10 / **Released 10/10** status, exact final commit
and workflow are in the [canonical v2.3.0 Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.3.0)
following confirmation of this documentation deployment. No overall roadmap percentage.

| ID | Deliverable | Status | Evidence |
| --- | --- | --- | --- |
| DC01 | Independent provider/capability | Verified | Versioned typed async provider, pure inspection, immutable revision/digest/provenance |
| DC02 | MNA numerical core | Verified | Actual stamps; complete pivot/row-column scaling; rank, contradiction, conditioning, original-unit residuals |
| DC03 | Independent V/I | Verified | Zero/negative values, supernode, multisource, orientation and power cases |
| DC04 | Four dependent families | Verified | VCVS/VCCS/CCVS/CCCS analytical and actual browser cases; stable explicit sensing currents |
| DC05 | Reference/topology | Verified | Explicit/marker/GND priority; no reference union; floating and cross-sheet diagnostics |
| DC06 | Electrical results/checks | Verified | Stable node/branch maps, V/I/P, passive sign, independent all-node KCL/power checks |
| DC07 | Equations/teaching display | Verified | Actual A/x/b and mapped values in UI/report; no separate mesh solver claim |
| DC08 | Editor/Atlas | Verified | Four source controls, stale/rerun/highlight; sixteen eligible templates; ten unsupported C/L templates |
| DC09 | Tests/real browser | Verified | 579 tests/35 files, standard checks and production CI; actual built/public Chrome 15 journeys, file equality, 1440/390 light/dark |
| DC10 | Docs/version/release/handoff | Application Released; finalizing tag/records | 2.3.0/schema1; main 12275b3 / Pages 39817263066 success; full public pass; final tag/SHA/workflow/10-of-10 handoff in canonical Release |

Branch `codex/v2.3-dc-analysis`, baseline `41e342a` / v2.2.0. Implementation
checkpoints `4542174`, `e80bbf3`, `12275b3`. Full public acceptance saved in
ignored `output/playwright/dc-live-verification.json`; native load/control file
round trips byte-identical; no console/resource errors. Methods, limits and
rollback are in [DC implementation](v2/DC_ANALYSIS_IMPLEMENTATION.md) and
[release record](v2/V2_3_0_RELEASE.md). No V2.4 work; no blocker.

Previous Atlas A01–A08 **Released (8/8)** confirmed from canonical release;
historical pre-tag checkpoint below retained as dated evidence.

---

Updated: **2026-10-22**. Progress is measured per scoped module; no overall
completion percentage is assigned to the evolving multi-year product.

## Active module: V2.2.0 — Circuit Atlas

**Application Released; finalization checkpoint 7/8 (87.5%)**, authorized 2026-10-22. Baseline main/tag/release
`1b61a74` / v2.1.0 verified. Branch `codex/v2.2-circuit-atlas`.
Owner confirmed V2.2.0 publication after acceptance and roadmap shift DC→2.3,
filters→2.4, competition→2.5; V3–V6 unchanged. No later-module implementation.

| ID | Deliverable | Status | Evidence |
| --- | --- | --- | --- |
| A01 | Integration inspection/design | Verified | Existing graph/editor/palette/file boundaries; independent recipe instances and guarded editor handoff |
| A02 | Twelve-category hierarchy/metadata | Verified | 12 categories / 89 families, stable keys; publisher-checked secondary chapter metadata |
| A03 | Three-level navigation | Verified | Independent disclosure/selection/search state; real browser 12/89/26 and workspace retention |
| A04 | Motion/responsive/accessibility | Verified | Chrome intermediate height/opacity/chevron/reflow frames, native keyboard/inert/ARIA/reduced motion, 1440/390px light/dark |
| A05 | Initial valid templates | Verified | 26 actual projects; 30 focused catalog cases: nets, parameters, UUID independence, canonical file round trips, actual resistor evidence |
| A06 | Editor integration/preservation | Verified | All 26 opened; actual dirty cancel/confirm, edited file download/reopen byte-identical, IDs/parameters retained; shared recipe unaffected; signal/V1 retained |
| A07 | Tests/actual browser acceptance | Verified | Final typecheck/lint/test/build, 539 tests / 33 files; actual built 2.2.0 Chrome workflow/screenshots, no console/resource failures |
| A08 | Docs/version/release/handoff | Finalization at this checkpoint | Package/writer 2.2.0/schema1; main 01e02b4 / Pages 39639505538 succeeded; full public acceptance passed; final docs deployment/tag/8-of-8 handoff in canonical Release |

First production `01e02b4df8af85ddd4d3de47b24d2974918b9f0b`,
[workflow 39639505538](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39639505538)
build/deploy success. Public Chrome full replay and byte-identical file round
trip passed. Final documentation deployment receives a targeted live confirmation
before tagging. Exact final SHA/workflow and A08 / **8/8** completion are in the
[canonical v2.2.0 Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.2.0).

Blockers: none. [Design and coverage](v2/CIRCUIT_ATLAS.md),
[per-version checklist](VERSION_CHECKLIST.md). Stop after Atlas and its authorized release.

## Released module: V2.1.0 — Signal Measurement & Analysis

Final S01–S10 **10/10 Released**, main/tag `1b61a74`, confirmed 2026-10-22 from
the actual published Release. The pre-tag execution checkpoint below is historical.

**Application Released; finalization checkpoint 9/10 (90%)**, authorized 2026-10-21.
Baseline: actual public V2.0.2 `bd79d6a`. Branch `codex/v2.1-signal-lab` safely
fast-forwarded into main. First production `dfc5d78`, workflow 39614955343
build/deploy success; full public workflow accepted. Final documentation deployment,
verified final SHA/workflow, tag and S10 / **10/10** completion are recorded in the
[canonical release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.1.0).
This preserves the actual pre-tag checkpoint rather than predicting its own SHA.

| ID | Deliverable | Status | Evidence |
| --- | --- | --- | --- |
| S01 | Signal data/processing foundation | Verified | Stable descriptors, verified float64 assets, async FFT provider, units/provenance and limits tested |
| S02 | Configurable sampled generator | Verified | All five generators/options; actual frequency control updates waveform and FFT |
| S03 | Interactive oscilloscope | Verified | Responsive real-sample SVG axes, time zoom/offset, exact cursor and synchronized independent-unit channels; display reduction separated |
| S04 | Numerically defined measurements | Verified | Full-capture min/max/pp/mean/total RMS/AC RMS, conservative frequency availability, method/options/units tested |
| S05 | FFT amplitude spectrum | Verified | Analytical/direct DFT; rectangular/Hann/coherent gain/DC/Nyquist; actual peak/units/settings display |
| S06 | CSV import/export | Verified | Explicit confirmation/units, physical row/column diagnostics, real CSV download/reimport and JSON measurement report |
| S07 | Integrated accessible workbench | Verified | Signal tab retains data across existing editor/V1 navigation; education and desktop/narrow themes verified |
| S08 | Data integrity/project persistence | Verified | Raw CSV byte-identical; generated 65536-point capture retained; exact dataset/channel/assets/results restored; FFT parameters and actual engine provenance persisted |
| S09 | Numerical/UI/browser acceptance | Verified | Final typecheck/lint/build and 504 tests / 31 files; built and first public workflows; final tick-spacing fix locally replayed with actual label bounds at four size/theme groups; public corrected-build replay precedes tag |
| S10 | Docs/version/release/handoff | Finalization at this checkpoint | Package/writer 2.1.0, schema 1; docs/changelog/rollback; main dfc5d78 and Pages 39614955343 success, full public acceptance; final deployment/tag/10-of-10 handoff in canonical release |

Blockers: none. Preserve latest movement fix and original V1/D05. Do not begin
V2.2/V2.3 or claim hardware acquisition. Commit verified meaningful checkpoints.

## Production release: V2.0.2 — component movement

Public status: **Released**, 2026-10-21. This documentation checkpoint is
**3/4 (75%)** before final documentation deployment and tag. Subsequent U04 / 4/4
completion, exact final SHA and successful workflow are retained in the
[canonical v2.0.2 release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.0.2).
Reused the verified fix and 456-test baseline. No V2.1 work.

| ID | Deliverable | Status | Evidence |
| --- | --- | --- | --- |
| U01 | Version/release preparation and built preview | Verified | 2.0.2 package/lock/writer; no dependency change; rebuild/typecheck/replay lint and four actual built-browser cases passed |
| U02 | Safe main integration and Pages deployment | Released | Fast-forward main `1c51e63`, workflow 39603301979 build/deploy success |
| U03 | Real public movement/new-component acceptance | Released | Real 2.0.2: four 1440/390px × light/dark cases, 650ms hold, stable UUID/count, one placement per palette action and history passed, no browser/resource failures |
| U04 | Final release records/tag/handoff | In Progress at this checkpoint | Final docs prepared; final workflow/live confirmation/tag and 4/4 handoff recorded in canonical release |

Resume check confirmed main/remote `1c51e63`, clean tree, successful workflow and
actual public log. Existing v2.0.1 is already published; no duplicate created.
Only final records/deployment check/tag remain. Blockers: none.
[Release record](v2/V2_0_2_COMPONENT_MOVEMENT.md).

## Verified local follow-up: component movement / one-shot placement

**Verified, 3/3**, 2026-10-21; **not Released**. Branch
`codex/fix-component-drag-placement`, baseline `5b900ef`. At this checkpoint no
version change or remote publication had been requested; later release
authorization and execution are tracked above.

| ID | Deliverable | Status | Evidence |
| --- | --- | --- | --- |
| F01 | Move original; add only through palette | Verified | Placement returns to select after one insertion; existing-body drag cancels armed placement and retains identity |
| F02 | Regression and real browser verification | Verified | Two new regressions; 456 tests / 28 files plus typecheck/lint/build passed; Chrome four viewport/theme cases with 650ms hold, count/UUID and undo/redo |
| F03 | Accurate handoff and persistent records | Verified | Current status/log distinguish local changes from public 2.0.1; browser replay updated for explicit palette activation |

Blockers: none. No commit/push/deployment or V2.1 work.

## Production patch: V2.0.1 — node drag-to-connect

Public application status: **Released**, verified 2026-10-21. This final
documentation checkpoint is **5/6 (83%)**, before its deployment and final tag.
The [canonical v2.0.1 release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.0.1)
records subsequent P06 completion / **6/6**, final production SHA and workflow.
Authorized focused patch; baseline `c6e8a9f` / `v2.0.0`. Preparation branch
`codex/v2.0.1-wire-drag` fast-forwarded into main. Schema remains 1. No V2.1 work.

| ID | Deliverable | Status | Evidence |
| --- | --- | --- | --- |
| P01 | Inspect interaction / minimal change | Verified | Extend existing SVG pointer gesture, screen CTM and connect transaction; preserve click wiring |
| P02 | Node pointer dragging / coordinates | Verified | Existing gesture with pointer ID/capture and inverse screen CTM; component body movement retained |
| P03 | Continuous preview / snapping | Verified | Real SVG dashed orthogonal path; fixed source; 14px screen-space snap and explicit target rings |
| P04 | Graph commit / cancellation / history | Verified | Existing connect transaction; Escape/cancel/lost capture/blur/tool/undo; real nets and stable file endpoints |
| P05 | Focused tests / actual browser | Verified | 16 new UI tests; Chrome four viewport/theme groups explicitly assert intermediate preview paths, zoom/pan, undo/redo, actual file reopen and CDP pen |
| P06 | Authorized patch release / records | Finalization at this checkpoint | 2.0.1 main `ede3523`, workflow 39553250543 success; actual public wire/pen and seven integration groups passed. Final documentation deployment, tag and 6/6 handoff recorded in canonical release |

Resume audit: actual clean main/remote `ede3523`, prior standard checks and local/
public browser evidence recovered; no tag/release existed. Reused all valid checks,
did not restart implementation or repeat the historical seven-group replay.
Only final records/deployment confirmation/tag remained. Blockers: none.
Prior release checkpoints below remain historical.

## Production release: V2.0.0 — R01–R09

Production status: **Released**, verified 2026-10-21. Execution checkpoint before
the final documentation deployment/tag: **7/9 (78%)**. R08/R09 final completion,
the final production SHA and its successful workflow are recorded in the
[canonical v2.0.0 GitHub Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.0.0)
after this commit's deployment is verified. This preserves a truthful pre-tag
checkpoint without predicting this document's own commit/run. Authorized scope
includes production integration, Pages, public acceptance and tag/release.
Do not begin V2.1. [Release evidence](v2/V2_0_0_RELEASE.md).

| ID | Deliverable | Status | Evidence |
| --- | --- | --- | --- |
| R01 | Release baseline and actual remote state | Verified | Remote main `8fd6e9b`, successful workflow 38141955598, push permission and Pages source checked |
| R02 | History-preserving integration | Verified | A/B/C/D ancestry confirmed; local main fast-forwarded to `4030e08`, no conflict |
| R03 | Version, visible information and release/compatibility notes | Verified | Package/lock/footer/writer 2.0.0; schema 1; changelog, compatibility and rollback documented |
| R04 | Final integrated standard checks | Verified | Typecheck/lint/build passed; 438 tests / 27 files passed |
| R05 | Actual local production browser preview | Verified | Chrome 155: seven workflow groups; real JSON round trip byte-identical; 1440/390px and both themes |
| R06 | Main push and successful Pages workflow | Released | `6485006`; build/deploy success, workflow 39541122926 |
| R07 | Actual public application / website navigation | Released | Seven public workflows, four actual website round trips, V1 five-stage MathML lesson, no resource/console errors |
| R08 | Tag/release and final persistent records | In Progress at this checkpoint | Persistent release records written; final documentation deployment, final tag/publication recorded in canonical release above |
| R09 | Final owner report and handoff | Planned at this checkpoint | Final report follows verified final deployment and tag; also retained in canonical release; stop before V2.1 |

Release preparation branch: `codex/release-v2.0.0`, fast-forwarded into production
`main`; no history rewrite. Final tag must follow the final documentation workflow
and live check. Blockers: none.
Git uses the existing system proxy per command because direct GitHub access failed.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| Planned | Scoped future work; not started |
| In Progress | Work started; deliverables remain incomplete |
| Implementation Complete | Scoped implementation/design outputs exist; verification pending |
| Verified | Applicable acceptance checks completed; may be an internal milestone |
| Released | Relevant public deployment and live workflow verified |
| Blocked | An actual obstacle prevents the remaining scoped work; record the reason |

For design modules, Implementation Complete means design outputs complete, not
production code. Verified does not imply owner approval of proposed decisions.

## Version and module overview

| Version/module | Status | Release state |
| --- | --- | --- |
| V1, M0–M8 | Released | Preserved in V2.0.0; public previews/lesson/MathML/navigation reverified 2026-10-21; historical package was 0.1.0 |
| V2.0-A architecture/interfaces | Verified | Internal design complete; no public release required or authorized |
| V2.0-B engineering model/files | Released | Implemented, verified and publicly available in V2.0.0 |
| V2.0-C schematic editor | Released | Implemented, verified and publicly available in V2.0.0 |
| V2.0-D V1 integration | Released | Implemented, verified and publicly available in V2.0.0 |
| V2.1 signal measurement | Released | v2.1.0 / 1b61a74, final 10/10 in canonical Release |
| V2.2 circuit atlas | Released | Public full acceptance passed; final SHA/tag/8-of-8 handoff in canonical Release |
| V2.3 DC analysis | Planned | Owner-approved shift from former V2.2 |
| V2.4 filters/frequency response | Planned | Owner-approved shift from former V2.3 |
| V2.5 competition workspace | Planned | Owner-approved shift from former V2.4 |
| V3.x advanced circuits/analog | Planned | Incremental usable releases |
| V4.x digital/embedded/control | Planned | Incremental usable releases |
| V5.x PCB engineering | Planned | Incremental usable releases |
| V6.x integrated engineering | Planned | Incremental usable releases |

## Completed design module: V2.0-A

Status: **Verified**. Completed: **10 / 10 deliverables (100%)**.
Authorization: official V2 kickoff, architecture/interface documents only.
Git baseline: local `main`, HEAD `8fd6e9b` at kickoff; persistent context documents
already existed as uncommitted local files. No new commit, push, or deployment.

| ID | Deliverable | Status | Verifiable output |
| --- | --- | --- | --- |
| A01 | V1 architecture and reusable contracts | Verified | [Reuse inventory](v2/ARCHITECTURE.md#a01--current-v1-contracts-and-reuse) |
| A02 | EngineeringProject model | Verified | [Project contract](v2/DOMAIN_MODEL.md#project-aggregate-and-common-values) |
| A03 | Multi-pin components, nets, stable IDs | Verified | [Identity/connectivity](v2/DOMAIN_MODEL.md#stable-identity-and-references) |
| A04 | Engine contracts and capabilities | Verified | [Engine contracts](v2/ENGINE_CONTRACTS.md) |
| A05 | V1 adapters and migration boundaries | Verified | [V1 adapters](v2/V1_COMPATIBILITY.md) |
| A06 | Versioned project files and migrations | Verified | [Project format](v2/PROJECT_FORMAT.md) |
| A07 | Measurement and waveform contracts | Verified | [Measurement contracts](v2/MEASUREMENT_DATA.md) |
| A08 | PCB/EDA interoperability boundaries | Verified | [PCB boundary](v2/PCB_INTEROPERABILITY.md) |
| A09 | Implementation dependencies and releases | Verified | [Implementation gates](v2/IMPLEMENTATION_ROADMAP.md) |
| A10 | Consistency, tradeoffs, acceptance | Verified | [Decisions](v2/DECISIONS.md) and [acceptance](v2/ACCEPTANCE.md) |

## Checkpoints

- 2026-10-20 — Kickoff: initialized A01–A10, 0/10 complete; reviewing relevant
  V1 public contracts and existing design/deployment conventions.
- 2026-10-20 — Architecture/domain checkpoint: 3/10 outputs complete; documented
  V1 reuse, project aggregate, stable instance/pin identities, authoritative graph,
  derived nets, label scope, and geometry separation. Consistency verification pending.
- 2026-10-20 — Engine/compatibility checkpoint: 5/10 outputs complete; specified
  provider capability/outcome contracts and V1 import/projection/protected writeback,
  including explicit rejection and the absence of an established legacy file schema.
- 2026-10-20 — File/measurement checkpoint: 7/10 outputs complete; specified schema
  and migration boundaries, portable verified assets, waveform axes/units/provenance,
  CSV boundaries, and explicit FFT/measurement applicability.
- 2026-10-20 — PCB/roadmap checkpoint: 9/10 outputs complete; specified pin/pad/net
  identity boundaries, stale checks, mature-EDA adapter limits, B/C/D acceptance,
  and the integrated V2.0 release gate. Cross-document verification in progress.
- 2026-10-20 — Acceptance checkpoint: 10/10 complete, internally Verified. Six
  contract modules and a complete JSON fixture type-check in memory under actual
  repository settings; document links/fragments/whitespace and changed scope pass.
  Recorded D01–D09 for owner review. No V2 runtime implementation or public release.

## Verification, release, blockers, next action

- Verification: complete; see [V2.0-A acceptance](v2/ACCEPTANCE.md). Internal design
  checks do not constitute runtime validation of unimplemented modules.
- Release: no new public version; V2.0-A is internal. Historical V1 evidence is
  referenced in [CURRENT_STATUS.md](CURRENT_STATUS.md), not reverified this round.
- Blockers: no material unresolved architecture question blocks B at this scope.
  Owner outcomes are recorded in [DECISIONS.md](v2/DECISIONS.md); D03/D06 reconciled,
  D05 unchanged, D09 conditional. External dataset containers/EDA formats/backends
  remain deferred and do not block the initial model/file foundation.
- Next: separately authorize V2.0-B. No active implementation
  module and no remaining V2.0-A deliverable. Do not begin V2.0-B automatically.

## Architecture review follow-up — 2026-10-20

Status: **Verified**. Completed: **4 / 4 review actions (100%)**.
Original A01–A10 remain **Verified, 10/10**; this is a scoped documentation follow-up.

- [x] R01 — Record all D01–D09 owner outcomes, preserving original D05.
- [x] R02 — Reconcile D03 labels/ground/reference and D06 structure/payload boundaries.
- [x] R03 — Update decision status and handoff; identify no material B design blocker.
- [x] R04 — Verified document links/whitespace, unchanged original D05 recommendation
  and V1 compatibility specification, and documentation-only scope.

Review verification: 14 documents and 101 local file/fragment links checked;
all nine outcomes recorded, ten original deliverables remain Verified, package
version stays `0.1.0`. Original D05 recommendation matches the pre-review text;
V1_COMPATIBILITY.md is byte-identical by SHA-256. No historical tests rerun.

No new commit, version, public release, deployment, or V2.0-B implementation.

Update this tracker and [CURRENT_STATUS.md](CURRENT_STATUS.md) at meaningful
checkpoints, keeping completed counts and evidence links consistent.

## Latest implementation module: V2.0-B — Engineering Project Model (complete)

Status: **Verified**. Completed: **9 / 9 deliverables (100%)**.
Authorization: V2.0-B implementation/testing/documentation only; no C/D or release.
Branch: `codex/v2-project-model`, baseline HEAD `8fd6e9b`. Existing uncommitted
context/design documents and DEV_LOG.md edits are preserved; no commits made.

| ID | Deliverable | Status | Evidence |
| --- | --- | --- | --- |
| B01 | EngineeringProject aggregate | Verified | [Engineering APIs](../src/engineering/index.ts) |
| B02 | Component definitions and instances | Verified | Five-pin and RLC-ready fixtures |
| B03 | Authoritative graph and derived nets | Verified | Crossings/junctions, labels/ground/reference tests |
| B04 | Validation, creation, immutability | Verified | UUID/reference/parameter/snapshot/revision/geometry tests |
| B05 | Versioned JSON/inline assets | Verified | 18 format/asset/round-trip/provenance tests |
| B06 | Read-only V1 import/projection | Verified | 18 compatibility cases including all 8 V1 examples |
| B07 | Minimal engine-facing contracts | Verified | [Analysis contracts](../src/analysis/index.ts); typecheck/lint passed |
| B08 | Focused fixtures/tests and standard checks | Verified | 60 final V2 focused cases; 373-case full run; standard checks/build passed |
| B09 | Implementation notes and handoff | Verified | [Implementation/acceptance](v2/ENGINEERING_MODEL_IMPLEMENTATION.md), CURRENT_STATUS and DEV_LOG |

Blockers: none. Next: separately authorized V2.0-C; do not start automatically.
Actual runtime engines, editor, history UI, transformation writeback, external data
packaging, and public release remain deferred.

B checkpoint: 22 focused tests passed in two Node-environment files. Initial
sandbox Vitest cache rename failed with EPERM before test execution; the authorized
outside-sandbox focused run passed. No historical test suite run at this checkpoint.

B format/adapter checkpoint: 16 format tests and 18 V1 compatibility tests passed.
Portable JSON verifies UTF-8/schema/identity/asset hash/length/sample axes; read-only
adapters preserve namespaces, endpoints/ports and observed boundaries, rejecting
unsupported models/scope explicitly. Identity collections serialize in ID order;
ordered pins/endpoints and opaque extension arrays retain their order.

B integration checkpoint: typecheck and lint passed after correcting recursive
test-fixture typing and strict test assertions. Module rules preserve all V1
dependency restrictions and add the four V2 boundaries. No numerical engine or
runtime plugin registry is implemented. Final regression/build followed this checkpoint.

B final checkpoint: **9/9 Verified, not Released**. The standard full run passed
373 tests (315 original + then-current 58 new); build passed with 47 modules.
After two final media/time-range/provenance cases, all 60 new tests passed together
in four focused files, and typecheck/lint passed again. No repeated historical suite
or browser/live deployment check. Package `0.1.0`, branch `codex/v2-project-model`,
HEAD `8fd6e9b`; no commit/push/deployment. All pre-existing uncommitted docs preserved.

## Completed module: V2.0-C — Interactive Schematic Editor

Status: **Verified**, **10/10 deliverables (100%)**. Accepted A/B work checkpointed
locally as `b7b53bc` on `codex/v2-project-model`; development branch is
`codex/v2-schematic-editor`. No unrelated files were staged or discarded.

| ID | Deliverable | Status | Evidence |
| --- | --- | --- | --- |
| C01 | Editor architecture and state separation | Verified | Pure editing API and derived presentation tests |
| C02 | SVG workspace, viewport and selection | Verified | Chrome desktop/narrow zoom, pan, screenshots |
| C03 | Palette, placement, move/rotate/delete | Verified | Placement, geometry and deletion tests |
| C04 | Explicit wiring, junctions and net inspection | Verified | Crossing/junction/reference/ground tests |
| C05 | Properties and grounded feedback | Verified | Stable identity and invalid-input tests |
| C06 | Immutable history and keyboard operations | Verified | Fresh revisions, undo/redo and shortcut tests |
| C07 | Actual file save/open | Verified | UI export/import and B format round trips |
| C08 | Application entry and preserved V1 workflows | Verified | Chrome themes, previews and all five lesson stages |
| C09 | Focused/full tests and real Chrome checks | Verified | 29 focused C cases; 404 full tests; seven Chrome workflow groups |
| C10 | Implementation notes and handoff | Verified | [Editor implementation/acceptance](v2/SCHEMATIC_EDITOR_IMPLEMENTATION.md), CURRENT_STATUS and DEV_LOG |

Checkpoint (2026-10-21): initial typecheck/lint/full test/build passed, 403 tests.
After one final UI inline-asset/metadata case and screen-scale/readability changes,
the final typecheck/lint/build and **404-test / 25-file full run passed**
(315 V1 + 60 B + 29 C). Build transforms 64 modules. Chrome **155.0.8059.40**
passed seven workflow groups using the local production preview at the existing
`/circuit-equivalence-lab/` base; zero page/console errors or HTTP failures.
Desktop 1440×1100 and narrow 390×844 light/dark screenshots visually inspected.
Actual download/reopen preserves graph/IDs/parameters/geometry/markers; re-export
is byte-identical. Evidence and limits are in the linked acceptance document.

Status: Implementation Complete / Verified, **not Released**. Package remains
`0.1.0`. No material blocker to a separately authorized D module. Next recommended
module: V2.0-D under the existing D05 contract; **do not start automatically**.
No V2.0-D writeback, new engine, dependency, personal-site change, push or deployment.

Verified C implementation is local commit **`290de9b`**; the final handoff documents
are committed separately after lightweight documentation checks. A/B checkpoint
`b7b53bc` remains intact; see local branch history for the handoff commit.

## Completed module: V2.0-D — Editor, Equivalence and Lessons

Status: **Verified, 10/10 (100%)**, authorized 2026-10-21. Verified C baseline
`296c191` was clean; branch `codex/v2-transform-integration` preserves all history.

| ID | Deliverable | Status | Evidence |
| --- | --- | --- | --- |
| D-C01 | Minimal integration architecture | Verified | React-free composition, typecheck and focused tests |
| D-C02 | Eligible projection and stable mapping | Verified | Four drawn fixtures and six imported integration cases |
| D-C03 | Observed terminals and protected boundaries | Verified | Ports, synthetic observations, probes, analysis and board references |
| D-C04 | Four-category discovery and highlights | Verified | Actual engine discovery and SVG highlight UI tests |
| D-C05 | Preview and independent numerical verification | Verified | Equivalent/inconclusive/different/failure and non-mutating previews |
| D-C06 | Atomic verified writeback and history | Verified | Validated geometry, unchanged entities, stale snapshots, undo/redo and file round trip |
| D-C07 | Existing five-stage lessons on user circuits | Verified | All five stages with real 100/220/320 values |
| D-C08 | Integrated editor workflow and V1 compatibility | Verified | Actual Chrome four-category flow, V1 previews, themes and responsive layout |
| D-C09 | Focused, standard and actual Chrome checks | Verified | 34 new cases; 438/438 full tests; typecheck/lint/build; seven Chrome workflow groups |
| D-C10 | Documentation and release-readiness handoff | Verified | [D acceptance](v2/TRANSFORMATION_INTEGRATION_IMPLEMENTATION.md), [release readiness](v2/V2_0_0_RELEASE_READINESS.md), CURRENT_STATUS and DEV_LOG |

Blockers: none. Next: separately authorized V2.0.0 release engineering/public
acceptance; no new phase starts automatically. Core D implementation is complete.
D05 remains unchanged. No new solver, dependency, version bump, push or deployment.

Early checkpoint: 25 integration-domain + 8 editor workflow tests passed; 20 existing
editor/App integration tests passed. Typecheck passed; initial lint reported four
typing/style issues, corrected before the next check. No full historical run yet.

Final integration checkpoint: after a ninth UI/display identity case and visual
fixes, **438 tests in 27 files passed** (404 C baseline + 34 D cases). Typecheck,
lint and build passed (69 modules). Chrome 155.0.8059.40 passed seven workflow
groups at the built local preview with zero page/console errors or HTTP failures.
The same downloaded transformed file reopens and re-exports byte-identically.
Label measurement now uses presentation names, preserving UUID mappings; new
replacement bodies sit below preserved original geometry and auto-fit the view.

Final handoff: D-C01–D-C10 **10/10 Verified / Implementation Complete, not Released**.
Verified source commit `0f3dd6a`; final documentation commit also trims four
formatting-only trailing spaces/lines without semantic source changes. Five scoped
handoff documents and 50 local file links/fences checked; actual exported-file
hashes match and schema/package remain 1 / `0.1.0`. Task browser and preview service
closed. No active next module, public push, production merge, release or deployment.
