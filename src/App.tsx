import { ThemeToggle } from './components'

const modules = [
  { name: 'domain', title: '电路数据模型', description: '稳定标识、显式连接与有限正电阻。', status: '基础模型已建立' },
  { name: 'topology', title: '网络拓扑', description: '识别电气节点与网络连通关系。', status: '接口已预留' },
  { name: 'solver', title: '数值求解', description: '为电阻网络计算提供独立契约。', status: '接口已预留' },
  { name: 'transforms', title: '等效变换', description: '逐步支持串并联与 Y–Δ 等效。', status: '接口已预留' },
  { name: 'visualization', title: '电路可视化', description: '将几何布局与电气连接分开表达。', status: '接口已预留' },
  { name: 'education', title: '教学与推导', description: '组织公式、解释与分步学习内容。', status: '接口已预留' },
]

export default function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">跳转到主要内容</a>
      <header className="site-header">
        <div className="wordmark"><span className="brand-mark" aria-hidden="true">CE</span><span>CIRCUIT EQUIVALENCE LAB</span></div>
        <ThemeToggle />
      </header>

      <main id="main-content">
        <section className="hero" aria-labelledby="project-title">
          <div className="hero-copy">
            <p className="eyebrow">本科《电路》课程 · 交互式学习项目</p>
            <h1 id="project-title">电路等效变换<span>实验室</span></h1>
            <p className="hero-description">从连接关系出发，理解电路为什么等效。逐步探索网络拓扑、数值求解与等效变换，把计算过程与学习过程连接起来。</p>
            <p className="development-status"><span className="status-dot" aria-hidden="true" />当前阶段：M0 项目基础架构</p>
          </div>
          <aside className="stage-card" aria-label="开发状态">
            <span className="stage-label">DEVELOPMENT STAGE</span>
            <strong className="stage-number">M0<span>/ M6</span></strong>
            <h2>先建立可靠的基础</h2>
            <p>工程、数据模型与模块边界已建立。拓扑识别、求解算法和交互电路图将在后续模块逐步实现。</p>
            <span className="stage-footnote">本阶段尚不提供电路计算</span>
          </aside>
        </section>

        <section className="module-section" aria-labelledby="modules-title">
          <div className="section-heading"><div><p className="eyebrow">PROJECT STRUCTURE</p><h2 id="modules-title">清晰的边界，逐步的探索</h2></div><p>每轮完成一个模块，验证后再向前。</p></div>
          <ul className="module-grid">
            {modules.map((module) => (
              <li className="module-card" key={module.name}>
                <code>{module.name}</code><h3>{module.title}</h3><p>{module.description}</p><span className="module-status">{module.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="site-footer"><p>理想导线与线性正电阻 · 几何布局独立于电气连接</p><span>学习，从基础开始。</span></footer>
    </div>
  )
}
