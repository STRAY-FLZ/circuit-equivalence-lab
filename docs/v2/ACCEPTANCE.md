# V2.0-A Acceptance Record

Date: **2026-10-20**. Module: System Architecture and Interface Design.
Status: **Verified — internal design outputs complete (10/10)**.
This is internal design acceptance, not implementation, owner decision approval,
or a new public release.

## Deliverable evidence

| ID | Output | Review criterion |
| --- | --- | --- |
| A01 | [Architecture reuse inventory](ARCHITECTURE.md#a01--current-v1-contracts-and-reuse) | Actual V1 public providers and limits distinguished from new modules |
| A02 | [EngineeringProject](DOMAIN_MODEL.md#project-aggregate-and-common-values) | Projects/sheets/definitions/configs/results/data/board references and ownership explicit |
| A03 | [Stable identity](DOMAIN_MODEL.md#stable-identity-and-references) and [connectivity](DOMAIN_MODEL.md#authoritative-connectivity-and-derived-nets) | Arbitrary pins, graph authority, nets/labels/references, and geometry separation explicit |
| A04 | [Engine contracts](ENGINE_CONTRACTS.md) | Capability, provenance, independent methods, physical/error/unsupported/inconclusive states |
| A05 | [V1 compatibility](V1_COMPATIBILITY.md) | Import/projection/protected boundaries, synthetic edges/terminals, writeback and migration boundary |
| A06 | [Project format](PROJECT_FORMAT.md) | File/app/revision versions, finite/validated assets, unknown semantics and migration policy |
| A07 | [Measurement data](MEASUREMENT_DATA.md) | Time/frequency axes, units, source provenance, calibration, CSV/FFT applicability |
| A08 | [PCB interoperability](PCB_INTEROPERABILITY.md) | Stable pin/pad mapping, source/board check freshness, explicit export limits |
| A09 | [Implementation roadmap](IMPLEMENTATION_ROADMAP.md) | B/C/D scopes/dependencies/acceptance and usable public release gate |
| A10 | [Decision register](DECISIONS.md), this record and persistent handoff | Consistency checks and owner review outcomes recorded; accurate module/release states |

## Cross-document design walkthrough

These are checks of the written design, not executed production behavior.

| Scenario | Contract trace and conclusion |
| --- | --- |
| Symbol moves across a wire | Domain graph unchanged; editor geometry separate; analysis never infers a connection |
| Shared V1 point / self-loop import | Adapter allocates distinct instance pin anchors and explicit connector edges; graph semantics survive without violating V2 pin invariants |
| Labels connect across sheets | Domain resolves project-wide groups; first V1 single-sheet projection rejects escaping connectivity |
| Protected probe during transform | Adapter protection plus synthetic terminals checks observability; numerical evidence remains tolerance-scoped; mapped-pin removal rejected |
| Unsupported source/transistor in V1 scope | Provider/adapter reports unsupported with entity identity; no resistor-only truncation |
| Old result or writeback finishes after edit | Revision/digest provenance and expectedRevision prevent stale attachment/commit |
| Newer file schema / required extension | Parser retains original/read-only or rejects; no silent resave under older semantics |
| CSV unit missing / irregular samples | Explicit mapping or rejection; no guessed SI scale or silent uniform FFT |
| FFT/calibration derived from imported capture | New dataset references immutable input/source graph; raw samples retained |
| Board source changes | Pin membership/revision/digest invalidates check evidence; preview does not assert manufacturability |
| Architecture milestone completes | Progress can become Verified; package/public baseline remains unchanged and not Released |

## Lightweight verification results

| Check | Actual result |
| --- | --- |
| Markdown local files/fragments and fences | Passed for the context and ten design documents; all referenced local targets/sections resolve |
| TypeScript contract examples | Passed: six specification modules type-checked together in memory using actual repository ES2023/strict settings and imported V1 public types; no emitted source files |
| Complete project JSON fixture | Parsed and type-checked against ProjectDocumentV1 in memory |
| Whitespace and changed paths | Documentation whitespace checks passed; only root instructions/docs differ from tracked baseline |
| Design walkthrough | Eleven scenarios above traced through the contracts; preserve V1, distinct engines, graph authority, source provenance, file evolution and release gates |
| Deliverable/status consistency | All A01–A10 have linked design evidence; 10/10 internal deliverables; no V2 implementation or public release claimed |

Verification harness notes: its first run used an ES2022 library rather than the
repository's ES2023 settings, and its generated JSON-to-TypeScript fixture initially
retained a trailing newline before a type assertion. Corrected those in-memory
checks and obtained the passing results above; no application defect or source
change was involved. Type-checking verifies interface compatibility, not runtime
schema/solver implementation.

No V1 historical test rerun, production build, browser test, deployment, remote
push, external install, or personal-website edit belongs to this design milestone.
No runtime correctness claim is inferred from type-checking interface examples.

## Remaining review and implementation boundaries

At original design completion, D01–D09 were recommendations pending owner review.
The owner's subsequent 2026-10-20 review is now recorded in DECISIONS.md: D01/D04/
D05/D07/D08 approved unchanged, D02 approved with clarification, D03/D06 revised,
and D09 conditionally approved. Completed A01–A10 and their original verification
record are preserved. Only D03/D06 semantics and review-status references are
reconciled in this follow-up; the original V1 compatibility design is unchanged.

V2 production implementation has not begun. File parsing, net resolution,
adapters, numerical methods, persistence, and board interchange all need the
targeted future acceptance listed in their specifications. Advanced hardware,
mixed-signal scheduling, hierarchy/buses, and vendor-specific EDA formats remain
explicitly deferred.

No material unresolved architecture question blocks V2.0-B at this review's scope.
External dataset formats, autosave backends, and specific EDA/simulation integrations
remain deferred to demonstrated needs. D09 conditions apply before public release.
Next recommended task: separately authorize **V2.0-B — Engineering Project Model**.
This documentation review does not grant that authorization.

## Architecture review verification — 2026-10-20

- Review follow-up: **Verified, 4/4 actions**; original A01–A10 remain 10/10.
- Checked 14 context/design documents and 101 local file/fragment links, Markdown
  fences/whitespace, all nine review outcomes, original deliverable status, and
  documentation-only working-tree scope. Package version remains `0.1.0`.
- D05's original recommendation text exactly matches the pre-review snapshot.
  V1_COMPATIBILITY.md is byte-identical before/after, SHA-256
  `0cef414a32107b9fc4f6b30500e768676a96b9314a6c837563669abf48f29ae0`.
- Technical changes are limited to D03 label/ground/solver-reference clarification
  and D06 structural/payload separation; remaining edits record review/handoff state.
  No additional proof/verification gate, V1 algorithm change, dependency, historical
  test rerun, push, deployment, or V2.0-B implementation.

## Files and Git/release scope

- New design outputs: the ten Markdown documents under `docs/v2/` linked above.
- New persistent tracker: [DEVELOPMENT_PROGRESS.md](../DEVELOPMENT_PROGRESS.md).
- Updated handoff/instructions: [CURRENT_STATUS.md](../CURRENT_STATUS.md) and
  [AGENTS.md](../../AGENTS.md); development-log entry recorded at completion.
- Pre-existing local/uncommitted PROJECT_CONTEXT.md and LONG_TERM_ROADMAP.md are
  retained. No V1 source/test/dependency/configuration changes.
- Baseline at kickoff: local `main`, HEAD `8fd6e9b`; no V2 commit/tag is invented.
- Release status: no new usable version published. Latest public evidence remains
  M8 at `a7096c7`, verified 2026-10-11 per repository records; package `0.1.0`.
  Public application: https://stray-flz.github.io/circuit-equivalence-lab/
  It was not reverified online during this documentation task.
