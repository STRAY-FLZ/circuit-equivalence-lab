# Architecture

## Current scope

M0 provides the React/TypeScript/Vite project, domain types and validation, module contracts, and a presentation shell with theme switching. M1 adds a deterministic, UI-independent topology engine. Numerical solving, equivalent transformations, circuit drawing, and interactive teaching remain future work.

The topology engine lives in `src/topology/`. It imports only `domain` and its own internal helpers, uses standard JavaScript data structures, and has no React, DOM, SVG, coordinate, browser, or graph-library dependency. The existing UI remains the M0 presentation shell; M1 is consumed through the TypeScript API.

## Module boundaries

Dependencies point from consumers to providers. These are permitted directions, not a claim that every planned dependency is currently used.

| Module | Responsibility | Allowed project dependencies |
| --- | --- | --- |
| domain | Stable IDs, connection points, wires, positive resistors, terminals, data integrity | None; no React |
| topology | Wire equivalence, normalized branches, terminal mappings, resistive components | domain |
| solver | Future numerical resistance-network solver and explicit result states | domain, topology |
| transforms | Future equivalent transformations and applicability checks | domain, topology, solver |
| visualization | Separate layout data and future SVG views | domain, topology; React allowed |
| education | Formula, explanation, and derivation data | domain, topology, solver, transforms; no React |
| components | Generic React UI without circuit knowledge | None; React allowed |
| App | Application composition | May combine the modules above |

Public module APIs are exported through `index.ts`. ESLint restricts production cross-module imports and React dependencies. Tests may compose modules. M1 does not change the existing solver, transform, visualization, education, or UI implementations.

## Domain model and validation

| Type | Meaning |
| --- | --- |
| ConnectionPoint | A declared point with a stable ID; not necessarily an electrical node |
| Endpoints | Exactly two point IDs, preserving original endpoint order |
| IdealWire | `kind: 'wire'`; explicitly represents an ideal conductive connection |
| ResistanceOhms | A branded number in ohms, finite and strictly positive |
| Resistor | `kind: 'resistor'`; endpoints and a ResistanceOhms value |
| ExternalTerminal | Stable terminal ID, display label, and referenced point ID |
| CircuitNetwork | Network ID and readonly point, element, and terminal collections |
| CircuitLayout | Independent optional coordinates indexed by point ID |

Points, elements, and terminals have independent ID namespaces. Wires and resistors share the element namespace. Within each namespace, IDs must be unique, nonempty strings without leading/trailing whitespace. Callers assign IDs; array positions, labels, and coordinates do not define identity.

`resistanceOhms(value)` requires `Number.isFinite(value) && value > 0`. Zero (including negative zero), negative values, NaN, and infinities are rejected. No arbitrary positive minimum or maximum is imposed. Numerical conditioning and tolerances belong to M2.

`createCircuitNetwork(input)` validates IDs, endpoint arity, point references, element kinds, positive resistances, and nonempty terminal labels, then copies and deeply freezes the network. It does not merge points or perform circuit calculations. M1 reuses this boundary for every analysis call, including inputs that were previously constructed by the factory.

Invalid references and endpoint data throw TypeError with the owning element or terminal ID. Invalid resistance throws RangeError with the resistor ID and the original validation error as its cause. Duplicate-ID errors name the namespace and duplicate ID. No invalid component is silently removed. Sparse endpoint tuples are checked at both positions.

This is a typed `CircuitNetwork` API, not a complete parser for arbitrary unknown/JSON values. Unsafe casts do not replace validation; malformed object/collection shapes beyond the typed contract are not promised schema diagnostics. Error classes and contextual messages are available; there is no new structured error-code API.

Valid unusual structures include:

- Repeated or reversed wires with **distinct element IDs**, wire cycles, and self-connecting wires.
- Isolated points, empty networks, and disconnected subgraphs.
- Parallel resistor branches, resistor self-loops, and wire-bypassed resistors.
- Multiple terminal IDs referencing one point or one electrical node; repeated display labels.
- Very small or large finite positive resistances, preserved without arithmetic.

An ideal short is expressed by a wire; an open connection by absence of an edge. A bypassed resistor must still contain a valid positive resistance.

## Public topology API

~~~ts
import { analyzeTopology } from './src/topology'
import type { TopologyAnalyzer, TopologyResult } from './src/topology'

const analyze: TopologyAnalyzer = analyzeTopology
const topology: TopologyResult = analyze(network)
~~~

The preserved entry contract is:

~~~ts
type TopologyAnalyzer = (network: CircuitNetwork) => TopologyResult
~~~

| Result field | Contents |
| --- | --- |
| networkId | The source network's ID |
| nodes | ElectricalNode records: `id` and sorted original `pointIds` |
| pointToNode | Every declared point ID mapped to its electrical-node ID |
| resistors | Every original resistor, retaining `id`, ordered `nodeIds`, original `resistance`, and `isShortCircuited` |
| terminalToNode | Every external terminal ID mapped to its electrical-node ID |
| components | ResistiveComponent records: `id`, sorted `nodeIds`, sorted `resistorIds` |
| nodeToComponent | Every electrical-node ID mapped to its resistive component |

Exported types are `ElectricalNodeId`, `ElectricalNode`, `NormalizedResistor`, `ResistiveComponentId`, `ResistiveComponent`, `TopologyResult`, and `TopologyAnalyzer`. No duplicate domain model is introduced. The DSU class is an internal module, intentionally absent from the public barrel.

All returned records, collections, endpoint tuples, and dictionaries are frozen. Lookup dictionaries have null prototypes, so IDs such as `__proto__`, `constructor`, and `toString` cannot collide with inherited properties. The mappings use readonly partial records: an undeclared dynamic lookup returns undefined. Use bracket indexing, Object.entries, or Object.hasOwn; do not call prototype methods on a dictionary.

The output shares no mutable caller-owned arrays or objects. The analyzer neither modifies nor freezes the caller's input.

## Normalization pipeline

1. Validate and copy the input through the existing domain factory.
2. Initialize a DSU with every declared point, including isolated points.
3. Union only ideal-wire endpoints. Resistors never participate in this equivalence operation.
4. Find wire equivalence classes, sort their original point IDs, and construct canonical nodes and the point lookup.
5. Normalize every resistor endpoint through the point lookup, preserve its identity/resistance/endpoint order, and mark it short-circuited exactly when both node IDs are equal.
6. Normalize terminals by their stable terminal IDs, not their labels.
7. Initialize a second DSU with every normalized node. Union endpoints of non-short-circuited resistor branches to identify resistive connected components.
8. Assign all resistor IDs, including short-circuited self-loops, to their owning component. Freeze and return the normalized result.

The DSU uses iterative full path compression and union by size. Redundant unions are no-ops. Its internal roots may change with union order and are never exposed as public IDs.

Parallel branches remain separate entries with their original IDs and values. No parallel aggregation, series reduction, conductance calculation, or equivalent resistance is performed.

## Canonical IDs and determinism

String ordering is JavaScript UTF-16 code-unit lexicographic order, using `<` and `>`; it is not locale-sensitive or numeric ordering. There is no Unicode normalization. For example, `10` precedes `2`, and `A` precedes `a`.

- Electrical node ID: `node:` followed by the smallest original point ID in that wire equivalence class.
- Resistive component ID: `component:` followed by the smallest electrical-node ID in the component.

For points B and A joined by a wire, the node is `node:A`, with `pointIds: ['A', 'B']`. If a resistor connects that node to `node:C`, their component is `component:node:A`.

These fixed-prefix encodings are injective within their respective namespaces, even when a caller's ID already contains colons or the prefix. IDs are network-scoped, not globally unique across circuits.

Membership arrays are sorted. Nodes and components are sorted by their canonical IDs, and resistors by original resistor ID. Lookup construction follows deterministic sorted traversal; consumers should treat dictionaries as mappings rather than depend on their enumeration order. Equivalent inputs reordered across points, wires, resistors, and terminals produce equal normalized results and deterministic JSON serialization. Reversing a wire's endpoints also preserves the result.

Resistor endpoint order is intentionally preserved for future orientation-sensitive consumers. Swapping the two endpoints of a resistor changes its stored tuple even though undirected connectivity is equivalent.

IDs remain stable under input permutations, redundant-wire changes that preserve the partition, and geometry-only changes. They are **not** guaranteed stable after renaming a minimum member, adding a smaller member to a group, merging/splitting groups, or otherwise editing connectivity. The source network ID is an identity label, not a topology fingerprint; recompute after electrical edits.

## Electrical nodes versus resistive components

An electrical node is a maximal group connected using **only ideal wires**. A resistive connected component is a maximal group of these nodes connected through resistor branches.

A resistor between A and B therefore normally gives two electrical nodes in one resistive component. An isolated electrical node forms a singleton component even without a terminal or resistor.

A short-circuited resistor is a self-loop on an already established electrical node. It remains in `resistors` and in its component's `resistorIds`, but contributes no connection to another node and creates no extra component. Every resistor belongs to exactly one component, and every node belongs to exactly one component. An empty network returns empty collections and mappings.

## Geometry separation

Coordinates belong exclusively to the visualization model. Crossing or overlapping lines create no connection unless the declared graph explicitly shares a point or contains a connecting wire. The topology engine reads no geometry fields; even extra coordinate fields on structurally compatible input objects cannot affect the result. Missing coordinates do not imply an open circuit.

Future drawing code consumes domain/topology data. It must not infer electrical connectivity from screen intersections.

## Complexity

Let P be the number of points, W ideal wires, R resistors, T external terminals, N normalized electrical nodes, and C resistive components. N <= P and C <= N. Let alpha be the inverse Ackermann function. Bounds below assume expected constant-time map/set operations and unit-cost ID comparisons; long identifier strings add their comparison/hash costs.

| Phase | Time |
| --- | --- |
| Domain validation and snapshot | O(P + W + R + T) |
| Point DSU initialization | O(P) |
| Wire union/find operations | O((P + W) alpha(P + 1)) amortized |
| Node canonicalization and ordering | O(P alpha(P + 1) + P log(P + 1) + N log(N + 1)) |
| Resistor normalization and ordering | O(R + R log(R + 1)) |
| Terminal normalization and ordering | O(T + T log(T + 1)) |
| Component DSU, branch assignment, and canonicalization | O(N + (N + R) alpha(N + 1) + N log(N + 1) + C log(C + 1)) |
| Output dictionaries and freezing | O(P + R + T + N + C) |

A simplified total bound is:

~~~text
O((P + W + R) alpha(P + 1)
  + P log(P + 1) + R log(R + 1) + T log(T + 1))
~~~

Peak space is O(P + W + R + T), including the validated domain snapshot. The returned topology occupies O(P + R + T). Sorting is part of the implementation, so the whole analyzer is not claimed to be purely near-linear.

## M2 integration boundary

M2 can resolve query terminals with `terminalToNode`, identify their components using `nodeToComponent`, enumerate component nodes and resistor IDs, and consume branch endpoint IDs and ResistanceOhms values. It can filter `isShortCircuited` branches while retaining their identities for later explanations.

M2 must decide reference-node selection, excitation, numerical tolerances, matrix assembly, conditioning/error behavior, and interpretation of query states. M1 performs none of these operations. It assigns no voltage, current, power, ground node, or equivalent resistance, and does not invent open/short resistor values.

The existing `ResistanceSolver` result contract still distinguishes finite resistance, short-circuit, open-circuit, and error states. Transform, visualization, and education contracts remain future interfaces.

## Verification

Tests run in the Node environment for domain and topology and use real implementations. The required A/B/C cases verify membership, canonical IDs, original branch identity and values, terminal mappings, short flags, components, validation errors, and input/output immutability. Additional checks cover unusual string IDs, endpoint arity/sparsity, extreme finite resistances, permutations, and 64 reproducible graphs compared with an independent traversal oracle.

TypeScript strict settings and type-aware ESLint remain enabled. Existing M0 tests and the real Vite startup test continue to run. Exact command outcomes and test counts are recorded in DEV_LOG.md.
