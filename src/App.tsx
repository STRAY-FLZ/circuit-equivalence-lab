import { useMemo, useReducer, useState } from 'react'
import { SiteHeader, CandidatePicker } from './components'
import { applyTransformation, discoverTransformations, verifyTerminalEquivalence } from './transforms'
import type { TransformCandidate, TransformType } from './transforms'
import { buildDrawing, CircuitDiagram } from './visualization'
import { buildLesson, lessonHighlights } from './education'
import { GuidedLesson } from './GuidedLesson'
import { labExamples } from './learning-examples'
import { lessonSessionReducer } from './lesson-session'
import type { PreviewSnapshot } from './lesson-session'
import type { CircuitNetwork } from './domain'
import { SchematicEditor } from './editor'
import packageText from '../package.json?raw'

const appVersion = (JSON.parse(packageText) as { version: string }).version

const transformNames: Record<TransformType, string> = { series: '串联化简', parallel: '并联化简', 'delta-to-star': 'Δ → Y', 'star-to-delta': 'Y → Δ' }
const verdictNames = { equivalent: '端口等效验证通过', different: '端口验证发现差异', inconclusive: '端口验证无法确定' }

function ElementInventory({ network }: { readonly network: CircuitNetwork }) {
  return <details className="inventory"><summary>完整元件清单 · {network.elements.length} 个元件 / {network.points.length} 个连接点</summary>
    <div className="table-scroll"><table><caption>来自电路数据的完整连接与阻值</caption><thead><tr><th>标识</th><th>连接点</th><th>类型 / 阻值</th></tr></thead><tbody>
      {network.elements.map(e => <tr key={e.id}><td>{e.id}</td><td>{e.endpoints.join(' ↔ ')}</td><td>{e.kind === 'wire' ? '理想导线' : `${e.resistance} Ω`}</td></tr>)}
    </tbody></table></div><p>连接点：{network.points.map(p => p.id).join('、') || '无'}；端子：{network.terminals.map(t => `${t.label} (${t.id} → ${t.pointId})`).join('、') || '无'}</p>
  </details>
}

export default function App() {
  const [workspace, setWorkspace] = useState<'v1' | 'editor'>('v1')
  const [editorVisited, setEditorVisited] = useState(false)
  const [exampleId, setExampleId] = useState('series')
  const [candidateId, setCandidateId] = useState<string | null>(null)
  const [session, dispatch] = useReducer(lessonSessionReducer, { kind: 'idle' })
  const [lessonError, setLessonError] = useState<string | null>(null)
  const example = labExamples.find(e => e.id === exampleId) ?? labExamples[0]!
  const discovery = useMemo(() => discoverTransformations(example.network), [example])
  const candidates = discovery.kind === 'candidates' ? discovery.candidates : []
  const selected = candidates.find(c => c.id === candidateId)
  const before = useMemo(() => buildDrawing(example.network, example.layout), [example])
  const preview = session.kind === 'idle' ? null : session.snapshot.result
  const learning = session.kind === 'lesson' ? session : null
  const applied = preview?.kind === 'applied' ? preview : null
  const after = useMemo(() => applied && before.kind === 'ready' ? buildDrawing(applied.network, undefined, {
    previous: before.model.layout,
    createdPointIds: applied.metadata.createdPointIds,
    boundaryPointIds: before.model.topology.nodes.filter(n => applied.metadata.boundaryNodeIds.includes(n.id)).flatMap(n => n.pointIds.slice(0, 1)),
  }) : null, [applied, before])
  const evidence = session.kind === 'idle' ? null : session.snapshot.evidence
  const dimensions = before.kind === 'ready' && after?.kind === 'ready' ? {
    width: Math.max(before.model.width, after.model.width), height: Math.max(before.model.height, after.model.height),
  } : null
  const comparableBefore = before.kind === 'ready' && dimensions ? { ...before, model: { ...before.model, ...dimensions } } : before
  const comparableAfter = after?.kind === 'ready' && dimensions ? { ...after, model: { ...after.model, ...dimensions } } : after
  const affected = selected ? [...selected.boundaryNodeIds, ...(selected.internalNodeId ? [selected.internalNodeId] : [])] : []
  const highlights = learning ? lessonHighlights(learning.lesson, learning.step) : null
  const showAfter = !highlights || highlights.showAfter
  function reset() { setCandidateId(null); dispatch({ type: 'clear' }); setLessonError(null) }
  function createSnapshot(network: CircuitNetwork, candidate: TransformCandidate): PreviewSnapshot {
    const result = applyTransformation({ network, type: candidate.type, elementIds: candidate.elementIds })
    return { result, evidence: result.kind === 'applied' ? verifyTerminalEquivalence(network, result.network) : null }
  }
  function startLesson(network: CircuitNetwork, candidate: TransformCandidate, snapshot: PreviewSnapshot) {
    setLessonError(null)
    if (snapshot.result.kind !== 'applied' || !snapshot.evidence) {
      dispatch({ type: 'preview', snapshot }); setLessonError('变换未成功，暂时无法开始课程。'); return
    }
    const content = buildLesson(network, candidate, snapshot.result, snapshot.evidence)
    if (content.kind === 'ready') dispatch({ type: 'start', snapshot, lesson: content.lesson })
    else { dispatch({ type: 'preview', snapshot }); setLessonError(content.message) }
  }
  function changeCandidate(id: string) {
    setCandidateId(id); setLessonError(null)
    const candidate = candidates.find(c => c.id === id)
    if (learning && candidate) startLesson(example.network, candidate, createSnapshot(example.network, candidate))
    else dispatch({ type: 'clear' })
  }
  function changeExample(id: string) {
    const next = labExamples.find(e => e.id === id)
    if (!next) return
    setExampleId(id); reset()
    if (learning) {
      const discovery = discoverTransformations(next.network)
      const first = discovery.kind === 'candidates' ? discovery.candidates[0] : undefined
      if (first) { setCandidateId(first.id); startLesson(next.network, first, createSnapshot(next.network, first)) }
    }
  }

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">跳转到主要内容</a>
    <SiteHeader />
    <main id="main-content" className="shell">
      <nav className="workspace-tabs" aria-label="实验工作区"><button aria-pressed={workspace === 'v1'} onClick={() => setWorkspace('v1')}>等效变换与课程</button><button aria-pressed={workspace === 'editor'} onClick={() => { setEditorVisited(true); setWorkspace('editor') }}>原理图编辑器</button></nav>
      {editorVisited && <div className="workspace-panel" hidden={workspace !== 'editor'}><SchematicEditor /></div>}
      <div className="workspace-panel" hidden={workspace !== 'v1'}>
      <section className="intro"><p className="eyebrow">工具 / 电路学习</p><h1>电路等效变换实验室</h1><p>从连接关系出发，选择真实网络，逐步理解一次等效变换。</p></section>
      <div className="lab-grid">
        <aside className="controls" aria-label="实验控制">
          <label className="field-label" htmlFor="example">01 / 选择电路</label>
          <select id="example" value={example.id} onChange={e => changeExample(e.target.value)}>{labExamples.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
          <p className="example-description">{example.description}</p>
          <h2>02 / 选择变换</h2><p className="muted">候选由电路变换引擎识别。</p>
          {discovery.kind === 'error' && <p role="alert">候选识别失败，请检查网络数据。</p>}
          <CandidatePicker options={candidates.map(c => ({ id: c.id, title: transformNames[c.type], detail: c.elementIds.join(' + ') }))} selectedId={candidateId} onSelect={changeCandidate} />
          <button className="primary-button" type="button" disabled={!selected || !!learning} onClick={() => { if (selected) dispatch({ type: 'preview', snapshot: createSnapshot(example.network, selected) }) }}>预览等效变换</button>
          <button className="reset-button" type="button" disabled={!selected || !!learning} onClick={() => { if (selected) startLesson(example.network, selected, session.kind === 'preview' ? session.snapshot : createSnapshot(example.network, selected)) }}>开始分步学习</button>
          <button className="reset-button" type="button" onClick={reset} disabled={!candidateId && !preview}>重置预览</button>
          <div className="legend" aria-label="图例"><span className="legend-selected">橙色虚线 · 选中元件</span><span className="legend-replacement">绿色粗线 · 新元件</span><span>实心圆 · 显式连接点</span><span>空心圆 · 外部端子</span><span>线间断 · 无连接跨越</span></div>
        </aside>
        <section className="workspace" aria-label="电路对比">
          {lessonError && <p role="alert">{lessonError}</p>}
          {learning && <GuidedLesson lesson={learning.lesson} step={learning.step} onPrevious={() => dispatch({ type: 'previous' })} onNext={() => dispatch({ type: 'next' })} onRestart={() => dispatch({ type: 'restart' })} onExit={() => dispatch({ type: 'exit' })} />}
          <div className="workspace-heading"><h2>{example.name}</h2><span>{example.network.terminals.length} 个外部端子</span></div>
          <div className="diagram-grid">
            <article className="diagram-card"><header><h3>原始电路</h3><span>{learning?.step === 4 ? '已标记保留边界' : selected ? '已标记待替换元件' : '选择候选以高亮'}</span></header><CircuitDiagram key={`${example.id}-before`} drawing={comparableBefore} title="原始电路图" selectedIds={highlights?.selectedIds ?? selected?.elementIds ?? []} affectedNodeIds={highlights?.originalNodeIds ?? affected} removedNodeIds={highlights?.removedNodeIds ?? []} boundaryNodeIds={highlights?.boundaryNodeIds ?? []} /><ElementInventory network={example.network} /></article>
            <article className="diagram-card"><header><h3>变换后电路</h3><span>{applied ? '来自不可变网络副本' : '等待预览'}</span></header>
              {comparableAfter && applied && showAfter ? <><CircuitDiagram key={`${example.id}-${applied.metadata.candidateId}`} drawing={comparableAfter} title="变换后电路图" replacementIds={highlights?.replacementIds ?? applied.metadata.replacementResistorIds} affectedNodeIds={highlights?.transformedNodeIds ?? [...applied.metadata.affectedNodeIds, ...applied.metadata.createdNodeIds]} createdNodeIds={highlights?.createdNodeIds ?? []} boundaryNodeIds={highlights?.boundaryNodeIds ?? []} /><ElementInventory network={applied.network} /></> : <div className="empty-preview"><span aria-hidden="true">↔</span><h4>{learning ? '先理解，再看结构变换' : '观察结构如何改变'}</h4><p>{learning ? '第 4 步将展示变换后的真实网络。' : '选择左侧候选，再点击“预览等效变换”。'}</p></div>}
            </article>
          </div>
          {!learning && <div className="preview-status" role="status">
            {preview?.kind === 'not-applicable' ? '此候选已不适用，请重新选择。' : preview?.kind === 'error' ? `变换失败：${preview.code === 'numerical-failure' ? '阻值超出可表示范围' : '网络数据无效'}` : applied ? <><strong>{evidence ? verdictNames[evidence.kind] : '预览已生成'}</strong><p>替换：{applied.metadata.originalResistorIds.join('、')} → {applied.metadata.replacementResistorIds.join('、')}</p><p>受影响节点：{applied.metadata.affectedNodeIds.join('、')}；新增：{applied.metadata.createdNodeIds.join('、') || '无'}；移除：{applied.metadata.removedNodeIds.join('、') || '无'}；保留内部节点：{applied.metadata.retainedInternalNodeIds.join('、') || '无'}</p>{evidence && <p>核对 {evidence.pairs.length} 对外部端子。数值验证使用求解器默认容差。</p>}</> : '尚未应用变换。原电路保持不变。'}
          </div>}
        </section>
      </div>
      </div>
    </main><footer className="site-footer"><div className="shell footer-inner"><p>位置不决定电气连接 · 工程计算与呈现分离</p><span aria-label="应用版本">STRAY Electronics Lab · v{appVersion}</span></div></footer>
  </div>
}
