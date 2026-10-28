# V3.2.0 — Amplifier frequency response release record

2026-10-28. Local candidate **Verified9/10**, not yet published. B01–B09 Verified;
B10 production release in progress. Baseline
main e29fa051784851a2be5e897d445ea82538eb0e36 and public v3.1.0 application
0bd1b11ccba8a52c54727c2e49433d6d31577027 confirmed. Feature branch
`codex/v3.2-amplifier-frequency`, core checkpoint cfbcfdf.

| ID | Deliverable | State |
| --- | --- | --- |
| B01 | Typed independent provider and pinned graph | Verified |
| B02 | Actual nonlinear bias and same-point linearization | Verified |
| B03 | Hybrid-π exact device derivatives | Verified |
| B04 | nMOS incremental model and regions | Verified |
| B05 | Explicit coupling/bypass/effective capacitor network | Verified |
| B06 | Complex MNA, one AC source, actual point failures | Verified |
| B07 | Justified sampled plateau, crossings and bandwidth | Verified |
| B08 | Editable Atlas/editor experiments and portable records | Verified |
| B09 | Full numerical, compatibility and built Chrome acceptance | Verified |
| B10 | Version/docs, public acceptance, verified tag and Release | In Progress |

## Local implementation evidence

21 targeted tests include independent fixed-gm CE−20 and CS−10 fixtures,
isolated 10kΩ/1µF high-pass15.915494Hz and 10kΩ/100pF low-pass159154.943Hz,
analytic-vs-finite-difference transistor derivatives, loaded/degenerate gain,
independent scalar DC bias bisection across20 fresh UUIDs, capacitor changes,
zero capacitance, bias/source separation, reference polarity, failed-frequency
gaps, plateau/interpolation/no-crossing/ambiguous crossings, invalid models and
inputs, cancellation, stable IDs and schema1 file roundtrips. These isolated RC
references are **not** assumed to be the amplifier's bandwidth.

Local built Chrome155 verified actual CE and CS bias, sweep and Bode, coupling
and bias edits, Cgd effect with identical DC, stale results, actual JSON file
reopen/settings/provenance, invalid bias/unsupported devices, desktop/narrow
light/dark controls and keyboard cursor. Four browser downloads contain804 actual
frequency points; independent script `tests/browser/verify-amplifier-downloads.mjs`
checks complex equations, branch KCL, exact derivatives, gain, plateau and
interpolation. Existing actual DC/AC/transient/Signal/V1/analog/competition
integration workflows were also checked. Final candidate Chrome resources
index-1FkAOr_N.js / index-CUYa2Us9.css; all four journeys and independent
checks passed after explicitly editing source and load.

Final typecheck/lint/762 tests/47 files/build passed. The initial sandbox test
run revealed a local loopback restriction and a new-template metadata conflict;
both were resolved, and all standard checks reran successfully.

Example after explicitly changing RS=1.5kΩ/RL=2.2kΩ: CE Q1 VBE=.54239954V,
VCE=9.6105266V, IC=.12939316mA, gm=.0050051508S; at1kHz |H|=4.659909,
phase−176.84612°. Measured sampled plateau≈4.64047, lower≈44.2284Hz,
upper≈514564.84Hz, bandwidth≈514520.61Hz. These values are numerical
interpolation estimates for this actual circuit, not isolated RC formulas.
MOS example VGS=2.236068V, VDS=7.7082039V, ID=.76393202mA and
gm=.001236068S; changing Cgd from20pF to200pF changes the sampled high-frequency
response while leaving the verified DC bias unchanged.

## Model and persistence limits

Only one introductory NPN in forward-active region or one nMOS in saturation;
actual R/C and independent sources, one explicit sinusoidal voltage test source.
Capacitors open at DC, jωC in AC; Cπ/Cμ/Cgs/Cgd are explicit teaching assumptions.
No SPICE libraries, Early/CLM/body effects, full transistor capacitance physics,
arbitrary multistage circuits, nonlinear transient, thermal/noise or real op-amp
dynamics. Midband is an explicitly reported numerical plateau heuristic; −3.0103dB
crossings are numerical interpolation estimates and may be unavailable.

Schema1 is retained; writer3.2.0. Existing project files remain readable. Frequency
settings and complete bounded point records are in a namespaced project extension.
Older applications may retain this opaque extension but do not implement its
provider; reopening requires explicit rerun to validate the current revision.
No new dependency or rewrite of existing V1/D05/DC/AC/transient/analog engines.
Full details and provenance: [implementation](AMPLIFIER_FREQUENCY_IMPLEMENTATION.md).

## Production and rollback

Pending final candidate, successful deployment, actual public interaction,
v3.2.0 annotated tag and published Release. Do not call this Released from a
local build or successful push. For an authorized rollback, revert the full
V3.2 change range on a new branch, run checks and redeploy without force or
moving immutable tags. Keep exported V3.2 project originals; old applications
do not gain the V3.2 provider. Do not reset history or touch the personal site.
