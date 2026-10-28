# V3.2 amplifier frequency response — working contract

Started 2026-10-28. B01–B10 In Progress/Planned; no public V3.2 release yet.
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

The legacy DC solver can reject a Newton correction when a disconnected coupling
branch has an almost-zero componentwise row scale. Only for its specific
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
in the same real circuit. No Miller correction is added to an explicit capacitor.

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

No general SPICE, nonlinear transient, full transistor capacitance model, thermal,
noise, arbitrary multistage/oscillator behavior, real op-amp dynamics, MCU or PCB.
Existing V1/D05/DC/AC/transient/nonlinear solver behavior remains unchanged.
Background: [MIT MOS operating-point linearization](https://ocw.mit.edu/courses/6-012-microelectronic-devices-and-circuits-spring-2009/16357c9888d3c06699dd573b0f5a8869_MIT6_012S09_rec11.pdf),
[MIT CE frequency response](https://ocw.mit.edu/courses/6-012-microelectronic-devices-and-circuits-spring-2009/e6afee3d5cc0080ed7bf6f7fd9c2c223_MIT6_012S09_lec22.pdf).
