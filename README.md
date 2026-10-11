# 电路等效变换实验室

Circuit Equivalence Lab 是面向大学本科《电路》课程的交互式学习项目。后续将逐步支持拓扑识别、节点电压法、串并联与 Y–Δ 等效变换、惠斯通电桥，以及 SVG 电路图和教学推导。

**当前已完成 M0 基础架构、M1 拓扑分析与 M2 电阻网络求解。** 独立 TypeScript API 提供拓扑识别、节点电压法、两端等效电阻及数值诊断。页面仍为 M0 介绍与主题切换界面，尚未接入这些引擎；等效变换、绘图和拖拽编辑尚未实现。

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
  transforms/      等效变换输入与结果契约
  visualization/  独立坐标和未来视图输入契约
  education/      教学内容与推导步骤契约
  components/     通用 React 组件（主题切换）
  App.tsx         M0 项目介绍页面
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

完整测试共 154 个，包括既有 90 个回归测试和 64 个 M2 测试。详见 [模块架构](docs/ARCHITECTURE.md)、[开发记录](docs/DEV_LOG.md) 与 [M0～M6 路线图](docs/ROADMAP.md)。工具配置参考 [Vite](https://vite.dev/guide/)、[Vitest](https://vitest.dev/guide/) 和 [ESLint](https://eslint.org/docs/latest/use/configure/configuration-files) 官方文档。
