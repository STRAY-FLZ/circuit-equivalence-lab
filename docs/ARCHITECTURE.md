# Architecture

## Current scope

M0 provides the React/TypeScript/Vite project, domain types and validation, module contracts, and a presentation shell with theme switching. M1 adds a deterministic, UI-independent topology engine. M2 adds a component-aware DC nodal solver with explicit physical states and numerical diagnostics. M3 adds explicit series, parallel, delta-to-star and star-to-delta rewrites with independent terminal-equivalence verification. M4 adds real SVG circuit diagrams and single-operation transformation previews. M5 adds five-stage guided lessons, grounded numerical substitutions and cached port-verification evidence. M6 verifies representative integration workflows and fixes a measured text-contrast defect without changing module APIs or computation/state architecture.

The topology engine lives in `src/topology/`. It imports only `domain` and its own internal helpers, uses standard JavaScript data structures, and has no React, DOM, SVG, coordinate, browser, or graph-library dependency. The M4 UI consumes M1 topology through the visualization layer and composes M3 discovery, application and verification in App.

## Module boundaries

Dependencies point from consumers to providers. These are permitted directions, not a claim that every planned dependency is currently used.

| Module | Responsibility | Allowed project dependencies |
| --- | --- | --- |
| domain | Stable IDs, connection points, wires, positive resistors, terminals, data integrity | None; no React |
| topology | Wire equivalence, normalized branches, terminal mappings, resistive components | domain |
| solver | DC nodal analysis, equivalent resistance, explicit physical states and numerical failures | domain, topology |
| transforms | Candidate eligibility, immutable graph rewrites, operation metadata and optional equivalence verification | domain, topology, solver |
| visualization | Deterministic presentation models, layouts and SVG views | domain, topology; React allowed |
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

Drawing code consumes domain/topology data. It must not infer electrical connectivity from screen intersections.

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

The existing `ResistanceSolver` result contract still distinguishes finite resistance, short-circuit, open-circuit, and error states. M3 transformation contracts are implemented below; visualization is implemented in M4; education lesson content is implemented in M5.

## M2 solver API and module boundaries

~~~ts
import { solveEquivalentResistance } from './src/solver'

const result = solveEquivalentResistance(topology, 'terminal-a', 'terminal-b')
~~~

The input must be a validated M1 `TopologyResult`. The solver never invokes `analyzeTopology`, rebuilds wire equivalence, or parses unknown/JSON data. It checks terminal existence and selected-component consistency, but does not promise comprehensive diagnostics for forged topology objects. Neither domain nor M1 contracts were changed.

The unused M0 solver placeholder has evolved: `ResistanceQuery` carries `topology` instead of `network`; `ResistanceSolver` now matches the three-argument entry function. There were no consumers of the placeholder. Result discriminants are preserved and extended:

| kind | Data and meaning |
| --- | --- |
| finite | Positive finite branded `resistance` in ohms, `nodeVoltages`, `branches`, `diagnostics` |
| short-circuit | `resistance: 0`; both existing terminals resolve to one electrical node |
| open-circuit | Different resistive components; no Infinity-valued JSON field |
| error | `code` and contextual `message`; never a substitute for physical open/short classification |

Error codes are `unknown-terminal`, `invalid-topology`, `numerical-failure`, and `size-limit`. Unknown terminals are checked before same-node classification. A query of one existing isolated terminal against itself is a short; two different isolated nodes are open. Classification precedes matrix construction. Short/open results intentionally contain no inferred voltage/current diagnostics.

Only the function and public types are exported by `solver/index.ts`. Internal files are:

- `nodal-system.ts`: selected-component extraction and deterministic matrix assembly.
- `linear-system.ts`: symmetric diagonal equilibration, Cholesky factorization, triangular solves, condition estimate, and residual checks.
- `numerics.ts`: dense storage and finite/positive/unit-conversion guards.
- `solve-equivalent-resistance.ts`: classification, orchestration, physical diagnostics and KCL acceptance.
- `types.ts`: immutable public result contracts.

The implementation uses standard JavaScript typed arrays, has no new dependencies, and imports no UI, geometry, or browser APIs. It does not perform circuit transformations.

## Nodal equations and units

For a branch from i to j, `g = 1/R` siemens and `Iij = g(Vi - Vj)` amperes. KCL at each unknown node gives `sum_j g_ij(Vi - Vj) = Ii`, hence `G V = I`.

Terminal B's node is the reference (`VB = 0 V`). Inject `+1 A` at A and withdraw `1 A` at B. Removing B's equation leaves one nonzero RHS entry at A. Consequently `Req = (VA - VB) / 1 A`, whose numerical value in ohms equals VA in volts.

Each non-short resistor contributes +g to both endpoint diagonals and -g to the two off-diagonal positions. A reference endpoint has no unknown index, so only the other diagonal is stamped. Parallel branches are stamped separately; original resistor IDs are never merged. Shorted self-loops are excluded from stamping, including scale selection, but retained in diagnostics with exactly zero drop and current.

Only the component containing both terminals is assembled. All its nodes participate, including dangling trees/cycles. Unrelated floating networks and isolated nodes are excluded. No absolute potentials or currents are reported for those unrelated components.

## Scaling and linear solution

Let `s` be the smallest non-short resistance in the selected component. Rather than computing possibly overflowing raw reciprocals, stamp `H = s G` using weights `s/R <= 1` and solve `H x = I`, where `x = V/s`. A uniformly tiny or large network thus has the same normalized system. Canonical node IDs and resistor IDs determine assembly order.

Set `Dii = sqrt(Hii)`, `A = D^-1 H D^-1`, `b = D^-1 I`, and `y = D x`. Solve `A y = b` using `A = L L^T` and forward/back substitution, then recover x and physical V. A connected positive resistor network yields an SPD grounded Laplacian in exact arithmetic, making Cholesky appropriate without row pivoting or explicit matrix inversion. The internal linear routine requires symmetric nonpositive off-diagonals; it is not a general-purpose linear solver.

The design uses the established SPD equilibration/factorization/condition-check approach described in [LAPACK DPOSVX](https://www.netlib.org/lapack/explore-html/d6/d44/group__posvx_gae23dac18e7ec69c36fd2a2648a470dc3.html). This implementation is smaller: it does not implement LAPACK iterative refinement or certified forward-error bounds.

For the equilibrated SPD M-matrix, the inverse is entrywise nonnegative. Solving `A z = 1` therefore gives its inverse row sums; `max(z)` estimates `||A^-1||inf`. The returned reciprocal condition estimate is `1 / (||A||inf * max(z))`. This requires one additional triangular solve, not an inverse matrix. The condition estimate describes the equilibrated system, not a rigorous error bound on every diagnostic.

## Numerical acceptance and limitations

Let n be the number of unknown nodes, m the number of selected resistor branches, and eps = Number.EPSILON.

| Check | Acceptance rule |
| --- | --- |
| Cholesky pivots on unit-diagonal A | Each pre-square-root pivot > `64 * eps * max(1,n)` |
| Reciprocal condition estimate | Greater than the same dimension-aware threshold |
| Reduced equation residual | `max_i abs((H x - I)i) / (abs(Ii) + sum_j abs(Hij*xj)) <= 512 * eps * max(1,n)`; a zero denominator uses absolute residual |
| Physical KCL, including reference | `abs(sum signed branch currents - injection) <= tau * max(1 A, sum abs(branch currents))`, with `tau = max(1e-9, 512*eps*(n+m))` |
| Passive voltage bounds | Normalized voltages within `[-1e-9*xA, (1+1e-9)*xA]`; no clamping |
| Physical unit conversion | Nonzero values must survive conversion; conversion round-trip relative discrepancy <= `1e-9` |
| Equivalent resistance | Strictly positive and finite |

Non-finite arithmetic, lost pivots, excessive condition/residual estimates, conductance underflow, current underflow, and unrepresentable physical results produce `numerical-failure`. In particular, a positive subnormal resistance that rounds with substantial relative error is rejected even if it remains nonzero. Numerical failures never return physical open/short states. Marginal networks may fail for one reference choice and succeed for another; failure is explicit and does not change connectivity.

Successful finite diagnostics contain:

- `nodeVoltages`: volts relative to B, only for the solved component; a frozen null-prototype dictionary.
- `branches`: every selected resistor ID, voltage drop and current directed from original `nodeIds[0]` to `nodeIds[1]`. Currents are computed as `(xi-xj)*(s/R)` to avoid unstable raw reciprocals. Reversing the query reverses physical branch currents.
- `diagnostics`: reference node, 1 A excitation, resistance scale, reciprocal condition estimate, componentwise equation residual, maximum absolute KCL residual in amperes, and the dimensionless KCL tolerance factor.

Outputs are deeply frozen; input topology is neither mutated nor frozen by the solver. Small negative roundoff in a nominally zero diagnostic is not silently clamped. Global scaling and residual checks improve reliability but cannot guarantee accurate results for every finite positive IEEE-754 input. High dynamic range, subtraction of nearly equal potentials, subnormal quantization, and ill-conditioning remain finite-precision limits. No arbitrary-precision fallback is included.

Dense assembly/storage costs O(n^2 + m), Cholesky O(n^3), subsequent solves and residuals O(n^2). Component selection scans the M1 component/resistor collections; canonical sorting adds O(n log n + m log m). Total auxiliary space is O(n^2 + m). The implementation explicitly limits the selected component to 512 unknown nodes before allocation; this is a documented resource bound, not a physical circuit limitation. Sparse solving, factorization caching, and incremental updates are future work. The test suite exercises a 100-edge chain; it is not a large-scale performance benchmark.

## M2 tests and M3 integration

M2 adds 64 tests: 51 public solver cases, one matrix-stamping case, 11 linear-algebra cases, and one independent exact reference test. The latter checks 32 connected integer-conductance multigraphs using BigInt Laplacian cofactor determinants and Cramer's rule, in both terminal directions; it shares no numerical solver code. These generated graphs are not separate Vitest test counts.

References include 7 ohm single, 2+3 series, 6||3 parallel, mixed networks, all delta/star terminal pairs, balanced bridge, and an unbalanced bridge with hand-derived `Req=106/33`, `VX=21/11`, `VY=20/11`, and central current `1/66 A`. K5 symmetry provides a non-series-parallel graph reference. Tests also verify current signs, KCL, power balance, matrix symmetry, scale changes, ordering, input immutability, explicit failures, prototype-like IDs, and JSON-safe physical states. The original 90 tests remain unchanged.

M3 can independently normalize the original and transformed networks through M1, then call M2 for corresponding external-terminal pairs. Compare physical states first; compare finite resistances using absolute plus relative tolerance. An error result makes the comparison inconclusive, not equivalent or open. For multi-terminal transformations, preserve terminal correspondence and verify all relevant port pairs; one matching pair alone does not establish general multi-port equivalence. M2 provides verification only, with no transformation algorithm or teaching UI.

## M3 transformation API

~~~ts
import {
  discoverTransformations, applyTransformation, verifyTerminalEquivalence,
} from './src/transforms'

const options = { protectedPointIds: ['boundary-point'] }
const discovery = discoverTransformations(network, options)
if (discovery.kind === 'candidates') {
  const chosen = discovery.candidates[0] // The caller selects one operation.
  if (chosen) {
    const result = applyTransformation({
      network, type: chosen.type, elementIds: chosen.elementIds, ...options,
    })
    if (result.kind === 'applied') {
      const evidence = verifyTerminalEquivalence(network, result.network)
    }
  }
}
~~~

Only supply protected point IDs that actually exist. `protectedPointIds` protects the whole M1 electrical node containing each point; all external-terminal nodes are always protected. Discovery and application must receive the same caller protection policy. Protection prevents elimination of series/star centers; boundary vertices remain eligible because those nodes and their external relationships are preserved.

`TransformType` is `series | parallel | delta-to-star | star-to-delta`. The M0 request placeholder now also requires a type; the network and explicit element selection remain. Discovery returns frozen candidates or `error/invalid-input`. Application returns `applied` with network/metadata, `not-applicable` with a reason, or `error` with `invalid-input` / `numerical-failure`. Discovery describes structural eligibility, not guaranteed numerical representability.

Each candidate identifies exact resistor IDs, sorted boundary node IDs, and an optional internal node. Its ID is an unambiguous JSON encoding of `[type, sortedElementIds]`. Candidates and their IDs use UTF-16 code-unit ordering, independent of input collection order. Application revalidates the selection against the current graph and uses current resistance values; candidate IDs are not revision hashes or concurrency locks. No automatic reduction loop or Y–delta iteration is implemented.

### Eligibility and formulas

An active branch is an M1 normalized resistor whose `isShortCircuited` flag is false. Distinct parallel resistors count as distinct incident branches. Shorted branches never become selected transformation edges, but remain in the network.

| Operation | Eligibility | Formula |
| --- | --- | --- |
| Series | Two selected branches share one unprotected internal node with exactly two active incident branches and two distinct neighbors | `Req = R1 + R2` |
| Parallel | At least two selected branches connect the same unordered pair of distinct electrical nodes | `1/Req = sum(1/Ri)` |
| Delta to star | Exactly three selected branches form all three sides between three distinct nodes | `S=RAB+RBC+RCA; RA=RAB*RCA/S; RB=RAB*RBC/S; RC=RBC*RCA/S` |
| Star to delta | Three selected branches share one unprotected center with exactly three active incident branches and three distinct neighbors | `P=RA*RB+RB*RC+RC*RA; RAB=P/RC; RBC=P/RA; RCA=P/RB` |

Delta boundary vertices may have additional branches or terminals. A star/series center may not have additional active branches or terminals, including through a wire-connected alias. Parallel discovery reports each maximal group; application also accepts a selected subset of at least two branches. Delta discovery enumerates each exact combination of parallel edges, once for each sorted vertex triple. Extra center self-loops are retained and do not invalidate an otherwise eligible series/star rewrite.

### Rewriting wire-connected nodes and traceability

Normalization uses M1; no geometry, React, SVG, or browser APIs participate. New branch endpoints use the smallest original point ID in each unchanged boundary node. All unselected resistors and all ideal wires are preserved with their IDs, endpoints, and values. External terminal records are preserved exactly.

After series/star removal, only unreferenced points belonging to that former internal node are deleted. A singleton orphan center disappears. A center represented by ideal wires or retaining shorted resistors stays as an isolated internal component, preserving those original elements. No unrelated orphan point is pruned. Metadata explicitly distinguishes removed nodes from retained internal nodes; a retained node is not claimed to have been deleted. M2 ignores these unrelated floating components in port queries.

Delta-to-star adds one new internal point. Generated point and element IDs share `m3:<integer>`, allocated above every matching ID in the input's network, point, element and terminal namespaces, including elements about to be removed. BigInt counters avoid integer overflow. Each rewrite introduces a replacement with a larger counter, so sequential rewrites of returned snapshots keep advancing without reusing earlier generated IDs. Identical inputs and requests produce identical IDs. This guarantee is scoped to a sequential network history, not independently forked circuits or caller-deleted history.

`TransformMetadata` supplies the operation type/candidate ID, original and replacement resistor IDs, complete immutable original/replacement resistor records (including resistance and endpoints), affected/boundary node IDs, created/removed point and node IDs, retained internal node IDs, and the mathematical formula expression. The original network ID is retained as an identity label. Each operation's metadata links inputs to replacements; callers should retain the operation records for multi-step provenance or undo. The engine does not embed a global history ledger in the domain model.

The domain factory creates the output snapshot. Input objects are neither modified nor frozen. Output networks, candidates, and metadata are frozen. Invalid or numerically failed operations return no partially rewritten network.

### Formula evaluation and numerical boundaries

Series uses a maximum-resistance scale. Parallel uses a minimum-resistance scale and sums bounded `Rmin/Ri` terms, avoiding raw conductance overflow. Delta-to-star uses a normalized sum and multiplies the smaller adjacent resistance by a bounded ratio, avoiding `Ra*Rb` and raw sum overflow.

Star-to-delta evaluates `Ra + Rb + Ra*Rb/Ropposite`. The product ratio uses binary mantissas and integer exponents so representable outputs can survive overflow/underflow in naive intermediate products or ratios. An underflowed product term is omitted only if its relative contribution to the positive sum is bounded below `2^-43`; otherwise it causes a numerical failure. Restoring physical units checks round-trip relative discrepancy against `1e-12`, catching significant subnormal quantization. All replacement resistances must be finite and strictly positive.

These are floating-point evaluations, not arbitrary-precision or certified-error algorithms. Extremely unequal scales can be rejected conservatively; structurally valid candidates may fail numerically. Analytical extreme-value tests are separate from M2 cross-validation because M2 may itself reject such networks. No numerical failure is treated as evidence of circuit equivalence.

### Independent terminal-equivalence verification

`verifyTerminalEquivalence(before, after, options?)` normalizes both networks and invokes M2 for every unordered pair of existing terminal IDs. Terminal ID sets must match; labels are not used to invent correspondence. Fewer than two terminals yields `inconclusive` rather than vacuous success.

Finite pairs use `abs(Rbefore-Rafter) <= absoluteToleranceOhms + relativeTolerance*max(Rbefore,Rafter)`, evaluated in scaled form to avoid overflow. Defaults are relative `1e-8` and absolute `0 ohms`, so tiny but proportionally different resistances are not accepted through an absolute floor. Options require finite nonnegative tolerances with relative tolerance < 1.

Shorts must match shorts, and opens must match opens. Either solver error makes that pair inconclusive, even if both return the same error. The overall result is `different` if any pair proves a mismatch, otherwise `inconclusive` if any pair cannot be evaluated, otherwise `equivalent`. All pair summaries are returned and frozen. `equivalent` means numerical agreement for the supplied terminal set/tolerances, not a symbolic proof or equivalence after arbitrary changes to protected internal boundaries. To test such a boundary electrically, expose it as a terminal in the comparison networks.

Verification is explicitly optional and is never called by normal application. With t terminals it performs `t*(t-1)` solver calls across the two circuits; large all-pairs checks can be expensive and inherit M2's numerical and 512-unknown-node limits.

### Implementation cost, tests, and M4 integration

The module separates `context.ts` (validated M1 context), `candidates.ts` (eligibility/discovery), `formulas.ts` (resistance arithmetic), `apply-transformation.ts` (single immutable rewrite), `verify-equivalence.ts` (independent M2 comparisons), and `types.ts` (public data). No M0/M1/M2 source, dependency, or existing expected test result changes are required.

Discovery builds branch adjacency/group maps, examines vertex-neighbor pairs for triangles, and expands parallel-edge combinations. Candidate validation currently scans active resistors, so c candidates among r branches can add O(c*r) work beyond M1 and triangle enumeration; candidate sorting adds O(c log c). Dense multigraphs may produce many candidates. This implementation targets educational networks, makes no linear-time claim, and has no discovery cache or automatic candidate scheduler. Application validates only the requested selection and does not enumerate all candidates.

M3 adds 72 tests: 33 transformation/integration cases, 16 numerical cases, and 23 verifier cases. Analytic references include 2+3=5, 6||3=2, symmetric delta/star, delta sides 2/3/5 yielding arms 1/0.6/1.5, and star arms 2/3/5 yielding delta sides 31/5, 31/2, 31/3. Multi-terminal integration tests compare all distinct pairs with M2, including short and open relationships. Round trips, repeated rewrites, wire groups, protected centers, exact multigraph selections, stable IDs, immutability, invalid selections, and numerical failures are covered.

M4 can display candidate boundary/internal nodes, select an operation by type plus exact element IDs, highlight original/replacement elements from metadata, and update geometry separately using created/removed point IDs. It must account for retained internal wire groups, preserve the protection policy between discovery and application, and handle non-applicable/numerical-failure results. No SVG, layout generation, editor, or educational UI is implemented by M3.

## Verification

Tests run in the Node environment for domain and topology and use real implementations. The required A/B/C cases verify membership, canonical IDs, original branch identity and values, terminal mappings, short flags, components, validation errors, and input/output immutability. Additional checks cover unusual string IDs, endpoint arity/sparsity, extreme finite resistances, permutations, and 64 reproducible graphs compared with an independent traversal oracle.

TypeScript strict settings and type-aware ESLint remain enabled. Existing M0 tests and the real Vite startup test continue to run. Exact command outcomes and test counts are recorded in DEV_LOG.md.

## M4 visualization and preview

### Public interfaces and dependency direction

`visualization/index.ts` exports `buildDrawing`, `CircuitDiagram`, `circuitExamples`, and the separate presentation types `Position`, `CircuitLayout`, `LayoutTransition`, `DrawnElement`, `CircuitViewModel`, and `DrawingResult`. The domain network is reused unchanged. Visualization imports only domain/topology (and React for rendering); the existing ESLint boundary configuration is unchanged. `CandidatePicker` is a generic component receiving option IDs, text and callbacks, with no circuit dependency.

`buildDrawing(network, explicitLayout?, transition?)` is a pure function returning either `ready/model` or `unsupported/message`. The model includes the original network reference, independently analyzed M1 topology, point coordinates, one route per original element, resistor centers/angles, separated label positions, residual point IDs and SVG dimensions. It neither mutates nor freezes caller-owned input. Its readonly types are a presentation contract, not an additional deep-freezing boundary.

`LayoutTransition` accepts previous coordinates, created point IDs and boundary representative point IDs. App adapts M3 metadata into this structural presentation contract rather than letting visualization import transforms. Existing active point coordinates are preserved; new star centers use the boundary centroid. Removed points disappear with the new domain network. Residual components deliberately move to a separate section.

### Deterministic geometry and electrical meaning

Eight immutable examples cover series, three parallel branches, delta, star, balanced Wheatstone bridge, ideal-wire bypass, retained internal wires/isolated points, and unconnected crossings. Explicit template coordinates carry no electrical information. The fallback lays out M1 components in stable sorted order, with circular positions for their declared points. Elements are sorted by stable IDs; endpoint pairs identify geometric lane groups only. Parallel resistors and wires have separate offset routes. Literal self-loops use a rectangular route.

M1 alone supplies point-to-electrical-node identity and short-circuit flags. Every declared point has a junction or external-terminal symbol; terminal labels use original terminal records and IDs. Only declared endpoints form connections. A background under-stroke marks unconnected crossings, and node dots render above all routes. Label separation is a modest deterministic bounding-box heuristic; labels render above paths. A third point overlapping an unrelated path is explicitly unsupported, avoiding false junctions. No graph data is rewritten to fix geometry.

Components without any external terminal are shown in a labeled residual section when the network has terminals. This includes retained center wire groups, disconnected resistors and isolated points. Distinct residual components are stacked; no connecting edge is invented. Networks without terminals still render their components normally. App gives both preview diagrams the same maximum viewBox dimensions to preserve comparison scale. SVGs maintain a minimum drawing width to keep text readable; narrow panels can scroll internally.

### App integration and interaction

App calls `discoverTransformations` on the selected example, uses candidate IDs for native keyboard-operable buttons, and highlights only candidate resistor IDs. The preview button passes the candidate type and element IDs directly to `applyTransformation`; eligibility and all numerical transformation formulas remain in M3. The source network is never replaced. Selecting a different candidate/example or resetting clears the preview.

Applied results provide the transformed network, original/replacement IDs, affected/created/removed/retained nodes and layout inputs. App calls `verifyTerminalEquivalence` to display the actual all-port-pairs verdict, including different/inconclusive states. This uses existing M1/M2/M3 behavior and default numerical tolerances, without introducing derivations. Non-applicable, invalid-input and numerical-failure results receive Chinese feedback and no invented transformed drawing.

`CircuitDiagram` draws IEC rectangular resistor symbols, ideal wires, point/junction symbols and labeled terminal rings. Selected resistors have orange dashed symbols, replacements have green thicker strokes, and unaffected elements keep their base style. Keyboard/click inspection of elements and points reveals actual resistance, endpoint and electrical-node data. Complete expandable inventories show every element, point and terminal even if drawing is unsupported. Labels use six significant digits for readability; the inventory shows the stored value. Theme colors, focus/hover states, responsive cards, native controls and live status text are defined in `styles.css`.

### Limits and M5 handoff

The layout supports at most 16 points and 24 elements, with validated finite template coordinates. Crowded branches, insufficient label space and ambiguous point/path overlap return explicit unsupported results. This is a bounded educational schematic MVP, not arbitrary automatic routing, collision-free general graph layout or a drag editor. Complex networks and long identifiers may require new presentation templates. Residual sections can make drawings tall, and small panels scroll rather than shrinking labels indefinitely.

M5 may reuse `CircuitDiagram` highlighting props (`selectedIds`, `replacementIds`, `affectedNodeIds`), pure `buildDrawing` output, the `LayoutTransition` adapter and existing M3 metadata/equivalence evidence. There is no teaching animation, mathematical derivation engine or multi-step editor/undo implementation in M4.

## M5 guided education

### Presentation-only educational data

`education/index.ts` exports `buildLesson`, `lessonHighlights`, `formatNumber`, and readonly lesson types. Education remains React-free and imports only existing domain, topology and transform contracts. `buildLesson(source, candidate, applied, verification)` consumes an actual M3 candidate, successful result/metadata and verification snapshot. It checks matching candidate/type metadata and reports unavailable content if required mapping records are absent. It does not rediscover eligibility, evaluate formulas, calculate replacement resistances or duplicate solver logic.

Five stages organize concept/conditions, mathematical principle, numerical substitution, structural comparison, and external-terminal verification. Chinese explanations cover same-current series conditions, same-voltage parallel conditions, delta vertex/arm correspondence, removable star centers, wire-equivalent nodes, shorted branches, protected boundaries, and common mistakes. The M3 two-resistor series candidate is distinguished from the general n-resistor series principle.

Variable mappings use M1 electrical endpoints rather than array order, screen position or resistor-ID order. Delta variables represent actual boundary edges; star variables represent arms incident to the protected boundary. Boundary aliases use unique simple terminal/point labels, otherwise explicit A/B/C roles with node/terminal correspondence. Multi-character edge aliases include separators to prevent ambiguous concatenation. M3 replacement records supply all displayed results and full-precision numeric mappings. S and P appear as unevaluated expressions; no educational arithmetic engine is introduced. Display formatting uses ten significant digits without modifying the stored resistance.

### React composition and progression

`lesson-session.ts` defines one discriminated reducer state: idle, preview snapshot, or lesson with snapshot and a single 0–4 step index. Previous/Next enforce endpoints; restart resets only the index; exit preserves the existing M4 preview. Navigation reuses operation/evidence/content references. App memoizes discovery and before/after layouts, and creates a transform plus all-terminal-pairs verification snapshot only for an explicit preview or a new lesson selection. Starting from an existing preview reuses that snapshot.

App retains the selected example and candidate identities. Candidate changes during learning rebuild the corresponding lesson at step zero. Example changes choose the first actual M3 candidate and start at zero; an example with no candidates clears learning and disables entry. Ordinary M4 preview/reset behavior remains available. `learning-examples.ts` adds an immutable symmetric three-ohm delta to the unchanged eight M4 examples, using the domain factory and existing presentation coordinates.

`GuidedLesson.tsx` is an application-level composition view rather than a React dependency inside education. It renders stage text, native Previous/Next/Restart/Exit controls, an aria-current step indicator, variable/node mappings, metadata changes and `EquivalenceSummary`. Generic `components/MathExpression.tsx` uses native MathML subscripts for fixed lesson notation through React.createElement; the installed React type declarations do not list MathML intrinsic JSX tags. No dependency, type-check relaxation, symbolic parser or expression evaluation was added.

### SVG and verification behavior

Stages one through three highlight selected originals while withholding the transformed drawing. Stage four renders both M4 diagrams with identical viewBoxes, selected/replacement elements, explicit created/removed/boundary node rings, and retained internal/unselected element lists. Stage five emphasizes preserved boundary nodes without continuing to highlight replaced branches. `CircuitDiagram` receives optional createdNodeIds, removedNodeIds and boundaryNodeIds props; its existing geometry/electrical algorithms remain unchanged.

The authoritative `verifyTerminalEquivalence` result is cached during lesson preparation and displayed at stage five. Equivalent/different/inconclusive remain distinct, with text plus themed visual treatments. A compact all-pairs table shows original/new finite resistances, shorts, opens or unavailable numerical solutions. Solver errors are never successful evidence; missing terminal pairs are inconclusive. Rounding affects only text. The UI explains that equivalence concerns preserved external behavior, not identical internal structures, and does not expose raw solver diagnostics.

### Styling, limits and next stages

New panels reuse M4 theme variables, native controls and visible focus styling. Math expressions scroll inside bounded rows, and long content cannot enlarge the page. No animation was added. The application-level views and local style classes can be restyled during M7 without replacing lesson data. The personal website and its repository are untouched.

M5 remains a single-operation lesson with fixed formula templates, not a symbolic algebra system, chained editor, persistent learning analytics or proof animation. It inherits M3 numerical limits and M4 layout bounds. Native MathML was smoke-tested in local Chrome; broader browser/screen-reader checks, state integration and delivery documentation are M6 quality-assurance considerations. M7 will align the design with the personal website; M8 will handle deployment/navigation only after separate authorization.

## M6 targeted integration assurance

M6 adds no production architecture layer. Representative browser journeys compare rendered elements, resistance labels and terminal identities with the actual M3 operation result. Selection/reset and lesson navigation remain controlled by the existing App and reducer; no eligibility, numerical formula, solver, layout or lesson-state implementation was replaced.

`src/integration.test.tsx` checks the verification boundary through preview, cached learning, exit and a new example. It supplies real M3 equivalent/different/inconclusive evidence via a verification spy because the predefined valid transformation examples normally verify successfully. These are boundary tests, not claims that the browser encountered a naturally failing predefined transformation. The new example then uses the real verifier, ensuring old evidence cannot become its feedback. Existing M5 tests retain precision and individual verdict coverage.

`tests/browser/preview-contrast.js` is a Playwright CLI replay, separate from the Vitest suite. It reproduces the confirmed small-text contrast failure and checks selected candidate details and preview paragraphs in both themes. Open the local application in a supported browser, then run `playwright-cli run-code --filename tests/browser/preview-contrast.js`. No new browser/test dependency is required. The two affected selectors reuse `--symbol` on the unchanged `--subtle` background: measured contrast is 8.01:1 in light and 9.46:1 in dark, versus the original light-theme 4.26:1.

Actual browser coverage used local Chrome/Chromium at 1440, 820 and 390 pixels, including native MathML, SVG inspection, Tab/Enter/Space controls, focus outlines, local formula scrolling, themes and reduced-motion emulation. Firefox and WebKit launch attempts failed because their executables are absent; their behavior is unverified. This is targeted assurance, not formal accessibility certification or screen-reader validation. M7 visual alignment can build on these preserved interfaces; website changes and deployment remain outside M6.
