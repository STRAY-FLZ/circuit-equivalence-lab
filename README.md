# 电路等效变换实验室

Circuit Equivalence Lab is an interactive learning tool for undergraduate circuit courses. It supports topology analysis, nodal resistance solving, series/parallel and Y–Δ transformations, SVG previews, and five-stage guided lessons.

M0–M7 are complete. M8 publishes the application at [Circuit Equivalence Lab](https://stray-flz.github.io/circuit-equivalence-lab/) and integrates it into the [Stray tools page](https://stray-flz.github.io/stray-articles/tools/). See [deployment and maintenance](docs/DEPLOYMENT.md) and [release evidence](docs/DEV_LOG.md). Arbitrary circuit editing remains outside the current scope.

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

## 数据模型约定

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

The current regression suite contains 315 tests in 19 files. See [architecture](docs/ARCHITECTURE.md), [development log](docs/DEV_LOG.md), and [M0–M8 roadmap](docs/ROADMAP.md). Tool configuration follows the official [Vite](https://vite.dev/guide/), [Vitest](https://vitest.dev/guide/), and [ESLint](https://eslint.org/docs/latest/use/configure/configuration-files) documentation.
