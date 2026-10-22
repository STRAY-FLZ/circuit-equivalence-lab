# STRAY Electronics Lab — Persistent Project Context

This document captures stable owner requirements from the V0.3 project brief.
It is repository context, not authorization to implement a phase or publish.
Read [CURRENT_STATUS.md](CURRENT_STATUS.md) for handoff state and
[LONG_TERM_ROADMAP.md](LONG_TERM_ROADMAP.md) for the complete planned scope.

## Identity and destinations

- Long-term name: **STRAY Electronics Lab / STRAY 电子工程综合实验室**.
- Existing public product: **电路实验室 / Circuit Equivalence Lab**.
- Local repository: `D:\D-codex\circuit-equivalence-lab`.
- Application repository: https://github.com/STRAY-FLZ/circuit-equivalence-lab
- Public application: https://stray-flz.github.io/circuit-equivalence-lab/
- Personal website: https://stray-flz.github.io/stray-articles/
- Website repository: https://github.com/STRAY-FLZ/stray-articles
- Website tools directory: https://stray-flz.github.io/stray-articles/tools/

Continue extending this repository, retaining Git history and the public URL.
A different repository requires a clear architectural need and owner approval.
The platform will evolve across multiple academic years through usable releases.

## Users and goals

The initial owner is an electronic information engineering undergraduate.
Keep introductory experiments understandable to first-year students while adding
more advanced engineering workflows as academic knowledge develops.

- **Academic learning:** ultimately cover all 18 chapters of 《电路》第六版,
  analog and digital electronics, and supporting mathematics, signals,
  microcontrollers, and control. Connect theory, equations, interactive
  visualization, numerical results, and actual circuit behavior.
- **Competition preparation:** support the National Undergraduate Electronics
  Design Contest, Guangdong and relevant regional competitions. Prioritize
  signal measurement, electronic instrumentation, filters, and signal processing.
  Later directions include power, embedded systems, control, communication,
  sensors, and vision. Verify official past problems before deriving requirements;
  retain attribution, year, division, indicators, and evaluation evidence.
  Competition-day use follows the applicable competition rules.
- **Engineering and internships:** support component and datasheet selection,
  schematic/connectivity review, real PCB workflows, embedded configuration,
  acquisition/debugging, measured-data analysis, BOMs, test specifications,
  engineering reports, and revision records.

The complete planned capabilities are maintained in LONG_TERM_ROADMAP.md;
they must not be described as existing features.

## Confirmed owner decisions

- Expand the existing product into a comprehensive electronics engineering platform.
- Prioritize measurement, instrumentation, and filters for early competition work.
- Target real PCB design and verified engineering exports in the long term.
- Use **Web First**, with WebAssembly, local helpers, desktop companions, external
  EDA/simulation, or hardware communication when engineering needs justify them.
- Complete **V2.0-A architecture and interface design before V2 implementation**.
- Deliver app-like incremental feature releases rather than waiting for the entire
  platform; a major usable module must reach the public product when release is
  authorized.
- Preserve the accepted V1 behavior and the Stray personal website's visual identity.

The owner's V2.0-A review approves the generalized model/V1 adapters, independent
typed providers, SVG editing/history, and neutral PCB mappings; it clarifies snapshot
net IDs and refines ground/reference semantics and JSON/dataset separation.
See [v2/DECISIONS.md](v2/DECISIONS.md) for exact outcomes, including unchanged D05
and D09's release conditions. Specific simulation/hardware backends and external
dataset formats remain deferred; architecture approval does not start implementation.

## Existing V1 foundation

Completed M0–M8 establish React/TypeScript/Vite, domain contracts, topology,
resistance solving, series/parallel and delta/star transformations, SVG previews,
five-stage guided lessons, integration checks, Stray styling, and Pages delivery.
See [ROADMAP.md](ROADMAP.md) for completed stages and [DEV_LOG.md](DEV_LOG.md)
for dated acceptance evidence.

Preserve these usable capabilities throughout upgrades:

- Predefined resistor examples, ideal-wire topology normalization, and equivalent
  resistance calculation.
- Series/parallel reduction, delta-to-star and star-to-delta transformations,
  and independent electrical equivalence verification.
- Original/transformed SVG comparison and element/node highlighting.
- Guided educational lessons, accurate formulas, actual numerical substitution,
  and native MathML.
- Light/dark themes, responsive layouts, shared theme preference, and return-home
  navigation.

The stack includes Vitest, SVG, CSS custom properties, GitHub Actions, and GitHub
Pages. Read `package.json`, the lockfile, and relevant configuration for actual
versions and commands; recorded versions are not permanent requirements.

## Technical boundaries and engineering principles

The existing [ARCHITECTURE.md](ARCHITECTURE.md) and public `index.ts` exports
describe V1 boundaries. Reuse those boundaries rather than replacing them.

- The V1 domain describes connection points, ideal wires, positive finite
  resistors, and external terminals. It is not an arbitrary multi-pin model.
- Topology normalizes explicitly declared wire connectivity independently of
  coordinates. Derived node IDs may change after connectivity edits; they are not
  persistent component/pin identities.
- The existing nodal solver measures equivalent resistance in resistor networks;
  it is not general source-driven DC analysis or a SPICE engine. It has explicit
  numerical failures and a 512-unknown-node limit for the selected component.
- Existing SVG layout supports at most 16 points and 24 elements. Its bounded
  automatic layout and predefined examples are not a general schematic editor.
- Existing lessons explain one operation with fixed templates and real results;
  they are not symbolic algebra, persistent learning analytics, or a chained editor.
- The typed domain factory is not a complete arbitrary-JSON project-file parser.
  File parsing, schema versions, migration, and diagnostics need their own boundary.

V2 must introduce a generalized, versioned project model with clear V1 adapters.
The design must accommodate projects and sheets, stable instances/pins,
connections/nets, parameters, simulation and symbol references, footprints/pads,
analysis configurations/results, measurement datasets, PCB designs, experiments,
and competition records. Do not rewrite V1 data and algorithms in one operation.

Keep electrical connectivity, schematic appearance, and physical PCB layout
separate. Coordinate overlap never creates a connection by itself. Share project
data across independently extensible topology, DC, AC, transient, digital/event,
signal/measurement, PCB verification, and education engines; each declares its
own applicability and mathematical method.

Keep authoritative calculations independent of presentation. Educational formulas
must reflect actual inputs and results. Distinguish successful calculations,
physical open/short states, unsupported configurations, numerical/convergence
failure, and inconclusive verification. Reject unsupported V1 transformations
explicitly instead of dropping components or producing an incorrect resistor model.

Build explainable educational engines when useful; evaluate mature engineering
software for complex capabilities. Introduce dependencies only for demonstrated
requirements and consider trusted sources, licenses, OS compatibility, and
permissions. Explain required installations/environment changes before performing
them. Ordinary educational work should not require unnecessary external software.

Distinguish simulated, imported, and live hardware data. A PCB 3D preview is not
proof of manufacturability; engineering exports require appropriate verification.

## Mandatory design and compatibility requirements

The personal website is the visual authority. Follow
[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), `src/design-tokens.css`, and established
components. Consult the website's `site.css`, `theme.js`, `index.html`, and
`tools/index.html` only when the task needs current reference details.

Preserve restrained editorial styling, whitespace, thin dividers, readable
typography, modest radii, and technical-diagram legibility. Avoid unrelated
palettes, unnecessary gradients/shadows, and excessive nested cards. Dense
engineering controls may adapt the layout without abandoning the shared identity.
Do not communicate electrical states by color alone.

Retain Stray branding, the light/dark control, short header divider, and `返回首页`.
Use the existing 1240px shell/92px desktop header conventions and responsive
behavior. Preserve the `stray-theme` key and same-origin theme synchronization.
Keep symbols, formulas, identifiers, waveforms, and measurements legible.

Retain access to existing examples and future saved projects. Design versioned
import/export and migrations with compatibility notes; never silently reinterpret
unsupported project content.

## Delivery and development expectations

Each round covers one explicitly approved module: define boundaries, expected
files, interfaces, acceptance criteria, checks, documentation, and Git/release
scope. Stop on completion. Inspect relevant code and debug from evidence; avoid
unrelated audits, speculative validation, redundant fallbacks, excessive defensive
abstractions, and unrelated refactoring. Necessary domain, numerical, and import
validation still applies.

For implementation milestones, test changed behavior/integration and run standard
project checks once at the appropriate final stage. Do not repeatedly reproduce
historical acceptance. Design-only documentation work needs lightweight checks.

An authorized major feature release includes scoped development/testing,
integration, production build, version/changelog updates, deployment, and actual
live workflow verification. It must be accessible in the public application;
APIs or unit tests alone do not constitute full delivery. Provide a visible app
version, human-readable changelog, release procedure, data compatibility notes,
recorded release commit, and reliable rollback by the next public feature release.

The conceptual V1 milestone is distinct from package version `0.1.0`.
V2/V3 roadmap labels and proposed semantic versions are not existing release tags.
V2.0-A is an internal design milestone and requires no empty production release.

Follow [DEPLOYMENT.md](DEPLOYMENT.md) for the existing main-branch Actions/Pages
workflow, `/circuit-equivalence-lab/` base, live verification, and history-preserving
rollback. Never force-push. Do not infer remote-push, deployment, personal-website,
or installation authorization from this context or previous release tasks.
Follow the authorization actually granted for the current task.

Use English for identifiers, technical contracts, and internal documentation where
practical. Use Simplified Chinese for UI, teaching/formula explanations,
competition learning content, and final development reports.

## Maintaining this context

Keep stable requirements here, full planned scope in LONG_TERM_ROADMAP.md, and
current facts/pending decisions in CURRENT_STATUS.md. Update technical documents
and append meaningful development/release evidence as work is completed; preserve
historical ROADMAP.md and DEV_LOG.md records. Maintain textbook/competition
coverage matrices and release/compatibility checklists as those modules develop,
without inventing completed coverage or unverified competition requirements.

The official V2 kickoff also requires visible Simplified Chinese progress reports
at meaningful milestones and a persistent per-module checklist in
[DEVELOPMENT_PROGRESS.md](DEVELOPMENT_PROGRESS.md). Report current module,
completed/total defined deliverables, completed/in-progress work, next action, and
actual blockers; count only complete deliverables. Never assign an invented
overall percentage to the multi-year platform. Internal completion/verification
does not imply a verified public release.

V2 design outputs are indexed in [v2/ARCHITECTURE.md](v2/ARCHITECTURE.md);
[v2/DECISIONS.md](v2/DECISIONS.md) distinguishes recommendations requiring owner
review from confirmed requirements. These documents do not authorize V2.0-B.

## V2.3.0 authorization — 2026-10-23

Owner authorized general linear DC MNA development, focused acceptance and
production release as DC01–DC10. Scope includes independent and four controlled
sources, actual equations/results and editor/Atlas integration. Preserve V1/D05,
schema 1, signal data and deployment history. No V2.4 work. Actual progress and
publication are tracked in CURRENT_STATUS/DEVELOPMENT_PROGRESS and
[v2/V2_3_0_RELEASE.md](v2/V2_3_0_RELEASE.md).
