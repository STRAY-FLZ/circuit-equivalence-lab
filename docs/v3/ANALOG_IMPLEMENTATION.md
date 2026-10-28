# V3.1 Analog fundamentals — implementation contract

Started 2026-10-28; In Progress. Baseline main41564c9 / immutable application
v3.0.0 a77a221. Branch `codex/v3.1-analog-fundamentals`. A01–A10 pending
verification. Current owner authorization covers V3.1 implementation and release
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

Pending: implementation, independent fixtures, browser evidence and release.
