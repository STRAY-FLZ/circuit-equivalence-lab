# V3.1 Analog fundamentals — implementation contract

Released 2026-10-28; A01–A10:10/10. Baseline main41564c9 / immutable
application v3.0.0 a77a221. Branch `codex/v3.1-analog-fundamentals`.
Current owner authorization covers V3.1 implementation and release
after numerical, compatibility, built-browser and actual production acceptance.

## Scope and model identity

Reuse schema1 projects, pinned definitions, instance pins, explicit connections,
immutable history and the existing editor. Independent analog provider; existing
V1/D05, DC, AC and linear transient algorithms are unchanged. Models have version1
resources and explicit terminal maps. Geometry never changes connectivity.
Single flat sheet; solver reference selects one existing net without joining nets.

Shockley diode uses IS, n, Kelvin T and a declared reverse-voltage validity limit
(not a breakdown model). VT=kB*T/q, kB=1.380649e-23 J/K,
q=1.602176634e-19 C. gd=IS*exp(VD/(n*VT))/(n*VT).
No junction capacitance, series resistance, temperature scaling of IS or avalanche.

Introductory NPN: one grounded-emitter device per circuit; base junction
IB=IS*max(expm1(VBE/VT),0). Active IC=beta*IB, IE=-(IB+IC), VCE>=VCEsat.
Cutoff VBE<=0. Saturation imposes VCE=VCEsat and solves IC independently;
0<=IC<=beta*IB is checked. Active/saturation candidates must satisfy their own
inequalities. This deliberately simplified model is not Ebers-Moll.
Exact active derivatives gm=beta*IS*exp(VBE/VT)/VT and rpi=beta/gm;
IC/VT is only the large-forward-bias approximation. No active gain in saturation.

Enhancement long-channel nMOS: k in A/V^2; overdrive u=VGS-Vth.
Cutoff u<=0; triode ID=k*(u*VDS-VDS^2/2); saturation ID=k*u^2/2.
Analytic gm/gds follow these expressions. Reject final negative VDS; no body diode,
body effect, channel-length modulation, subthreshold or breakdown model.

Ideal op-amp: separate linear capability, one amplifier with passive resistive
feedback and independent sources. Test feedback with sources suppressed and output
forced to1V: d(Vminus-Vplus)/dVout must be positive before imposing input equality.
Inputs draw no current. No rails, saturation, bandwidth, slew or noise prediction.

## Numerical contract

Actual residual/Jacobian MNA; existing complete-pivot linear algebra is reused.
Damped Newton with bounded steps/iterations, no gmin or arbitrary zero fallback.
Validate original ampere KCL and volt constraints plus finite values and model
regions; failure never returns a last iterate as a verified result.
Quasi-static sweeps solve each independent input voltage; these are not nonlinear
transient predictions. Small-signal gains solve the verified operating-point
Jacobian with explicit input/output stable anchors and a source perturbation.
No capacitive/high-frequency gain claim.

Reference background: [ngspice manual](https://ngspice.sourceforge.io/docs/ngspice-43-manual.pdf)
describes Newton residual/iterate convergence; [MOS model background](https://ngspice.sourceforge.io/docs/ngspice-42-manual.pdf)
limits level1 to long-channel devices. This work implements the narrower equations
above, not ngspice compatibility or commercial-device accuracy.

## Acceptance and persistence

A01 architecture; A02 diode/NR; A03 diode experiments; A04 NPN; A05 nMOS;
A06 small signal; A07 ideal op-amp; A08 integration/templates; A09 acceptance;
A10 documentation/release. Only verified deliverables count as completed.
Stable IDs, revision/digest/provenance and complete portable JSON remain required.
Large sampled data formats remain deferred under D06. No new dependencies.

## Executed numerical and integration evidence

`src/analog/mna.test.ts`: independent diode bisection/thermal constant/derivative,
reverse polarity and breakdown boundary, central-difference Jacobian columns,
NPN cutoff/active/saturation and terminal KCL, CE derivative versus finite bias
perturbation, square-law MOS regions/continuity, CS gain, five ideal-opamp
fixtures, singular/conflicting/floating/nonfinite/cancelled/iteration failures.
`engine.test.ts`: all12 actual recipes, pinned providers, stable UUID pins,
canonical schema1 roundtrip, digest tampering, wrong units/model versions/values,
independently extracted loadline and each of41 actual sweep points for rectifier
and limiter. `competition/analog.test.ts`: actual source/revision/digest capture,
snapshot artifact, stale evidence and portable HTML. 32 focused cases.
Complete candidate suite:733 tests/46 files (48 more than V3.0.0).

Newton: at most300 iterations; node step<=1V, junction step<=.08V; at most32
backtracking trials. Merit scales KCL by1mA and voltage constraints by1V only
for choosing a step. Acceptance uses **original** residuals: max KCL<=1e-11 A,
max voltage constraint<=1e-9 V, previous node update<=1e-7 V, branch current
update<=1e-10 A. Analytic exponential never clips to a fabricated physical value;
exponent>650 fails numerically. The reused equilibrated complete-pivot solver
rejects rank-deficient/ill-conditioned systems. No leakage/gmin regularization.
Dense teaching budget: nets+elements<=160, one grounded-emitter NPN or one
ideal op-amp; multiple diodes/nMOS with supported networks may be solved.

The op-amp feedback test suppresses independent sources, removes input equality,
forces output1V and solves the actual passive network. Require
(Vminus−Vplus)/Vout>1e-8. The subsequent MNA has a separate output-current
unknown and input-equality equation. Feedback sign alone is not a prediction of
dynamic stability: no dynamic op-amp model is present.

Small-signal output is dVout/dVin for an explicit independent source whose negative
terminal is at reference. Other independent sources have zero perturbation.
Require NPN active / nMOS saturation and positive finite requested amplitude;
junction perturbation<=.05*n*VT, MOS overdrive perturbation<=.05*u, and predicted
excursion must stay inside NPN/MOS region boundaries. rpi and gm derive from the
actual NPN exponential; no fixed-VBE model is combined with invented derivatives.
This is a local low-frequency linearization, without arbitrary-frequency AC claims.

The single-diode loadline removes that diode and solves the external linear network
at open circuit and1mA test current, deriving Vth/Rth. It is shown only for positive
finite Rth. Plot samples use the actual Shockley function; operating-point numbers
are solver outputs. Quasi-static scans have2–121 points; any failed/unsupported
point rejects the whole new capture, without presenting a partial verified sweep.
No time axis, nonlinear transient, junction storage, rectifier filter/ripple claim.

## Project and user-interface boundaries

The new palette pins are diode A/K, NPN B/C/E, nMOS G/D/S, op-amp +/−/OUT.
Stable IDs and separate symbol positions retain undo/redo, moving, rotation,
explicit wires and file identity. Primary symbol values stay short; all model
parameters remain editable in properties. Table shows terminal voltages/currents,
VBE/VCE or VGS/VDS and region/derivatives next to the existing diagram.
390px tables scroll horizontally, retaining full numbers; existing theme tokens,
`stray-theme`, home links and keyboard editing are preserved.

Application/package/lockfile/writers3.1.0; file schema1. Canonical unit A/V^2 is
additive. Existing V2/V3 files remain readable. Older readers may reject nMOS files
containing this previously unknown unit; older providers cannot solve new models.
Keep an original file and use V3.1 for analog editing; never silently downgrade a
device or strip data. Opaque analog records are not a cross-version solver promise.

`org.stray.analog` version1 stores sheet ID, selected stable reference/source/output,
perturbation/sweep settings, original configuration/provenance/digest, full resolved
circuit (parameters/ports/pin IDs/net snapshots), operating point and complete small
sweep/gain. It is a project extension containing bounded small datasets under D06,
not another schema/editor or external dataset container. Atomic immutable writeback
uses the expected current revision; old result stays bound to its original input.
After reopening, saved settings/record are available, but require an explicit rerun
before reporting a new verified result. Imported opaque records are never trusted
as numerical success. Changing source/settings marks live output stale.

Competition uses its existing immutable analysis capture/artifact path. Positive
success only, current project/revision and recomputed input digest required; terminal
values carry units and region. Source edits make evidence historical. These are
introductory-model software results, not hardware measurements or contest grading.

No direct Signal waveform transfer is offered for a voltage-domain static sweep:
it has no physical sample-time axis. Existing transient/Signal waveform handoff
remains independent and unchanged. Preserve all raw small-sweep points in JSON.

Actual local/public browser and release identity: [release record](V3_1_0_RELEASE.md).
