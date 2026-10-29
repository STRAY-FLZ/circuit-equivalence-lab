# V3 capability inventory — 2026-10-30

Audited implementation and accepted V3.0–V3.3 evidence, not roadmap checkmarks.
The UI inventory lives in `src/capstone/coverage.ts`; the runtime Atlas count comes
from the actual catalog. No symbol or editable recipe alone implies analysis.

| Topic | Validated method / experiment | Export / constraints |
| --- | --- | --- |
| Resistor equivalents | V1/D05 graph, candidates, independent terminal equivalence and MathML lessons | Existing projection/writeback only for supported resistive candidates; JSON/editor |
| DC | Pinned R, independent and four controlled-source models; real MNA/KCL/power | Single flat sheet, finite values, no C/L or nonlinear idealization; engine limits |
| AC | Complex MNA, explicit positive-cosine RMS sources, stable oriented probes, actual Bode | 64 unknowns/256 branches, 3–401 samples, 8M point×unknown³; failure gaps; JSON/evidence |
| Linear transient | Passive RLC, independent step/pulse/constant sources, explicit initial states | Adaptive BE, local error plus numerical dissipation; no nonlinear/controlled-source transient; hashed float64 data |
| Semiconductor DC | Shockley, single grounded-emitter introductory NPN, long-channel nMOS | Bounded nonlinear solve, regions, exact same-model derivatives; no complete physical models |
| Local transistor gain | Current operating-point Jacobian and regional validity checks | Static local teaching model, not a broadband prediction by itself |
| Transistor frequency | Actual new bias and explicit R/C incremental network | Single NPN active or nMOS saturation; explicit teaching capacitances; stored full points |
| Ideal op-amp | Resistive source-suppressed negative feedback and input equality | Separate pinned ideal model; no rails, bandwidth or slew limits |
| Dynamic op-amp | Single-pole finite-gain model, real DC and complex closed-loop MNA | Single op-amp, RC and independent sources; only resistor-only return networks certify margin |
| Signal | Synthetic/imported sampled data, RMS, FFT, scope and RC sampled filters | Four channels, declared sampling/window/unit limits; no hardware certification |
| Competition | Source-attributed requirements, actual simulation/import/manual/derived evidence | Schema-1 JSON/HTML, notebook and stale checks; no official automatic grading |

References select existing graph anchors; they do not silently connect nets. Flat-
sheet or engine-specific budgets are enforced by each provider. In V3.4 a study is
one actual parameter, 1–5 finite scenarios, 201 frequency samples per provider and
the existing bounded transient settings. Each scenario retains source project ID,
gets fresh scenario ID/revision/digest and keeps raw outcomes. Scenario edits never
commit to the source. JSON artifacts and float64 waveform assets use existing
manifest lengths/SHA checks; imported captures are historical until rerun.

Textbook map: [publisher sixth-edition contents](https://xuanshu.hep.com.cn/front/book/findBookDetails?bookId=60f7238badb85dae6a2f4523),
ISBN978-7-04-056553-9, checked 2026-10-30. The app shows paraphrased chapter themes
and explicit partial/unimplemented scope. It does not claim 18 completed chapters.
Chapter 4 theorem automation, 10 coupling/transformers, 12 three-phase, 14 general
Laplace/symbolic analysis, 16 two-port extraction and 18 transmission lines remain
unimplemented or partial as listed. Fourier circuit methods, higher-fidelity and
multistage semiconductors, nonlinear transient, power regulation, advanced active
filters/oscillators remain deferred. Complete teaching scope is broader than V3.
