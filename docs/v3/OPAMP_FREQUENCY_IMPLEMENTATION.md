# V3.3 operational-amplifier dynamics — implementation in progress

Owner-authorized scope: finite-gain, single-pole op-amp, passive R/C feedback,
one flat sheet and one explicitly selected AC source. V3.2.0 public baseline and
remote main `69c7f044729b80287334e26810b9ec092da108de` were checked on 2026-10-29;
production served the V3.2 application assets. Branch `codex/v3.3-opamp-frequency`.
No release is authorized until numerical, integration, browser and public acceptance.

## Planned numerical approach

Use a separate pinned component/model; existing ideal-op-amp projects retain their
semantics. Reuse the existing real and complex MNA solvers with temporary internal
branches for the declared model. With an internal unit-ohm resistor, capacitor
`1/(2π fp)`, a unity controlled current and a controlled output of gain `A0`,
the elimination of the internal node gives exactly `A0/(1+j f/fp)`. The projected
branches never enter the source project or its stable connectivity. DC capacitors
are open. Suppressed-source output injection can establish return feedback only
for the declared single-device topology, and must not be interpreted as a general
multiloop stability analysis. Proposed design is not acceptance evidence.

## Checkpoint

O01–O07 verified by focused model, numerical and UI checks. The finite DC relation
uses the selected reference network as the explicit output-voltage and output-current
return; it does not join graph nets. DC-open capacitors, actual source/load currents,
polarity, ideal-model separation, input digests and bounded cancellation are checked.
Source-suppressed 1 V output injection solves the passive return network; its
`β=Vminus−Vplus` defines `L=Aβ`. A unique sampled 0 dB crossing and a continuous
phase branch are required for an interpolated phase margin; this is not a general
multi-loop stability proof. A -3.0103 dB cutoff is relative to the separately solved
DC incremental transfer; ambiguous/missing crossings remain unavailable.

Seventeen focused tests passed: follower, non-inverting, inverting, summing,
differential and frequency-dependent RC feedback; exact independent DC/complex
references and cutoff checks; invalid gain/pole/ports, open/positive feedback,
floating and contradictory networks, no crossing, ambiguity, cancellation,
schema-1 roundtrip and stale digest. Real development Chrome verified a follower
and exported/reopened its 201 closed-loop and 201 loop samples. A development-only
theme asset path returned 404; final acceptance must use the production build.
O08/O09 integration, full built-browser/old-module checks and O10 release remain.
O01–O10 **7/10**, no current blocker. Preserve prior engines and D05, schema 1,
working tree and release history. Do not start V3.4 or V4.
