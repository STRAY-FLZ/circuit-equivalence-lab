# V3 planned product milestone — closure pending public V3.4 acceptance

This document closes only the owner-authorized V3.0–V3.4 delivery plan after
V3.4's actual production release. It does not close the broader textbook/analog
scope. Current state: V3.4 local candidate, not yet Released/Closed. No V4 work.

| Release | Actual application commit | Delivered contract |
| --- | --- | --- |
| v3.0.0 | a77a22112c9c2de6beeba5bf51ec7b9f1df3c624 | Linear RLC adaptive-BE transient, explicit initial states, energy/numerical loss, raw waveform/Signal/evidence |
| v3.1.0 | 0bd1b11ccba8a52c54727c2e49433d6d31577027 | Shockley/NPN/nMOS DC, region checks/derivatives, ideal negative-feedback op-amp |
| v3.2.0 | b2a851f7f623761e32e27cb82559bfd58e6a19c6 | Fresh-bias transistor incremental frequency response, explicit teaching capacitors, real Bode |
| v3.3.0 | 322b9ee2c15db3a781447bdf28cbb0015e61dde5 | Finite-gain single-pole op-amp, actual closed-loop MNA and bounded return-network inspection |
| v3.4.0 | Candidate; production identity pending | Existing-provider capstones, parameter scenarios, raw evidence/measurement/report handoff and learning map |

## Supported learning and engineering workflows

Existing Atlas source circuits remain editable; V3.4 adds coordinated experiments
over the same project, not duplicate solver implementations or template claims.
RC/RLC jointly run actual transient and AC; references require recognized topology.
Time constants, natural/damped frequencies and sampled driven maxima stay distinct.
CE/CS rerun bias before each incremental sweep; invalid regions retain failed
outcomes. Ideal/finite op-amp output, open/closed/loop frequency samples and the
resistor-only phase-margin boundary are explicit. One parameter and at most five
scenarios preserve project UUID, unique scenario revisions, digest and full captures.
Scenario generation never writes back to the active source.

JSON assets retain raw point arrays and source snapshots. Float64 assets expose
actual transient samples in Signal; standard analysis/result/experiment records
and competition snapshot handoff preserve the same archive. Reports contain
actual tables, data-derived charts, model assumptions, reference labels, failures,
user-entered conclusions and a portable schema-1 project. An imported capture is
historical until explicit recomputation; provenance is not a digital signature.

## Numerical accuracy and limits

The numerical algorithms remain those verified in the individual releases: real
and complex MNA with original-unit residual/KCL checks, bounded nonlinear bias,
and adaptive BE with local-error control and explicit numerical dissipation.
Interpolation is a sampling estimate, not an exact pole solution. Each provider's
model/reference/scale limits remain active. No scenario borrows a prior result.
Local V3.4 independent download evidence currently covers 8 files, 13 scenarios,
2412 frequency samples and 3105 time samples, with 7369 checks including RC/RLC
closed forms, op-amp complex response, transistor derivatives, source identity and
asset integrity. Final regression passed 800 tests/51 files, typecheck/lint/build;
built Chrome and download checks passed. Public acceptance is still pending.

## Coverage and deferred work

The live map counts actual catalog recipes; editing does not imply numerical
support. [Capability inventory](V3_CAPABILITY_INVENTORY.md) separates calculations,
education and exports. The publisher's sixth-edition/18-chapter themes were
checked on 2026-10-30 and shown with partial/unimplemented status. No entire
18-chapter or full analog-electronics completion is claimed.

Deferred: transformer/mutual inductance, dedicated three-phase analysis, general
Fourier/Laplace circuit methods, two-port extraction, transmission lines, advanced
semiconductor thermal/noise physics, general multistage/nonlinear transient,
power regulation, advanced active filters and oscillators. No retroactive roadmap
checkmarks. Bugs may later justify a separately authorized patch; no automatic V3.5.

## V4 readiness

Stable schema1 projects, graph/geometry separation, pinned model identity, explicit
providers, cancellation, asset integrity, typed measurement/evidence and immutable
history provide a baseline. Before V4, separately scope digital event/time/unit
semantics, logic levels, supported gates, timing/clock behavior, capability failures,
verified fixtures and editor/report integration. MCU peripherals, hardware links
and control dynamics need their own contracts and acceptance. V4 is not started.
