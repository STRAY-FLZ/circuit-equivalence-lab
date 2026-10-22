# 电路等效变换实验室

STRAY Electronics Lab / 电路实验室 is an interactive circuit learning and engineering tool. V2.0.0 adds engineering projects, an editable SVG schematic, explicit wiring, undo/redo, portable JSON files, and verified resistor-network transformations with five-stage lessons based on the current circuit.

V2.3.0 adds explicit MNA DC operating-point analysis for positive resistors,
independent V/I sources and VCVS/VCCS/CCVS/CCCS. It displays actual equations,
node/branch voltage, current and power, with reference selection, residual/KCL/
power checks, stale-result handling and 16 compatible Atlas entry points.
See [methods and limits](docs/v2/DC_ANALYSIS_IMPLEMENTATION.md) and
[release evidence](docs/v2/V2_3_0_RELEASE.md).

V2.2.0 adds the Circuit Atlas: twelve circuit-type categories, 89 families,
26 actual editable templates, animated three-level navigation and protected
existing-editor integration. Planned families and unsupported analyses remain
explicit. See [coverage and methods](docs/v2/CIRCUIT_ATLAS.md),
[release status](docs/v2/V2_2_0_RELEASE.md) and the [per-version checklist](docs/VERSION_CHECKLIST.md).

V2.1.0 adds a standalone signal laboratory: configurable sampled generation,
interactive oscilloscope, full-capture RMS/statistics, amplitude FFT, explicit-unit
multi-channel CSV and portable source/derived-data project files. It does not
acquire hardware or simulate arbitrary schematics. See [methods and limits](docs/v2/SIGNAL_IMPLEMENTATION.md)
and [release status](docs/v2/V2_1_0_RELEASE.md).

V2.0.1 adds pin/anchor drag-to-connect with a continuously rendered wire preview,
screen-space snapping and the existing graph/history transactions.
See [patch verification and release status](docs/v2/V2_0_1_WIRE_INTERACTION.md).

V2.0.2 makes each palette activation place one component; holding and dragging
an existing component moves its original instance. See [movement patch evidence](docs/v2/V2_0_2_COMPONENT_MOVEMENT.md).

The completed V1 M0–M8 foundation remains available at [Circuit Equivalence Lab](https://stray-flz.github.io/circuit-equivalence-lab/), linked from the [Stray tools page](https://stray-flz.github.io/stray-articles/tools/). See the [changelog](CHANGELOG.md), [V2.0.0 release record](docs/v2/V2_0_0_RELEASE.md), and [deployment and maintenance](docs/DEPLOYMENT.md). Transformations support eligible resistor-only sheets; DC supports the documented linear source models; AC/transient/nonlinear simulation remains unsupported. Application version 2.3.0 and project-file schema version 1 are independent.

## 本地运行

推荐使用 Node.js 24 LTS（至少 24.15.0）与 npm 11；本轮实际环境为 Node.js 24.21.0、npm 11.19.0。

```powershell
npm install
npm run dev
```

开发服务默认只监听本机，通常为 `http://127.0.0.1:5173`；以终端输出为准。依赖缓存位于项目内的 `.npm-cache/`，无需全局安装工具。

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview
```

`test` 一次运行后退出；`test:watch` 用于开发时持续测试。`build` 先执行类型检查，再输出静态文件到 `dist/`。已有锁文件时可使用 `npm ci` 重建相同依赖树。

## 技术栈与结构

- React 19、TypeScript 6、Vite 8。
- Vitest 4、Testing Library、jsdom；包含真实 Vite HTTP 启动测试。
- ESLint 10 flat config，启用 TypeScript 类型感知规则和模块依赖限制。
- 原生 CSS，无组件框架、路由、数据库、付费 API 或科学计算依赖。

```text
src/
  engineering/    Stable project identities, pinned definitions and derived nets
  project-format/ Versioned UTF-8 JSON, integrity checks and migrations
  compatibility/ Explicit V1 projection and stable identity mappings
  editing/        Immutable transactions and undo/redo
  editor/         Editable SVG view and project persistence controls
  integration/    Verified transformations and transactional writeback
  analysis/       Typed asynchronous analysis provider contracts
  signal/         Sample generation, statistics, FFT, CSV and verified data assets
  signal-ui/      Responsive oscilloscope and integrated signal workbench
  atlas/          Typed circuit taxonomy, immutable recipes and project instances
  atlas-ui/       Animated searchable catalog and guarded editor entry
  domain/          电路类型、有限正电阻与网络完整性校验
  topology/        DSU、电气节点识别、支路与连通分量归一化
  solver/          节点电压法、等效电阻、数值检查与诊断
  transforms/      Transformation discovery, immutable rewrites and verification
  visualization/  Circuit layout, SVG diagrams and built-in examples
  education/      Five-stage lesson content and formula mappings
  components/     Shared header, theme switch and controls
  App.tsx         Interactive circuit laboratory
  main.tsx        React 启动入口
  styles.css      响应式布局与主题样式
tests/            测试环境与真实服务启动测试
docs/             架构、开发记录与路线图
```

## V1 兼容数据模型约定

V2 工程模型与连接图见 [engineering model](docs/v2/DOMAIN_MODEL.md)；以下保留 V1 兼容 API，供既有示例与数值引擎使用。

电气连接由连接点 ID 与元件端点显式表达；坐标单独存放在 `CircuitLayout`，位置重叠不产生连接。理想导线表达短路，缺少连接表达断路。普通电阻必须通过 `resistanceOhms()` 构造为有限正数，`createCircuitNetwork()` 校验引用与 ID 后返回不可变副本。

```ts
import { createCircuitNetwork, resistanceOhms } from './src/domain'

const network = createCircuitNetwork({
  id: 'example',
  points: [{ id: 'p-a' }, { id: 'p-b' }],
  elements: [{
    id: 'r-1', kind: 'resistor', endpoints: ['p-a', 'p-b'],
    resistance: resistanceOhms(100),
  }],
  terminals: [
    { id: 'terminal-a', label: 'A', pointId: 'p-a' },
    { id: 'terminal-b', label: 'B', pointId: 'p-b' },
  ],
})
```

ID 由调用方稳定分配，标签只用于展示。该构造函数只校验数据，不识别拓扑或计算电路。

## M1 拓扑 API

```ts
import { analyzeTopology } from './src/topology'

const topology = analyzeTopology(network)
```

结果包含 `nodes`、`pointToNode`、`resistors`、`terminalToNode`、`components` 和 `nodeToComponent`。理想导线合并电气节点；电阻只连接不同节点形成电阻连通分量。并联支路和短路电阻均保留原始 ID、阻值与归一化端点，短路使用 `isShortCircuited` 标记。

节点 ID 为 `node:` 加组内按 UTF-16 码元字典序排列的最小连接点 ID；结果不受输入集合顺序影响。输入不被修改，输出深层冻结。详细 ID 稳定性、校验规则、复杂度与 M2 接口见架构文档。本模块不计算电压、电流、功率或等效电阻。

## M2 求解 API

```ts
import { solveEquivalentResistance } from './src/solver'

const result = solveEquivalentResistance(topology, 'terminal-a', 'terminal-b')
if (result.kind === 'finite') {
  console.log(result.resistance) // Ω; this example gives approximately 100
}
```

结果区分 `finite`、`short-circuit`（明确为 0Ω）、`open-circuit` 和带错误代码的 `error`。有限结果含所选分量的节点电压、各电阻支路的电流/压降及残差诊断；以第二端子为参考，在第一端子注入 1 A。极端尺度、病态矩阵或结果溢出会返回数值失败，不会伪装为物理开路。稠密求解限制为最多 512 个未知节点。

The V2.3.0 regression suite contains 579 tests in 35 files, including 40 new DC/palette cases and the accepted 539-test V2.2.0 baseline. The original 315-test V1 baseline remains preserved. See [architecture](docs/ARCHITECTURE.md), [development log](docs/DEV_LOG.md), and [M0–M8 roadmap](docs/ROADMAP.md). Tool configuration follows the official [Vite](https://vite.dev/guide/), [Vitest](https://vitest.dev/guide/), and [ESLint](https://eslint.org/docs/latest/use/configure/configuration-files) documentation.
