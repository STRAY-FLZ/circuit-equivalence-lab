import { useMemo, useState } from 'react'
import type { EngineeringProject, Id, SchematicSheet } from '../engineering'
import { candidateHighlight, candidateLabel, discoverForProject, previewTransformation } from '../integration'
import type { IntegrationDiscovery, TransformationHighlight, TransformationPreview } from '../integration'
import { buildDrawing, CircuitDiagram } from '../visualization'
import { lessonHighlights } from '../education'
import type { LessonStepIndex } from '../education'
import { EquivalenceSummary, GuidedLesson } from '../GuidedLesson'

const names = { series: '串联化简', parallel: '并联化简', 'delta-to-star': 'Δ → Y', 'star-to-delta': 'Y → Δ' }
const reasons: Readonly<Record<string, string>> = {
  'unsupported-component-model': '当前图纸包含不受 V1 支持的元件模型；不会提取或伪装为纯电阻子图。',
  'cross-sheet-connectivity': '网络连接到了其他图纸；当前仅支持电气隔离的完整单张图纸。',
  'unsupported-analysis-observations': '已有分析的观测契约尚不支持，需保留其观测对象。',
}
function anchorDisplayName(sheet: SchematicSheet, id: Id): string {
  const owner = sheet.components.find(c => c.pins.some(p => p.anchorId === id))
  return owner ? `${owner.reference}.${owner.pins.find(p => p.anchorId === id)!.definitionPinKey}` : sheet.ports.find(p => p.anchorId === id)?.label ?? `连接点 ${sheet.anchors.findIndex(a => a.id === id) + 1}`
}
export function TransformationPanel({ project, sheetId, selectedAnchorId, busy, onCommit, onHighlight }: {
  readonly project: EngineeringProject; readonly sheetId: Id; readonly selectedAnchorId?: Id; readonly busy: boolean
  readonly onCommit: (preview: TransformationPreview) => boolean
  readonly onHighlight: (highlight: TransformationHighlight | null) => void
}) {
  const sheet = project.sheets.find(s => s.id === sheetId)!
  const [observedIds, setObservedIds] = useState<readonly Id[]>([])
  const observed = observedIds.filter(id => sheet.anchors.some(a => a.id === id))
  const [discovery, setDiscovery] = useState<{ revision: string; result: IntegrationDiscovery } | null>(null)
  const [candidateId, setCandidateId] = useState<string | null>(null)
  const [preview, setPreview] = useState<TransformationPreview | null>(null)
  const [step, setStep] = useState<LessonStepIndex | null>(null)
  const [error, setError] = useState('')
  const result = discovery?.revision === project.revision ? discovery.result : null
  const session = result?.kind === 'ready' ? result.session : null
  const selected = session?.candidates.find(c => c.id === candidateId)
  const currentPreview = preview && session === preview.session ? preview : null
  const applied = currentPreview?.result.kind === 'applied' ? currentPreview.result : null
  const lesson = currentPreview?.lesson?.kind === 'ready' ? currentPreview.lesson.lesson : null
  const studying = step !== null && lesson !== null
  const highlights = studying ? lessonHighlights(lesson, step) : null
  const { elementLabels, pointLabels } = useMemo(() => {
    const elementLabels = Object.create(null) as Record<string, string>, pointLabels = Object.create(null) as Record<string, string>
    if (session) {
      const sourceSheet = session.project.sheets.find(s => s.id === session.projection.sheetId)!
      session.projection.identities.elements.forEach((pair, i) => { elementLabels[pair.v1Id] = sourceSheet.components.find(c => c.id === pair.projectId)?.reference ?? `W${i + 1}` })
      session.projection.identities.points.forEach(pair => { pointLabels[pair.v1Id] = anchorDisplayName(sourceSheet, pair.projectId) })
      session.projection.identities.syntheticWireIds.forEach((id, i) => { elementLabels[id] = `标签连接 ${i + 1}` })
      applied?.metadata.replacements.forEach((r, i) => { elementLabels[r.id] = `新电阻 ${i + 1}` })
      applied?.metadata.createdPointIds.forEach((id, i) => { pointLabels[id] = `新结点 ${i + 1}` })
    }
    return { elementLabels, pointLabels }
  }, [session, applied])
  const before = useMemo(() => session ? buildDrawing(session.projection.network, undefined, undefined, elementLabels) : null, [session, elementLabels])
  const after = useMemo(() => applied ? buildDrawing(applied.network, undefined, undefined, elementLabels) : null, [applied, elementLabels])
  const anchorName = (id: Id) => anchorDisplayName(sheet, id)
  function clear() { setDiscovery(null); setPreview(null); setCandidateId(null); setStep(null); setError(''); onHighlight(null) }
  function discover() {
    clear()
    setDiscovery({ revision: project.revision, result: discoverForProject(project, sheetId, observed) })
  }
  function select(id: string) {
    setCandidateId(id); setPreview(null); setStep(null); setError('')
    const candidate = session?.candidates.find(c => c.id === id)
    onHighlight(session && candidate ? candidateHighlight(session, candidate) : null)
  }
  function showPreview() {
    if (!session || !selected) return
    try { setPreview(previewTransformation(session, selected.id)); setStep(null); setError('') }
    catch (failure) { setError(failure instanceof Error ? failure.message : '预览失败，工程保持不变。') }
  }
  return <section className="editor-transformations" aria-label="工程等效变换与课程">
    <div className="editor-transformation-heading"><div><h2>03 / 等效变换与课程</h2><p>编辑电路 → 设置观测边界 → 识别候选 → 预览与验证 → 应用或学习</p></div><button disabled={busy} onClick={discover}>识别可用变换</button></div>
    <div className="editor-observations"><strong>观测边界</strong><p>使用「外部端口」工具为边界标注 A、B 等名称；所有已有端口均参加验证并受到保护。求解参考只声明参考，不连接网络。</p>
      <p>已有端口：{sheet.ports.map(p => `${p.label}（${anchorName(p.anchorId)}）`).join('、') || '无'}；参考、测量及受支持分析中的观测也会自动保护。</p>
      <button disabled={busy || !selectedAnchorId || observed.includes(selectedAnchorId)} onClick={() => { if (selectedAnchorId) { clear(); setObservedIds([...observed, selectedAnchorId]) } }}>将选中连接点加入临时观测</button>
      {observed.length > 0 && <ul>{observed.map(id => <li key={id}>{anchorName(id)} <button disabled={busy} aria-label={`移除观测 ${anchorName(id)}`} onClick={() => { clear(); setObservedIds(observed.filter(a => a !== id)) }}>移除观测</button></li>)}</ul>}
      <p className="muted">临时观测不新增工程端口；它随本次预览与变换记录保留。少于两个观测端子时可预览，但数值验证无法确定，不会提交为已验证编辑。</p>
    </div>
    {discovery && !result && <p role="status">工程已更新，旧预览已失效；请重新识别变换。</p>}
    {result?.kind === 'unsupported' && <div role="status"><p>当前配置不支持等效变换。</p><ul>{result.reasons.map((r, i) => <li key={i}>{reasons[r.code] ?? r.code} {r.entityIds.map(id => sheet.components.find(c => c.id === id)?.reference ?? id).join('、')}</li>)}</ul></div>}
    {result?.kind === 'invalid' && <p role="alert">投影失败：{result.message}</p>}
    {session && <>
      <p className="editor-applicability">{Object.entries(names).map(([type, name]) => `${name} ${session.candidates.filter(c => c.type === type).length} 项`).join(' · ')}</p>
      {session.candidates.length === 0 ? <p role="status">未找到适用候选。串联内部节点需仅有两条有效支路且不被观测；并联需共享两端；Δ/Y 需满足现有三支路与边界条件。短接支路和受保护中心不会被化简。</p> : <div className="editor-transform-candidates" aria-label="工程变换候选">{session.candidates.map(c => <button key={c.id} disabled={busy || studying} aria-pressed={selected?.id === c.id} onClick={() => select(c.id)}>{names[c.type]} · {candidateLabel(session, c)}</button>)}</div>}
      <div className="editor-transform-actions"><button disabled={busy || !selected || studying} onClick={showPreview}>预览所选变换</button><button disabled={busy || !currentPreview || !applied || currentPreview.evidence?.kind !== 'equivalent' || !!currentPreview.writebackIssue || studying} onClick={() => { if (currentPreview && onCommit(currentPreview)) clear() }}>应用已验证变换</button><button disabled={busy || !lesson || studying} onClick={() => setStep(0)}>学习此电路的变换</button></div>
    </>}
    {error && <p role="alert">{error}</p>}
    {currentPreview && <div className="editor-transform-preview" aria-label="工程变换预览">
      <p>预览基于当前工程快照，尚未改变工程内容或撤销历史。</p>
      {currentPreview.result.kind !== 'applied' ? <p role="status">{currentPreview.result.kind === 'error' ? '变换计算失败' : '变换不可应用'}：{currentPreview.result.kind === 'error' ? currentPreview.result.message : currentPreview.result.reason}</p> : <>
        {currentPreview.evidence && <EquivalenceSummary result={currentPreview.evidence} source={currentPreview.session.projection.network} />}
        {currentPreview.writebackIssue && <p role="status">数值证据与对象引用检查分开显示：{currentPreview.writebackIssue}</p>}
        <div className="editor-comparison">
          <div><h3>变换前</h3>{before && <CircuitDiagram drawing={before} title="工程原始电路图" elementLabels={elementLabels} pointLabels={pointLabels} selectedIds={highlights?.selectedIds ?? currentPreview.candidate.elementIds} affectedNodeIds={highlights?.originalNodeIds ?? currentPreview.candidate.boundaryNodeIds} boundaryNodeIds={highlights?.boundaryNodeIds ?? currentPreview.candidate.boundaryNodeIds} removedNodeIds={highlights?.removedNodeIds ?? currentPreview.result.metadata.removedNodeIds} />}</div>
          <div><h3>变换后{highlights && !highlights.showAfter ? '（课程尚未展示）' : ''}</h3>{(!highlights || highlights.showAfter) && after && <CircuitDiagram drawing={after} title="工程变换后电路图" elementLabels={elementLabels} pointLabels={pointLabels} replacementIds={highlights?.replacementIds ?? currentPreview.result.metadata.replacementResistorIds} affectedNodeIds={highlights?.transformedNodeIds ?? currentPreview.result.metadata.affectedNodeIds} createdNodeIds={highlights?.createdNodeIds ?? currentPreview.result.metadata.createdNodeIds} boundaryNodeIds={highlights?.boundaryNodeIds ?? currentPreview.result.metadata.boundaryNodeIds} />}</div>
        </div>
        <details><summary>完整变换结果与身份映射</summary><p>替换元件：{currentPreview.result.metadata.originalResistorIds.map(id => candidateLabel(currentPreview.session, { ...currentPreview.candidate, elementIds: [id] })).join('、')}；保留 {currentPreview.session.projection.network.terminals.length} 个观测端子。图示可能受 V1 预览大小限制，完整数据如下。</p><pre>{JSON.stringify({ source: currentPreview.session.projection.network, result: currentPreview.result, mappings: currentPreview.session.projection.identities }, null, 2)}</pre></details>
      </>}
      {currentPreview.lesson?.kind === 'unavailable' && <p>{currentPreview.lesson.message}</p>}
    </div>}
    {studying && <GuidedLesson lesson={lesson} step={step} onPrevious={() => setStep(Math.max(0, step - 1) as LessonStepIndex)} onNext={() => setStep(Math.min(4, step + 1) as LessonStepIndex)} onRestart={() => setStep(0)} onExit={() => setStep(null)} />}
  </section>
}
