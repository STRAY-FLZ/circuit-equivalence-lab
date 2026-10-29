# V3.3 operational-amplifier dynamics — implementation in progress

Owner-authorized scope: finite-gain, single-pole op-amp, passive R/C feedback,
one flat sheet and one explicitly selected AC source. V3.2.0 public baseline and
remote main `69c7f044729b80287334e26810b9ec092da108de` were checked on 2026-10-29;
production served the V3.2 application assets. Branch `codex/v3.3-opamp-frequency`.
No release is authorized until numerical, integration, browser and public acceptance.

## Model and numerical approach

Use a separate pinned component/model; existing ideal-op-amp projects retain their
semantics. Reuse the existing real and complex MNA solvers with temporary internal
branches for the declared model. With an internal unit-ohm resistor, capacitor
`1/(2π fp)`, a unity controlled current and a controlled output of gain `A0`,
the elimination of the internal node gives exactly `A0/(1+j f/fp)`. The projected
branches never enter the source project or its stable connectivity. At DC, the
real MNA system stamps `Vout=A0(Vplus−Vminus)` directly; all external capacitors
are open. Bounds: `0<A0<=1e9`, `1e-6<=fp<=1e12 Hz`, one flat sheet, one op-amp,
positive finite resistances, nonnegative capacitances, independent voltage/current
sources, at most 64 complex unknowns, 256 projected branches, 3–401 frequency
samples and `points × unknowns³ <= 8,000,000`. Positive-cosine RMS phasors and
stable oriented probe anchors are explicit; exactly one selected voltage source
is excited in AC, all other source increments are suppressed.

The actual DC output and branch currents come from the finite-gain equations.
The separately reported ideal comparison calls the existing V3.1 ideal provider;
failure of that comparison cannot be substituted for a finite solution. The exact
model unity frequency is `fp sqrt(A0²−1)` for `A0>1`, whereas `A0 fp` is a
conventional approximation. Suppressed-source output injection establishes return
feedback only for the declared single-device topology. Frequency-domain result
matrices, KCL and original-equation residuals come from the existing complex MNA;
invalid, unsupported, singular, ill-conditioned and cancelled runs remain distinct.
The model is a teaching approximation without rails, clipping, current limits,
slew rate, offset, noise, thermal behavior or a commercial op-amp macromodel.
See [MIT Electronic Feedback Systems, Chapter 5](https://ocw.mit.edu/courses/res-6-010-electronic-feedback-systems-spring-2013/07139ba01c8bd464ed6f8ec649db106d_MITRES_6-010S13_chap05.pdf)
for the distinction between a single dominant-pole loop and more general compensation.

## Checkpoint

O01–O07 verified by focused model, numerical and UI checks. The finite DC relation
uses the selected reference network as the explicit output-voltage and output-current
return; it does not join graph nets. DC-open capacitors, actual source/load currents,
polarity, ideal-model separation, input digests and bounded cancellation are checked.
Source-suppressed 1 V output injection solves the passive return network; its
`β=Vminus−Vplus` defines `L=Aβ`. Only all-resistive external networks are eligible
for the interpolated crossover/phase margin: their positive β is frequency
independent and the single-pole loop magnitude is monotone. R/C networks retain
their actual return samples but no certified crossover or margin, because a
finite grid alone can miss crossings or phase wraps. A unique sampled 0 dB
crossing and a continuous phase branch are required; this is not a general
multi-loop stability proof. A -3.0103 dB cutoff is relative to the separately solved
DC incremental transfer; ambiguous/missing crossings remain unavailable.

Seventeen focused tests passed: follower, non-inverting, inverting, summing,
differential and frequency-dependent RC feedback; exact independent DC/complex
references and cutoff checks; invalid gain/pole/ports, open/positive feedback,
floating and contradictory networks, no crossing, ambiguity, cancellation,
schema-1 roundtrip and stale digest. The full local run passed 787 tests in 49
files, typecheck, lint and build. Real built Chrome verified model and resistor
edits, actual DC/closed/loop values, unsupported feedback, 1440/390 light/dark,
keyboard cursor, schema-1 export/reopen and provenance. Three actual exported
projects contained 603 points, with 1,835 independent scalar checks passed. V1,
DC, AC, transient, Signal, V3.1 analog, V3.2 amplifier, Atlas and competition
integration journeys passed. A development-only theme asset path returned 404;
the production preview's actual theme/JS/CSS resources all returned 200.
O01–O09 verified; O10 production deployment and public acceptance remain.
O01–O10 **9/10**, no current blocker. Preserve prior engines and D05, schema 1,
working tree and release history. Do not start V3.4 or V4.
