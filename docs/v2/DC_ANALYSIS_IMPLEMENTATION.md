# V2.3.0 — Linear DC operating-point analysis

Authorized module DC01–DC10, 2026-10-23. Implementation is independent of the
V1 resistor equivalence solver and its transformations. D01–D09, particularly
the original D05 recommendation, remain unchanged. No new dependency or schema
version. See [release evidence](V2_3_0_RELEASE.md) for verification/publication.

## Public APIs and ownership

`src/dc/index.ts` exports `dcEngine: AnalysisEngine<DcSolution>`,
`createDcInput(project, sheetId, referenceAnchorId?)`, `resolveDcCircuit(input)`,
`solveDc(circuit)`, `voltageDefined(kind)`, and typed circuit/result structures.
`src/engineering` exports `DC_SOURCES` and `createDcSourceDefinition(kind)`.
`src/dc-ui` owns React rendering; core DC code imports only engineering/analysis
contracts. No React, SVG, geometry, V1 solving, network access or asset reads in
the numerical core. ESLint enforces these dependency directions.

Provider resource `org.stray.engine.dc-mna` version `1`, analysis type
`dc.operating-point`, main-thread async execution. Configuration has one-sheet
`circuit` scope and optional `referenceAnchorId`; unknown options/providers are
rejected. Input creation freezes a validated snapshot and hashes recursively
key-sorted JSON of project + configuration with SHA-256. Array order is retained.
`run` rechecks the digest and records project ID, revision, analysis/configuration,
engine version and digest. Geometry edits also invalidate this conservative
snapshot. Pure `inspect` checks scope, model versions/ports/units/control IDs,
references and resource limits; it does not solve. Supported does not promise
uniqueness or numerical precision. Cancellation is checked before/after async
digest and solve; the bounded synchronous elimination is not preemptible midway.

## Supported models and stable ports

| Component | Pinned model v1 | Parameters | Constitutive equation |
| --- | --- | --- | --- |
| Positive resistor | `org.stray.model.resistor` | resistance / ohm | I = (Vp − Vn)/R |
| Independent voltage source | `org.stray.model.dc.voltage-source` | voltage / V | Vp − Vn = E |
| Independent current source | `org.stray.model.dc.current-source` | current / A | I = J |
| VCVS | `org.stray.model.dc.vcvs` | gain / 1 | Vp − Vn = gain (Vcp − Vcn) |
| VCCS | `org.stray.model.dc.vccs` | gain / S | I = gain (Vcp − Vcn) |
| CCVS | `org.stray.model.dc.ccvs` | gain / ohm; controlBranchId / text | Vp − Vn = gain Icontrol |
| CCCS | `org.stray.model.dc.cccs` | gain / 1; controlBranchId / text | I = gain Icontrol |

Definitions bind model ports to stable pin keys. Built-ins map p/n to 1/2 and
cp/cn to 3/4. Voltage control draws no current. Current control references a
stable **component UUID**, restricted to an explicit voltage-defined branch
(independent V, VCVS, CCVS); its positive current is p → n. A 0 V sensing source
is valid. No inferred resistor/wire current, display-name binding, automatic
sensor insertion or new electrical connection. Renaming retains control;
deleting a controller leaves an explicit `DC_CONTROL_BRANCH` diagnostic until
the user repairs it. Newly placed current-controlled sources are editable with
an empty control selection, but cannot be solved until configured.

Zero/negative independent source values and zero/negative finite gains are
valid. R must be finite and positive; ideal shorts are graph connections. The
only legacy adaptation is an empty-binding pre-2.3 built-in independent V/I
definition with exact `org.stray.component.{voltage-source,current-source}` v1,
two expected pins and correct parameter units. Its definition/UUID is preserved.
Unknown versions, arbitrary `kind` strings and unknown bindings are rejected;
an unsupported model never silently receives a resistor/source approximation.

## Reference policy and scope

`deriveElectricalNets` resolves explicit graph edges and scoped labels first.
Geometry overlap/crossings have no effect. Labels follow D03: sheet labels join
only that sheet/name; project labels join all matching project/name anchors.
GND is an electrical label, so it really joins matching label groups. A reference
marker never joins anything. Derived net keys/numbers belong to this snapshot;
probes/references/control relationships retain stable pin/anchor/component IDs.

Reference priority: valid explicit anchor option; otherwise analog-domain
markers all resolving to exactly one net; if there are no such markers, GND
labels all resolving to one net. None → `DC_REFERENCE_MISSING`; conflicting
marker/GND groups → `DC_REFERENCE_AMBIGUOUS`. An explicit choice resolves
ambiguity without shorting the other nets. There is no automatic first-node
grounding. Atlas direct entry visibly preselects its COM or B port, then waits
for the user to run. The dropdown selection is session state, not a graph edit.

Only one flat sheet is solved. A selected net with anchors from another sheet
is `unsupported/DC_CROSS_SHEET`; independent other sheets are retained/ignored.
All selected anchors, including isolated ones, participate. A fully floating
island or unspecified ideal-source current yields an underdetermined system,
not an invented zero. A one-ended resistive branch can legitimately have zero
current when its end voltage is uniquely determined.

## Actual MNA system

Unknowns are all non-reference node voltages, followed by currents of independent
V/VCVS/CCVS branches. Reference voltage is exactly zero; omit its voltage column
and KCL row. For each resistor add g=1/R to p,p and n,n and −g to p,n and n,p.
An independent current source p → n subtracts J at RHS[p], adds J at RHS[n].
Voltage-defined branches add +I at KCL[p], −I at KCL[n], with a new constraint
row Vp−Vn=E (or the controlled equation above). VCCS adds its voltage-controlled
current directly to output KCL; CCCS adds its controlling branch-current term.
No voltage-control gain division is used, so zero gain remains defined.

Results expose the **raw matrix A, RHS b, unknown map, row names/units, solution**
actually solved. UI renders those equations and `A x = b`, labels KCL rows in A
and voltage constraints in V, and explains KCL, Ohm's law and source constraints.
Values are displayed to 8 significant figures; JSON report retains full doubles.
This is numerical MNA, not arbitrary symbolic derivation, superposition automation,
equivalent-source theorem automation or a separate mesh-current solver.

Technical references: [Qucs MNA formulation](https://qucs.sourceforge.net/tech/node14.html)
and [Qucs controlled-source equations](https://qucs.sourceforge.net/tech/node60.html).
The latter's VCCS can eliminate its extra unknown; our direct KCL stamp is that
equivalent form. Current-controlled sources here use a separately named explicit
voltage-defined sensing branch, rather than implicitly creating sensing ports.

## Numerical method and honest diagnostics

Dense double-precision MNA: at most **192 unknowns and 512 components**. Row
equilibration uses max absolute coefficient, then column equilibration. Complete
pivot Gaussian elimination tracks both row and column permutations and unscales
the recovered solution. No explicit matrix inverse or least-squares free-variable
substitution. Rank threshold `64 * Number.EPSILON * n` applies to scaled pivots;
augmented RHS inconsistency uses that tolerance times max(1, scaled RHS magnitude).
Rank deficiency with a significant residual RHS → `DC_INCONSISTENT`; otherwise
`DC_UNDERDETERMINED` (floating potentials/redundant constraints/unknown currents).
Inconsistency smaller than numerical tolerance may be diagnosed as underdetermined;
neither is reported as a successful solution. Exact graph shorts remain topology;
a nonzero ideal V shorted onto itself is a contradictory ideal-source equation.

Scaled min/max pivot ratio below 1e-10 rejects with `DC_ILL_CONDITIONED`.
This is a conservative heuristic, **not a computed condition number**. Original
matrix componentwise backward error max |Ax−b|/(|b|+Σ|Aij*xj|) must be ≤1e-9.
Every output branch is independently recomputed from its constitutive equation;
KCL is checked at **all** nodes, including reference, within
1e-10 A + 1e-8 Σ|incident I|. Power balance must satisfy
|ΣP| ≤1e-9 W + 1e-8 (absorbed + delivered). Nonfinite stamps/results/power totals
are numerical failures. Finite precision/underflow and this small dense solver
are limits; no arbitrary-precision or certified error bound is claimed.

Unsupported model/scope, invalid references/units/control, resource limit,
rank/contradiction, poor conditioning and failed residuals remain distinguishable
diagnostics/outcomes. No numerical failure is relabeled as physical open/short.
No global `gmin` leakage, forced ground per island or arbitrary zero current is
inserted to manufacture a solvable matrix.

## Workbench, portability and backward compatibility

Editor palette adds E/G/H/F source symbols; property inspector selects a stable
voltage-defined current controller. `直流分析` opens a dedicated panel. Run is
explicit; no rerun per edit. Results and highlights require exact current project
ID/revision/reference. Editing (including parameter/source edits, move, undo/redo)
hides old numerical results/equations/highlights and requires rerun. Node/branch
table buttons highlight the actual stable entities and annotate voltage/current/
power in the SVG. Clear highlight is available; errors display code/context.

Schema 1 continues to store the circuit, pinned definitions and text control IDs.
DC results are **session-only**: reopen and rerun. Reference markers/GND labels
persist; the panel dropdown is session-only. Exported DC report is separate JSON
with provenance/full solution; it is not a project document or reimport format.
Existing measurements/assets/extensions/PCB links are retained by the editor's
unchanged project serializer. No external data package or schema migration.
Old apps may retain new generic definitions but are not claimed to simulate or
faithfully draw the new source symbols. V2.3 reads the exact legacy source adapter.

Atlas remains 12 categories / 89 families / 26 templates. **16** R/V/I-only
templates expose `使用直流分析`: resistor series/parallel/mixed, bridge, star,
delta, ladder, voltage-load, current-load, two-voltage-loops, source-ladder,
superposition-network, thevenin-network, norton-network, resistor T and Pi.
The **10** C/L templates retain editing and explicit unsupported capability.
Nine pure-resistor templates retain the separate V1 transformation/course path.
No new controlled-source Atlas recipe is claimed; all four are available in the
editor and analytical/browser fixtures. No AC/transient/nonlinear/SPICE/hardware/
PCB/filter module. Existing source-driven DC results do not authorize mixed-
component equivalence transformations or change D05 verification requirements.

## Representative hand-derived acceptance

| Fixture | Reference values |
| --- | --- |
| 10 V / 1 kΩ | VR=10 V, IR=10 mA, PR=+0.1 W, PV=−0.1 W |
| 1 kΩ + (2 kΩ ∥ 2 kΩ) at 10 V | midpoint 5 V, source output 5 mA |
| 2 mA into 3 kΩ | 6 V, source delivers 12 mW |
| 5 V floating source between two 1 kΩ-to-reference nodes, 1 mA injection into p | Vp=3 V, Vn=−2 V |
| VCVS: control 2 V, gain 3, 1 kΩ load | output 6 V, load 6 mA |
| VCCS: control 2 V, 3 mS, 1 kΩ load | output −6 V, source current +6 mA |
| 0 V sense carries +2 mA; CCVS 1 kΩ | output 2 V |
| same sense; CCCS gain 3, 1 kΩ load | output −6 V |

Focused tests also cover negative/zero gains and sources, controller rename/delete,
controlled-voltage current control, floating islands, redundant/contradictory
sources, missing/ambiguous/GND/reference choices, unknown bindings/versions,
C/L/nonlinear rejection, cross-sheet labels, resource/range/conditioning,
digest tampering/cancellation, stable maps and schema-1 round trips. UI integration
tests cover real values/equations, stale/rerun and highlights. See the release
record for final standard checks and actual local/public Chrome evidence.
