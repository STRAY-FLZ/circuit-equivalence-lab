# Development Roadmap (M0–M8)

Each round implements and verifies one module. M0–M5 have passed acceptance; M6–M8 remain unimplemented.

| 阶段 | 状态 | 内容 | 验收条件 |
| --- | --- | --- | --- |
| M0 项目基础架构 | 已完成 | React/TS/Vite、严格检查、模型与契约、基础页面、文档 | install/typecheck/lint/test/build 全部实际通过；有限正电阻与数据完整性测试有效；真实启动测试成功；支持深浅主题 |
| M1 拓扑识别 | 已完成 | DSU 导线等价类、稳定节点 ID、点/端子映射、电阻支路与电阻连通分量 | A/B/C 全部场景和边界测试通过；并联与短路电阻身份保留；几何无关；输入不变、输出冻结；独立遍历交叉验证；含排序成本的复杂度有文档；typecheck/lint/test/build 全部通过 |
| M2 电阻网络求解 | 已完成 | 分量内节点电压法、缩放 Cholesky、两端等效电阻、支路诊断与显式求解状态 | 解析电路和独立精确算术参考通过；开短路与数值失败区分；KCL、互易性、尺度和边界测试通过；保留全部 M0/M1 测试；typecheck/lint/test/build 全部通过 |
| M3 Circuit equivalence transformations | Complete | Series/parallel, delta-to-star, star-to-delta, explicit candidates, immutable rewrites and metadata | Analytical and rejection tests pass; wires/terminals/protected boundaries preserved; independent all-pairs M1/M2 verification; 72 new tests; all checks pass |
| M4 SVG circuit visualization | Complete | Separate layout/SVG models, eight real examples, M3 candidate selection and before/after preview | Every declared element rendered or explicitly unsupported; crossing/junction distinction; terminal identity and source immutability; responsive light/dark UI and keyboard inspection; 47 new tests; 273 total tests and all checks pass; actual Chrome inspection |
| M5 Interactive educational system | Complete | Five-stage series/parallel/delta/star lessons, actual substitutions, synchronized SVG metadata highlights, cached numerical evidence | 31 focused tests plus unchanged M4 regressions; 304 tests total; all standard checks pass; Chrome delta/series learning smoke tests; original networks preserved |
| M6 集成与完整学习流程 | 待开发 | 组合已验收模块、端到端学习流程与必要的集成整理 | 全部模块回归通过；图形、拓扑、计算、变换与教学状态一致；验证真实学习流程；不以集成为由引入无关的大规模重构 |

M1 验收结果：新增 57 个拓扑测试，加上保留的 33 个 M0 测试，共 6 个文件、90 个测试通过。独立遍历测试在一个测试用例中检查 64 个可复现图及其重排输入；它们不计作额外 Vitest 用例。详见 DEV_LOG.md。

M2 验收结果：新增 64 个测试，保留 M0/M1 的 90 个测试，共 10 个文件、154 个测试通过。已验证 100 支路串联网络；稠密求解器限制为所选分量最多 512 个未知节点，极端数值可能返回明确失败。UI 尚未接入求解器。

M3 acceptance: 72 new tests plus the unchanged 154 M0–M2 tests, totaling 226 passing tests in 13 files. Type checking, linting and production build passed. Numerical failures remain explicit and M2 errors make equivalence comparisons inconclusive. Transformations are available through TypeScript APIs; the UI remains unchanged.

M4 acceptance: 47 new tests (28 visualization and 19 preview tests), plus the existing 226 tests, total 273 passing tests in 15 files. One obsolete App shell assertion was updated for the real M4 UI; its five theme cases remain. Typecheck, lint and build passed. Actual Chrome inspection covered all four transformation types, wire crossings, bypasses, residual nodes, themes and tablet/narrow viewport behavior.

M5 acceptance: 15 educational-content tests and 16 React integration/verification tests added. The final project regression passed all 304 tests in 17 files, with typecheck, lint and production build passing. A small actual Chrome smoke check completed delta-to-star and series lessons, navigation/restart/exit, mobile formulas and theme switching. Existing M4 examples and preview interactions remain; a symmetric 3-ohm delta was added as educational input.

| Future stage | Status | Planned scope |
| --- | --- | --- |
| M7 Personal website visual alignment | Not started | Align typography, theme, headers, separators and navigation with https://stray-flz.github.io/stray-articles/ (STRAY-FLZ/stray-articles); keep educational views modular |
| M8 Deployment and website navigation | Not started | Separately authorized public deployment and personal website navigation integration |

Stop after M5. M6 requires explicit user authorization. No personal website modification, push, merge or deployment was performed. Arbitrary circuit editing, symbolic algebra and tutoring services are outside M5.
