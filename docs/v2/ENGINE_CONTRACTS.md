# Analysis Engine Contracts and Capability Detection

Status: V2.0-A proposed design (A04). No new solver/dependency is implemented.
Common DTOs are defined in [DOMAIN_MODEL.md](DOMAIN_MODEL.md); V1 behavior remains
defined by its current public APIs and [V1_COMPATIBILITY.md](V1_COMPATIBILITY.md).

## Provider contract

Start with an explicit application-owned provider list. Do not add dynamic plugin
loading, a backend scheduler, or one solver pretending to cover every domain.

```ts
import type {
  AnalysisConfiguration, ComplexValue, EngineeringProject, Id, JsonObject,
  Quantity, ResourceRef, Revision,
} from './DOMAIN_MODEL'

export interface Diagnostic {
  readonly code: string
  readonly severity: 'info' | 'warning' | 'error'
  readonly message: string
  readonly entityIds: readonly Id[]
}
export interface EngineDescriptor {
  readonly resource: ResourceRef
  readonly family: 'topology' | 'electrical' | 'digital' | 'signal' | 'pcb' | 'education'
  readonly analysisTypes: readonly string[]
  readonly execution: 'main-thread' | 'worker' | 'external'
  readonly modelVersions: readonly ResourceRef[]
}
export interface AnalysisInput {
  readonly project: EngineeringProject
  readonly configuration: AnalysisConfiguration
  readonly inputDigest: string
}
export type CapabilityReport =
  | { readonly kind: 'supported'; readonly diagnostics: readonly Diagnostic[] }
  | { readonly kind: 'unsupported'; readonly diagnostics: readonly Diagnostic[] }
export interface EngineHost {
  readonly signal: AbortSignal
  readAsset(assetId: Id): Promise<Uint8Array>
  onProgress(completed: number, total?: number): void
}
export interface ResultProvenance {
  readonly engine: ResourceRef
  readonly projectId: Id
  readonly inputRevision: Revision
  readonly inputDigest: string
  readonly analysisId: Id
  readonly options: JsonObject
}
export type AnalysisOutcome<Output> =
  | { readonly kind: 'success'; readonly value: Output }
  | { readonly kind: 'physical-state'; readonly state: 'open-circuit' | 'short-circuit' }
  | { readonly kind: 'unsupported'; readonly diagnostics: readonly Diagnostic[] }
  | { readonly kind: 'failure'; readonly category: 'invalid-input' | 'numerical' | 'resource' | 'io'; readonly diagnostics: readonly Diagnostic[] }
  | { readonly kind: 'inconclusive'; readonly diagnostics: readonly Diagnostic[] }
  | { readonly kind: 'cancelled' }
export interface AnalysisResult<Output> {
  readonly provenance: ResultProvenance
  readonly outcome: AnalysisOutcome<Output>
}
export interface AnalysisEngine<Output> {
  readonly descriptor: EngineDescriptor
  inspect(input: AnalysisInput): CapabilityReport
  run(input: AnalysisInput, host: EngineHost): Promise<AnalysisResult<Output>>
}

export interface ResistanceOutput {
  readonly resistance: Quantity
  readonly diagnostics: JsonObject
}
export interface DcOutput {
  readonly referenceAnchorId: Id
  readonly voltages: readonly { readonly anchorId: Id; readonly volts: number }[]
  readonly currents: readonly { readonly componentId: Id; readonly fromPinId: Id; readonly toPinId: Id; readonly amps: number }[]
}
export interface AcOutput {
  readonly frequencyHz: number
  readonly referenceAnchorId: Id
  readonly phasors: readonly { readonly anchorId: Id; readonly voltsRms: ComplexValue }[]
}
export interface TransientOutput { readonly datasetIds: readonly Id[] }
export interface DigitalOutput { readonly eventAssetIds: readonly Id[] }
export interface SignalOutput { readonly datasetIds: readonly Id[]; readonly measurements: readonly Quantity[] }
export interface PcbCheckOutput {
  readonly status: 'pass' | 'fail' | 'not-run'
  readonly ruleSet: ResourceRef
  readonly diagnostics: readonly Diagnostic[]
}
```

The generic output type belongs to a specific provider/analysis. There is no
requirement that every engine produce node voltages. EngineHost is runtime-only,
not project-file content. Asset-producing engines stage outputs in orchestration;
dataset/asset IDs become project records only through a successful atomic commit.
Cancelled/failed work cannot leave half-imported assets or overwrite a prior result.

## Analysis request and capability checks

`AnalysisConfiguration` options are engine-owned versioned JSON contracts; the
chosen provider validates their exact shape, units, and required references.
The preferred engine is optional. When unavailable, report that explicitly;
switching to a different numerical model requires visible selection/confirmation
when it changes assumptions. No silent idealization of a nonlinear component.

For the initial `resistance-equivalent` analysis, options contain
`terminalIds: [portAId, portBId]`; exactly two existing ExternalPort IDs are required.
They may be identical, matching V1's same-terminal short semantics. `inspect`
validates selected sheet scope, port references, positive resistor models, label
closure, and known resource limits. Invalid options/data are reported with error
diagnostics; `run` returns `failure/invalid-input`. Structurally valid circuits with
unhandled models/scope return `unsupported`, not an apparent physical open.

Capability checking is pure and cheap relative to solving. It inspects the exact
input snapshot, model IDs/versions, supported analysis type, required units,
topology features, scope, and known resource limits. A supported report does not
promise numerical convergence or precision. `run` rechecks revision/configuration
and may still return numerical/resource failure. A size bound discovered during
execution is `failure/resource`, not an electrical state. Provider diagnostics
carry stable project entity IDs through adapters, not only backend IDs.

Do not require a simulation model for topology-only inspection. The V1 adapter may
support built-in resistor definitions without an external SPICE model. Unknown
component definitions can remain editable while a particular engine rejects them.

## Solver reference selection (D03)

Electrical connectivity is resolved from graph edges and scoped labels before
reference-node selection. An electrical ground net and a numerical zero-potential
choice are distinct. Inspecting/selecting `ReferenceMarker` records never unions
their anchors, even when marker domains match or they are drawn with similar glyphs.

Each provider documents whether it accepts an explicit `referenceAnchorId` option,
uses applicable marker hints, or has its own fixed query reference. An explicit
reference anchor must exist in the selected scope; it changes the numerical gauge,
not the graph. If marker hints are used, markers resolving to one net agree;
markers on different nets require an explicit reference selection or an ambiguity
diagnostic, never an implicit short. Missing/floating-reference diagnostics remain
provider-specific; sharing a ground label does not silently select a solver policy.

The existing V1 resistance provider remains unchanged: its query terminal B is
the 1 A test reference. D03 introduces no extra applicability/proof/verification
gate for that provider or for the approved D05 transformation policy. General DC,
AC, and digital providers define their own later reference conventions explicitly.

## Independent methods and initial ownership

| Analysis category | Inputs/method | Output and meaningful applicability |
| --- | --- | --- |
| Topology/ERC | Explicit graph and pin roles, graph resolution/rules | Nets and diagnostics; geometry never connects edges |
| Passive resistance | V1 projection and existing nodal resistance method | Finite resistance, physical open/short, explicit error; no source excitation model |
| General DC | Later MNA with independent/controlled source stamps | Referenced node voltages, oriented branch currents, KCL diagnostics; source conflicts/floating systems diagnosed |
| AC | Later complex linearized equations, frequency/model conventions | RMS phasors, `exp(+jωt)` convention; nonlinear bias requirements explicit |
| Transient | Later differential equations/time integration and initial conditions | Waveform datasets, tolerances, convergence/step diagnostics |
| Digital | Later timestamped events with deterministic ordering | Four-state logic `0/1/X/Z`, propagation delays; not analog node solving |
| Signal | Sample datasets, generation, statistics, FFT/filter algorithms | Waveforms/spectra/measurements with sampling/window/normalization evidence |
| PCB | Board + resolved source connectivity + rules | ERC/DRC/connectivity findings; no claim of fabrication readiness from rendering |
| Education | Actual model, operation, equation, result and evidence | Derivations/highlights referencing true calculations, not another hidden solver |

Mixed-signal coupling needs a separately approved scheduling/conversion contract;
sharing a project does not imply automatic coupling between analog and event engines.
Advanced analog providers may later wrap SPICE-compatible software after accuracy,
license, platform, and permission review. No provider is selected here.

## Result semantics and stale work

- `success` contains a valid output with actual numerical conventions/diagnostics.
- `physical-state` applies only to a query where open/short has a defined meaning,
  initially V1 resistance. An open branch inside a DC simulation is not sufficient
  to classify the entire general simulation as open-circuit.
- `unsupported` means capability does not cover the input, without deleting parts.
- `failure` distinguishes invalid data, numerical/convergence, resource, and I/O.
- `inconclusive` is for evidence that cannot establish a claim, such as port
  equivalence with failed solves or too few ports. It is not a successful proof.
- `cancelled` records user/orchestrator cancellation without fabricated output.

Provenance contains the immutable source revision, pinned engine, options, and a
SHA-256 digest of canonical analysis input. Initial digest policy may conservatively
include the whole project except `revision` and prior `results`, plus the selected
configuration; referenced asset hashes are included via the manifest. Asset bytes
must be verified against those hashes before analysis. Reordered arrays may change
this digest; it is a conservative identity check, not an electrical equivalence test.

On completion, orchestration compares the source revision/digest with the active
project before attaching results. Old output can be retained as historical evidence
with its original source; it cannot become the current circuit's result. Runtime
progress messages report completed work/known total without invented percentages.
Persisted ResultRecord.outcome matches the engine outcome discriminant and references
a typed result artifact carrying complete provenance/diagnostics/output.

If revisions differ, current-result reuse requires a freshly computed identical
input digest and the same configuration; otherwise the output is historical. Merely
appending a ResultRecord changes project revision but not the input digest (results
and revision are excluded), so that append does not permanently stale its own
output. Transform writeback remains stricter: an expectedRevision mismatch rejects
the command even when a digest matches. Deletion of a referenced configuration,
dataset, or anchor must either be rejected or explicitly remove/rebind dependent
records in one command; retaining a result is not permission to save dangling IDs.

## Design acceptance cases

1. Passive source-free resistor network: V1 provider supported; genuine numerical
   failure remains failure, not unsupported/open/equivalent.
2. Resistor plus capacitor: passive V1 provider unsupported; future AC provider
   may support it with a frequency and reference. No capacitor is dropped.
3. Imported irregular samples: storage allowed; basic FFT capability rejects or
   requests an explicit resampling operation with provenance.
4. Two source revisions finish out of order: only matching current input can attach
   as current evidence; cancellation and historical results remain distinguishable.
