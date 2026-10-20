# Long-Term Product Roadmap

Planning source: the owner's **V0.3 STRAY Electronics Lab project brief**.
Captured for repository context on **2026-10-20**. This document preserves the
complete intended feature scope; it does not authorize implementation or release.

## Status and reading guide

- **Existing/implemented:** the M0–M8 V1 resistor-network application, including
  topology, equivalent resistance, series/parallel/delta/star transformations,
  SVG comparison, guided lessons, shared Stray themes, and public deployment.
  Preserve [ROADMAP.md](ROADMAP.md) and [DEV_LOG.md](DEV_LOG.md) as the historical
  completion and acceptance records.
- **Initial V2 architecture gate:** V2.0-A, architecture and interface design only.
  [CURRENT_STATUS.md](CURRENT_STATUS.md) records actual phase and release facts.
- **Planned functionality:** every unchecked item below. The V2–V6 sequence is
  the implementation plan; CURRENT_STATUS.md records actual internal stage completion. Existing V1
  functionality is a foundation, not proof that a broader V2 capability is done.
  Persistent context setup does not implement an item or complete V2.0-A.
  Phase descriptions below preserve the V0.3 planning sequence; use CURRENT_STATUS.md
  and DEVELOPMENT_PROGRESS.md for later internal design completion or implementation.
- The priorities and version labels below are planning targets, not release tags,
  promises of dates, or claims of present support. The actual package baseline
  is `0.1.0`; establish consistent semantic releases before the next public
  feature release and version the project-file schema separately.
- Work one approved module at a time. Keep measurement, instrumentation, filters,
  and signal processing first among competition-oriented expansions. Later order
  may change with learning progress, verified problems, dependencies, and feasibility.

See [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for stable owner decisions,
[ARCHITECTURE.md](ARCHITECTURE.md) for existing technical boundaries,
[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for required Stray styling, and
[DEPLOYMENT.md](DEPLOYMENT.md) for the existing hosting/release procedure.

## Complete Planned Functional Scope

The following checklist represents the desired long-term product scope.

Items are planned capabilities, not completed features.

### A. Platform Foundation — P0

- [ ] Generalized engineering project model.
- [ ] Stable component and pin identifiers.
- [ ] Arbitrary multi-pin components.
- [ ] Electrical net definitions and connectivity.
- [ ] Schematic symbol definitions.
- [ ] Simulation model references.
- [ ] PCB footprint and pad mappings.
- [ ] Units, engineering prefixes, precision, and complex numbers.
- [ ] Versioned project-file schema.
- [ ] Project import/export and migration.
- [ ] V1 compatibility adapters.
- [ ] Extensible analysis engine contracts.
- [ ] Shared component and experiment libraries.

### B. Schematic Editor — P0

- [ ] Interactive schematic canvas.
- [ ] Component placement, selection, movement, rotation, and deletion.
- [ ] Electrical wire drawing and snap-to-pin behavior.
- [ ] Junctions, crossings, ground, and net labels.
- [ ] Component property editing.
- [ ] Undo/redo and keyboard shortcuts.
- [ ] Circuit connectivity inspection.
- [ ] Basic electrical rule checking.
- [ ] Local project saving and reopening.
- [ ] Existing V1 equivalence transformations integrated with the editor.

### C. Circuit Theory — P1

Eventually cover all 18 chapters of 《电路》第六版.

- [ ] KCL and KVL equation generation.
- [ ] Branch-current, mesh-current, loop-current, and nodal analysis.
- [ ] Independent and dependent sources.
- [ ] Modified nodal analysis.
- [ ] Voltage, current, power, and energy calculations.
- [ ] Circuit equivalence and network theorems.
- [ ] Ideal operational amplifier circuits.
- [ ] Capacitors, inductors, and RLC networks.
- [ ] First- and second-order transient responses.
- [ ] Phasors and AC steady-state analysis.
- [ ] Coupled inductors and transformers.
- [ ] Frequency response and resonance.
- [ ] Three-phase circuits.
- [ ] Fourier and Laplace-based analysis.
- [ ] Matrix circuit equations.
- [ ] Two-port networks.
- [ ] Nonlinear circuit demonstrations.
- [ ] Transmission-line experiments.

Each chapter should eventually have representative interactive experiments, not merely explanatory text.

### D. Analog Electronics — P1

- [ ] Diode characteristics and rectification.
- [ ] BJT and MOSFET models.
- [ ] Bias and operating-point analysis.
- [ ] Common amplifier configurations.
- [ ] Gain, impedance, bandwidth, and distortion.
- [ ] Differential and multistage amplifiers.
- [ ] Feedback and operational amplifiers.
- [ ] Active filters and oscillators.
- [ ] Power supplies and regulation.
- [ ] Relevant nonlinear and small-signal analysis.

### E. Digital Electronics — P1

- [ ] Logic gates and Boolean expressions.
- [ ] Truth tables.
- [ ] Karnaugh maps and logic minimization.
- [ ] Combinational logic circuits.
- [ ] Latches and flip-flops.
- [ ] Registers and counters.
- [ ] Finite-state machines.
- [ ] Clock and reset modeling.
- [ ] Timing diagrams and propagation delay.
- [ ] ADC/DAC introductory experiments.
- [ ] Basic mixed-signal interaction.

### F. Signal Measurement & Processing — Early Priority P1

This is the first major competition-oriented expansion priority.

- [ ] Virtual function generator.
- [ ] Virtual oscilloscope.
- [ ] Waveform navigation and cursors.
- [ ] Signal amplitude, peak-to-peak, RMS, frequency, and phase measurements.
- [ ] FFT and spectral visualization.
- [ ] Sampling theory and aliasing experiments.
- [ ] Window functions and frequency resolution.
- [ ] Harmonic and THD analysis.
- [ ] RC/RLC filter experiments.
- [ ] Bode plots and frequency response.
- [ ] LCR and impedance measurement concepts.
- [ ] CSV measurement import/export.
- [ ] Multi-channel waveform comparison.
- [ ] Calibration and error estimation.
- [ ] Comparison between simulated and measured data.

Always distinguish simulated, imported, and live hardware data.

### G. Embedded Systems & Control — P1

- [ ] GPIO visualization.
- [ ] PWM waveform experiments.
- [ ] ADC and DAC sampling.
- [ ] Timers and interrupts.
- [ ] UART terminal and data visualization.
- [ ] I²C and SPI protocol timing.
- [ ] MCU pin mapping.
- [ ] Embedded sensor data acquisition.
- [ ] PID control experiments.
- [ ] Motor and actuator models.
- [ ] Closed-loop responses.
- [ ] Sensor calibration and filtering.
- [ ] State-machine behavior.
- [ ] Selected vision and tracking experiments.

### H. PCB & EDA — Long-Term P1/P2

The final target is real engineering capability, not merely decorative PCB rendering.

- [ ] Schematic symbol-to-footprint mapping.
- [ ] Component pin-to-pad mapping.
- [ ] Netlist generation.
- [ ] Board outlines and footprint placement.
- [ ] Ratsnest and unconnected-net visualization.
- [ ] Copper layers, traces, vias, and pads.
- [ ] Basic ERC/DRC.
- [ ] Schematic-PCB consistency checking.
- [ ] Interactive 2D PCB layout.
- [ ] 3D PCB appearance and component viewing.
- [ ] BOM integration.
- [ ] KiCad or other mature EDA interoperability.
- [ ] Validated engineering file import/export.
- [ ] Manufacturing outputs only after the necessary verification capabilities exist.

A 3D preview must not be presented as evidence that a board is manufacturable.

### I. Electronics Design Competition Workspace — P1

- [ ] Historical National Electronics Design Contest problem index.
- [ ] Guangdong competition problem index.
- [ ] Source attribution, year, division, and problem category.
- [ ] Requirements and scoring indicator extraction.
- [ ] Technical knowledge mapping.
- [ ] Competition project templates.
- [ ] Design alternative comparison.
- [ ] Test metric tracking.
- [ ] Simulated versus measured result comparison.
- [ ] Project documentation and experiment reports.
- [ ] Version tracking and competition retrospectives.

Initial representative project families:

- [ ] Circuit-model identification and filter behavior.
- [ ] Periodic-signal measurement and spectral analysis.
- [ ] Power analysis and harmonics.
- [ ] Cable and impedance measurement.
- [ ] Power converters and efficiency.
- [ ] PID control and embedded systems.
- [ ] Sensor and communication projects.
- [ ] Vision-based measurement and control.

Verify official problem statements before relying on specific contest requirements.

Competition-day usage must comply with the applicable competition rules.

### J. Engineering Practice — P1

- [ ] Component selection and parameter comparison.
- [ ] Datasheet reference management.
- [ ] BOM generation.
- [ ] Engineering schematics and connectivity review.
- [ ] Test plans and acceptance criteria.
- [ ] Instrument data import.
- [ ] Firmware and serial-log records.
- [ ] Engineering charts and reports.
- [ ] Debugging history and design revisions.
- [ ] Reusable engineering project templates.

### K. Educational Workspace — P1

- [ ] Textbook chapter coverage matrix.
- [ ] Analog and digital electronics topic indexes.
- [ ] Interactive derivations based on actual calculations.
- [ ] Guided and free-exploration modes.
- [ ] User exercises with meaningful feedback.
- [ ] Experiment templates.
- [ ] Learning-progress management.
- [ ] Connections between textbook topics and competition problems.
- [ ] Exportable notes, diagrams, results, and reports.

---

## Proposed V2–V6 Implementation Sequence

### V2.0-A — Architecture and Interface Design

**Immediate next stage.**

Deliver:

- System architecture.
- Unified engineering project model.
- Component and pin data contracts.
- Analysis engine contracts.
- V1 compatibility strategy.
- Versioned project-file design.
- Measurement data representation.
- Future PCB interoperability considerations.
- Prioritized implementation roadmap.

This stage is documentation/design only.

Do not implement the new editor yet.

### V2.0-B — Engineering Project Model

Implement the approved domain model, project serialization, versioning, and migration foundations.

### V2.0-C — General Schematic Editor

Implement a usable schematic canvas with essential editing and connectivity operations.

### V2.0-D — V1 Integration

Connect compatible editable resistor networks with existing equivalence transformations and guided lessons.

**Release V2.0 when the integrated editor offers a genuinely usable workflow.**

### V2.1 — Signal Measurement Workspace

Develop the first major competition-oriented feature:

- Signal generation.
- Waveform display.
- Basic measurements.
- FFT.
- CSV import/export.

Integrate, release, and verify the public version.

### V2.2 — DC Circuit Analysis

Introduce sources and general DC analysis.

Provide meaningful equation generation, actual calculations, and visualization.

Release once usable.

### V2.3 — Filters and Frequency Response

Introduce RLC frequency analysis, filtering, phase response, and Bode visualization.

Release once usable.

### V2.4 — Competition Project Workspace

Introduce real past-problem indexing, measurable requirements, test records, and reports.

Release once usable.

### V3.x — Advanced Circuits and Analog Electronics

Expand dynamic circuits, nonlinear devices, amplification, power supplies, and advanced circuit theory.

### V4.x — Digital Electronics, Embedded Systems and Control

Develop logic/event simulation, microcontroller experiments, communication, data acquisition, and control.

### V5.x — PCB Engineering

Develop schematic-to-PCB workflows, footprint handling, layout, 3D viewing, design checks, and appropriate EDA interoperability.

### V6.x — Advanced Integrated Engineering

Develop advanced subject-specific functionality and multi-domain engineering projects.

**This sequence is adjustable based on academic progress, contest preparation, actual dependencies, and technical feasibility.**

---

## Versioned Feature Releases and Acceptance

Public semantic version examples from the brief are `2.0.0` for the integrated
editor/project foundation, `2.1.0` for signal measurement, `2.1.1` for fixes, and
`2.2.0` for DC analysis. These are proposed future releases. The conceptual V1
milestone is not evidence of a `1.0.0` release tag.

Before the next public feature release, provide:

- [ ] A consistent semantic release baseline and visible application version.
- [ ] A human-readable changelog and documented release procedure.
- [ ] Project-file compatibility and migration notes when data changes.
- [ ] A recorded public version, corresponding commit, and dated verification.
- [ ] A reliable, history-preserving rollback route.

Each authorized major user-visible module must complete:

1. Scoped implementation and tests of relevant behavior/integration.
2. Standard project checks and production build at the final milestone.
3. Representative browser verification and essential V1 regression coverage.
4. Confirmation that existing saved projects remain accessible when applicable.
5. Version/changelog/compatibility updates and tested integration.
6. Authorized production push/deployment using the existing repository, main-branch
   Actions/Pages workflow, base path, and public URL.
7. Verification of actual live routes, assets, controls, and complete user workflow.
8. Recording of the published version/commit and updating CURRENT_STATUS.md.

APIs, passing unit tests, a local build, or a successful push alone do not complete
a public feature delivery. Do not claim deployment success before live verification.
Architecture-only milestones such as V2.0-A are internal deliverables and require
no empty application deployment. Do not publish unrelated or incomplete work.
Publication requires authorization for that task; this roadmap supplies none.

## Coverage and Planning Maintenance

- Maintain textbook chapter/topic and competition coverage matrices as the relevant
  modules are developed. The target includes **all 18 chapters of 《电路》第六版**;
  verify the edition's contents before assigning chapter titles or claiming coverage.
- Every chapter should ultimately have representative interactive experiments,
  rather than text alone. Preserve analog/digital subject indexes and connections
  between theory, calculations, experiments, and competition tasks.
- Competition coverage includes both National and Guangdong/regional preparation.
  Source actual official problems, retain year/division/category attribution,
  extract measurable requirements, and follow the applicable contest rules.
- Keep functional release checklists and project-file compatibility notes aligned
  with actual development. Check off capabilities only with implementation and
  appropriate acceptance evidence; distinguish internal architecture acceptance
  from actual public delivery.
- Update this roadmap when approved scope/priorities change, CURRENT_STATUS.md
  when actual development state changes, and relevant technical documents/logs
  for meaningful decisions. Preserve M0–M8 historical records.
