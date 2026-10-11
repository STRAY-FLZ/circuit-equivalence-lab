import { formatNumber } from './education'
import type { LessonContent, LessonStepIndex } from './education'
import { MathExpression } from './components'
import type { CircuitNetwork } from './domain'
import type { EquivalenceResult, ResistanceSummary } from './transforms'

function resistanceText(result: ResistanceSummary): string {
  switch (result.kind) {
    case 'finite': return `${formatNumber(result.resistance)} Ω`
    case 'short-circuit': return '短路（0 Ω）'
    case 'open-circuit': return '开路'
    case 'error': return '无法求解'
  }
}
export function EquivalenceSummary({ result, source }: { readonly result: EquivalenceResult; readonly source: CircuitNetwork }) {
  const text = { equivalent: '已验证：外部端口行为在数值容差内一致', inconclusive: '无法确定：数值验证未能建立等效性', different: '验证失败：已发现外部端口差异' }
  const terminalLabel = (id: string) => source.terminals.find(t => t.id === id)?.label ?? id
  return <div className={`lesson-verification ${result.kind}`} data-verdict={result.kind}>
    <p role="status"><strong>{text[result.kind]}</strong></p>
    <p>核对 {result.pairs.length} 对保留的外部端子。有限阻值比较使用 默认数值容差；显示舍入不参与验证。</p>
    {result.pairs.length > 0 && <div className="table-scroll"><table><caption>端口等效电阻对照</caption><thead><tr><th>端子对</th><th>原网络</th><th>新网络</th><th>判断</th></tr></thead><tbody>{result.pairs.map(pair => <tr key={JSON.stringify(pair.terminals)}><td>{pair.terminals.map(terminalLabel).join(' ↔ ')}</td><td>{resistanceText(pair.before)}</td><td>{resistanceText(pair.after)}</td><td>{{ equivalent: '一致', inconclusive: '无法确定', different: '存在差异' }[pair.verdict]}</td></tr>)}</tbody></table></div>}
    {result.kind === 'inconclusive' && <p>可能没有可核对的端口对，或数值求解未成功；这不能作为等效已验证的证据。</p>}
  </div>
}
interface Props { readonly lesson: LessonContent; readonly step: LessonStepIndex; readonly onPrevious: () => void; readonly onNext: () => void; readonly onRestart: () => void; readonly onExit: () => void }
export function GuidedLesson({ lesson, step, onPrevious, onNext, onRestart, onExit }: Props) {
  const content = lesson.steps[step]
  return <section className="lesson-panel" aria-label="分步学习">
    <div className="lesson-heading"><div><p className="eyebrow">分步学习 / {lesson.title}</p><h2>第 {step + 1} / 5 步：{content.title}</h2></div><button className="lesson-button" type="button" onClick={onExit}>退出学习模式</button></div>
    <ol className="lesson-progress" aria-label="学习步骤">{lesson.steps.map((item, i) => <li key={item.id} aria-current={i === step ? 'step' : undefined} className={i === step ? 'current' : ''}><span>{i + 1}</span>{item.title}</li>)}</ol>
    <div className="lesson-explanation" aria-live="polite"><p>{content.explanation}</p>{content.conditions.length > 0 && <><h3>适用条件</h3><ul>{content.conditions.map(c => <li key={c}>{c}</li>)}</ul></>}
      {content.formulas.length > 0 && <div className="lesson-equations" aria-label="变换公式">{content.formulas.map(expression => <div className="equation-row" key={expression}><MathExpression expression={expression} /></div>)}</div>}
      {content.substitutions.length > 0 && <div className="lesson-equations" aria-label="数值代入">{content.substitutions.map(expression => <div className="equation-row" key={expression}><MathExpression expression={expression} /></div>)}</div>}
      {step <= 2 && <details className="lesson-mappings" open={step === 2}><summary>公式变量与真实元件、节点的对应</summary><div className="table-scroll"><table><caption>变量对应（输入和结果均来自元件记录）</caption><thead><tr><th>变量</th><th>元件标识</th><th>阻值</th></tr></thead><tbody>{lesson.variables.map(v => <tr key={v.elementId}><td><MathExpression expression={v.variable} /></td><td>{v.elementId}</td><td>{formatNumber(v.resistance)} Ω</td></tr>)}</tbody></table></div><ul>{lesson.nodeMappings.map(n => <li key={n.nodeId}>公式顶点 {n.alias} → {n.nodeId}；连接点 {n.pointIds.join('、')}；端子 {n.terminalLabels.join('、') || '无'}</li>)}</ul></details>}
      {step === 3 && <div className="lesson-changes"><p>新增内部节点：{lesson.metadata.createdNodeIds.join('、') || '无'}；移除内部节点：{lesson.metadata.removedNodeIds.join('、') || '无'}</p><p>保留边界：{lesson.metadata.boundaryNodeIds.join('、')}；保留未选中元件：{lesson.preservedElementIds.join('、') || '无'}</p><p>保留内部残留节点：{lesson.metadata.retainedInternalNodeIds.join('、') || '无'}</p></div>}
      {step === 4 && <EquivalenceSummary result={lesson.verification} source={lesson.source} />}
      {content.conclusion && <p className="lesson-conclusion">{content.conclusion}</p>}
      <div className="lesson-mistake"><h3>常见误区</h3><p>{content.commonMistake}</p></div>
    </div>
    <nav className="lesson-navigation" aria-label="学习步骤导航"><button className="lesson-button" type="button" onClick={onPrevious} disabled={step === 0}>上一步</button><button className="lesson-button" type="button" onClick={onRestart}>重新开始课程</button><button className="lesson-button lesson-next" type="button" onClick={onNext} disabled={step === 4}>下一步</button></nav>
  </section>
}

