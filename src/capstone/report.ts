import { escapeHtml } from '../competition/report'
import { serializeProject } from '../project-format'
import type { ProjectDocumentV1 } from '../project-format'
import type { StudyCurve } from './types'
import { capstoneExperiments } from './experiments'
import { capstoneAssumptions } from './experiments'
import { deriveElectricalNets } from '../engineering'
import { readStudy } from './persistence'

/** A data-derived SVG; null samples split paths and phase wraps split segments. */
export function curveSvg(curve: StudyCurve): string {
  const values = curve.y.filter((v): v is number => v !== null), log = curve.xUnit === 'Hz'
  if (!values.length || !curve.x.length) return '<p>没有有效曲线样本。</p>'
  const xs = curve.x.map(x => log ? Math.log10(x) : x), a = Math.min(...xs), b = Math.max(...xs), low = Math.min(...values), high = Math.max(...values)
  let connected = false, previous: number | null = null
  const d = curve.y.map((v, i) => { if (v === null) { connected = false; previous = null; return '' } const move = !connected || curve.yUnit === '°' && previous !== null && Math.abs(v - previous) > 180; connected = true; previous = v; return `${move ? 'M' : 'L'}${40 + (xs[i]! - a) / (b - a || 1) * 500},${160 - (v - low) / (high - low || 1) * 130}` }).join(' ')
  return `<svg viewBox="0 0 580 200" role="img" aria-label="${escapeHtml(curve.label)}"><path d="M40 20V160H540" fill="none" stroke="currentColor"/><path d="${d}" fill="none" stroke="currentColor"/><text x="40" y="190">${escapeHtml(curve.x[0])}…${escapeHtml(curve.x.at(-1))} ${curve.xUnit}${log ? '（对数）' : ''}</text><text x="45" y="16">${escapeHtml(low.toPrecision(5))}…${escapeHtml(high.toPrecision(5))} ${curve.yUnit}</text></svg>`
}
export async function studyReport(document: ProjectDocumentV1): Promise<string> {
  const study = await readStudy(document)
  if (!study) throw Error('请先保存实验记录。')
  const definition = capstoneExperiments.find(e => e.kind === study.kind)!, extension = document.project.extensions['org.stray.capstone'] as { readonly conclusion: string }
  const serialized = (await serializeProject(document)).replaceAll('<', '\\u003c')
  const nets = deriveElectricalNets(study.source), sourceRows = study.source.sheets[0]!.components.map(c => { const d = study.source.definitions.find(d => d.id === c.definitionId)!; return `<tr><td>${escapeHtml(c.reference)}</td><td>${escapeHtml(d.resource.id)} / ${escapeHtml(d.resource.version)}</td><td>${escapeHtml(JSON.stringify(c.parameters))}</td><td>${escapeHtml(c.pins.map(p => p.definitionPinKey + '→' + nets.anchorToNet[p.anchorId]).join('；'))}</td></tr>` }).join('')
  const rows = study.scenarios.map(s => `<section><h2>${escapeHtml(s.requestedValue)} ${escapeHtml(study.parameter.unit)} · ${escapeHtml(s.status)}</h2><p>${s.messages.map(escapeHtml).join('；')}</p><table><tr><th>量</th><th>值</th><th>单位</th><th>来源</th></tr>${s.metrics.map(m => `<tr><td>${escapeHtml(m.label)}</td><td>${m.value === null ? '不可用' : escapeHtml(m.value)}</td><td>${escapeHtml(m.unit)}</td><td>${escapeHtml(m.origin)}</td></tr>`).join('')}</table>${s.curves.map(c => `<figure><figcaption>${escapeHtml(c.label)}</figcaption>${curveSvg(c)}</figure>`).join('')}<p>场景 ${escapeHtml(s.id)} · 源 UUID ${escapeHtml(s.project.id)} · 场景修订 ${escapeHtml(s.project.revision)}</p>${s.captures.map(c => `<p>引擎 ${escapeHtml(c.input.configuration.preferredEngine?.id)} · 输入修订 ${escapeHtml(c.input.project.revision)} · 摘要 ${escapeHtml(c.input.inputDigest)}</p>`).join('')}</section>`).join('')
  return `<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(study.title)}</title><style>body{font:16px/1.7 system-ui;max-width:1100px;margin:2rem auto;padding:1rem;color:#262c34}section{border-top:1px solid #ddd;margin-top:2rem}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;text-align:left;padding:.4rem}svg{width:100%;max-width:700px}p{overflow-wrap:anywhere}figure{margin:1rem 0}</style><body><h1>${escapeHtml(study.title)}</h1><p>目标：${escapeHtml(definition.objective)}</p><p>来源：软件仿真；参考为独立标注的解析/派生量。不是硬件测量。此为历史捕获报告，重开后须重新运行才能验证当前工程。</p><p>模型与限制：${escapeHtml(study.source.title)}；参数 ${escapeHtml(study.parameter.componentId)}.${escapeHtml(study.parameter.key)} / ${escapeHtml(study.parameter.unit)}。沿用各引擎的单图纸、元件、参考和数值预算；不组合为非线性暂态或通用 SPICE。</p><p>声明的模型假设：${escapeHtml(capstoneAssumptions(study.kind))}</p><h2>实际源电路与参数/网络</h2><table><tr><th>元件</th><th>固定定义</th><th>参数</th><th>引脚到电网</th></tr>${sourceRows}</table><p>源修订 ${escapeHtml(study.source.revision)} · 摘要 ${escapeHtml(study.sourceDigest)}</p><h2>用户填写的结论</h2><p>${escapeHtml(extension.conclusion) || '尚未填写，不自动推断结论。'}</p>${rows}<p>内嵌完整 schema-1 工程、原始分析与所有数值样本；可重新导入综合实验或作为便携工程交接。</p><script type="application/json" id="stray-project">${serialized}</script></body></html>`
}
