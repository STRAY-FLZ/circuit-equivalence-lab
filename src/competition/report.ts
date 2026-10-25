import type { ProjectDocumentV1 } from '../project-format'
import { decodeInlineAsset, serializeProject } from '../project-format'
import { displayIndices, loadWaveform } from '../signal'
import { problemById } from './catalog'
import { evaluateAttempt, evidenceStale } from './evidence'
import { readWorkspace } from './validation'
import { editWorkspace } from './project'
import type { Evidence } from './types'

export const escapeHtml = (value: unknown): string => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
export const originLabels = { published: '原题公布要求（摘录摘要）', derived: '派生工程解释/计算', training: '自定训练目标' } as const
export const evidenceLabels = { simulation: '软件仿真', imported: '导入文件', manual: '用户手动填报', derived: '派生计算' } as const
function table(headers: string[], rows: readonly (readonly unknown[])[]): string { return `<div class="scroll"><table><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` }
function plot(title: string, points: readonly (readonly [number, number])[], logX: boolean): string {
  const valid = points.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && (!logX || x > 0)); if (valid.length < 2) return '<p>有效绘图数据不足。</p>'
  const xs = valid.map(([x]) => logX ? Math.log10(x) : x), ys = valid.map(p => p[1]), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const path = valid.map((p, i) => `${i ? 'L' : 'M'}${50 + (xs[i]! - minX) / (maxX - minX || 1) * 680},${180 - (p[1] - minY) / (maxY - minY || 1) * 150}`).join(' ')
  return `<figure><figcaption>${escapeHtml(title)}</figcaption><svg viewBox="0 0 760 220" role="img" aria-label="${escapeHtml(title)}"><path d="M50 20V180H730" fill="none" stroke="#889"/><path d="${path}" fill="none" stroke="#284b79" stroke-width="1.5"/><text x="4" y="30">${escapeHtml(Number(maxY.toPrecision(4)))}</text><text x="4" y="180">${escapeHtml(Number(minY.toPrecision(4)))}</text><text x="50" y="208">${escapeHtml(valid[0]![0])}</text><text x="730" y="208" text-anchor="end">${escapeHtml(valid.at(-1)![0])}</text></svg></figure>`
}
function evidencePlots(document: ProjectDocumentV1, evidence: Evidence): string {
  if (evidence.datasetIds.length) return evidence.datasetIds.map(id => {
    const dataset = document.project.measurements.find(d => d.id === id)
    if (!dataset || dataset.axis.kind !== 'uniform-time') return ''
    const waveform = loadWaveform(document, id)
    return waveform.channels.map(ch => plot(`${ch.channel.name} / ${ch.channel.samples.unit}；横轴时间 s（显示最小/最大包络，数值与资产保留全样本）`, displayIndices(ch.values, 0, ch.values.length - 1, 256).map(i => [waveform.axis.startSeconds + i * waveform.axis.intervalSeconds, ch.values[i]!] as const), false)).join('')
  }).join('')
  const artifact = document.inlineAssets.find(a => a.assetId === evidence.artifactAssetIds[0]); if (!artifact) return ''
  const value = JSON.parse(new TextDecoder().decode(decodeInlineAsset(artifact))) as { outcome?: { value?: { sweep?: { points?: readonly { kind: string; frequencyHz: number; gainDb: number | null }[] } } } }
  const points = value.outcome?.value?.sweep?.points
  const isList = (v: unknown): v is readonly unknown[] => Array.isArray(v)
  if (!isList(points)) return ''
  // Split failure/zero-transfer gaps; never connect across missing points.
  const segments: [number, number][][] = [[]]
  for (const p of points) { if (p.kind === 'available' && typeof p.frequencyHz === 'number' && p.frequencyHz > 0 && typeof p.gainDb === 'number' && Number.isFinite(p.gainDb)) segments.at(-1)!.push([p.frequencyHz, p.gainDb]); else segments.push([]) }
  return segments.filter(p => p.length > 1).map(p => plot('实际频扫增益 / dB；横轴对数频率 Hz（失败处断开）', p, true)).join('')
}
export async function exportCompetitionReport(document: ProjectDocumentV1, pendingRevisions: Readonly<Record<string, string>> = {}): Promise<string> {
  if (Object.keys(pendingRevisions).length) document = await editWorkspace(document, s => ({ ...s, sourceRevisions: s.sourceRevisions.map(r => ({ ...r, revision: pendingRevisions[r.projectId] ?? r.revision })) }))
  const state = readWorkspace(document.project), problem = problemById(state.problemId)
  const serialized = (await serializeProject(document)).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026')
  const requirements = table(['需求', '归属 / 原文位置', '指标规则', '条件 / 证据', '边界'], state.requirements.map(r => [r.title, `${originLabels[r.origin]}；${r.sourceSection}`, `${JSON.stringify(r.criterion)} ${r.unit}`, `${r.conditions}；${r.evidenceNeeded}`, `${r.limitation} ${r.derivation}`]))
  const attempts = table(['尝试', '指标', '实际值', '证据来源 / 条件', '当前判定', '误差 / 方法'], state.attempts.map(a => { const m = state.metrics.find(m => m.id === a.metricId)!, e = state.evidence.find(e => e.id === a.evidenceId)!, d = e.data.find(d => d.key === a.datumKey)!, result = evaluateAttempt(state, a.id, pendingRevisions); return [a.label, m.title, `${d.quantity.value} ${d.quantity.unit}`, `${evidenceLabels[e.origin]}：${e.acquisition}；${e.conditions}`, result.kind === 'pass' ? '训练数值比较通过' : result.kind === 'fail' ? '训练数值比较未通过' : '无法判定', `${'absoluteError' in result ? `绝对误差 ${result.absoluteError ?? '不适用'}；相对误差 ${result.relativeError ?? '未定义'}；` : ''}${result.detail}`] }))
  const evidence = state.evidence.map(e => `<section><h3>${escapeHtml(e.title)}${evidenceStale(state, e, pendingRevisions) ? ' · 历史修订' : ''}</h3><p>${escapeHtml(evidenceLabels[e.origin])} · ${escapeHtml(e.acquisition)}</p><p>方法：${escapeHtml(e.method)}；条件：${escapeHtml(e.conditions)}</p><p class="ids">来源工程 ${escapeHtml(e.sourceProjectId)}；修订 ${escapeHtml(e.sourceRevision)}；摘要 ${escapeHtml(e.inputDigest || '手动记录，无软件执行摘要')}；时间 ${escapeHtml(e.recordedAtUtc)}；证据 ${escapeHtml(e.id)}</p>${table(['观测', '值', '单位'], e.data.map(d => [d.title, d.quantity.value, d.quantity.unit]))}${evidencePlots(document, e)}</section>`).join('')
  const notebooks = state.notebooks.map(n => `<section><h3>${escapeHtml(document.project.experiments.find(e => e.id === n.experimentId)!.title)}</h3>${Object.entries(n).filter(([key]) => !['experimentId', 'requirementIds'].includes(key)).map(([key, value]) => `<p><strong>${escapeHtml(({ objective: '目标', setup: '搭建与方法', parameters: '参数', observations: '观察', problems: '问题', adjustments: '调整', conclusion: '结论', review: '复盘', nextSteps: '下一步' } as Record<string, string>)[key] ?? key)}</strong>：${escapeHtml(value) || '未填写'}</p>`).join('')}</section>`).join('')
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(document.project.title)} · 实验报告</title><style>body{font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif;color:#262c34;background:#fff;max-width:1100px;margin:2rem auto;padding:0 1rem}h1,h2,h3{line-height:1.3}h2,section{border-top:1px solid #d9dee4;padding-top:1rem;margin-top:2rem}a{color:#284b79}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:.6rem;text-align:left;border-bottom:1px solid #ddd;vertical-align:top;overflow-wrap:anywhere}.scroll{overflow:auto}.ids{font-size:12px;overflow-wrap:anywhere}svg{width:100%;max-width:760px;min-width:760px}svg text{font-size:12px}figure{margin:1rem 0;overflow-x:auto}@media print{svg{min-width:0}body{max-width:none;margin:0}h2,h3{break-after:avoid}.scroll{overflow:visible}table{font-size:10px}a{color:inherit}}</style></head><body><p>STRAY Electronics Lab · 电子设计竞赛 / 训练实验报告</p><h1>${escapeHtml(document.project.title)}</h1><p class="ids">工程 ${escapeHtml(document.project.id)} · 修订 ${escapeHtml(document.project.revision)} · writer ${escapeHtml(document.writer.version)}</p><p>这是历史赛题学习与部分工程训练记录。训练目标、派生计算与官方要求分别标注；通过数值比较不等于官方评分、硬件测试或整题完成。</p><h2>原题与来源</h2><p>${escapeHtml(problem.year)} ${escapeHtml(problem.letter)} · ${escapeHtml(problem.title)} · ${escapeHtml(problem.classification === 'regional' ? '广东赛区' : '全国')} · ${escapeHtml(problem.division)}</p><p>${escapeHtml(problem.publisher)}；元数据与原文核验日期 ${escapeHtml(problem.verifiedOn)}。<a href="${escapeHtml(problem.publicationUrl)}">发布页面</a> / <a href="${escapeHtml(problem.sourceUrl)}">原始文件</a>；${escapeHtml(problem.sourceLocator)}</p><p>${escapeHtml(problem.limitation)}</p><h2>需求与指标</h2>${requirements}<h2>任务与方案</h2>${table(['任务', '状态'], state.tasks.map(t => [t.title, t.done ? '已完成' : '待完成']))}${table(['方案', '方法 / 参数', '优点 / 缺点 / 风险', '决策与修订依据', '引用'], state.alternatives.map(a => [a.title, `${a.approach}；${a.parameters}`, `${a.advantages}；${a.disadvantages}；${a.risks}`, `${a.rationale}；${a.revisionNote}；基于${a.basedOnRevision}，${a.recordedAtUtc}`, a.references]))}<h2>指标比较</h2>${attempts}<h2>实验笔记与复盘</h2>${notebooks}<h2>实际证据与图形</h2>${evidence || '<p>尚无证据，不报告成功结果。</p>'}<p>使用浏览器打印可生成打印件。本HTML内含完整schema-1工程数据，可在电赛工作台重新导入；文件内来源记录不构成数字签名或仪器认证。</p><script type="application/json" id="stray-project">${serialized}</script></body></html>`
  if (new TextEncoder().encode(html).byteLength > 32 * 1024 * 1024) throw new Error('报告超过32 MiB，未截断数据；请导出工程并缩小单份报告范围。')
  return html
}
export function extractProjectText(text: string): string { if (text.trimStart().startsWith('{')) return text; const payload = /<script type="application\/json" id="stray-project">([\s\S]*?)<\/script>/.exec(text); if (!payload) throw new Error('不是受支持的工程JSON或本工作台导出的便携HTML报告。'); return payload[1]! }
