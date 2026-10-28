# V3.2 amplifier frequency response — working contract

Released 2026-10-29 (Asia/Shanghai); B01–B10:10/10.
Baseline: clean local/remote main e29fa051784851a2be5e897d445ea82538eb0e36,
V3.1.0 application/tag 0bd1b11ccba8a52c54727c2e49433d6d31577027.
Branch `codex/v3.2-amplifier-frequency`; release authorized only after acceptance.

The original project graph and stable anchors are authoritative. This provider is
independent of the V2.4 AC and V3.1 analog providers; it reuses their unchanged
complex-MNA and nonlinear operating-point numerical implementations. One NPN or
one nMOS, explicit R/C and independent sources, one flat sheet. Device definitions,
model versions, pins, positive resistor values and capacitor units are checked.
Capacitors are open for the DC solve and contribute jωC to the AC network; zero
capacitance is an open circuit, not a hidden short. The projection is temporary,
retains all source anchors/connectivity, and does not change the project snapshot.

The legacy DC solver can reject a Newton correction via its componentwise
normalized-residual check in circuits with DC-open coupling branches. Only for its specific
`DC_RESIDUAL` diagnostic, the new provider retries the same original V3.1 residual
and analytic Jacobian with independently scaled complex elimination. Each Newton
correction is checked in original units (1e-13 A or 1e-11 V absolute plus 1e-9
relative); final all-node KCL, voltage constraints and separate voltage/current
step tolerances are checked. The fallback changes no legacy engine and accepts no
unverified last iterate or fictitious leakage. The loaded divider/degeneration
bias is cross-checked against independent scalar bisection over fresh UUIDs.

For an NPN with an emitter resistor, selecting the emitter as the *temporary DC
voltage gauge* permits reuse of the unchanged V3.1 solver. This does not connect
the emitter to ground. Voltages are translated back to the user's explicitly
selected reference, and absolute voltage differences and currents are unchanged.
An nMOS is solved using the selected reference. Each run solves the actual current
DC bias first; saved results are never reused as current bias.

NPN active incremental branches: iB=gπ·vBE, iC=gm·vBE, iE=−iB−iC,
gπ=IS·exp(VBE/VT)/VT, gm=βgπ and rπ=1/gπ. No invented Early resistance.
nMOS saturation: iD=gm·vGS+gds·vDS, iG=0, iS=−iD; gm and gds are the exact
V3.1 model derivatives and gds=0 without channel-length modulation. All effective
Cπ/Cμ/Cgs/Cgd are explicitly connected editable capacitor elements, not inferred
from device physics. Ordinary source/load/coupling/bypass components are stamped
in the same real circuit. Device terminal current arrays describe the intrinsic
static model; currents through explicitly connected capacitors are separate branch
currents and are included in actual node KCL. No Miller correction is added to an
explicit capacitor.

Only one selected independent source receives the separately configured positive
cosine RMS test phasor; all other ideal V sources have zero AC voltage and all
other ideal I sources zero AC current. DC source values are never replaced.
Input/output are oriented pairs of stable anchors. Each frequency uses actual
complex equations, original residual/KCL checks and conditioning diagnostics;
failed frequency points remain gaps. Results capture revision, configuration,
digest, operating point and complete bounded sweep data.

Midband must be an actual contiguous near-flat plateau: at least five successful
samples spanning at least half a decade with <=0.3 dB range; report its mean dB
and sample span. Crossings are interpolated relative to this measured plateau by
10log10(2) dB; only unique lower/upper crossings can establish bandwidth. Missing
coverage, gaps and ambiguous crossings remain unavailable. These are numerical
estimates, not analytical pole claims.

## Implementation, budgets and checks

`createAmplifierInput` snapshots the actual project/configuration and hashes the
canonical JSON. The provider checks the digest again before every run. It solves
DC afresh, checks the declared transistor region, builds the incremental network
with a controlled-current branch and (for BJT) a base/emitter rπ branch, then
uses the unchanged V2.4 complex pivoting/MNA core. All physical R/C, independent
sources and explicit test-port anchor IDs remain the actual project identities.
Synthetic gm/rπ branch identifiers are result-local descriptors, not persistent
project entities. The documented single device and positive-frequency bounds are
enforced; at most64 complex unknowns,256 branches,401 samples and8,000,000
`points×unknowns³` operations. Sweeps yield at least every eight points and can
be cancelled without returning a partial sweep as success.

Original complex matrix residual, recomputed node KCL and complex power checks
come from the existing complex MNA routine. The user-specified AC source is
independent of all DC values and has positive-cosine RMS convention. Peak device
excursion is sqrt(2) times the RMS phasor magnitude: the linearization checks the
existing model's 5% control-voltage limit and the relevant region boundaries at
each frequency. A failed point keeps its diagnostic and produces a plot gap; it
does not cause interpolation through the gap or fabricate a value.

The plateau is the widest contiguous segment satisfying the declared sample and
0.3dB range requirements; its average dB defines the half-power threshold. The
lower and upper estimates are supplied only if exactly one respective crossing
is found without a failed point separating it from the plateau. If both estimates
exist, bandwidth is their difference. A plateau is a numerical heuristic, not a
guarantee of a unique physical pole or a substitute for frequency coverage.

## Editor, Atlas and data provenance

Eight independently instantiated schema1 recipes cover CE direct bias, emitter
degeneration, coupling, emitter bypass, CS direct bias, source degeneration,
coupling, and source bypass with explicit gate capacitances. Input/output ports,
test source, RMS amplitude and frequency settings are explicit on opening. Use
the existing component properties to change source/load, bias and capacitances;
the analysis panel exposes current bias and frequency results side by side with
the circuit and invalidates captured output whenever the project or settings
change. It never treats a saved result as a fresh operating point after reopening.

The version1 `org.stray.amplifier-frequency` project extension holds the stable
sheet/source/port IDs, settings, original configuration, project/revision/digest,
DC model snapshot, single-frequency matrix/phasors, device terminal phasors,
bounded real sweep samples, KCL diagnostics and cutoff estimates. These are small
project-contained data, not sampled time-domain waveforms; no artificial Signal
dataset or time axis is generated. Projects continue to use versioned UTF-8
schema1 JSON and existing asset integrity checks. V3.1 files remain readable;
older applications may preserve the opaque extension but cannot run this provider.
Saving is an immutable expected-revision transaction. Stored provenance is visible;
explicit re-analysis verifies the currently opened circuit and configuration.

## Verification

Independent fixtures set gm=0.02S, RC=RL=2kΩ and obtain −20; gm=0.005S,
RD=RL=4kΩ and obtain −10. Isolated RC references are 15.915494Hz and
159154.943Hz. They exercise linear algebra/model stamps independently and are
not presented as a transistor circuit's measured cutoff. Actual loaded BJT bias
also matches scalar bisection across 20 independent UUID allocations. Analytic
derivatives match finite differences; source/load and polarity changes,
degeneration, all explicit capacitor roles, failed points, singular/invalid
models, extrapolation boundaries, cancellation, persistence and old integrations
are checked. Actual local/public observations are recorded in
[V3.2 release evidence](V3_2_0_RELEASE.md).

No general SPICE, nonlinear transient, full transistor capacitance model, thermal,
noise, arbitrary multistage/oscillator behavior, real op-amp dynamics, MCU or PCB.
Existing V1/D05/DC/AC/transient/nonlinear solver behavior remains unchanged.
Background: [MIT MOS operating-point linearization](https://ocw.mit.edu/courses/6-012-microelectronic-devices-and-circuits-spring-2009/16357c9888d3c06699dd573b0f5a8869_MIT6_012S09_rec11.pdf),
[MIT CE frequency response](https://ocw.mit.edu/courses/6-012-microelectronic-devices-and-circuits-spring-2009/e6afee3d5cc0080ed7bf6f7fd9c2c223_MIT6_012S09_lec22.pdf).
