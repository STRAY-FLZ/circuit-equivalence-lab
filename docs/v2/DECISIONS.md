# Architecture Decision and Owner Review Register

Status: **Owner review recorded, 2026-10-20**. Outcomes below come from the owner's
explicit V2.0-A architecture review, not inferred from design completion. Confirmed
product directions are in [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md). Architecture
approval does not authorize V2.0-B implementation, remote pushes, or deployment.

## Material choices

| ID | Recorded design | Alternative and tradeoff | Owner review outcome |
| --- | --- | --- | --- |
| D01 | New V2 aggregate with UUID project/entity IDs, pinned embedded multi-pin definitions, and V1 adapters | Extending V1's two-endpoint union directly is smaller initially but couples future simulation/PCB to resistor-specific assumptions; new model adds explicit adapter work | Approved unchanged |
| D02 | Persist anchor/connection/label graph; derive snapshot net keys; probes refer to stable pins/anchors | Persisting stable editable net-membership tables can ease PCB net naming but requires conflict-free reconciliation on every wire split/merge; dual authorities risk contradictory circuits | Approved with clarification: editable graph is authoritative; derived net IDs are snapshots, not persistent identities |
| D03 | Flat sheets with precise label scope; electrical ground connections are explicit graph/label connections, distinct from solver reference-node selection | Implicitly joining anchors because they share a solver reference marker changes the circuit; hierarchical sheets remain deferred | Revised as directed: distinguish labels, electrical ground, and solver reference selection; no silent reference-marker connectivity |
| D04 | Explicit typed engine providers, pinned models, independent analog/digital/signal/PCB methods; async runtime host | One universal engine/result structure reduces interface count but hides differing mathematical assumptions; a dynamic plugin platform adds unnecessary runtime complexity | Approved unchanged; no speculative plugin framework |
| D05 | Transactional V1 projection/writeback; preserve observed boundaries and commit only numerically verified equivalence initially | Allowing an unverified computed transform can help exploration when a verifier fails, but risks presenting inconclusive evidence as a safe committed edit; preview remains available | Approved original design unchanged; existing independent numerical terminal-equivalence verification, no new proof or verification gates |
| D06 | Versioned UTF-8 JSON; project structure/descriptors logically separate from sampled payloads; small datasets may be inline with verified assets | Inline payloads aid initial portability but are not a requirement to embed arbitrarily large captures; external dataset containers/package formats wait for actual need | Revised as directed; preserve portability/integrity; external formats deferred, autosave technology not selected by this review |
| D07 | Initial SVG editor with its own view model and immutable command history, retaining V1 bounded previews | Reusing V1 automatic layout is quicker but carries its 16-point/24-element limits; canvas/WebGL may scale later but need measured justification/accessibility work | Approved unchanged; future editor does not inherit V1 preview bounds |
| D08 | Stable pin-to-pad mappings and neutral source netlist; mature-EDA adapters only with validated requirements | Implementing native industrial file formats immediately may give early exports but requires extensive format/rule/round-trip work; previews alone cannot justify manufacturing outputs | Approved unchanged; specific EDA formats deferred |
| D09 | Keep actual package `0.1.0` during design; target `2.0.0` when B+C+D form a usable accepted workflow, then `2.1.0` etc. | Conceptual V1 does not establish an existing `1.0.0` tag; design completion alone cannot justify a public V2 release | Conditionally approved: usable verified B/C/D workflow and versioning/changelog/compatibility/rollback procedures before release; no invented historical tags |

All requested review outcomes are recorded. D03/D06 refinements below have been
reconciled into the affected specifications. Completed A01–A10 remain Verified;
this review does not implement them or publish a feature release.

## D05 — Approved original recommendation, unchanged

- Transactional V1 projection and writeback.
- Preservation of observed circuit boundaries.
- Initially commit only transformations that pass the existing independent numerical
  terminal-equivalence verification.
- Allow previews of unverified or inconclusive transformations without committing
  them as verified edits.

No additional mathematical proof requirement or verification gate is introduced.
The original [V1 compatibility design](V1_COMPATIBILITY.md) is unchanged by this
review. Do not redesign or rewrite the V1 transformation algorithms.

## D03 — Recorded clarification

Electrical labels join explicitly declared matching label groups. Electrical ground
connections are explicit wires or an explicitly declared common ground label group.
Solver reference selection chooses the zero potential for analysis and adds no
conductive edges. A reference marker never joins otherwise separate nets. See
[domain semantics](DOMAIN_MODEL.md#labels-electrical-ground-and-solver-reference-d03)
and [engine reference selection](ENGINE_CONTRACTS.md#solver-reference-selection-d03).

## D06 — Recorded refinement

The project holds structure, dataset descriptors/provenance, and asset references;
sample arrays/bytes are logically separate payloads. Initial portable JSON may carry
small payloads in the existing inline asset table. This is not an all-datasets-inline
requirement. Large external datasets, archives, and package formats are deferred;
do not invent external links, omit required bytes, or claim a partial export is
portable. See [file policy](PROJECT_FORMAT.md#container-and-version-axes) and
[measurement storage boundary](MEASUREMENT_DATA.md#project-structure-and-sampled-payloads-d06).

## Deliberately deferred decisions

Specific FFT/SPICE/numerical libraries, KiCad format versions, hardware protocols,
desktop packaging, cloud persistence, mixed-signal scheduling, bus/hierarchy
semantics, validity-masked waveform data, advanced DRC and manufacturing rule sets
need actual module requirements and evidence. No placeholder implementation or
universal abstraction is required now.

External dataset containers/package formats and an autosave backend also remain
deferred. These do not block a V2.0-B structure/serialization foundation with empty
measurement collections or small inline fixtures. D09's conditions are future
release obligations, not unresolved model-design questions.

## V2.0-B readiness

No material unresolved architecture question blocks V2.0-B at this review's scope.
D03/D06 have concrete initial semantics and preserve deferred decisions without
inventing infrastructure. **Separate owner authorization to start V2.0-B is still
required and has not been given in this review.**

## Decision maintenance

For later changes, record the decision ID, date, actual choice, rationale,
affected contracts, and implementation task. Update the relevant specification,
progress tracker, and concise handoff. Preserve the distinction between a reviewed
contract, implemented functionality, internally verified behavior, and a released
public workflow. Do not substitute a progress percentage for any of these states.
