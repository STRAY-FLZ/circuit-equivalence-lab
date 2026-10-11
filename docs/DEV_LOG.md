# 开发记录

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
