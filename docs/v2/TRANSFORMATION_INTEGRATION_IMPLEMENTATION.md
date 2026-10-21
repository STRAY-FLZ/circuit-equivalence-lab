# V2.0-D Editor / V1 Transformation Integration

Status: **Implementation Complete / Verified, D-C01–D-C10, 10/10**, 2026-10-21.
Internal milestone, **not Released**. Package remains `0.1.0`.
Baseline: accepted C `296c191`; branch `codex/v2-transform-integration`.
Verified implementation commit: `0f3dd6a`; final handoff also removes formatting-only
trailing whitespace. No accepted history is rewritten.

## Composition and APIs

| File / API | Responsibility |
| --- | --- |
| [integration/transformations.ts](../../src/integration/transformations.ts), [public barrel](../../src/integration/index.ts) | React-free composition over existing projection, discovery, application, verification and education APIs |
| `discoverForProject(project, sheetId, observedAnchorIds?)` | `ready` session, explicit `unsupported` reasons, or `invalid` input; one complete eligible sheet |
| `candidateLabel`, `candidateHighlight` | Map V1 candidate IDs/nodes to actual project reference labels, component UUIDs and anchor UUIDs |
| `previewTransformation(session, candidateId)` | Immutable computed result, independent numerical evidence, existing lesson content and any dangling-reference issue |
| `writebackTransformation(project, preview)` | Revision-bound revalidation, same existing numerical verification, validated atomic V1-to-V2 reconciliation |
| [editing/history.ts](../../src/editing/history.ts): `commitSnapshot` | Add the prepared aggregate as exactly one history entry, with project/revision validation |
| [TransformationPanel.tsx](../../src/editor/TransformationPanel.tsx) | Boundaries, discovery, candidate selection, preview/evidence, apply and five-stage lesson UI |
| [SchematicEditor.tsx](../../src/editor/SchematicEditor.tsx) | Compose commands/history, SVG highlights, invalidation and fit after writeback |
| [CircuitDiagram.tsx](../../src/visualization/CircuitDiagram.tsx), [layout.ts](../../src/visualization/layout.ts) | Optional display labels; layout measures those labels instead of long stable IDs |

No new circuit model, solver, equation implementation, engine registry or dependency
was added. Engineering, compatibility, topology, solver, transforms and education
source remain unchanged. ESLint adds a narrow `integration` layer; V1 numerical
layers retain their existing dependency restrictions.

`buildDrawing` accepts an optional fourth `elementLabels` argument. `CircuitDiagram`
accepts optional `elementLabels` / `pointLabels`. Existing calls retain the old
behavior. Labels never replace authoritative network IDs or change topology.
Own-property lookup preserves arbitrary legacy ID namespaces, including names
that coincide with object-prototype properties.

## Scope, observations and mappings

The B `projectToV1` contract remains authoritative: recognized pinned two-pin
built-in resistor models only, finite positive resistance in ohm, full selected
sheet, explicit graph and exact label scopes. A disconnected C/L/source still
makes that sheet unsupported. A conductive label net leaving the sheet is
unsupported; electrically independent sheets can remain unchanged.

The existing projection identity arrays map all V1 points/elements/terminals to
project anchors/components/connections/ports. Imported aliases remain traceable;
V1-generated `m3:` identifiers never become permanent engineering UUIDs.
Electrical net keys and topology node IDs are snapshot identifiers.

Users set persistent boundaries with the existing **external-port** tool. Every
port participates in verification and protection. Users may also select a pin or
anchor and add a temporary observation. References, anchor-bound measurements,
supported analysis observations and PCB pin mappings are included by B projection.
Synthetic observation terminals enter the existing all-pairs verifier but never
become new user ports on writeback. Temporary observations persist in a committed
operation's provenance, not as an automatically restored future selection.

Discovery and application pass the same `protectedPointIds`. Label/GND projection
wires stay synthetic, ground joins only its explicit electrical label group,
and a solver-reference marker never creates connectivity.

Component/pin-bound references cannot be rescued simply by retaining a node.
Removing a PCB-assigned component or an explicitly observed analysis pin is
rejected until a rebind workflow exists. Anchor-bound observations may remain
on retained free anchors. Unknown observation contracts remain unsupported under
the existing B policy. These checks prevent dangling domain references; they
do not add a mathematical verification condition.

## D05: unchanged numerical acceptance policy

1. Project the exact immutable source and discover using the declared protection.
2. Apply the chosen existing V1 operation and independently call
   `verifyTerminalEquivalence` on the actual source/result networks.
3. Display its `equivalent`, `different`, or `inconclusive` result and pair evidence.
   Computation failures and unsupported configurations are separate outcomes.
4. Initially commit only `equivalent` evidence. No-port/fewer-than-two-terminal
   previews remain available but inconclusive. Failed or inconclusive previews
   cannot be submitted as verified edits.
5. On apply, reject a stale source revision, rediscover/reapply the same candidate,
   and call that **same verifier** again. A modified preview flag cannot bypass it.

No symbolic proof, new tolerance, post-mapping numerical gate, or replacement
algorithm is introduced. The verifier keeps its existing default relative
tolerance `1e-8` and absolute tolerance `0`. Display rounding never feeds back
into resistance data or numerical comparisons. Physical open/short pair outcomes
retain their original meaning; numerical errors do not become successful evidence.

## Atomic writeback and geometry

Unselected components, pins, connections, ports, labels, references, their geometry,
other sheets and supported engineering metadata retain their identities and values.
V1 retains original ideal wires, including imported connector edges and residual
groups. Old pin anchors retained by the V1 result become free anchors after the
owning selected component is removed. No residual wire is silently discarded.

Replacement resistors, pins, anchors and explicit connector edges receive fresh
UUIDs. New star points receive fresh anchor UUIDs. Replacement definitions and
symbols use pinned built-in resistor records. Connection endpoints map through the
actual projection/result point map; synthetic label wires/terminals are not imported.

Preserve old anchor/route geometry, place new bodies below the old geometry in
separate rows, and create explicit orthogonal connector routes. Auto-fit exposes
the complete result. This separates new symbols from preserved residual wires
without changing their electrical meaning or claiming a general layout router.
Domain validation and net derivation run before the snapshot is returned.

`commitSnapshot` pushes the complete result once. Undo restores all old content
and IDs; redo restores the same replacement IDs and content. Each history state
has a fresh revision. Preview, candidate selection and lessons add no history
entry. Any engineering revision invalidates the old runtime preview/highlight.

The optional `org.stray.transformations` extension records source/result revisions,
sheet and temporary observations, complete V1 source/result snapshots, transform
metadata and numerical evidence, source identity arrays, replacement identity
arrays, result point mappings and new connector IDs. This is command provenance,
not a new analysis-provider `ResultRecord`. After undo/redo or later edits it
remains a historical operation record; this UI does not assert that it is a fresh
analysis of a modified project.

## Guided lessons and user flow

The editor now supports:

**Edit → Declare ports/observations → Discover → Select/highlight → Preview and
verify → Apply or study → Undo/redo → Export/reopen.**

Lessons use the same actual V1 source, selected candidate, applied metadata and
independent evidence via existing `buildLesson` and `lessonHighlights`. All five
stages and MathML remain unchanged. Application is disabled while studying that
source snapshot; exit the lesson to apply it. A project edit invalidates the
lesson rather than teaching from mismatched source/result records.

The original eight V1 examples plus the pre-existing symmetric-delta educational
input remain reachable in the default V1 workspace. Its cached preview/lesson
workflow, editor files/history, shared light/dark theme and return-home link remain.

## Actual verification

Environment: Node `24.21.0`, npm `11.19.0`, local Chrome `155.0.8059.40`.

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings |
| `npm run test` | **438 passed, 27 files**: 404 accepted baseline + 34 D cases |
| `npm run build` | Passed, 69 modules; existing classic pre-theme script separately served |
| [Domain integration tests](../../src/integration/transformations.test.ts) | 25: four drawn categories, six imported cases, observations, metadata, writeback, stale/invalid states, history, persistence and lesson records |
| [UI integration tests](../../src/editor/TransformationPanel.test.tsx) | 9: actual drawn workflow, five stages, preview invalidation, verdicts/failure, temporary observations, mixed circuits and presentation identity |
| [Chrome replay](../../tests/browser/editor-transformations.js) | Seven workflow groups, zero page/console errors or HTTP failures |

Equivalent, zero-terminal inconclusive and extreme-value computation failure cases
use actual engine results. `different` orchestration/UI tests inject a rejected
verifier verdict to exercise that branch; no fake browser equivalence is claimed.
All 404 prior cases ran in the final full suite. No repeated historical full-suite
run was needed; focused checks preceded the final standard run.

Chrome used the local **built preview**, `http://127.0.0.1:4173/circuit-equivalence-lab/`:
draw 100/220-ohm series resistors, wire/select ports, discover/highlight, preview,
verify 320 ohms, traverse all five lesson stages, apply once, undo/redo, download
and reopen that actual file. Separate drawn parallel, Δ and Y fixtures each
previewed, independently verified and committed. Before/after diagram visibility
was explicitly asserted after correcting display-label measurement.

Both themes and **1440×1100 / 390×844** layouts passed without page overflow;
wide diagrams scroll inside their containers. Existing protected B boundary,
inconclusive no-port preview, mixed-capacitor rejection, V1 examples/previews and
home destination were checked. Screenshots were visually inspected, including
the reopened committed geometry. Task-started browser/preview services were closed.

Ignored local evidence: `output/playwright/integration-browser-verification.txt`,
`integration-series-preview.png`, `integration-lesson.png`, desktop/mobile
light/dark and panel captures, parallel/delta/star previews, `integration-committed.png`,
and the actual transformed/reopened `.straylab.json` files. The final two files
are byte-identical, SHA-256:
`c0c4404decee0a3a2ef485eda7fee6d1eca56359a42c2b5ef4b504b14ce802ed`.

## Limits and handoff

- Whole eligible single-sheet resistor scopes only. No extraction of a compatible
  subset from a mixed sheet, general DC/AC/RLC engine, or new simulation capability.
- V1 comparison retains its bounded layout (16 points/24 elements) and can report
  ambiguous/unavailable drawings; complete source/result/mapping data remains
  inspectable. This display condition does not gate verified writeback and does
  not bound the editable schematic.
- Replacement geometry is a basic initial layout, not collision-free automatic
  routing. Residual wires/free anchors intentionally remain. No advanced editing,
  multi-selection or PCB/probe rebind workflow is added.
- Port editing and existing history/export behavior remain as C. Preview/lesson
  sessions and temporary observation selections do not resume on reload; committed
  provenance remains in files. No cloud, autosave or persistent undo stack.
- Verification is tolerance-scoped numerical evidence at declared boundaries,
  not a new proof claim. Physical-device and cross-browser certification were
  not performed; responsive evidence uses local Chrome viewport sizes.
- Existing C dev-mode pre-theme/cache-watcher observations remain documented;
  this round used built preview only and had no browser-resource failures.

No material unresolved implementation question blocks release preparation.
See [V2.0.0 release readiness](V2_0_0_RELEASE_READINESS.md) for actual remaining
publication work and rollback procedures. **Stop after D; no public release,
push, production merge, deployment, tag, package bump or personal-site edit is
authorized or performed in this module.**
