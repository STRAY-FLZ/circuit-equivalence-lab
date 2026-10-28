# V3.1.0 — Analog fundamentals release record

2026-10-28. Local candidate **Verified9/10**, not yet published. A01–A09 Verified;
A10 production release In Progress. Baseline main41564c9 / immutable
v3.0.0 application a77a221 and handoff workflow40334349933 confirmed via GitHub;
actual public Chrome returned v3.0.0 before this implementation.
Focused branch `codex/v3.1-analog-fundamentals`, core checkpoint4f67be4.

## Implemented and independently verified

| ID | Scope | Current acceptance |
| --- | --- | --- |
| A01 | Pinned models/terminals, typed providers, immutable project/digest | Verified |
| A02 | Shockley + damped NR/MNA residual/Jacobian | Verified |
| A03 | Editable bias/loadline/half-wave/limiter quasi-static experiments | Verified |
| A04 | Exponential-base NPN cutoff/active/saturation | Verified |
| A05 | Long-channel enhancement nMOS square-law regions | Verified |
| A06 | Same-model derivatives and actual CE/CS local gains | Verified |
| A07 | Actual negative-feedback ideal-opamp MNA, five topologies | Verified |
| A08 | Editor,12 Atlas templates, files and competition | Verified |
| A09 | Full checks and built Chrome acceptance | Verified |
| A10 | Version/docs/integration/deploy/public acceptance/tag/Release | In Progress |

Methods, exact acceptance tolerances and compatibility are in
[ANALOG_IMPLEMENTATION.md](ANALOG_IMPLEMENTATION.md). No V1/D05/DC/AC/transient
numerical rewrite; no dependency added or personal-website change.

## Local evidence

- Typecheck/lint/build passed; full candidate suite733 tests/46 files.
-32 focused numerical/provider/competition cases passed after final separate V/A
  Newton iterate tolerances. All12 analog recipes solve and roundtrip stable IDs.
- Real Chrome155 built preview, eight journeys in `tests/browser/analog-workspace.js`:
  diode actual IS edit/loadline/41-point scan/reopen/invalid parameter; half-wave
  and limiter; NPN region transitions/RB/CE; MOS regions/CS; all five op-amps;
  open-feedback rejection;1440/390 light/dark/keyboard; competition actual capture.
  No app console/resource errors. Screenshot review prompted readable scrollable
  narrow result tables; final candidate all8 journeys passed after correction.
- Actual default diode VD=.5741915V/ID=.0044258085A; changing IS to2e-12 produces
  ID=.0044436239A. CE default Av=−7.1739326; CS=−2. Ideal follower.1V,
  inverting−1V, noninverting1V, summing−2V, differential2V.
- Five actual downloaded schema1 writer3.1.0 files,128 operating points,
  1037 independent KCL/device/source/pin/provenance checks passed using
  `node tests/browser/verify-analog-downloads.mjs` (no application-solver import).
- Scoped existing workflows: actual DC5mA; RC RMS/Bode.846733; adaptive transient
  RC6.31782904V at1ms (analytic6.32120559V separately); generated Signal/FFT;
  V1 actual transform/lesson/MathML/home. Historical exhaustive tests remain archived.

## Model limits

Teaching models only: IS fixed with Kelvin VT, no temperature scaling/seriesR or
junction capacitance; one grounded-emitter NPN, no reverse-active/Ebers-Moll/
Early/charge/thermal/high-frequency physics; nMOS positive VDS, no body diode/body
effect/CLM/subthreshold; one ideal resistive-feedback op-amp, no rail/bandwidth/slew/
noise/dynamic-stability prediction. No arbitrary SPICE/nonlinear transient,
capacitor-filter ripple/oscillators/power switching/digital/MCU/PCB/V3.2/V4.
Schema1 retained; old readers can reject the new canonical A/V^2 unit. Saved
analog records remain original evidence, requiring rerun for new verified results.

Final candidate typecheck/lint/733 tests/build and repeated scoped built acceptance
passed. Browser checked assets `index-CKwkNEom.js` / `index-8iEHP9Pq.css`.
Nonfinite diode derivatives/rpi reject explicitly; original V/A tolerances are separate.

## Production identity and publication

Pending final candidate SHA, successful build/deploy workflow, real public replay,
immutable v3.1.0 annotated tag and published GitHub Release. Do not call this
Released from local checks or a successful push alone.

## History-preserving rollback

Keep immutable v3.0.0 at a77a221 and v3.1.0 release identities. For an authorized
rollback, revert the entire V3.1 change range on a new codex branch (including new
providers, unit, templates, UI, version and docs), leaving earlier history intact;
review, run standard checks, integrate without force and verify Pages/live version.
Choose the actual pre-release main41564c9 baseline; do not reset/force-push or move
tags. Keep exported V3.1 analog originals; older app cannot be promised to import
new units/models. Restoring old hosting does not migrate new files.
