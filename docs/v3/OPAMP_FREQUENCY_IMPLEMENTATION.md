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

O02 verified: fixed model evaluates the exact complex gain and unity crossing;
independent pole/high-frequency fixtures and invalid gain/pole/frequency checks
passed. Initial O01/O03/O04/O05 code and six real Atlas recipes are present. Eight
focused tests passed, including independent follower, non-inverting and inverting
DC/complex gain and cutoff references, actual source suppression in the summing
network, schema-1 identity, cancellation, stale digest and ideal-model rejection.
Editor/Atlas integration, further boundary tests, final checks and release remain.
O01–O10 **1/10**, no current blocker. Preserve prior engines and D05, schema 1,
working tree and release history. Do not start V3.4 or V4.
