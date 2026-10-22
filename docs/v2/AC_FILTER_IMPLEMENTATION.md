# V2.4 AC and sampled filtering

Implemented 2026-10-23. Independent `org.stray.engine.ac-mna` version 1,
typed async provider, immutable snapshot/digest/revision and explicit cancellation.
`src/ac` owns numerical calculations; `src/ac-ui` presents actual results.
V1 algorithms, D05 verification, DC solver and schema 1 remain unchanged.

## Electrical and numerical contract

- Positive-cosine convention `Re(sqrt(2) V exp(+j omega t))`. Independent source
  settings are explicit nonnegative **RMS** magnitude and phase in degrees, never
  inherited from a DC value. Frequencies must be finite and strictly positive.
- Positive finite ideal R/L/C: `YR=1/R`, `YC=j omega C`, `YL=1/(j omega L)`.
  Pinned resistor and DC-source models have explicit AC interpretations. Only exact
  version-1 built-in C/L/V/I definitions with completely empty bindings use the
  narrow ideal adapter. Other bindings/versions are unsupported, not idealized.
- Ideal independent V/I and real frequency-independent VCVS/VCCS/CCVS/CCCS.
  Current controls reference stable voltage-defined branch UUIDs, including 0 V
  sensing sources. No transformer, op-amp, nonlinear/SPICE or arbitrary transient.
- Authoritative connection graph/label scope determines nets; geometry creates no
  connection. Explicit reference > analog marker net > unique GND net. Multiple
  distinct marker nets require a choice. References never join nets. One flat
  sheet; project labels reaching another sheet are rejected.
- Complex MNA, row/column equilibration, complete complex pivoting. Rank tolerance
  `64 epsilon n`; scaled pivot ratio below `1e-10` returns a numerical failure for conditioning,
  not a condition-number estimate. Original complex row backward error <= `1e-9`.
  Recomputed branch currents check every node's complex KCL with
  `1e-10 A + 1e-8 sum|I|`; complex power balance with `1e-9 VA + 1e-8 sum|S|`.
  Overflow/nonfinite range, underdetermined and inconsistent systems are explicit.
- Actual complex matrix/RHS/unknown mapping, node/branch phasors, Z/Y and
  `S=V conj(I)=P+jQ` are reported. p->n is positive branch direction;
  positive P means absorption and positive Q inductive reactive power.
  Zero phasor phase is undefined. Display rounding does not change exported data.
- Limits: 64 complex unknowns, 256 elements, 3–401 sweep points and
  `points * unknowns^3 <= 8,000,000`; bounded main-thread work yields every 8 points.

MNA follows the independently implemented ideal-element formulation described in
[Qucs MNA](https://qucs.sourceforge.net/tech/node14.html) and its
[controlled-source treatment](https://qucs.sourceforge.net/tech/node60.html).
During acceptance the initial real-block solve exposed componentwise residual
false failures at zero imaginary constraints. A dedicated complex elimination
with complex residuals fixed this; the existing DC implementation was not changed.

## Transfer and Bode

`H(f)=(Vout+ - Vout-)/(Vin+ - Vin-)`, with four stable anchor IDs and one explicit
nonzero test source. All other independent sources must be explicitly zero
(0 V short / 0 A open). Nonzero multiple sources, same-net terminal pairs,
missing anchors or near-zero input (`1e-12` relative to maximum node magnitude)
are diagnosed. A single-frequency solve can use multiple configured sources.

Linear or logarithmic sample grids include the endpoints. Each frequency invokes
the actual circuit solver; failed points retain diagnostics and create plot gaps.
The separately displayed operating point uses the explicitly entered frequency;
if that solve fails the run returns failure. Zero transfer keeps magnitude zero,
undefined phase and null logarithm (UI says −infinity dB), never a fabricated floor.

SVG uses actual log-frequency positions, dB magnitude and wrapped phase. Pointer
and native range/keyboard cursor select actual samples. ResizeObserver keeps text
readable at narrow widths. Failure, zero transfer and wrapped phase jumps do not
produce misleading connecting segments. Full point table and JSON are available.

Half-power level is relative to an explicitly chosen low-end, high-end or sampled
peak gain. Crossings interpolate adjacent valid dB samples in the grid's frequency
coordinate. Boundary maximum does not prove resonance; unresolved/multiple
crossings are explained. Bandwidth requires two crossings bracketing an interior
sampled peak. These are estimates. Exact standard RC/RL or series-RLC topology
recognition separately displays `1/(2pi RC)`, `R/(2pi L)` or `1/(2pi sqrt(LC))`;
arbitrary rewiring removes that reference rather than retaining template folklore.

## Editable experiments and persistence

Atlas retains twelve categories/89 families and now 27 templates. Five explicit
AC entries: RC lowpass, RC highpass, RL lowpass, driven series RLC (output across
R), and RLC resistor-output bandpass. Existing RC/RLC recipes were extended with
visible sources/ports; one RL template was added. Each fresh instance has new
UUIDs, 1 V RMS/0 degree excitation, explicit COM/input/output, and a 1–100000 Hz
201-point log sweep. Actual component edits drive results.

Per-sheet settings are a schema-1 opaque `org.stray.ac` extension. Save-configuration
uses an immutable editor transaction before project download. Import restores
settings; any project revision or analysis-control change hides results and
highlights until rerun. Results remain session state; reports separately preserve
engine, full settings, digest, revision, matrix, checks and sweep. Older readers
retain opaque settings but do not gain AC computation; no schema bump is needed.

## Sampled RC processing

Separate `org.stray.signal.rc-zoh` v1 operation; no claim of general circuit
transients or hardware acquisition. `x[n]` holds over `[t[n],t[n+1])`, capacitor
state `y[0]=initialOutput`, then
`y[n]=a*y[n-1]+b*x[n-1]`, `a=exp(-dt/RC)`, `b=-expm1(-dt/RC)`.
Lowpass is y, highpass x-y. The initial state and left-boundary sample alignment
are explicit. This is the exact ideal RC state update for a held input, following
the [ZOH assumption](https://www.mathworks.com/help/control/ug/continuous-discrete-conversion-methods.html).
It does not equate coarse sampled response with continuous sinusoidal AC results.

Original dataset/assets are retained. A derived two-channel capture reuses the
original input asset and appends actual float64 output, the original time axis,
input dataset/channel/revision/digest, method/version, R/C/state/mode and a/b.
The existing oscilloscope compares both; channel selection compares real FFTs.
CSV exports both sample columns; project JSON preserves provenance and integrity.
Current bounds remain 65536 samples, 4 channels, 8 MiB per asset/16 MiB assets and
32 MiB file. Exceeding limits fails without truncation. Filtering retains units;
voltage input gives the stated RC voltage interpretation.

## Evidence and limits

Hand-derived RC 1 kohm / 1 uF: fc=159.1549430919 Hz, |H|=1/sqrt(2),
gain=-3.0102999566 dB, phase -45/+45 degrees. Doubling R halves fc.
Series RLC 100 ohm/.01 H/1 uF: f0=1591.549430919 Hz, resistor-output gain 1,
phase 0; bandwidth R/(2pi L)=1591.549430919 Hz (sampled estimate within 3 Hz
on the test grid). All four controlled families also checked with complex controls.
Held step and initial-state decay match exponentials; highpass+lowpass=input.
Tests cover zero transfer, source ambiguity, invalid probes, singularity,
unsupported bindings, references, digest/cancel/resources, per-point failure,
editing staleness, five portable Atlas experiments and derived-data round trips.
Live/build/check evidence is recorded in [release record](V2_4_0_RELEASE.md).
