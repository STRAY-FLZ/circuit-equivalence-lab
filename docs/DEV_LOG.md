# 开发记录

## 2026-10-23 · V2.3.0 implementation checkpoint

Verified clean baseline `41e342a` / v2.2.0 on local/remote main and published
Release, then created `codex/v2.3-dc-analysis`. Independent typed MNA core and
editor/Atlas integration implemented; 32 core and 4 UI focused cases now cover
the new module. A duplicate React sibling key found by integration testing was
fixed; stale results and annotations are hidden after edits. Final typecheck/lint/test/build passed (579 tests / 35 files); built Chrome full DC workflow accepted, including four families and byte-identical load/control file round trips. Public checks and release are pending at this checkpoint.
No V1/D05/schema/dependency/website changes. [Methods](v2/DC_ANALYSIS_IMPLEMENTATION.md).


## 2026-10-22 · Circuit Atlas V2.2.0 public acceptance

- Preserved history and safely fast-forwarded accepted branch into main,
  **`01e02b4df8af85ddd4d3de47b24d2974918b9f0b`**.
  [Workflow 39639505538](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39639505538)
  build/deploy completed successfully. Actual public V2.2.0 accepted in Chrome
  155.0.8059.85: 12/89/26, all template opens, real animation intermediate
  frames/reflow/fade/rotation, native keyboard/inert/ARIA/reduced motion,
  dirty cancel/confirm, real parameter edit and project files, signal/V1 retained,
  1440/390px light/dark. No console/resource errors; screenshots inspected.
- Public actual export/re-export independently byte-identical; stable project/
  component IDs, graph, geometry and R1=1234 retained, writer2.2.0/schema1.
  Scope unchanged: 9 conditional resistor numerical/lesson templates, 17
  schematic/edit-only; 69 planned families. No new solver/dependency or V2.3 work.
- Application **Released**, this final documentation checkpoint **7/8** before
  its own deployment confirmation/tag. Exact final SHA/workflow, annotated tag
  and A08 / **8/8** handoff are in the
  [canonical Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.2.0).
  [Full version checklist](VERSION_CHECKLIST.md), [release/rollback](v2/V2_2_0_RELEASE.md).

## 2026-10-22 · Circuit Atlas local acceptance / resume

- Recovered `codex/v2.2-circuit-atlas` / `a318ca2`, preserving all pending version,
  focus and browser-script work. Reused exact candidate standard results:
  typecheck/lint/test/build, **539 tests / 33 files**; no dependency reinstall or
  full-suite repetition. Already approved V2.2.0/roadmap decision retained.
- Completed missing real built Chrome 155.0.8059.85 acceptance: 12/89/26 catalog,
  category/family opening/closing with 38–51 intermediate frames, opacity/rotation/
  downstream reflow, native keyboard/ARIA/inert and reduced motion; actual 26
  editor opens, dirty cancel/confirm, real 100→1234 edit/download/reopen and
  shared-template independence. Saved/re-exported files independently byte-identical.
- 1440/390px light/dark screenshots inspected, no page overflow; signal RMS and
  V1 preview retained. No browser/resource errors. JS `index-Bd8uTY76.js`, CSS
  `index-DmkpcxYZ.css`. Browser replay now retains final output across CLI's early
  native-dialog return; only changed replay lint rerun afterward.
- **A01–A07 Verified, 7/8**; A08 production integration/Pages/public/tag/handoff
  pending. No V2.2 remote publication yet. [Release/rollback](v2/V2_2_0_RELEASE.md).

## 2026-10-22 · Circuit Atlas implementation checkpoint

- Owner authorized a real twelve-category expandable Atlas, not a simulator.
  Actual local/remote main, tag and published latest Release confirm v2.1.0
  `1b61a74`; clean baseline. Owner explicitly approved V2.2.0 publication after
  acceptance and shifting DC/filters/competition to V2.3/2.4/2.5; V3–V6 unchanged.
- Immutable stable catalog keys, 89 families and 26 original recipe templates;
  reuse palette, engineering validation, explicit connectivity and independent
  UUID instances. Nine resistor-only templates use existing numerical/lesson
  capabilities conditionally; seventeen are schematic/edit/export only.
- Thirty catalog cases pass, including all real net mappings/parameters/rotations,
  canonical JSON round trips, independent IDs and actual V1 numerical evidence.
  Five UI cases pass: independent disclosure/ARIA/inert/selection/search,
  planned states, dirty cancel/confirm, history and signal/V1 preservation.
  Typecheck passed. Real browser/standard checks/publication still pending.
- Added guarded editor template handoff and preview reusing the existing SVG
  projection/symbol renderer; no new device/solver/dependency or schema change.
  [Version checklist](VERSION_CHECKLIST.md), [contracts/coverage](v2/CIRCUIT_ATLAS.md).

## 2026-10-21 · V2.1.0 Signal Measurement & Analysis production release

- Authorized S01–S10 scope, actual baseline `bd79d6a` / v2.0.2 (the brief's
  v2.0.1 baseline was historical). Preserved V1/D05, latest movement/wiring,
  schema 1, dependencies, Pages/base and personal website repository.
- `927b36b`: pure sampled generators/statistics/radix-2 FFT, explicit-unit CSV,
  stable measurement descriptors/checksummed inline assets and typed async engine.
  `fa90724`: independent retained-state signal workbench, responsive real SVG
  oscilloscope/spectrum, source/options/units, real file exchange and education.
  `dfc5d78`: 2.1.0 version/writer, final canonical digest/provenance correction,
  exact numerical/UI/browser evidence and compatibility/rollback records.
- Final typecheck/lint/test/build passed: **504 tests / 31 files**, 48 new.
  Analytical/direct-DFT checks include normalization/DC/Nyquist/periodic Hann;
  real old 2.0.1 circuit project preserved graph/geometry/metadata on export.
- Main fast-forward/push and [workflow 39614955343](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39614955343)
  build/deploy success for `dfc5d784784bc85d7ad0cf86d5c46f6fcd210f60`.
  Built and actual public Chrome passed 100Hz/1V peak/fs1024/N1024,
  RMS≈0.7071068V and FFT 100Hz/1V; changed frequency, cursor/zoom,
  65536 samples, two-channel CSV mapping, Hann/DC, actual downloads/reopen,
  invalid-input preservation, 1440/390px light/dark and editor/V1 navigation.
  No console/resource errors; independent hashes/raw CSV/identity/provenance pass.
- Final screenshot inspection caught adjacent narrow time ticks overlapping.
  Reduced x-axis label density while retaining data/grid; browser replay now
  checks actual label bounds. Corrected code passed standard checks again
  (504 tests / 31 files) and the full local replay, with non-overlapping labels
  at 1440/390px × light/dark. Final JS `index-C5L40b3w.js`; corrected-build public
  replay is required before tagging. Branch `codex/v2.1-chart-axis-spacing`.
- Application **Released**; this final documentation checkpoint is 9/10 before
  its own deployment/tag. Final targeted public confirmation, exact production
  SHA/workflow and S10 / **10/10** handoff are retained in the
  [canonical release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.1.0).
  [Methods/limits](v2/SIGNAL_IMPLEMENTATION.md), [release/rollback](v2/V2_1_0_RELEASE.md).
  No hardware, general circuit simulation, filters, V2.2 or V2.3. Stop at V2.1.0.

## 2026-10-21 · V2.0.2 component movement production release

- Owner authorized publication of the verified local movement/placement fix.
  Application/package/lock/writer 2.0.2; schema 1 and dependencies unchanged.
  Prior 456 tests / 28 files plus typecheck/lint/build reused; versioned build
  and changed replay lint passed. No repeated implementation/full historical audit.
- Fast-forward main **`1c51e63`**, [workflow 39603301979](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39603301979)
  build/deploy success. Built and real public Chrome each passed four 1440/390px
  × light/dark movement cases, with a 650ms hold, stable UUID/count, undo/redo,
  armed-placement cancellation and one new component per explicit palette click.
  No console/resource failures. Public status: **Released**.
- Resume audit confirmed this actual state and existing v2.0.1 publication; no
  old tags/releases were recreated. Final documentation deployment and targeted
  live confirmation precede the v2.0.2 tag. Exact final SHA/workflow and completed
  4/4 handoff are retained in the [canonical release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.0.2).
  [Evidence/compatibility/rollback](v2/V2_0_2_COMPONENT_MOVEMENT.md). No personal
  website repository modification or V2.1 work.

## 2026-10-21 · Local component movement / placement correction

- Fixed persistent placement mode: each palette activation inserts one component,
  then selects it. Dragging an existing component body also exits an armed
  placement mode and moves that same stable component; another insertion requires
  clicking the palette again. Existing pin wire-drag and graph semantics unchanged.
- Added two meaningful regressions for inductor one-shot insertion/movement,
  stable identity/count, undo/redo, and existing-body drag while placement is armed.
  Updated editor integration fixtures/replays to activate the palette per insertion.
- Typecheck/lint/build passed; **456 tests / 28 files** passed. Focused real Chrome
  replay `tests/browser/component-movement.js` passed desktop/narrow × light/dark,
  including 650ms held drags and explicit subsequent addition. No console/HTTP
  errors. Local evidence: ignored `output/playwright/component-move-*` screenshots
  and `component-movement-verification.txt`.
- Local **Verified, not Released**, `codex/fix-component-drag-placement`, baseline
  `5b900ef`. No dependency/version change, commit, push, tag or deployment.

## 2026-10-21 · V2.0.1 Drag-to-Connect Patch

- Extended existing SVG pointer gestures: real pin/anchor drag, captured pointer,
  inverse screen CTM, continuously rendered orthogonal dashed preview and 14px
  screen-space snap with explicit target ring. Preserved component-body movement,
  click/keyboard wire editing, separate graph/geometry and original D05 policy.
- Valid release uses one existing connect transaction; real nets, history and
  JSON persist stable endpoints. Invalid/self/duplicate releases do not edit;
  Escape/cancel/lost capture/blur/tool and history paths discard drag preview.
- 16 focused cases added. Final typecheck/lint/build passed; **454 tests / 28
  files passed**. Built/public Chrome each passed four viewport/theme wire groups,
  including explicit intermediate SVG paths, snapping, zoom/pan, cancellation,
  component movement, undo/redo and actual export/reopen; simulated pen passed.
  Seven existing editor integration groups also passed on local/public builds.
- Implementation/first deployment **`ede3523`**, [workflow 39553250543](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39553250543)
  build/deploy success. Actual public version 2.0.1 and wire preview verified;
  no interaction console/resource failures. Production assets unchanged from
  verified build. Schema stays 1; dependency records and V1 algorithms unchanged.
- Resume audit confirmed existing clean main/remote and reliable evidence; no
  patch tag/release existed. Only final records and publication remained. Reused
  successful checks without rerunning full tests or historical browser acceptance.
  Final documentation deployment requires a targeted live check before tagging.
  Exact final SHA/workflow and completed P01–P06 handoff live in the
  [canonical v2.0.1 release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.0.1).
  [Details/limits/rollback](v2/V2_0_1_WIRE_INTERACTION.md). No website repository
  edit or V2.1 work; pen/phone hardware and other browsers are not certified.

## 2026-10-21 · V2.0.0 Production Release

- Owner authorized the full production release. Confirmed remote baseline
  `8fd6e9b`, successful existing Pages workflow and accepted A/B/C/D ancestry
  through `4030e08`; integrated using fast-forward history without conflicts.
  Candidate `6485006` was pushed to main; no force push or recreated history.
- Application/package/lock/footer/export writer now 2.0.0; project schema remains
  1. Dependencies, V1 algorithms, D05 and the existing workflow are unchanged.
  Added changelog, compatibility/rollback notes and reusable public browser replay.
- Final local typecheck/lint/build passed and **438 tests / 27 files passed**.
  Seven local and seven real public Chrome integration workflows passed, including
  all four transformations, five lesson stages, stable identities and byte-identical
  JSON round trips. Desktop/narrow × light/dark checked; no phone certification.
- [Production workflow 39541122926](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39541122926)
  succeeded (build/deploy); public version and production resource paths verified.
  Four actual website/tools/application/home round trips and a V1 MathML lesson
  passed, without console/resource errors. Personal website repository unchanged.
- Public B/C/D status is now **Released**, distinct from prior internal handoffs.
  Final documentation deployment must also pass before tagging. Exact final SHA,
  final workflow and completed R01–R09 handoff are recorded in the
  [canonical v2.0.0 release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.0.0).
  [Full evidence and rollback](v2/V2_0_0_RELEASE.md). Stop before V2.1; separate
  module authorization remains required. No unresolved release blocker.

## 2026-10-21 · V2.0-D Editor / V1 Equivalence Integration

- Completed **D-C01–D-C10, 10/10 Verified / Implementation Complete, not Released**.
  Confirmed clean accepted C `296c191`, then created focused local branch
  `codex/v2-transform-integration`. Verified implementation: **`0f3dd6a`**;
  final documentation handoff also removes formatting-only trailing whitespace.
  No history rewrite, production merge, remote push, deployment, tag, dependency
  install, package bump or personal-website change. Actual version stays `0.1.0`.
- Added a React-free composition module using B projection and existing V1
  discovery/application, independent numerical terminal verifier and five-stage
  educational engine. All four transformation categories work on real drawn
  resistor circuits. Mixed components/cross-sheet nets are rejected explicitly.
  V1 domain/topology/solver/transformation/education and B API source are unchanged.
- Added persistent-port/temporary-observation workflow, actual candidate-to-UUID
  highlights, non-mutating before/after previews, pair-level numerical evidence,
  verified apply and source-consistent guided study in the editor. Numerical
  mismatch/inconclusive/computation failure remain separate from unsupported scope.
  Fewer than two terminals produces the existing inconclusive result.
- Writeback checks the exact source revision, rediscover/reapplies with the same
  protected points and reruns the existing independent verifier. Only `equivalent`
  permits a verified transaction. **D05 is unchanged**: no new proof requirement,
  tolerance or post-mapping numerical gate, and no equation/algorithm rewrite.
  Existing domain references must remain valid; PCB/component and analysis/pin
  observations block removal until explicit rebind support exists.
- Maps retained entities to existing UUIDs, preserves old wires/labels/ports and
  other sheets/metadata, retains needed old pin anchors as free anchors, and
  allocates new replacement component/pin/anchor/connector UUIDs. Preserves old
  geometry, places new bodies below it and auto-fits. One history entry restores
  the complete original/result with stable IDs on undo/redo and fresh revisions.
- Optional `org.stray.transformations` command provenance stores source/result
  revisions/networks, transform metadata/evidence and source/replacement/point
  mappings. It travels through unchanged schema-v1 JSON/inline asset APIs. Runtime
  preview/lesson and temporary selection state remain session-only.
- Visual inspection found that stable UUIDs inflated V1 label-width measurement.
  Added optional presentation labels to existing layout/diagram APIs without
  changing identity or electrical data. Focused coverage includes prototype-like
  legacy IDs. Existing V1 callers keep their prior presentation defaults and bounds.
- Final standard checks passed: typecheck, zero-warning lint, **438 tests / 27
  files** (404 baseline + 25 integration + 9 UI/display cases), build (69 modules).
  Focused tests cover all four drawn categories, six imported examples including
  residual wires/bridge, observation mappings, reference preservation, stale input,
  metadata, history, round trips, lesson consistency and rejected/inconclusive
  evidence. Rejected-verdict tests inject a verifier response; actual inconclusive,
  extreme-value failure and successful cases use the existing real engines.
- Installed Chrome **155.0.8059.40** passed seven local built-preview workflow
  groups: complete draw→ports→discover→preview→verify→apply→undo→redo→save→reopen;
  all five source-circuit lesson stages; three further drawn transform categories;
  protected boundaries, both themes, 1440px/390px layouts, mixed/no-port outcomes
  and existing V1 examples/previews/navigation. Zero page/console errors or HTTP
  failures. Screenshots visually inspected. Download/re-export SHA-256 matches;
  ignored local evidence remains under `output/playwright/integration-*`.
  Browser and task-started preview service were closed after verification.
- [D APIs/acceptance/limits](v2/TRANSFORMATION_INTEGRATION_IMPLEMENTATION.md),
  [V2.0.0 readiness](v2/V2_0_0_RELEASE_READINESS.md), progress and status updated.
  No material core implementation blocker remains. Next milestone is separately
  authorized version/changelog/release integration, Pages deployment and actual
  live acceptance with history-preserving rollback; no publication started here.

## 2026-10-21 · V2.0-C Interactive Schematic Editor

- Completed C01–C10, **10/10 Verified / Implementation Complete, not Released**.
  Preserved accepted A/B/context work in local checkpoint `b7b53bc`, then worked
  on `codex/v2-schematic-editor`. Verified implementation commit: **`290de9b`**.
  Local commits reuse the prior commit's identity per command; no global identity
  setting, history rewrite, remote push, deployment, tag or version bump.
- Added React-free edit operations/history over the actual immutable B aggregate,
  a derived editable SVG view, and independent selection/tool/viewport/drag state.
  Added R/C/L/V/I placement, move/rotate/delete, definition-driven properties,
  explicit wires/anchors/junctions, scoped labels/ground/reference/ports, graph
  inspection, keyboard controls, and real B-format file download/open.
- Preserved pin/anchor identity, graph/geometry separation, all supported opaque
  engineering metadata and inline assets. Invalid edits/imports preserve current
  data. Undo/redo restore complete content with fresh revisions; each drag is one
  transaction, while viewport and selection do not create revisions.
- Added a workspace entry with existing tokens, shared theme/header/home link
  and a narrow layout. V1 remains the default; cached original/transformed
  previews and all five lesson stages remain usable across workspace switches.
  B contracts/adapters, V1 numerical algorithms, package/lockfile and deployment
  workflow are unchanged. D05 is unchanged; no writeback or additional proof gate.
- Final checks passed: `typecheck`, `lint`, full **404 tests / 25 files**
  (315 V1 + 60 B + 29 C), production `build` (64 modules). The earlier 403-case
  run preceded a final UI asset/metadata test and screen-scale/readability work;
  404 is the actual final full-suite result.
- Existing Playwright CLI drove local installed Chrome **155.0.8059.40** against
  the built preview. Seven workflow groups passed: connected resistor circuit/net
  inspection, properties/drag/history/rotation, actual download/reopen, both
  themes, V1 previews/all five lesson stages, 390px layout/zoom/pan, explicit
  crossing/junction behavior and all palette kinds. Zero page/console errors or
  HTTP failures. Final downloaded/reopened files have identical SHA-256 hashes.
  Desktop/narrow screenshots visually inspected; ignored local evidence remains
  in `output/playwright/`. No browser framework or dependency was added.
- Actual limits: single selection, simple auto-routes and delete/reconnect wire
  editing; no sheet-management UI, bend handles, autosave or persisted history.
  Generic imported symbols/absent optional parameters have limited editing UI.
  Narrow overview needs zoom for detail; no physical phone/cross-browser claim.
  An unchanged dev-mode pre-theme duplicate-base request produces 404; all built
  preview resources passed. No material C acceptance blocker remains.
- Service cleanup also exposed a dev watcher `EBUSY` on the Playwright CLI's
  default download cache. Verification on the built preview passed; run that
  workflow with dev stopped to avoid the local cache watcher conflict. Closed
  the task's Chrome session and dev/preview services after verification.
- [Editor implementation/API/acceptance](v2/SCHEMATIC_EDITOR_IMPLEMENTATION.md),
  CURRENT_STATUS and DEVELOPMENT_PROGRESS updated. Stop at C; next recommendation
  is separately authorized V2.0-D under existing transactional writeback/D05 rules.
  Public release still requires usable verified B+C+D and release procedures.

## 2026-10-20 · V2.0-B Engineering Project Model

- Completed B01–B09, **9/9 Verified**, internally implemented and checked, not
  Released. Created the local `codex/v2-project-model` branch at `8fd6e9b`, preserving
  all prior uncommitted context/design work and development-log edits. No commit,
  remote push, deployment, version bump, dependency install, or personal-site change.
- Added engineering types, UUID allocation, immutable creation/revision, complete
  domain shape/reference validation, multi-pin and pinned resistor definitions,
  graph-only net derivation with exact label scopes and separate solver markers.
  Optional analysis/measurement/asset/PCB mapping records remain independent of UI.
- Added schema-v1 UTF-8 JSON parsing/export, small inline assets with SHA-256,
  byte/sample/time-axis integrity, unknown-version/required-extension handling,
  canonical identity collections and preserved ordered/opaque data. No invented
  old migrations, external container, or persistence backend.
- Added read-only V1 import/projection with dedicated pin anchors, legacy namespace
  provenance/ID maps, current-graph projection, scoped labels/observed boundaries,
  and explicit unsupported-model/scope/observation results. No writeback, numerical
  algorithm rewrite, new proof gate, or schematic editor.
- Added minimal async engine-facing types and four-module dependency rules in
  ESLint, preserving V1 restrictions. Source is limited to new engineering,
  project-format, compatibility and analysis modules plus focused fixtures/tests.
  Existing V1 code, UI, package/lockfile, and deployment workflow are unchanged.
- Checks: typecheck/lint passed; full regression **373 tests in 23 files passed**,
  including all existing 315 V1 tests; production build passed (47 modules).
  Two final validation cases brought the new test inventory to 60: the final
  four-file focused run passed **60/60**, followed by passing typecheck/lint.
  The original full-suite result is not relabelled as a single 375-test run.
- Initial Vitest sandbox cache rename failed with EPERM before tests; authorized
  outside-sandbox execution passed. Corrected test-only typing/lint/order assertions
  and completed media/time-range/provenance validation before final focused checks.
- Added [implementation/API/acceptance notes](v2/ENGINEERING_MODEL_IMPLEMENTATION.md)
  and updated progress/handoff. Next: separately authorize V2.0-C. Existing public
  release evidence remains M8 `a7096c7` from 2026-10-11, package `0.1.0`; no live
  verification or release is claimed by this internal foundation.

## 2026-10-20 · V2.0-A System Architecture and Interface Design

- Completed the officially authorized documentation-only module: A01–A10,
  10/10 deliverables, internally Verified. No V2 production implementation.
- Added ten design documents under [v2/](v2/ARCHITECTURE.md): system/reuse inventory,
  project and multi-pin/connection contracts, independent engine capabilities,
  V1 import/projection/writeback, versioned project files/migrations, waveform and
  measurement provenance, PCB/EDA identity boundaries, phased implementation gates,
  material decision register, and [acceptance record](v2/ACCEPTANCE.md).
- Added [DEVELOPMENT_PROGRESS.md](DEVELOPMENT_PROGRESS.md), updated
  [CURRENT_STATUS.md](CURRENT_STATUS.md), and extended root AGENTS.md with visible
  milestone reporting and persistent per-module progress rules. Updated stable
  context/navigation without changing historical M0–M8 records or planned scope.
- Lightweight checks passed: local Markdown file/fragment links and fences,
  whitespace (including untracked documents), documentation-only changed paths,
  six TypeScript specification modules checked together in memory under repository
  ES2023/strict settings with V1 public type imports, and a parsed/type-checked
  complete JSON format fixture. No source files emitted by these checks.
- Material recommendations D01–D09 remain pending owner review at their relevant
  implementation/release gates. Verified design output does not mean owner approval
  or implemented behavior. Next recommended module is V2.0-B only after authorization.
- Git baseline remained local `main` at `8fd6e9b`; existing persistent-context
  documents were already uncommitted at kickoff. Changes remain local for review;
  no new commit, tag, push, version bump, installation, or deployment. No source,
  tests, dependencies, UI, deployment configuration, or personal website changed.
- Did not rerun historical V1 tests/build/browser acceptance. Latest confirmed
  public release remains the repository-recorded M8 `a7096c7`, verified 2026-10-11,
  actual package `0.1.0`; no live verification was performed in this design task.

## 2026-10-11 · M8 Production Deployment and Website Integration

### Authorized release and preparation

- The user explicitly authorized both repositories' production pushes, Pages configuration, and the focused personal website tool entry. M7 was committed as `c4ba6b7` (`style(design): align circuit lab with personal website`); `main` was updated with fast-forward merges after fetching the unchanged remote README commit. All M0–M7 history is preserved; no force push or history rewrite.
- Added the project base `/circuit-equivalence-lab/` and a GitHub Actions workflow with Node.js 24, locked installation, existing type/lint/test checks, Vite build, Pages artifact upload and a dependent deployment job. Read-only build permissions are separated from deployment write permissions. GitHub's authenticated API enabled `build_type: workflow`; repository admin/push access and enabled Actions were verified without exposing credentials.
- Updated the existing real startup test to request the configured project base and head initializer. Added a focused production Playwright replay, DEPLOYMENT.md maintenance instructions and current README/roadmap descriptions. Electrical algorithms, lessons, M7 design and dependency versions are unchanged; generated files remain ignored.
- Local typecheck/lint/test/build passed: 315 tests in 19 files, 47 Vite modules. Production HTML uses the correct project path for the bootstrap, favicon, CSS and JavaScript. The classic blocking theme initializer is deliberately copied as a public asset; Vite's non-module bundling notice is informational, and the built reference/file are valid.

### Release verification

- Application release: [`a7096c7`](https://github.com/STRAY-FLZ/circuit-equivalence-lab/commit/a7096c7d4e66c21fdc96c9ecc1d1adbdec2607e8). [Actions run 38141334784](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/38141334784) completed successfully: both build and deploy passed, including locked installation and every existing engineering check. The real [public entry](https://stray-flz.github.io/circuit-equivalence-lab/) returned HTTP 200 and was checked before modifying the personal website.
- Production Chrome checks at 1440x1100 and 390x844 selected the symmetric 3-ohm delta, previewed three 1-ohm star resistors in two actual SVG diagrams, completed all five lesson stages and compared all three external terminal pairs. Native MathML in stages two/three had the correct namespace and nonzero dimensions (19 formula instances per viewport). Both light/dark palettes match M7; page width equals viewport width. Direct refresh restored a usable circuit and persisted dark mode. Return-home navigation reached the actual personal homepage and inherited the same-origin preference.
- All four application resources (head initializer, favicon, hashed JavaScript and CSS) resolved under `/circuit-equivalence-lab/` with HTTP 200. No development source URL appeared in production HTML. The observed browser journey had zero console/application errors, failed requests or HTTP errors. Four live application screenshots and replay output were saved as ignored browser evidence and representative desktop/mobile images were inspected.
- Personal website source was cloned into ignored workspace artifacts. Its actual source is `main`/root branch Pages, with `.nojekyll` and GitHub's existing `pages build and deployment` mechanism. The focused commit [`e609a82`](https://github.com/STRAY-FLZ/stray-articles/commit/e609a8209cbb9e61ab61c11f8845b89a24b3c9c6) (`feat(tools): add circuit equivalence lab`) changed only `tools/index.html`: appended entry 05 with the exact requested Chinese title, description and absolute URL; updated the count from four to five. All four existing entry blocks and every other website file remain unchanged. [Website Pages run 38141574793](https://github.com/STRAY-FLZ/stray-articles/actions/runs/38141574793) succeeded for this commit; the Pages build API reported this exact commit as built with no error.
- Live [tools page](https://stray-flz.github.io/stray-articles/tools/) returned HTTP 200 and showed the new entry/count. The replay completed **homepage -> tools -> circuit laboratory -> return home** at both widths in both themes. Existing tool titles/order/destinations match the source; actual browser navigation to PDF/Word, video, Agent Lab and vocabulary entries returned HTTP 200 with real page titles. The tools layout has no page-level horizontal overflow. Four live tools screenshots and successful replay output were saved as ignored evidence.
- Same-origin `stray-theme` sharing passed across actual hosted project paths: theme followed both navigation directions; toggling the app tab updated the open homepage, toggling the homepage updated the app, and app reload retained the preference. Header branding/home destinations and M7 tokens remain unchanged.

### Operational observations and final scope

- Two initial Git network attempts timed out because Git did not inherit the Windows system proxy. Applying the existing system proxy only to the Git invocation allowed normal push/clone operations; no global proxy setting was changed. The first hidden preview launcher did not start the server; direct Node arguments and a readiness check resolved the harness launch, without application changes.
- The first browser replay had an incompatible trailing semicolon for the CLI's function expression wrapper; corrected it before successful local/live runs. An initial HTTP-client check of the existing external Agent Lab returned 403, while actual Chrome returned 200 and rendered the tool. Existing-tool verification now uses real browser navigation, and the complete replay passed. No unrelated website change was made.
- Local typecheck, lint, all 315 tests in 19 files and production build passed. Linux Actions independently completed the same checks before deployment. New browser-script lint also passed. No historical algorithm acceptance or unrelated website audit was added.
- The subsequent documentation/evidence commit records completion and adds the reusable website replay; it does not alter the built application. All history is retained, all publication pushes are normal pushes, and build/dependency/reference/browser artifacts remain ignored.
- No unresolved deployment or integration defect was found. Coverage remains Chrome/Chromium with mobile viewport emulation; Firefox/WebKit, physical devices and screen readers were not tested. Future updates and non-destructive rollback are documented in DEPLOYMENT.md.

## 2026-10-11 · M7 Personal Website Design Alignment

### Git preparation and reference evidence

- Committed completed M6 changes as `515cd58` (`fix(integration): improve application reliability and accessibility`), then created `feat/08-design-alignment`. M7 changes remain uncommitted. No push, merge, deployment, history rewrite, unrelated repository edit or M8 implementation.
- Read only Stray's actual `site.css`, `theme.js`, `index.html` and `tools/index.html` from both the live site and the main-branch source. All four pairs matched SHA-256 hashes. Browser inspection measured the 1240px desktop shell / 92px header, mobile shell/type and the actual dark palette. No general website audit or historical module acceptance rerun.
- The web fetch tool could not retrieve this site, and the GitHub metadata API was rate-limited. Direct read-only HTTPS retrieval of the four main-branch source files succeeded; actual Chrome navigation to the live site also succeeded. Reference files/screenshots are ignored workspace artifacts.

### Implementation and files

- Added `src/design-tokens.css` with the exact main-site paper/surface/ink/muted/line/blue/gold and font tokens, shell dimensions, spacing scale, switch tokens and separate selected/replacement/failure colors. Reworked `src/styles.css` around thin rules, restrained blue controls and compact sections, retaining existing SVG electrical presentation rules and local scrolling.
- Added generic `src/components/SiteHeader.tsx` and updated its barrel/App composition. Header branding links to the absolute main homepage, followed on the right by the theme switch, short vertical divider and `返回首页`. Main/footer share the reference shell. Replaced the development-stage eyebrow with a Chinese tool label. Favicon follows the source's S mark.
- Updated `ThemeToggle.tsx` for `stray-theme`, system default/following, manual-only persistence, storage-event synchronization/clearing, restored-page refresh, restricted storage and reference-style accessible switch semantics. Added `public/theme-init.js` and its head inclusion in `index.html` for initialization before React/production CSS. No extra runtime theme controller or UI library.
- Updated existing App theme tests and added four header/shared-theme cases. Added `tests/theme-bootstrap.test.ts` with four pre-paint/head-order cases. Added `tests/browser/design-alignment.js`; updated the M6 contrast replay's locator to the new switch role without changing its contrast assertions.
- Added `docs/DESIGN_SYSTEM.md` and updated only current M7 architecture/roadmap sections plus this entry. Domain, topology, solver, transformations, drawing/layout and educational content/state files are unchanged; no package/configuration/dependency change.

### Actual visual and interaction verification

- Compared actual main-site desktop/mobile pages with the local application and inspected the real main-site dark tokens. Application palette/font/header match the verified source; denser type, semantic circuit inks, a compact mobile row and a vector crescent are deliberate tool-specific adaptations documented in DESIGN_SYSTEM.md.
- Chrome at 1440x1100, 820x1100 and 390x844 passed both themes. Measured page width matched viewport width. Desktop comparison panels were 484px each; tablet/mobile stacked. Header controls remained ordered switch -> divider -> home and at least 44px high. Native MathML namespace/size/subscripts remained present; long mobile substitutions scrolled locally with keyboard arrows.
- The browser replay held the Vite React entry request and confirmed dark `data-theme` while `#root` was still empty. It then verified React agreed, a real second tab synchronized manual preferences, reload preserved them, clearing returned to the system default and subsequent system changes applied. A separate page with throwing Storage methods still initialized and switched correctly.
- Actual `返回首页` navigation reached the personal homepage, and browser Back restored a usable app. Tab reached the header switch with a visible 3px outline. Reduced-motion emulation disabled the thumb transition. Series preview, delta substitutions, parallel lesson completion, Previous/Restart/Exit/Reset remained functional.
- Retained the M6 browser contrast regression: selected detail/preview paragraphs measured 11.9687:1 light and 11.9079:1 dark. Surface samples for ink/muted/blue/selected/replacement/failure were at least 5.49:1 light and 7.96:1 dark. Gold is restricted to decorative rules, not small text. Final app console contained zero errors/warnings.
- Saved one application before screenshot, two reference screenshots and four after screenshots under ignored `output/playwright/`; visually inspected desktop light/dark and mobile light/dark. Full-page captures reset page scrolling so the sticky header appears at the top.
- An initial browser replay waited on a Vite entry URL without its development timestamp query. Fixed the replay's URL glob and reran successfully. A shared browser profile prevented a second independent session, so the comparison reused one session and isolated peer tabs. Neither issue required an application change.

### Final project verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed with unchanged strict options |
| `npm run lint` | Passed, zero warnings/errors |
| `npm run test` | Passed: 19 files, 315 tests; none skipped |
| `npm run build` | Passed: strict typecheck and Vite build |
| Focused browser replays | M7 design/theme/navigation and retained M6 contrast checks passed |

The first full regression exposed nine old preview cases whose global `svg` counts included the two new decorative theme icons. Narrowed those six diagram-count assertions to `svg.circuit-svg`, preserving expected counts and all original electrical assertions. The subsequent complete run passed. An earlier focused test launch hit sandbox temporary-cache rename restrictions; workspace-local TEMP/TMP supported the successful runs and unchanged real startup test. No check/rule was disabled and no algorithm acceptance suite was run separately.

The final production HTML places `theme-init.js` before the generated stylesheet/React module, and the copied bootstrap file matches its source hash. Build artifacts remain ignored; no publication occurred.

### Limitations and M8 handoff

- Visual checks used Chrome/Chromium and viewport emulation. Firefox/WebKit, physical phones and screen readers were not tested in M7; no broader compatibility claim or accessibility certification.
- Font rendering depends on installed system/math fonts. Narrow diagrams/formulas deliberately scroll internally. Existing single-operation lessons and numerical/drawing limits remain unchanged.
- Theme sharing requires the same origin; localhost does not share storage with github.io. Same-origin tab synchronization is verified locally, while the final hosted project path is not yet configured or tested.
- M7 is ready for separately authorized M8 deployment work. No personal website repository/navigation or public host was modified.

## 2026-10-11 · M6 Targeted Integration Testing and Quality Assurance

### Git preparation and scope

- Committed the completed M5 implementation locally as `cb93198` (`feat(education): implement interactive circuit lessons`) and created `feat/07-integration`. M6 changes remain uncommitted. No push, merge, deployment, history rewrite, personal website change or M7 implementation.
- Started from actual selection, preview, lesson, feedback and recovery workflows. No historical M1–M5 acceptance rerun, broad source audit, dependency installation or algorithm/state refactoring.

### Confirmed defect and minimal fix

- Reproduction: in light theme, select the series candidate and preview it. The selected candidate detail and preview paragraphs use `rgb(101,117,111)` on `rgb(234,242,238)`, measured at 4.2598:1 for small text, below the 4.5:1 target.
- Cause: `--muted` was reused on `--subtle`, although it was adequate on the white card surface. Added one scoped CSS rule for these two selectors to reuse existing `--symbol`; no palette, typography or layout redesign. Measured contrast after the fix: 8.0100:1 light, 9.4644:1 dark.
- Added `tests/browser/preview-contrast.js`. The real-browser regression failed before the CSS fix (`light: R1 + R2: contrast 4.26 < 4.5`) and passed afterward for the selected detail and all three preview paragraphs in both themes.
- No other product defect was confirmed in the tested journeys. An SVG group-center click in the browser harness hit empty space within a bent parallel route; clicking the actual resistor symbol worked. An immediate scroll assertion ran before native scrolling completed; waiting for nonzero scroll confirmed working keyboard scrolling. Neither observation required a product fix.

### New integration coverage

- Added three tests in `src/integration.test.tsx` for real M3 equivalent, different and inconclusive evidence across preview -> cached five-stage lesson -> exit -> new parallel example. They assert status/table association, no additional verification during cached entry/exit, removal of old diagrams/evidence on selection change, and fresh authoritative evidence for the next example.
- Different/inconclusive evidence is supplied at the verification boundary using actual computations, not fabricated numeric result objects. The normal predefined transformations verify; this harness does not claim a failing transformation occurred in the browser. Existing M5 verdict/precision tests were not recreated.
- The first standard typecheck caught an unsupported `exact` option accidentally copied from Playwright to Testing Library queries in the new tests. Removed that option; no strictness or rule was relaxed. Then completed the full regression below.

### Actual verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings/errors |
| `npm run test` | Passed: 18 files, 307 tests; none skipped |
| `npm run build` | Passed: strict typecheck and Vite production build |
| Browser contrast regression | Failed before fix; passed after fix in light/dark |

The complete project suite ran once to completion after the new test typecheck fix; the unchanged real Vite startup test used local loopback access and process-local `.artifacts/m6/temp` TEMP/TMP. No separate numerical/topology/transformation acceptance run was performed.

### Browser workflows and accessibility

- Used the existing Playwright CLI skill/wrapper and local Chrome on Vite port 5175. Series, parallel, delta, star, bridge and bypass example transitions checked exact rendered element IDs, resistance labels, terminal identities, original-candidate highlighting, actual M3 transformed networks, reset and unavailable lesson controls.
- Completed all five stages for parallel, star and the second bridge candidate, with formulas/substitution outputs compared to actual M3 replacement records. Checked structural diagrams, final terminal-pair counts/verdicts, backward/forward navigation, restart, exit preserving the current preview and switching after a completed delta lesson. No stale result/table/highlight survived a new example or candidate.
- A keyboard-only series journey exercised the skip link, candidate selection, lesson entry, all five steps, Previous with Space, restart, exit and SVG inspection. The focused Next button had a visible 3px outline. These are focused keyboard checks, not screen-reader certification.
- At 1440x1100, 820x1100 and 390x844, checked both themes, native MathML namespace/rendered sizes/subscripts, no page-level horizontal overflow, local equation-row overflow, lesson buttons at least 36px high and 44px wide, and reduced-motion emulation with no running animation/transition.
- On mobile, the long parallel substitution remained locally scrollable: keyboard ArrowRight focused the row and scrolled 108px within a 322px-wide row (430px content). Visually inspected mobile dark formulas and the 820px light star comparison; the latter showed one removed center and three replacement branches.
- Final browser console: zero errors and zero warnings. Screenshots are ignored artifacts under `output/playwright/`, including `m6-mobile-math-dark.png` and `m6-tablet-star-light.png`.
- Firefox and WebKit were explicitly attempted, but failed before navigation: missing `firefox-1553/firefox/firefox.exe` and `webkit-2368/Playwright.exe`. Neither is counted as tested. No browser downloads or global configuration changes were made.

### Remaining limits and handoff

No unresolved product defect was found within the representative checked workflows. Firefox/WebKit, real mobile devices and screen readers remain unverified. Existing bounded drawing, numerical conditioning, single-operation lessons and display rounding limits remain unchanged. M7 can proceed with visual alignment using the existing contracts; M8 deployment and personal website navigation remain separately scoped.

## 2026-10-11 · M5 Interactive Educational System

### Git preparation and scope

- Committed the completed M4 changes locally as `b251c9b` (`feat(visualization): implement interactive circuit diagrams`), then created `feat/06-education`. Staged only the known 15 M4 files; no unrelated changes were found. Reused reported M4 acceptance rather than repeating historical audits.
- M5 changes remain uncommitted. No push, merge, deployment, personal website change, dependency/configuration change, M6 work or existing domain/topology/solver/transformation/layout algorithm modification.

### Implementation and files

- Added `src/education/types.ts`, `format.ts`, and `lesson.ts`; updated its barrel. Pure lesson construction adapts actual candidates, M1 topology, M3 original/replacement records and verification evidence to five Chinese teaching stages. Formula strings are presentation templates, not a second arithmetic engine.
- Added `src/lesson-session.ts` for one discriminated idle/preview/lesson reducer and bounded step index. Updated App to cache transformation/verification snapshots, memoize layout/discovery, reuse M4 previews, navigate/restart without recalculation, and initialize new selections correctly. Exit keeps the preview; selecting an example with no candidate exits learning.
- Added `src/GuidedLesson.tsx` for application-level educational composition, variable/node correspondence, metadata changes and three-state all-pairs verification presentation. Added generic `src/components/MathExpression.tsx` and its barrel export for native MathML subscript notation; no math dependency or general symbolic engine.
- Added `src/learning-examples.ts` with a real immutable symmetric 3-ohm delta. Kept all eight original M4 examples unchanged. M3 supplies its 1-ohm replacement arms and 2-ohm port-pair verification results.
- Extended CircuitDiagram only with optional created/removed/boundary node-ring styling props; preserved its electrical and layout logic. Added local educational styles to existing styles.css using M4 theme variables, native keyboard controls and bounded equation-row scrolling. No visual redesign or animation.
- Added `src/education/lesson.test.ts` (15 tests) and `src/learning.test.tsx` (16 tests). Existing M1–M4 tests are unchanged. Updated only current M5 architecture/status sections, roadmap handoff stages and this new log entry; historical records are preserved.

### Actual verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed with unchanged strict settings |
| `npm run lint` | Passed; zero errors/warnings |
| `npm run test` | Passed: 17 files, 304 tests, none skipped |
| `npm run build` | Passed: typecheck and Vite production build |
| Focused Playwright / local Chrome | Completed delta-to-star and series guided lessons and the interactions below |

Focused tests cover all four lesson types and five stages, series/parallel/delta/star formulas, numerical substitutions, symmetric/asymmetric delta values, electrical-endpoint mapping independent of ID order/orientation, opposite star-arm denominators, unrounded authoritative values, actual bridge labels, retained center wires, mismatched metadata feedback, progression/highlights, preview reuse and existing M4 compatibility. Real M3 verification results cover verified, genuine resistance mismatch, missing-terminal-pair inconclusive and numerical-solver-error inconclusive states. Spies confirm navigation/restart/exit/re-entry does not repeat transform or numerical verification calls. No separate historical module acceptance workflow was rerun.

The initial focused run exposed that jest-dom's toBeInTheDocument matcher accepts HTMLElement/SVGElement but rejects native MathML Element objects in jsdom. Used isConnected plus an explicit MathML namespace assertion instead. A new test helper's unused import was also caught and removed. No type/lint/test rule was disabled. All final checks used the project commands; loopback access and ignored workspace-local TEMP/TMP (.artifacts/m5/temp) supported the unchanged real Vite startup regression.

The browser smoke used the existing Playwright skill/CLI wrapper, local Chrome and a Vite service on port 5175. Actually completed all five steps for a symmetric delta (three 1-ohm arms, three verified 2-ohm terminal pairs) and series (100+220=320 ohms, one verified pair). Checked Previous, restart to stage one, selection changes, Exit preserving two preview diagrams, created/removed node highlights and identical before/after viewBoxes. At 390px the page width stayed 390px; native MathML rendered actual substitutions in dark theme. Theme switching worked, and the inspected browser console reported no errors/warnings. Only two screenshot files were retained for this focused smoke: output/playwright/m5-mobile-substitution.png and m5-delta-verified.png, both visually inspected and ignored by Git.

### Limitations and M6 handoff

- Fixed five-stage, single-operation lessons; no chained transformation history, interactive algebra, persistent progress or animation. M3 eligibility/results remain authoritative, with M2 numerical and M4 drawing limits unchanged.
- Formatted teaching numbers use ten significant digits; this can hide sub-display differences, but mappings and verification retain unrounded values. S/P substitutions remain unevaluated presentation expressions. Unsupported drawing still reports an explicit message and full inventory.
- Verification is tolerance-dependent numerical evidence, not a symbolic proof. Inconclusive and failed outcomes remain distinct. No solver error is promoted to success.
- Native MathML and the focused workflows were tested in local Chrome/viewport emulation; M6 should broaden browser/screen-reader coverage, cross-module state/failure integration and overall documentation consistency. M7 will align the design system with the owner's website; M8 will handle deployment/navigation separately. No later stage was started.

## 2026-10-11 · M4 SVG Circuit Visualization

### Git and scope

- Committed only the known M3 transform sources/tests and corresponding ARCHITECTURE, DEV_LOG and ROADMAP changes as `0b39f28` (`feat(transforms): implement circuit equivalence transformations`). No unrelated modifications were found. No M3 acceptance rerun was performed before this commit.
- Created `feat/05-visualization` from the committed M3 state. Git required access to the restricted .git directory. Missing Git identity was resolved using the previous repository commit identity as command-local options; no global configuration was changed.
- M4 changes remain uncommitted. No push, merge, deployment, M5 implementation, mathematical algorithm change, package dependency change or ESLint rule relaxation.

### Implementation and files

- Added `src/visualization/types.ts`, `layout.ts`, `examples.ts`, and `CircuitDiagram.tsx`; updated the visualization barrel. The separate readonly presentation model keeps geometry outside domain/topology. M1 supplies electrical meaning and short-circuit classification.
- Added eight real immutable circuit fixtures: series, parallel, delta, star, balanced Wheatstone bridge, ideal-wire bypass, retained center wire/isolated point, and unconnected crossing. Templates provide clear initial geometry; deterministic component/lane fallback supports other small networks.
- Every declared resistor/wire/point/terminal stays represented. Parallel branches get distinct routes, self-loops get explicit loops, crossings have gaps, and declared junctions get dots. Disconnected residual components are stacked in a labeled section. Unsupported/crowded/ambiguous geometry returns a clear message; complete inventory remains available.
- Added generic `src/components/CandidatePicker.tsx` and its barrel export. Replaced the M0 shell in App with the Chinese experiment UI, source/replacement highlighting, keyboard/click inspection, preview/reset, metadata status and actual M3 all-terminal verification. Updated `src/styles.css` for readable symbols, native controls, themes and responsive panels.
- App alone composes M3 discovery/application and adapts transformation metadata to `LayoutTransition`; no UI eligibility rules or transformation formulas. Existing active point positions and terminal identities are preserved, new centers use boundary centroids, and comparison diagrams share a viewBox.
- Added `src/visualization/visualization.test.tsx` (28 tests) and `src/preview.test.tsx` (19 tests). Updated one obsolete M0 shell case in `src/App.test.tsx` to assert the M4 drawing; retained its five theme cases. Updated only M4-related architecture/roadmap sections and this new log entry; historical entries remain intact.

### Actual verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed with unchanged strict settings |
| `npm run lint` | Passed; zero errors/warnings |
| `npm run test` | Passed: 15 files, 273 tests, none skipped |
| `npm run build` | Passed: typecheck and Vite production build |
| Actual Chrome / Playwright CLI | Passed the inspected flows and screenshots described below |

The 47 new tests cover all example symbols and actual resistance labels, node/terminal mappings, independent parallel lanes, connected/unconnected crossings, shorted branches/self-loops, selected/replacement/unaffected styles, M3 results for all available example candidates, terminal positions/labels, retained residual elements, deterministic geometry under permutations, immutable inputs, unsupported bounds/coordinates/false junctions, keyboard inspection, exact M3 candidate lists, preview/reset/example/candidate changes, failed discovery/application feedback, and comparison viewBox consistency. Mocked failure returns test UI feedback only; successful transformations use real M3 APIs and actual networks.

The first permutation test accidentally compared the deliberately preserved source network array order; corrected it to compare layout, drawn elements and M1 topology separately. A comprehensive candidate-rendering test found insufficient margin for one bridge Y-to-delta result; reduced the lane interval to 76 drawing units without changing the circuit. Visual inspection found overlapping crossing wire labels; added deterministic label separation and rendered labels above routes.

The full sandboxed suite initially passed 272 tests but the unchanged real Vite startup case hit `connect EACCES 127.0.0.1`. Reran `npm run test` with authorized loopback access and workspace-local TEMP/TMP (`.artifacts/m4/temp`); all 273 passed. No test/configuration was skipped or weakened. The sandboxed Chrome process also could not start crashpad; the authorized browser and Vite service on port 5174 enabled actual inspection.

Browser work used the Playwright skill and the repository's existing ignored CLI wrapper with local Chrome. Actually operated series, parallel, delta-to-star and star-to-delta previews; candidate selection, reset/example switching; keyboard activation; theme switching; and wire/point inspection. Visually inspected screenshots of series, delta in both themes, star-to-delta, bridge, parallel/tablet, bypass, crossing, residual components and narrow layout. At 820px and 390px document width equaled viewport width; diagram panels may scroll internally to preserve text size. Final browser console had no errors or warnings. Screenshots are ignored artifacts under `output/playwright/m4-*.png`; this is viewport emulation, not physical tablet/device testing.

### Limitations and M5 interfaces

- Educational layouts are bounded to 16 points/24 elements. Explicit overlap/spacing failures are reported with the full inventory; no complex automatic routing or arbitrary editing. Label separation is a modest heuristic, not a general collision-free graph engine.
- Drawing labels use six significant digits; the inventory preserves the stored numeric value. Complex networks/long identifiers can require explicit templates. Residual sections may be tall, and narrow diagram panels intentionally scroll.
- Preview applies one candidate to the original immutable example. No chained editor, undo history, teaching formulas or animations. M3/M2 numerical limits and inconclusive equivalence results remain explicit.
- M5 can consume public drawing/layout types, `buildDrawing`, `CircuitDiagram` highlight props, `LayoutTransition`, existing M3 metadata and terminal verification evidence. No M5 work has begun.

## 2026-10-11 · M3 Circuit Equivalence Transformation Engine

### Git preparation and scope

- Inspected `feat/03-solver` at `93743c8`; the working tree contained exactly the 14 known M2 files from the preceding delivery. No unrelated modifications were included.
- At the user's explicit request, created local commit `d845dcb14e962a7883bca5af2a42d7b05f22bdad` (`feat(solver): implement nodal analysis engine`) and branched `feat/04-transforms` from it. Reused the completed M2 acceptance results for that Git operation without rerunning them.
- M3 changes are confined to transforms and relevant sections of ARCHITECTURE, ROADMAP and this log. M0–M2 implementation/tests, dependency/configuration files, README and the UI remain unchanged from the M2 commit. Historical log entries below are preserved verbatim.
- M3 work is left uncommitted for review. No push, merge, deployment, history rewrite, or M4 development was performed.

### Implemented behavior

- Added deterministic discovery and single-operation application for series, parallel, delta-to-star and star-to-delta transformations. Exact resistor IDs disambiguate multigraph candidates. Every application rechecks current structural eligibility and caller-protected connection points using actual M1 topology.
- Series/star centers require exactly two/three active branches, distinct neighbors and no terminal/protected node. Parallel discovery returns maximal groups while application permits subsets. Delta discovery permits extra vertex branches and enumerates exact edge combinations.
- Preserved all unselected elements, ideal wires and external terminal records. Boundary rewrites connect through representatives of their M1 wire-equivalence classes. Remove only newly unreferenced internal points; wire groups and shorted resistors at former centers remain explicitly reported isolated internal components.
- Added frozen metadata with original/replacement records, resistance values, affected/boundary nodes, created/removed points/nodes, retained internal nodes, and formula expressions. Outputs are immutable without modifying/freezing caller inputs.
- New IDs use a shared `m3:<BigInt counter>` namespace above all matching input IDs. Sequential rewrites advance the counter, including when selected old elements are removed. Tests exercise collisions across network, point, element and terminal namespaces and eight consecutive alternating rewrites.
- Stable formula evaluation avoids naive reciprocal/product/sum overflow. Binary mantissa/exponent arithmetic handles Y-to-delta product ratios; negligible underflowed terms may be omitted only under a documented relative bound. Unrepresentable positive values or significant subnormal quantization cause explicit numerical failure with no partial network.
- Added independently callable all-terminal-pairs M1/M2 verification. It distinguishes equivalent/different/inconclusive, checks terminal identity and physical result classification, uses configurable absolute/relative tolerances, and never treats solver errors as equivalence. Normal application does not trigger numerical verification.

### Files

- Updated `src/transforms/index.ts` to export the public API.
- Added `types.ts`, `context.ts`, `candidates.ts`, `formulas.ts`, `apply-transformation.ts`, and `verify-equivalence.ts` inside transforms.
- Added `transformations.test.ts`, `numerical.test.ts`, and `verify-equivalence.test.ts` inside transforms.
- Updated only the M3-relevant scope/API/status sections of ARCHITECTURE and ROADMAP, and appended this new record above the unchanged historical records.

### Actual verification results

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed with existing strict settings |
| `npm run lint` | Passed; zero errors/warnings |
| `npm run test` | Passed: 13 files, 226 tests, no skipped tests |
| `npm run build` | Passed: typecheck and Vite production build |

The 72 M3 tests comprise 33 transformation/integration tests, 16 numerical tests and 23 verifier tests. The existing 154 tests remain unchanged and pass. Multi-terminal applied transformations are checked against every distinct external-terminal pair. Independent analytical expectations include asymmetric delta legs 1/0.6/1.5 and star-to-delta values 31/5, 31/2, 31/3. Verification tests include genuine mismatch, exact open/short preservation, one/both solver failures, invalid terminal sets/tolerances, no available terminal pair, and tiny resistances without a masking absolute tolerance floor.

Initial execution encountered Windows sandbox restrictions: a Vitest temporary-cache rename failed with EPERM, then the original Vite startup test failed with EACCES connecting to 127.0.0.1. Moved process-local TEMP/TMP to ignored `.artifacts/m3/temp` and reran the full suite with permission for loopback access; all 226 tests passed. No project test/configuration was disabled or altered. A new parameterized test initially used an array as a single argument; it was corrected to explicit object cases to satisfy Vitest's argument expansion and strict typing.

### Limitations and M4 handoff

- No unresolved M3 acceptance blocker. Double-precision transformations can fail conservatively at extreme scales; numerical port agreement is tolerance-dependent evidence, not an exact symbolic proof.
- Candidate discovery can be expensive on dense multigraphs because every delta edge combination is explicit. There is no unrestricted reduction loop, candidate cache, sparse solver extension or large-network performance claim.
- Retained center wire groups/shorted resistors may leave isolated internal components. This preserves original connectivity/traceability and is reported in metadata; no automatic drawing cleanup is performed.
- Protection is an explicit caller policy and must be supplied again on application. Candidate IDs identify selections, not immutable network revisions. Persist operation metadata externally for complete multi-step provenance/undo.
- All-pairs verification inherits M2 limits; fewer than two terminals or solver errors are inconclusive. Proven mismatches take precedence over unrelated inconclusive pairs. Protected internal boundaries must be exposed as terminals if their port behavior is to be numerically checked.
- M4 can reuse candidates for selection/highlighting, apply a request, and reconcile original/replacement elements and created/removed/retained nodes using metadata. Geometry remains external. Stop here; M4 requires explicit authorization.

## 2026-10-11 · M2 Nodal Analysis and Resistive Network Solver

### Baseline, resumption and scope

- Verified clean `feat/02-topology` at `93743c8ed35db0d18d145cc6336e9d4e9c28ff42`, containing M0 commit `594e814` and M1. Created `feat/03-solver` from that state; main was not assumed to contain either module.
- On the user's resume request, rechecked branch/status/history and retained all six in-progress solver files. Core implementation had passed typecheck/lint; tests, documentation and complete verification were unfinished. Continued those requirements without resetting or recreating existing work.
- Changes are confined to solver and project documentation. M1/domain contracts, all existing tests, UI, dependencies and tool configuration remain unchanged. No final commit, push, merge, deployment, or M3 implementation was performed.

### Implemented behavior and numerical decisions

- Public `solveEquivalentResistance(topology, terminalAId, terminalBId)` consumes the existing M1 result. It checks terminals, classifies identical nodes and disconnected components, and assembles only the selected connected component.
- Evolved the unused M0 solver placeholder to accept normalized topology. Preserved the four result kinds; added explicit zero for shorts, contextual error codes, node voltages, branch currents/drops, and residual/conditioning diagnostics. All results are frozen, without mutating caller input.
- Ground terminal B and inject +1 A at A. Stamp every non-short resistor independently; exclude self-loops numerically but retain their IDs with zero diagnostics. Unrelated floating networks receive no invented potentials/currents.
- Scale resistances globally using the minimum non-short branch value, then symmetrically equilibrate the reduced matrix. Use Cholesky and triangular solves; no matrix inversion, graph reduction, or numerical dependency.
- Estimate the equilibrated infinity condition number using the nonnegative-inverse property of grounded SPD M-matrices and one additional solve against all ones. Dimension-aware pivot/condition thresholds use 64*n*epsilon.
- Check componentwise nodal residuals, branch KCL including the reference, positive finite resistance, passive voltage bounds, non-finite arithmetic, and physical-unit conversion accuracy. This is a conservative double-precision solver, not a certified forward-error algorithm.
- Added a regression for subnormal physical-unit rounding: two parallel resistors of 3*Number.MIN_VALUE have a mathematical result of 1.5*Number.MIN_VALUE; rounding to 2*Number.MIN_VALUE is a 33% relative error and now returns numerical-failure. Ordinary scaling tests include 1e-300 through 1e300; exact single-resistor extremes can also succeed.
- Dense factorization costs O(n^3) time/O(n^2) storage. Limit the selected component to 512 unknown nodes before allocation; resource failures are separate from numerical failures and physical open circuits.

### Files

- Updated `src/solver/index.ts`; added `types.ts`, `numerics.ts`, `nodal-system.ts`, `linear-system.ts`, and `solve-equivalent-resistance.ts` inside solver.
- Added `solve-equivalent-resistance.test.ts`, `nodal-system.test.ts`, `linear-system.test.ts`, and `reference.test.ts` inside solver.
- Updated README, ARCHITECTURE, ROADMAP, and this development log. Architecture documentation and new technical comments are English; existing Chinese project documentation conventions are retained where applicable.

### Actual verification

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed with strict checks; no configuration relaxation |
| `npm run lint` | Passed; zero errors and warnings |
| `npm run test` | Passed: 10 files, 154 tests, none skipped |
| `npm run build` | Passed: typecheck followed by Vite production build |

The 64 M2 tests consist of 51 public solver cases, one matrix-assembly case, 11 linear-system cases, and one exact-reference case. All original 90 M0/M1 tests remain unchanged and pass, including App and actual Vite HTTP startup tests. No new browser/UI acceptance is claimed because the UI was not changed.

The suite covers A1–A6, B1–B3, C1–C7 and D1–D9. Analytical references include the unbalanced bridge result 106/33 ohms and K5 result 4/5 ohm. One independent BigInt cofactor test checks 32 generated connected multigraphs in both terminal directions using Cramer's rule; these are not counted as extra Vitest cases. Additional checks include a 100-edge chain, signed currents, power conservation, output freezing, missing normalized component data, resource limits and JSON serialization.

The initial test run caught a missing closing brace in a new test helper and an incorrectly selected condition-threshold fixture. The fixture was corrected analytically: for coupling c, rcond=(1-c)/(1+c), while the final Cholesky pivot is 1-c^2. No circuit reference value, tolerance, type rule, or test was weakened to obtain passing results.

### Limitations and M3 integration

- No unresolved M2 acceptance blocker. All requested checks were actually run after the completed implementation.
- Only passive linear DC resistors and ideal-wire-normalized graphs are supported. No sources beyond the internal 1 A test, SPICE device models, AC, or circuit transformations.
- Input is trusted typed M1 output, not arbitrary JSON. Small selected-component guards do not duplicate the full topology validator.
- Extreme resistance ratios, nearly equal potentials, subnormal rounding, and ill-conditioning can produce numerical-failure even for a physically valid connected graph. Residuals/condition estimates are diagnostics, not guaranteed significant digits. No arbitrary precision, sparse backend, iterative refinement, factorization cache, or large-scale benchmark.
- Diagnostics describe only the excited component; branch direction follows the original normalized endpoint tuple. Short/open results intentionally omit finite-solution diagnostics.
- M3 should independently analyze original and transformed circuits, preserve terminal correspondence, compare result kinds and finite values with explicit tolerances, and treat solver errors as inconclusive. Test all relevant port pairs for multi-terminal equivalence. M3 remains unimplemented and requires explicit authorization.

## 2026-10-11 · M1 Circuit Topology Modeling and Node Identification

### Baseline and scope

- Continued from `feat/01-foundation`, whose uncommitted files were the known M0 delivery from the preceding round. Created `feat/02-topology` without discarding, stashing, or committing that work.
- Existing commit history and main were preserved. No commit, push, merge, or deployment was performed.
- Implemented the topology engine and its tests. Shared domain changes are limited to contextual diagnostics and checking both positions of an actual two-endpoint array. No domain type was duplicated or replaced.
- No dependency or tool configuration changes. Solver, transforms, visualization, education, components, and App source remain outside this round's changes.

### Implementation and decisions

- Added an internal Map-based DSU with `find`, `union`, iterative full path compression, union by size, and redundant-union handling.
- Added `analyzeTopology(network): TopologyResult`, preserving the existing TopologyAnalyzer contract. Validation uses `createCircuitNetwork` before normalization.
- Canonical node IDs use `node:` plus the minimum original point ID in UTF-16 code-unit order. DSU roots never become public IDs. Component IDs use `component:` plus the minimum node ID.
- All collections have deterministic ordering. Reordering points, wires, resistors, and terminals preserves normalized output; geometry is never read. Endpoint order within a resistor remains the original order.
- Preserved every resistor ID, resistance, normalized endpoint tuple, and short-circuit flag. Parallel branches remain separate; wire-bypassed resistors and literal self-loops remain traceable.
- Used a separate DSU for resistive connected components. Every node belongs to one component, including isolated nodes; shorted branches stay in their component without connecting new nodes.
- Added point-to-node, terminal-to-node, and node-to-component dictionaries. Null prototypes support arbitrary valid property-like identifiers without inherited-property collisions.
- Returned a deeply frozen snapshot without changing or freezing caller-owned data. No numerical computation or electrical simplification is performed.

### Files changed

New files:

- `src/topology/types.ts`
- `src/topology/disjoint-set.ts`
- `src/topology/analyze-topology.ts`
- `src/topology/disjoint-set.test.ts`
- `src/topology/analyze-topology.test.ts`
- `src/topology/reference.test.ts`

Updated files:

- `src/topology/index.ts`: public API exports.
- `src/domain/network.ts`: errors name the offending component/terminal; reject malformed/sparse endpoints with context.
- `README.md`: current engine status and API introduction; explicitly distinguishes the unchanged UI shell.
- `docs/ARCHITECTURE.md`: English documentation of contracts, pipeline, determinism, validation, geometry separation, complexity, and M2 integration.
- `docs/ROADMAP.md`: M1 verified complete; future phase numbering follows the M1 task specification. No future module is marked complete.
- `docs/DEV_LOG.md`: this record; historical M0 record retained below.

### Actual verification results

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed; strict typing and dependency declaration checks remain enabled |
| `npm run lint` | Passed; zero errors and warnings |
| `npm run test` | Passed: 6 files, 90 tests, no skipped tests |
| `npm run build` | Passed: type checking followed by Vite production output |

The suite contains 57 new M1 tests (49 analyzer tests, 7 DSU tests, 1 independent reference test) and the original 33 M0 tests. The reference test checks 64 deterministic generated networks and their reordered forms; those graphs are not counted as separate Vitest tests. The existing real Vite HTTP startup test also passed.

Coverage includes all A1–A5, B1–B7, and C1–C7 requirements: node membership and IDs, delta/parallel networks, transitive bypasses, self-loops, isolated and disconnected structures, terminal equivalence, geometry-only crossings, every wire permutation of a four-wire example, resistor permutations, invalid references/IDs/resistances, immutability, and the distinction between the two partitions. Additional cases exercise empty networks, ID namespaces, prototype-like/Unicode/numeric-looking IDs, endpoint arity/sparsity, deterministic serialization, and extreme finite positive resistances.

During the first lint pass, an assertion that read the dictionary key `valueOf` triggered the unbound-method rule. The assertion now checks own-property absence plus the null prototype. No rule was disabled. All final checks passed after that correction and the added boundary/reference tests.

### Complexity and integration considerations

For P points, W wires, R resistors, and T terminals, the total bound is
`O((P + W + R) alpha(P + 1) + P log(P + 1) + R log(R + 1) + T log(T + 1))`,
assuming expected constant-time maps and unit-cost identifier operations. The second DSU operates on N <= P electrical nodes. Peak space is `O(P + W + R + T)`, including the validated input copy. Sorting costs are explicitly included; the complete engine is not described as purely near-linear.

M2 can reuse `TopologyResult`, `NormalizedResistor`, `ElectricalNode`, and `ResistiveComponent`. Resolve terminals through `terminalToNode`, select connected components through `nodeToComponent`, and retain/filter branches using their IDs and `isShortCircuited` flags. No ground node, excitation, matrix, voltage, current, power, or equivalent resistance is supplied by M1.

### Limitations and unresolved issues

- No unresolved verification blockers. Stop after M1; M2 requires explicit user authorization.
- This is a typed network API, not a general unknown/JSON schema parser. Contextual TypeError/RangeError diagnostics cover the stated model invariants; there is no structured error-code protocol yet.
- Canonical IDs are stable for the same partition and identifiers, not across arbitrary renaming or connectivity edits. The original network ID is not a content hash.
- Snapshot construction validates/copies the input on every call; there is no incremental or cached topology maintenance. No large-scale performance benchmark is claimed.
- Shorted resistor IDs are retained inside component membership; downstream numerical consumers must explicitly exclude their self-loop contribution as appropriate.
- The UI remains the M0 shell and does not display M1 analysis. Browser rendering was not changed or re-audited in this round; the existing App and startup regression tests passed.

## 2026-10-11 · M0 项目基础架构

### 起点与 Git

- 仓库：STRAY-FLZ/circuit-equivalence-lab。
- 初始分支 main，工作区干净，仅有 README.md；初始提交 `cf4f2c9`。
- 新建 `feat/01-foundation` 分支；保留已有提交和 main，不 push、不合并、不部署。本轮变更保留为工作区文件，未创建提交。
- 实际环境：Windows PowerShell、Node.js 24.21.0、npm 11.19.0。

### 实现内容

- 手动初始化 React 19 + TypeScript 6 + Vite 8 工程，避免脚手架覆盖已有仓库文件。
- 配置 dev/build/preview/test/test:watch/lint/typecheck，生成 npm 锁文件，缓存与构建/验证产物均在忽略目录内。
- TypeScript strict 及更严格的索引、可选属性等检查；源码、测试和工具 TS 配置均参与检查，未启用 skipLibCheck。
- ESLint flat config 与类型感知规则、React Hooks、Fast Refresh 检查，模块依赖方向约束，零警告要求。
- 领域模型表达稳定连接点、理想导线、正电阻、多外部端子与完整网络；实现阻值校验、ID/引用完整性校验和深层冻结快照。
- topology/solver/transforms/visualization/education 仅定义公共类型契约；没有求解、拓扑识别、变换、教学公式计算或电路绘图实现。
- 基础 React 页面、响应式布局、深浅主题切换与持久化、系统初始偏好、浏览器存储不可用时的降级行为，以及 favicon。
- 维护 README、ARCHITECTURE、ROADMAP 和本记录。

### 实际验收

| 命令/验证 | 结果 |
| --- | --- |
| npm install | 成功；兼容调整后的最终依赖树审计 243 个包，报告 0 个漏洞 |
| npm run typecheck | 通过，包含依赖声明检查，无类型错误 |
| npm run lint | 通过，无错误、无警告 |
| npm run test | 3 个文件、33 个测试全部通过，无跳过测试 |
| npm run build | 通过；先检查类型，再生成 dist 中的 HTML、CSS、JS 与 favicon |
| npm run dev -- --port 5173 --strictPort | 成功监听 http://127.0.0.1:5173/，Vite 实际启动 |
| Playwright + 本机 Chrome | 页面正常渲染；深浅主题可切换，刷新保留选择；1440px/390px/320px 无横向溢出；截图已目视检查 |

测试分布：

- domain：26 个测试，包含有限正数与非法值、品牌类型契约、多端子、空网络/断路、重复/无效 ID、悬空引用、端子标签、网络边界阻值重验和冻结副本。
- App：6 个测试，包含项目介绍与 M0 状态、没有假功能按钮、主题切换/保存、系统偏好、已存主题优先、无效存储和存储不可用。
- startup：1 个集成测试，真实开启 Vite HTTP 服务，请求 HTML、React 入口、组件、样式和 favicon，最后关闭服务。

浏览器截图保存在被 Git 忽略的 `output/playwright/`，Playwright CLI 是一次性验证工具，未加入 package.json。验证完成后关闭浏览器与本轮 dev 服务。

### 遇到并解决的问题

- npm 最新 TypeScript 为 7，而当前 typescript-eslint 支持范围小于 6.1，因此固定兼容的 TypeScript 6.0.3。
- Vitest 5 与 jest-dom 的 Assertion 泛型声明不兼容，首次 typecheck 明确失败。改为 Vitest 4.1.11 后通过完整类型检查；没有屏蔽声明错误或更改 node_modules。
- 为 Vite/Vitest 配置间 import 补充 `.ts` 扩展名，消除原生配置加载的兼容提示。
- 沙箱内 Edge 自动化启动停滞，改用本机 Chrome 完成浏览器检查；不影响工程启动测试。
- 浏览器初次请求 favicon.ico 返回 404；添加显式 SVG favicon 后刷新验证不再出现该资源错误。
- Vite 曾监听项目内的浏览器配置缓存，出现 EBUSY 文件锁提示；在 server.watch.ignored 中明确排除 npm 缓存、浏览器验证与其他生成目录后，重新启动验证不再出现该提示。

### 已知局限与待后续解决

- 本轮无未解决的验收阻塞项；M1～M6 的业务功能均未实现。
- ID 由调用方稳定分配；电气节点的 ID 生成规则留待 M1 定义。基础模型允许重边、自环、孤立点和多个端子引用同一连接点，M1/M2 需明确处理。
- 工厂接受类型化输入，未实现 unknown/JSON 的完整 schema 解析；调用方不得使用强制断言替代输入校验。
- 阻值入口只保证有限正数，不保证未来数值计算的条件数与容差；极端阻值尺度留待 M2 处理。
- 主题读取系统偏好仅发生在首次初始化，不监听运行中的系统主题变化。
- 尚未验收真实手机设备、其他浏览器和旧 Node.js 版本；当前验收基于上述本机环境及 Chrome 视口模拟。

### M1 接续入口

复用 `CircuitNetwork`、`ConnectionPointId`、`IdealWire`、`CircuitElement`、`ExternalTerminal`，并通过 `createCircuitNetwork()` 与 `resistanceOhms()` 构造可信输入。实现已预留的 `TopologyAnalyzer` / `TopologyResult` / `ElectricalNode` 契约时保持 domain 无反向依赖、不读取 CircuitLayout。下一轮仅推进 M1，不顺带引入求解或变换算法。
