# Linear transient laboratory — V3.0.0

Status 2026-10-26: T01–T09 locally Verified, release In Progress, not Released.
Baseline V2.5.0 `99e2ba7512341af3ffe0ba4697a4bdcd3a670cca`. No V3.1/V4 work.

## Provider and supported models

`org.stray.engine.transient-mna / 1`, analysis `transient.linear`, owns explicit
version-1 options. `createTransientInput` validates/freeze-copies the actual
project/configuration and computes SHA256; `run` rechecks it. Capability inspection
checks pinned adapters, references, options, limits and initial algebraic solve.
The provider is independent of DC/AC; only the unchanged equilibrated complete-pivot
real linear solver is reused. There is no third-party simulation dependency.

Supported: finite positive R/C/L, pinned independent voltage/current sources, one
flat sheet, explicit graph/scoped labels. Reference policy matches DC/AC: explicit
stable anchor, otherwise analog marker hints, otherwise unique electrical GND net.
References never create connectivity; ambiguous/cross-sheet scopes are rejected.
Unsupported models (including controlled sources in this initial transient release)
remain unsupported; floating, singular, inconsistent and nonfinite systems fail.
No leakage, automatic grounding, idealization of unknown devices or free zero solve.

## Actual differential-algebraic equations

Orient v=Vp−Vn and i from model p to n (built-ins pin1→pin2). KCL applies at every
node, including the numerical reference in independent post-solve checks.

- R: i=v/R. Stamp the actual conductance into nodal rows.
- C: i=C·dv/dt; a branch-current unknown and one constitutive row.
- L: v=L·di/dt; a branch-current unknown and one constitutive row.
- Independent V: branch-current unknown plus Vp−Vn=source(t).
- Independent I: signed current injection into node equations.

For a backward-Euler step h, C row is `v[n]−h/C·i[n]=v[n−1]`, and L row is
`v[n]−L/h·i[n]=−L/h·i[n−1]`. Each actual matrix is equilibrated/solved; the original
unit residual is checked. Storage history is derived from the accepted solution,
never a prerecorded exponential. Branch currents are independently reassembled
for KCL with tolerance `1e-11 A + 1e-8 × sum(abs(incident current))`.

## Initial state, source events and step selection

Every capacitor requires an explicit initial voltage in V; every inductor an initial
current in A, identified by component UUID. Zero is an explicit selectable value,
not a replacement for an incompatible initial state. No automatic DC bias solve.
At 0+ the exact specified C voltage and L current replace their dynamic rows; the
remaining algebraic quantities are solved under right-hand source values. Thus
finite consistent storage states are continuous, while resistor/source currents
or voltages may jump. Redundant storage/source constraints and impulsive solutions
are explicitly outside this initial implementation, even when some ideal constraints
could be made compatible using a more general higher-index treatment.

Every independent source has its own declared V/A waveform: constant, step with
initial/final value and event time, or finite rectangular pulse with start/end.
All values/time intervals are finite and validated. A pulse is active on [start,end).
No inheritance from DC parameters or AC RMS phasors. These are mathematical sources,
not a physical switch-contact or topology-changing solver.

Internal steps stop exactly at source events. Integrate using the left forcing to
the event, retain C voltage/L current, and re-solve right algebraic variables.
Uniform output at an event records the right solution. Events between output samples
are integrated but may be visually missed when the output interval is too coarse;
users must refine the output interval for narrow pulses.

Backward Euler is first-order and dissipative, selected for robust passive linear
storage integration without trapezoidal discontinuity ringing. Each attempted h
compares one full step with two half steps, with no extrapolation. Accept both half
steps only if every storage-state difference is ≤ absoluteTolerance + relativeTolerance
× max(abs(previous state),abs(fine state)); reject/shrink otherwise. Absolute bounds
are 1e-8 V / 1e-10 A; user relative bound 1e-8–1e-3, default 1e-5. Step suggestion
uses safety .85/sqrt(errorRatio), factor clamped .1–2, capped by uniform output interval.
This controls a local estimate, **not** guaranteed global accuracy. Real integration
steps/attempts/rejections/errors are recorded. Refine time interval/tolerance and
compare independent analytical references; do not call the approximation exact.

The model equations are derived here. For context, the
[ngspice project manual](https://ngspice.sourceforge.io/docs/ngspice-manual.pdf)
separately documents transient initial-condition and integration options; this
application does not embed ngspice or claim its broader SPICE capabilities.

## Energy accounting

Compute EC=½C·v² and EL=½L·i² in joules. For each accepted half step, integrate
R power and independent-source power with the same right-end BE quadrature. The
discrete energy identity is `ΔE + dissipated_R − delivered_sources + loss_BE = 0`,
where `loss_BE=Σ(½C·Δv²+½L·Δi²)` is explicit numerical dissipation, not physical loss.
Reject nonfinite accounting or imbalance beyond `1e-12 J + 1e-7 × energyScale`.
Physical dissipation, source delivery and numerical error are displayed separately.
Natural passive fixtures verify non-increasing total storage energy; source-driven
tests account for actual delivered energy rather than assuming energy must decrease.

## Experiments and analytical references

Reuse existing Atlas instances; no duplicate circuit recipes. Ten entry templates:
RC charging/discharging, RL series/natural, series/parallel RLC, RC low/high-pass,
RL low-pass, RLC band-pass. Dedicated transient actions set explicit teaching values.
Users can edit the actual circuit/configuration and rerun.

RC uses 1kΩ/1µF and RL 100Ω/0.1H: both τ=1ms. At t=1ms the independent 0→10V,
zero-state references are vC=6.321205588V and iL=0.06321205588A. Nonzero initial
energy supports zero-input/complete responses. Closed-loop reference recognition
checks actual topology and polarity; it is not based solely on a template label.

Series RLC uses L=1H/C=25µF, α=R/(2L), ω0=1/sqrt(LC)=200rad/s; R=200/400/600Ω
shows under/critical/overdamping. Parallel natural RLC uses α=1/(2RC); R=200/100/50Ω
for those classes. ωd is shown only when real. Natural/step response and C↔L energy
exchange are numerical outputs. Independent repeated-root/near-critical references
use sinc/expm1 and stable slow roots to avoid cancellation/overflow. Delayed/pulse
or arbitrary unsupported closed forms have numerical plots without a false reference.

## Workbench, data and compatibility

The editor owns an independent 暂态分析 panel with explicit source/IC fields,
actual circuit geometry, teaching parameter transactions, run/cancel, exact sample
inspection, synchronized scope cursors and zoom, selectable node/branch/energy
series. Uses the existing min/max display envelope without modifying full samples.
Draft/project changes invalidate current results. Stored records are compared by
canonical electrical/geometry basis plus settings, not merely an append revision.

Schema1 is unchanged. `org.stray.transient` keeps per-sheet versioned options and an
explicit latest-result UUID (array ordering after file canonicalization is not time
ordering). Immutable result manifests reference full float64-le waveform datasets
in four-channel groups, preserving every output series and raw prior datasets.
Each group carries simulated engine/revision/digest/configuration and uniform axis;
manifest records actual method, event and numerical/energy diagnostics, plus the
resolved original R/C/L values, node/branch/pin orientations and reference snapshot.
Later circuit edits cannot silently change those recorded simulation parameters.

Selected scope views reuse original assets with fresh derived-channel identities
and full ancestry. Signal Lab opens those waveforms for inspection without automatic
FFT; inappropriate record length is never silently padded. CSV names label simulated
data; the complete project retains authoritative provenance. Competition receives
actual sample statistics through existing evidence/experiment/metric rules, with
unit-aware energy support J/mJ/uJ, original requirements and stale semantics retained.

Saving a simulation is one validated transaction. Editor history retains an asset
vault and exports only current manifest assets, so undo/redo cannot corrupt files.
Reopen preserves exact bytes/UUIDs; a recomputation creates new analysis/result/data
IDs. Older V2 readers preserve opaque extensions/assets but do not implement the UI.
No migration or silent rewrite of historical DC/AC/V1 results.

## Bounds and acceptance state

2–8193 uniform output points; duration must be an integral multiple of output dt.
48 unknowns/64 components/500000 scalar outputs. Execution rejects beyond 60000
linear solves or 80000000 estimated unknowns³-work; yields every 16 attempts and
checks cancellation between bounded work. Step underflow/failed error control fails,
never a partial success. Existing file limits remain 32MiB JSON, 8MiB per asset,
16MiB total inline bytes. Any asset/budget failure keeps the original project intact.

Scoped numerical/data tests cover analytical RC/RL, all RLC damping cases, initial
continuity, off-grid/aligned pulses, polarity, current-source RC, time refinement,
small/large time constants, KCL/energy, bad input/constraints, cancellation/work caps,
source/asset identity, exact export/reopen, latest-result order and competition links.
Final standard checks passed: 685 tests/43 files, typecheck/lint/build. Built Chrome
11 grouped journeys and a targeted final report handoff passed; 15 native projects/
9615 samples independently matched analytical fixtures, with KCL/energy/asset/CSV/
report checks. Public candidate 501f3e1 / workflow40329459842 passed all 11 workflows and the same
actual-download checks. Final axis-label correction passed four narrow SVG text
bounds and nine scoped UI tests; corrected public assets/tag/Release are being
confirmed. See
[release evidence](V3_0_0_RELEASE.md).
No universal symbolic, nonlinear, switch, coupled-inductor, SPICE, hardware or PCB claim.
