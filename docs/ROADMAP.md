# Development Roadmap (M0–M8)

Each round implements and verifies one module. M0–M7 have passed their scoped acceptance; M8 remains unimplemented. M6/M7 browser coverage is limited to the locally available Chrome/Chromium engine.

| 阶段 | 状态 | 内容 | 验收条件 |
| --- | --- | --- | --- |
| M0 项目基础架构 | 已完成 | React/TS/Vite、严格检查、模型与契约、基础页面、文档 | install/typecheck/lint/test/build 全部实际通过；有限正电阻与数据完整性测试有效；真实启动测试成功；支持深浅主题 |
| M1 拓扑识别 | 已完成 | DSU 导线等价类、稳定节点 ID、点/端子映射、电阻支路与电阻连通分量 | A/B/C 全部场景和边界测试通过；并联与短路电阻身份保留；几何无关；输入不变、输出冻结；独立遍历交叉验证；含排序成本的复杂度有文档；typecheck/lint/test/build 全部通过 |
| M2 电阻网络求解 | 已完成 | 分量内节点电压法、缩放 Cholesky、两端等效电阻、支路诊断与显式求解状态 | 解析电路和独立精确算术参考通过；开短路与数值失败区分；KCL、互易性、尺度和边界测试通过；保留全部 M0/M1 测试；typecheck/lint/test/build 全部通过 |
| M3 Circuit equivalence transformations | Complete | Series/parallel, delta-to-star, star-to-delta, explicit candidates, immutable rewrites and metadata | Analytical and rejection tests pass; wires/terminals/protected boundaries preserved; independent all-pairs M1/M2 verification; 72 new tests; all checks pass |
| M4 SVG circuit visualization | Complete | Separate layout/SVG models, eight real examples, M3 candidate selection and before/after preview | Every declared element rendered or explicitly unsupported; crossing/junction distinction; terminal identity and source immutability; responsive light/dark UI and keyboard inspection; 47 new tests; 273 total tests and all checks pass; actual Chrome inspection |
| M5 Interactive educational system | Complete | Five-stage series/parallel/delta/star lessons, actual substitutions, synchronized SVG metadata highlights, cached numerical evidence | 31 focused tests plus unchanged M4 regressions; 304 tests total; all standard checks pass; Chrome delta/series learning smoke tests; original networks preserved |
| M6 Targeted integration and quality assurance | Complete | Representative selection/preview/lesson/recovery workflows, verification handoff and focused browser/accessibility checks | Three new integration tests; 307 total tests in 18 files; all standard checks pass; measured small-text contrast defect fixed with browser regression; Chrome at 1440/820/390px; Firefox/WebKit unavailable and explicitly unverified |
| M7 Personal website design alignment | Complete | Verified Stray source tokens, branding/header/home links, shared theme lifecycle and restrained application styling | Eight new theme/header/bootstrap cases; 315 total tests in 19 files; all standard checks pass; actual main-site comparison; Chrome light/dark at 1440/820/390px; shared-theme/restricted-storage/pre-paint checks; DESIGN_SYSTEM.md |

M1 验收结果：新增 57 个拓扑测试，加上保留的 33 个 M0 测试，共 6 个文件、90 个测试通过。独立遍历测试在一个测试用例中检查 64 个可复现图及其重排输入；它们不计作额外 Vitest 用例。详见 DEV_LOG.md。

M2 验收结果：新增 64 个测试，保留 M0/M1 的 90 个测试，共 10 个文件、154 个测试通过。已验证 100 支路串联网络；稠密求解器限制为所选分量最多 512 个未知节点，极端数值可能返回明确失败。UI 尚未接入求解器。

M3 acceptance: 72 new tests plus the unchanged 154 M0–M2 tests, totaling 226 passing tests in 13 files. Type checking, linting and production build passed. Numerical failures remain explicit and M2 errors make equivalence comparisons inconclusive. Transformations are available through TypeScript APIs; the UI remains unchanged.

M4 acceptance: 47 new tests (28 visualization and 19 preview tests), plus the existing 226 tests, total 273 passing tests in 15 files. One obsolete App shell assertion was updated for the real M4 UI; its five theme cases remain. Typecheck, lint and build passed. Actual Chrome inspection covered all four transformation types, wire crossings, bypasses, residual nodes, themes and tablet/narrow viewport behavior.

M5 acceptance: 15 educational-content tests and 16 React integration/verification tests added. The final project regression passed all 304 tests in 17 files, with typecheck, lint and production build passing. A small actual Chrome smoke check completed delta-to-star and series lessons, navigation/restart/exit, mobile formulas and theme switching. Existing M4 examples and preview interactions remain; a symmetric 3-ohm delta was added as educational input.

M6 acceptance: representative actual browser workflows compared SVG data and terminal identities with M3 results; learning navigation, candidate/example switches and recovery passed. Three verification handoff tests were added without repeating numerical algorithm validation. One confirmed light-theme contrast defect was fixed locally (4.26:1 -> 8.01:1), with a separate replayable Playwright regression. The final complete regression passed 307 tests in 18 files plus typecheck/lint/build. Keyboard, native MathML, SVG, both themes and three viewports were checked in Chrome; absent Firefox/WebKit executables prevented those runs. No unresolved product defect was found in the checked sample; this is not full browser or accessibility certification.

M7 acceptance: read-only source/live inspection verified the personal website's actual CSS, theme script and two relevant HTML pages. Presentation tokens, typography, Stray header, absolute home navigation and `stray-theme` synchronization are aligned. Eight new cases brought the final regression to 315 tests in 19 files; typecheck/lint/build passed. Actual Chrome comparison and replays covered pre-React theme initialization, persistence, cross-tab sync, storage restriction, keyboard focus, lesson/preview navigation, MathML and three light/dark viewport sizes. M6 contrast protection remains passing. No electrical/educational engine or personal website implementation changed.

| Future stage | Status | Planned scope |
| --- | --- | --- |
| M8 Deployment and website navigation | Not started | Separately authorized public deployment and personal website navigation integration |

Stop after M7 and leave its changes uncommitted for review. M8 requires explicit user authorization; project-path deployment and personal website navigation integration remain pending. No personal website modification, push, merge or deployment was performed. Arbitrary circuit editing, symbolic algebra and tutoring services remain outside this scope.
