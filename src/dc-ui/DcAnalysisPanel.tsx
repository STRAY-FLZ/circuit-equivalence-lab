import { useState } from 'react'
import { deriveElectricalNets } from '../engineering'
import type { EngineeringProject } from '../engineering'
import { createDcInput, dcEngine } from '../dc'
import type { DcSolution } from '../dc'
import type { AnalysisResult } from '../analysis/types'
import './dc.css'

export interface DcHighlight { readonly revision: string; readonly sheetId: string; readonly anchorIds: readonly string[]; readonly componentId?: string; readonly text: string }
const number = (n: number): string => Number(n.toPrecision(8)).toString()
export function DcAnalysisPanel({ project, sheetId, initialReference = '', onHighlight }: { readonly project: EngineeringProject; readonly sheetId: string; readonly initialReference?: string; readonly onHighlight: (value: DcHighlight | null) => void }) {
  const [reference, setReference] = useState(initialReference), [running, setRunning] = useState(false), [progress, setProgress] = useState(0)
  const [record, setRecord] = useState<{ result: AnalysisResult<DcSolution>; reference: string } | null>(null)
  const [error, setError] = useState('')
  const sheet = project.sheets.find(s => s.id === sheetId)!, topology = deriveElectricalNets(project)
  const nets = topology.nets.filter(n => n.anchorIds.some(id => sheet.anchors.some(a => a.id === id)))
  const stale = !!record && (record.result.provenance.inputRevision !== project.revision || record.result.provenance.projectId !== project.id || record.reference !== reference)
  const outcome = !stale ? record?.result.outcome : undefined, solution = outcome?.kind === 'success' ? outcome.value : undefined
  function describe(anchorIds: readonly string[]): string {
    const aliases = [...sheet.ports.filter(p => anchorIds.includes(p.anchorId)).map(p => p.label), ...sheet.components.flatMap(c => c.pins.filter(p => anchorIds.includes(p.anchorId)).map(p => `${c.reference}.${p.definitionPinKey}`))]
    return aliases.join(' · ')
  }
  async function run() {
    setRunning(true); setProgress(0); setError(''); onHighlight(null)
    try {
      const input = await createDcInput(project, sheetId, reference || undefined)
      const result = await dcEngine.run(input, { signal: new AbortController().signal, readAsset: () => Promise.resolve(new Uint8Array()), onProgress: completed => setProgress(completed) })
      setRecord({ result, reference })
    } catch (failure) { setError(failure instanceof Error ? failure.message : '分析输入无效。') }
    finally { setRunning(false) }
  }
  function exportReport() {
    if (!record || stale || !solution) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(record.result, null, 2)], { type: 'application/json;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'stray-dc-report.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const highlight = (anchorIds: readonly string[], text: string, componentId?: string) => onHighlight({ revision: project.revision, sheetId, anchorIds, text, ...(componentId ? { componentId } : {}) })
  return <section className="dc-panel" aria-label="直流分析面板">
    <header><p className="eyebrow">求解 / 核对 / 理解</p><h2>直流分析</h2><p>改进节点分析（MNA）· 电阻、独立源与四类线性受控源。电容、电感、非线性器件暂不支持。</p></header>
    <div className="dc-controls"><label>参考节点<select aria-label="直流参考节点" value={reference} onChange={e => { setReference(e.target.value); onHighlight(null) }}><option value="">使用模拟参考标记；无标记时使用唯一 GND 网</option>{nets.map(n => <option key={n.key} value={n.anchorIds.find(id => sheet.ports.some(p => p.anchorId === id)) ?? n.anchorIds[0]}>N{topology.nets.findIndex(t => t.key === n.key) + 1} · {describe(n.anchorIds)}</option>)}</select></label><button className="primary-button" disabled={running} onClick={() => { void run() }}>{running ? `正在分析 ${progress}/3` : '运行直流分析'}</button></div>
    <p className="muted">选择参考仅定义零电位，不连接网络。引脚 1 为输出正端 p，引脚 2 为 n；电流正方向 p → n，功率 P = (Vp − Vn)I，正值吸收、负值发出。压控源的引脚 3/4 为 c+/c−，理想控制输入不取电流。</p>
    <p role="status" aria-label="直流分析状态">{stale ? '结果已过期，请重新运行。工程或参考节点已经改变。' : solution ? '分析完成：已通过方程残差、KCL 与功率平衡检查。' : running ? '正在求解当前修订。' : '请显式运行分析；参数修改后不会自动重算。'}</p>
    {error && <p role="alert">{error}</p>}
    {outcome && 'diagnostics' in outcome && <div role="alert">{outcome.diagnostics.map((d, i) => <p key={i}><strong>{d.code}</strong> · {d.message}{d.entityIds.length > 0 && <small className="dc-ids">关联对象：{d.entityIds.join(', ')}</small>}</p>)}</div>}
    {solution && <div className="dc-results" data-input-revision={record!.result.provenance.inputRevision}>
      <h3>节点电压</h3><div className="dc-scroll" tabIndex={0} role="region" aria-label="节点电压表"><table><thead><tr><th>节点 / 定位</th><th>关联端口与引脚</th><th>电压 / V</th><th>KCL 残差 / A</th></tr></thead><tbody>{solution.nodes.map(n => <tr key={n.key}><td><button onClick={() => highlight(n.anchorIds, `${n.name}: ${number(n.volts)} V`)}>{n.name}{n.anchorIds.includes(solution.referenceAnchorId) ? '（参考）' : ''}</button></td><td>{describe(n.anchorIds)}</td><td>{number(n.volts)}</td><td>{number(n.kclAmps)}</td></tr>)}</tbody></table></div>
      <h3>支路电流、电压与功率</h3><div className="dc-scroll" tabIndex={0} role="region" aria-label="支路结果表"><table><thead><tr><th>支路 / 定位</th><th>Vp − Vn / V</th><th>I p → n / A</th><th>功率 / W</th><th>状态</th></tr></thead><tbody>{solution.branches.map(b => <tr key={b.id}><td><button onClick={() => highlight([], `${b.reference}: ${number(b.volts)} V · ${number(b.amps)} A · ${number(b.watts)} W`, b.id)}>{b.reference}</button></td><td>{number(b.volts)}</td><td>{number(b.amps)}</td><td>{number(b.watts)}</td><td>{b.watts > 0 ? '吸收' : b.watts < 0 ? '发出' : '零功率'}</td></tr>)}</tbody></table></div>
      <p>总吸收 {number(solution.checks.absorbedWatts)} W · 总发出 {number(solution.checks.deliveredWatts)} W · 功率不平衡 {number(solution.checks.powerImbalanceWatts)} W</p>
      <p>最大 KCL 残差 {number(solution.checks.maxKclAmps)} A · 归一化后向误差 {number(solution.checks.backwardError)} · 缩放主元比 {number(solution.checks.pivotRatio)}（不是条件数）</p>
      <details><summary>实际 MNA 方程与矩阵</summary><p>对每个非参考节点列 KCL；电阻使用欧姆定律，电压定义支路增加电流未知量和电压约束。系统 A x = b 同时求解这些未知量。以下是本次实际盖章矩阵，不是示意方程；未另行实现网孔法。</p>
        <ol>{solution.equations.unknowns.map((u, i) => <li key={i}>x[{i}] = {u.name} / {u.unit} = {number(solution.equations.solution[i]!)}</li>)}</ol>
        <div className="dc-scroll" tabIndex={0} role="region" aria-label="MNA 矩阵"><pre>{solution.equations.rows.map((row, i) => `${row.name} [${row.unit}]\n${solution.equations.matrix[i]!.map((a, j) => `${number(a)}*x[${j}]`).join(' + ')} = ${number(solution.equations.rhs[i]!)}\nA[${i}] = [ ${solution.equations.matrix[i]!.map(number).join(', ')} ]; b[${i}] = ${number(solution.equations.rhs[i]!)}\n`).join('\n')}</pre></div><p className="muted">显示取 8 位有效数字；导出报告保留完整数值与稳定对象映射。求解采用行列缩放和完全主元高斯消元。</p></details>
      <button onClick={exportReport}>导出直流分析报告 JSON</button><button onClick={() => onHighlight(null)}>清除分析高亮</button>
      <details><summary>本次分析来源</summary><p className="dc-ids">工程 {record!.result.provenance.projectId} · 修订 {record!.result.provenance.inputRevision}<br />引擎 {record!.result.provenance.engine.id} / {record!.result.provenance.engine.version}<br />SHA-256 {record!.result.provenance.inputDigest}</p></details>
    </div>}
    <p className="muted">保存工程会保留电路、参数及控制支路 ID。分析结果属于当前会话；重新打开工程后请重新选择参考并运行，可另行导出分析报告。</p>
  </section>
}
