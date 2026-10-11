# 开发记录

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
