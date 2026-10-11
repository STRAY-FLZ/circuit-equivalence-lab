# M0～M6 开发路线

Each round implements and verifies one module. M0–M3 have passed acceptance; M4–M6 remain unimplemented.

| 阶段 | 状态 | 内容 | 验收条件 |
| --- | --- | --- | --- |
| M0 项目基础架构 | 已完成 | React/TS/Vite、严格检查、模型与契约、基础页面、文档 | install/typecheck/lint/test/build 全部实际通过；有限正电阻与数据完整性测试有效；真实启动测试成功；支持深浅主题 |
| M1 拓扑识别 | 已完成 | DSU 导线等价类、稳定节点 ID、点/端子映射、电阻支路与电阻连通分量 | A/B/C 全部场景和边界测试通过；并联与短路电阻身份保留；几何无关；输入不变、输出冻结；独立遍历交叉验证；含排序成本的复杂度有文档；typecheck/lint/test/build 全部通过 |
| M2 电阻网络求解 | 已完成 | 分量内节点电压法、缩放 Cholesky、两端等效电阻、支路诊断与显式求解状态 | 解析电路和独立精确算术参考通过；开短路与数值失败区分；KCL、互易性、尺度和边界测试通过；保留全部 M0/M1 测试；typecheck/lint/test/build 全部通过 |
| M3 Circuit equivalence transformations | Complete | Series/parallel, delta-to-star, star-to-delta, explicit candidates, immutable rewrites and metadata | Analytical and rejection tests pass; wires/terminals/protected boundaries preserved; independent all-pairs M1/M2 verification; 72 new tests; all checks pass |
| M4 SVG 电路图与交互 | 待开发 | 独立布局、节点/元件/端子绘制、选取及编辑交互 | 几何变化不修改电气连接；交叉线不产生隐式节点；绘制与模型一致；响应式、主题与键盘可达；交互不破坏模型校验；具体拖拽编辑范围在该轮确认 |
| M5 教学与惠斯通电桥 | 待开发 | 平衡/不平衡电桥案例、交互解释、公式与逐步推导 | 解释平衡条件及适用前提；数值与 M2 一致；不平衡桥不错误套用串并联；中文教学结论可追溯到计算与变换 |
| M6 集成与完整学习流程 | 待开发 | 组合已验收模块、端到端学习流程与必要的集成整理 | 全部模块回归通过；图形、拓扑、计算、变换与教学状态一致；验证真实学习流程；不以集成为由引入无关的大规模重构 |

M1 验收结果：新增 57 个拓扑测试，加上保留的 33 个 M0 测试，共 6 个文件、90 个测试通过。独立遍历测试在一个测试用例中检查 64 个可复现图及其重排输入；它们不计作额外 Vitest 用例。详见 DEV_LOG.md。

M2 验收结果：新增 64 个测试，保留 M0/M1 的 90 个测试，共 10 个文件、154 个测试通过。已验证 100 支路串联网络；稠密求解器限制为所选分量最多 512 个未知节点，极端数值可能返回明确失败。UI 尚未接入求解器。

M3 acceptance: 72 new tests plus the unchanged 154 M0–M2 tests, totaling 226 passing tests in 13 files. Type checking, linting and production build passed. Numerical failures remain explicit and M2 errors make equivalence comparisons inconclusive. Transformations are available through TypeScript APIs; the UI remains unchanged.

Stop after M3. M4 requires explicit user authorization. SVG drawing, circuit editing, interactive teaching and M6 integration remain future work. No deployment, database or paid API is required.
