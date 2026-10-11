# 模块架构

## M0 范围

本轮实现工程、领域类型与数据完整性检查、模块契约、基础页面和主题切换。除 `domain` 与通用 UI 外，各业务区域只有类型导出，没有算法、假实现或返回示例计算结果的占位函数。

## 模块职责与依赖

下表表示允许的直接依赖；箭头始终从使用者指向提供者。并非每个预留依赖当前都有 import。

| 模块 | 职责 | 允许依赖 |
| --- | --- | --- |
| domain | 稳定 ID、连接点、导线、正电阻、端子和网络完整性 | 无其他项目模块，无 React |
| topology | 基于连接关系形成电气节点与拓扑结果 | domain |
| solver | 电阻网络数值计算与明确的有限/短路/开路结果 | domain、topology |
| transforms | 等效变换的适用性与新网络结果 | domain、topology、solver |
| visualization | 几何布局与未来 SVG 视图 | domain、topology，可使用 React |
| education | 教学公式、文字解释、推导步骤 | domain、topology、solver、transforms，无 React |
| components | 不依赖电路业务的通用 React UI | React，无其他项目模块 |
| App | 页面与未来模块组合 | 可组合上述模块 |

各模块通过 `index.ts` 导出公共接口。`eslint.config.js` 对生产源码执行模块方向约束，并禁止计算和教学模块依赖 React。测试文件允许组合模块。未来需要跨模块调用时优先通过公共接口，在 App 层组合，避免反向依赖和循环依赖。

## 核心类型

| 类型 | 含义与边界 |
| --- | --- |
| ConnectionPoint | 电路连接点，只有稳定 ID，不是已识别的电气节点 |
| Endpoints | 恰好两个连接点 ID，明确表示元件两端 |
| IdealWire | `kind: 'wire'`，明确表示理想导线，不存储电阻值 |
| ResistanceOhms | 带品牌的 number，单位 Ω，构造时必须为有限正数 |
| Resistor | `kind: 'resistor'`，端点与 ResistanceOhms |
| ExternalTerminal | 独立稳定 ID、展示 label、关联 pointId，可表达 A/B/C 等多端子 |
| CircuitNetwork | 网络 ID 与 readonly points/elements/terminals，不携带布局 |
| CircuitLayout | 按连接点 ID 保存的可选坐标，不决定电气连接 |
| ElectricalNode | M1 将识别出的理想导线连通组，含节点 ID 与 pointIds |

连接点、元件、端子分别拥有独立的 ID 命名空间，在各自集合内必须唯一。ID 用字符串保持易于序列化，不依赖数组下标、端子显示名称或几何位置；调用方负责其跨编辑过程的稳定性。M1 电气节点 ID 的稳定生成规则留待该模块确定。

同坐标不表示连接，线条交叉不表示连接，坐标缺失不表示断路。移动图形无需改变 CircuitNetwork。多个端子可以引用同一连接点；空网络、孤立点和不连通子网合法。重边和自环不在 M0 数据校验层禁止，后续拓扑或算法模块应明确处理。

## 构造与校验边界

`resistanceOhms(value)` 使用 `Number.isFinite(value) && value > 0` 校验，再创建带品牌的数值。0Ω、负数、NaN、Infinity、-Infinity 均被拒绝。不设人为最小/最大阻值；数值尺度、病态矩阵和容差属于后续 solver 的责任。

`createCircuitNetwork(input)` 校验：

1. 网络及各类 ID 非空、无首尾空白，同类 ID 不重复。
2. 元件恰好有两个端点，且端点和端子均引用已存在连接点。
3. 元件种类仅为理想导线或线性正电阻，所有电阻重新验证。
4. 端子展示名称非空。

成功后复制并冻结网络、数组、记录和端点元组，防止调用方修改输入导致已有网络失效；失败抛出 TypeError 或 RangeError。该函数不读取或解析 unknown/JSON，不承担完整反序列化 schema 验证。TypeScript 品牌与 readonly 可被强制断言绕过，调用方应通过工厂进入业务边界，不能把类型声明当作外部数据验证。

短路用导线表达，断路通过未连接的网络关系表达。未来求解结果采用 `finite | short-circuit | open-circuit | error` 判别联合，使短路与开路不进入正电阻公式。

## 后续模块契约

- `TopologyAnalyzer(network): TopologyResult`：M1 的入口，返回完整的电气节点分组。
- `ResistanceSolver(query): EquivalentResistanceResult`：M2 的入口，查询端子使用稳定 TerminalId。
- `CircuitTransform(request): TransformResult`：后续变换模块根据元件 ID 选区，返回新网络或不适用原因。
- `CircuitViewModel`：网络与布局的组合输入；无绘图实现。
- `LessonContent` / `DerivationStep`：纯教学数据；无公式执行器或数学渲染依赖。

当前接口保持最小形态。节点连通分量、详细错误代码、数值容差、变换推导元数据将在相应模块结合有效测试演进，不在 M0 假定算法细节。

## 工程检查与 UI

TypeScript 开启 strict、noUncheckedIndexedAccess、exactOptionalPropertyTypes 等检查，覆盖源码、测试和 Vite/Vitest 配置。ESLint 使用类型感知规则，并把警告视为失败。Vitest 明确 import 测试 API，无全局类型捷径；领域和 HTTP 服务测试在 Node 环境执行，React 页面测试在 jsdom 执行。

主题初次加载优先读取已保存的有效设置，否则读取系统偏好；按钮切换主题并尝试保存。存储不可用时仍可切换。当前没有系统偏好变更监听，也没有服务端渲染。页面采用原生 CSS 媒体查询，无外部字体与 UI 库，无尚未实现功能的按钮。
