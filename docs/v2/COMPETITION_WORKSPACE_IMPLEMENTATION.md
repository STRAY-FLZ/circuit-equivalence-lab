# V2.5 competition project and evidence workspace

Implemented 2026-10-25. Local-first **电赛工作台**, one active project per session;
multiple independent projects are portable files. No autosave, cloud, team service
or second project store. It reuses schema-1 `EngineeringProject`,
`CompetitionRecord`, `ExperimentRecord`, analysis/result IDs, measurement datasets
and hash-checked inline assets. `src/competition` owns data/acceptance/report logic;
`src/competition-ui` presents the workflow. No new runtime dependencies.

## Sources, requirements and scope

[Source register](COMPETITION_SOURCES.md) records six originals: 2019 national
A/C/D/E/F and Guangdong regional 2026 G. The original documents were individually
read; the regional archive member was rendered and its header/conditions checked.
The national collection is university-hosted and cross-checked with a committee
index. One original requirement per entry is summarized with its exact location;
this is neither full-problem coverage nor an extracted official scoring rubric.
The preferred national training homepage returned 502; authoritative alternatives
supplied the evidence, so no unverifiable entry is called verified.

The namespaced `org.stray.competition.workspace` extension has version 1/catalog
version 1. Requirements are **published**, **derived**, or **training**. Published
fields must exactly match the pinned source metadata/condition/rule; modified
official attribution is rejected. Only source-supported clauses are called basic
or advanced. Derived targets require derivation text; custom/derived goals cannot
be promoted to basic/advanced contest requirements. No official score is computed.
Requirements link to metrics and notebook topics through stable IDs.

Two actual partial workflows:

1. National 2019 D → independent RC training → existing Atlas RC recipe/editor →
   real AC sweep/Bode → associate actual cutoff estimate → compare two R choices.
   It does not simulate the original 9013 amplifier or claim whole-problem completion.
2. Guangdong 2026 G → periodic signal training → actual generation or explicitly
   mapped CSV → full-capture RMS/FFT → optional sampled RC processing → associate
   data/compare targets/report. The preset 20 kHz/0.1 V peak/256 kHz sample rate/
   4096 samples is one explicit software exercise, not a hardware or full-band
   contest acceptance. Reference RMS is `0.1/sqrt(2)` V.

Power, RF, MCU, mechanics, hardware acquisition and nonlinear simulation remain
outside the executable scope. Other indexed problems support clearly labeled
knowledge/plan/manual-evidence work and applicable existing tool subsets.

## Identity, edits and safe import

`createCompetitionProject` allocates independent project/competition/experiment/
requirement/metric/task IDs, reusing actual Atlas definitions. Shared recipes are
never modified. A competition initially has three experiment notebooks (signal,
frequency response, custom electrical work), four editable tasks and three
separately attributed goals. None has a prefilled observation or successful result.

`editWorkspace` stages an immutable `reviseProject`, validates references and units,
then validates the complete project document/assets before replacing current state.
The core fields remain normal DTOs; richer requirements, notebooks, plans, metrics,
evidence and attempts live in the validated extension. Each type of workspace
collection currently allows 256 records, text fields 20000 characters and an
evidence record at most 4096 finite scalar observations. Existing file budgets are
32 MiB text, 8 MiB per asset, 16 MiB total decoded assets. Limits fail explicitly;
data is never silently truncated.

New/open operations protect unexported projects and draft forms. Invalid input is
validated before replacing current state. Before-unload protection covers workbench
changes. JSON/portable HTML import preserves IDs, source lineage, plans and results.
Experiment restoration follows requirement/experiment IDs, not array positions:
schema-1 serialization sorts entity collections and must not change the selection.

## Tools and provenance

The workbench opens its actual `ProjectDocumentV1` in the existing editor or
Signal Lab. Editor `openDocument` and Signal Lab `openDocument` preserve project,
experiment and asset identities, and guard existing unexported work. Atlas may be
viewed independently; adopt a training template in the workbench to retain this
project's identity. Replacing a diagram already referenced by analysis is rejected;
edit its existing components or start another independent project instead.

Fresh DC/AC panels expose an optional `AnalysisCapture<Output>` containing the
actual immutable input project/configuration/result. **关联到电赛实验** only
associates a successful, current result. The workspace rechecks project/revision/
configuration identity and the original input digest. It adds actual configuration,
result identity and a JSON result asset to existing project arrays; no fake
measurement is synthesized. AC observations include real sweep half-power estimates,
not an analytical reference substituted for measured response.

Signal transfer preserves original waveforms, spectra, imported file and all
existing assets, then records actual full-sample statistics/channel/axis/method.
Dataset lineage describes software generation, imported files or derived
operations. A file's hardware claim is described as unverified by this app;
CSV is not automatically instrument acquisition. Manually entered evidence has
no software analysis ID/digest and is permanently labeled user-reported.
Colliding immutable asset/dataset/result IDs with changed content are rejected.
The complete raw arrays remain in portable assets; reports use the existing
display-only min/max envelope without changing numerical processing.

`sourceRevisions` and each evidence basis/source revision make prior tool results
historical when that source advances. Notebook-only edits do not change the
engineering basis. Editor edits notify the workspace immediately; **回传当前工程到电赛**
can synchronize changes without fabricating an analysis. A SHA-256 circuit/config
fingerprint covers definitions, symbols, sheets (including conservative geometry)
and stored AC settings. Its entity ordering matches schema-1 sets. On file import,
`reconcileCompetitionDocument` detects externally edited circuits even when their
opaque workspace metadata was retained by an older editor, advances the source
basis in a new revision and marks previous evidence indeterminate. Ordinary file
reordering and notebook-only revisions do not create false circuit changes.

## Plans, records and acceptance

Tasks retain completion status. Alternative records include assumptions/approach,
parameters, advantages/disadvantages/risks, rationale, references, revision note,
timestamp and the project revision on which the decision was based. Append a new
record for a revised design. Each notebook links requirements and retains objective,
setup, parameters, observations/limitations, problems, adjustments, conclusion,
review and next steps. Original `ExperimentRecord` notes/analysis/dataset IDs stay
linked to that richer notebook.

Each metric is linked to an attributed requirement, rule/unit, conditions and method.
Each attempt points to an actual evidence datum; it does not overwrite previous
attempts. Comparison supports:

- Exact target: `abs(actual-target) <= absTolerance + relativeTolerance*abs(target)`.
  Absolute/relative errors are reported; relative error at zero target is undefined.
- Minimum/maximum with explicit inclusive or exclusive boundaries.
- Lower/upper intervals with independent boundary flags; empty intervals reject.
- Explicit compatible conversions (V/mV/uV, A/mA/uA, Hz/kHz/MHz, s/ms/us,
  ohm/kohm, selected F/H/W units, ratio/percent, dB and degrees). No arbitrary
  cross-dimension or dB/linear conversion. Unknown/nonfinite values fail honestly.

Missing evidence, incompatible units, invalid rules or historical source revision
produce **indeterminate**. Numeric pass/fail is a training comparison, not proof
that every free-text test condition or contest hardware requirement is fulfilled.
Historic values remain visible for comparison but cannot validate the current
design. No observations, uncertainty or official score are invented.

## Reports, compatibility and APIs

`exportCompetitionReport` produces self-contained printable HTML with source links,
attribution, goals, tasks/alternatives, attempts/errors/provenance, notebooks and
actual waveform/Bode data. The embedded non-executable JSON is a complete canonical
schema-1 project. Text and links are escaped, `<`/`>`/`&` escaped inside its JSON
payload. Import extracts only that JSON; it does not render or execute supplied
HTML. Reopening JSON or the generated HTML restores the same project/data.
Chart overflow stays local at narrow widths; axis text is readable. There is no
external report renderer or hardware/screenshot fabrication.

Public `src/competition/index.ts` APIs include `problems`, `problemById`,
`searchProblems`, `createCompetitionProject`, `readWorkspace`, `editWorkspace`,
`reconcileCompetitionDocument`, `replaceTrainingCircuit`, `circuitDigest`,
`receiveToolTransfer`, `addManualEvidence`, `evaluateAttempt`, `compareMetric`,
`convertQuantity`, `exportCompetitionReport` and `extractProjectText`, plus types.
App composes tools through explicit callbacks; there is no plugin framework.

Package/export writer target 2.5.0; project format stays 1. Prior V1/V2 files remain
readable in their existing tools. Older apps preserve opaque competition data but
cannot operate its workbench. Unsupported future workspace/catalog versions reject
without replacing current work. Imported file provenance is inspectable metadata,
not a digital signature. V1/D05/DC/AC numerical semantics and original signal
processing remain unchanged. Actual acceptance/release/rollback evidence is in
[V2.5 release record](V2_5_0_RELEASE.md).
