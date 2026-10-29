// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createProjectDocument, deserializeProject, serializeProject } from '../project-format'
import { extractProjectText } from '../competition/report'
import { createCompetitionProject, readWorkspace, receiveToolTransfer } from '../competition'
import { createCapstoneProject, parameterChoices, readStudy, runStudy, storeStudy, studyReport } from './index'
import type { CapstoneKind, StudyParameter } from './types'

const host = () => ({ signal: new AbortController().signal, readAsset: () => Promise.reject(Error('unused')), onProgress: () => {} })
function setup(kind: CapstoneKind, reference: string, key: string, values: number[]) {
  const source = createCapstoneProject(kind), component = source.sheets[0]!.components.find(c => c.reference === reference)!, choice = parameterChoices(source).find(c => c.componentId === component.id && c.key === key)!
  return { source, parameter: { ...choice, values } satisfies StudyParameter }
}
describe('actual integrated capstone orchestration', () => {
  it('solves RC time/frequency references for two isolated source-preserving revisions', async () => {
    const { source, parameter } = setup('rc', 'R1', 'resistance', [1000, 2000]), before = JSON.stringify(source), study = await runStudy(source, 'rc', parameter, host())
    expect(JSON.stringify(source)).toBe(before); expect(new Set(study.scenarios.map(s => s.id)).size).toBe(2)
    for (const [i, scenario] of study.scenarios.entries()) {
      expect(scenario.status, scenario.messages.join()).toBe('success'); expect(scenario.project.id).toBe(source.id); expect(scenario.project.revision).not.toBe(source.revision)
      const metric = (label: string) => scenario.metrics.find(m => m.label === label)!.value!
      expect(metric('τ 解析参考')).toBeCloseTo((i + 1) * .001, 10)
      expect(metric('τ 附近实际采样')).toBeCloseTo(10 * (1 - Math.exp(-1)), 2)
      expect(metric('τ×采样fc')).toBeCloseTo(1 / (2 * Math.PI), 3)
      const ac = scenario.captures[1]!.result.outcome as { value: { operatingPoint: { nodes: { anchorIds: string[]; value: { real: number; imaginary: number } }[] } } }
      const output = scenario.project.sheets[0]!.ports.find(p => p.label === 'OUT')!.anchorId, v = ac.value.operatingPoint.nodes.find(n => n.anchorIds.includes(output))!.value
      expect(v.real).toBeCloseTo(.5, 7); expect(v.imaginary).toBeCloseTo(-.5, 7)
      expect(scenario.curves.some(c => c.yUnit === 'A')).toBe(true)
      expect(scenario.captures.every(c => c.input.inputDigest.length === 64)).toBe(true)
    }
  })
  it('links actual RLC solves while keeping natural and damped frequency references distinct', async () => {
    const { source, parameter } = setup('rlc', 'R1', 'resistance', [200]), study = await runStudy(source, 'rlc', parameter, host()), scenario = study.scenarios[0]!
    expect(scenario.status, scenario.messages.join()).toBe('success')
    expect(scenario.captures).toHaveLength(2)
    const f0 = scenario.metrics.find(m => m.label === '自然频率参考')!.value!, fd = scenario.metrics.find(m => m.label === '阻尼振荡频率参考')!.value!
    expect(f0).toBeCloseTo(200 / (2 * Math.PI), 7); expect(fd).toBeCloseTo(Math.sqrt(30000) / (2 * Math.PI), 7); expect(fd).toBeLessThan(f0)
  }, 15000)
  it.each(['ce', 'cs'] as const)('%s recomputes device bias, derivatives and frequency points', async kind => {
    const { source, parameter } = setup(kind, 'RS', 'resistance', [1000, 2000]), study = await runStudy(source, kind, parameter, host())
    expect(study.scenarios.every(s => s.status === 'success'), JSON.stringify(study.scenarios.map(s => s.messages))).toBe(true)
    expect(study.scenarios[0]!.metrics.find(m => m.label === 'gm')!.value).toBeGreaterThan(0)
    expect(study.scenarios[0]!.curves[0]!.x).toHaveLength(201)
    expect(study.scenarios[0]!.captures[0]!.input.inputDigest).not.toBe(study.scenarios[1]!.captures[0]!.input.inputDigest)
  })
  it('keeps invalid bias unsupported without carrying over curves', async () => {
    const { source, parameter } = setup('cs', 'V2', 'voltage', [10, 0]), study = await runStudy(source, 'cs', parameter, host())
    expect(study.scenarios[0]!.status).toBe('success'); expect(study.scenarios[1]!.status).not.toBe('success'); expect(study.scenarios[1]!.curves).toEqual([])
  })
  it.each(['follower', 'inverting', 'noninverting', 'active-lowpass'] as const)('%s reuses finite/ideal outputs and preserves conditional loop metrics', async kind => {
    const { source, parameter } = setup(kind, 'U1', 'openLoopGain', [100000]), study = await runStudy(source, kind, parameter, host()), s = study.scenarios[0]!
    expect(s.status, s.messages.join()).toBe('success'); expect(s.curves).toHaveLength(6)
    const gain = s.metrics.find(m => m.label === '有限直流增益')!.value!, pm = s.metrics.find(m => m.label === '相位裕度')!.value
    if (kind === 'follower') expect(gain).toBeCloseTo(100000 / 100001, 8)
    if (kind === 'active-lowpass') expect(pm).toBeNull(); else expect(pm!).toBeGreaterThan(89)
  })
  it('archives raw points, configurations and user conclusions in portable schema1 JSON/HTML', async () => {
    const { source, parameter } = setup('rc', 'R1', 'resistance', [1000]), study = await runStudy(source, 'rc', parameter, host()), base = await createProjectDocument(source, { name: 'test', version: '3.4.0' }, []), doc = await storeStudy(base, study, '<script>test</script>')
    expect(doc.project.experiments.at(-1)!.analysisIds).toHaveLength(2); expect(doc.project.results).toHaveLength(2); expect(doc.project.assets.length).toBeGreaterThan(1); expect(doc.project.measurements.length).toBeGreaterThan(0)
    const restored = await deserializeProject(await serializeProject(doc)); expect(restored.kind).toBe('ready')
    if (restored.kind !== 'ready') throw Error('roundtrip')
    expect(await readStudy(restored.document)).toEqual(study)
    const report = await studyReport(doc); expect(report).toContain('&lt;script&gt;test&lt;/script&gt;'); expect(report).toContain('软件仿真'); expect(report).toContain('<svg')
    expect((await deserializeProject(extractProjectText(report))).kind).toBe('ready')
  })
  it('rejects malformed units and over-budget values and honors cancellation', async () => {
    const { source, parameter } = setup('rc', 'R1', 'resistance', [1000]), controller = new AbortController(); controller.abort()
    await expect(runStudy(source, 'rc', parameter, { ...host(), signal: controller.signal })).rejects.toThrow('取消')
    await expect(runStudy(source, 'rc', { ...parameter, unit: 'V' }, host())).rejects.toThrow('单位')
    await expect(runStudy(source, 'rc', { ...parameter, values: [1, 2, 3, 4, 5, 6] }, host())).rejects.toThrow('1–5')
    await expect(runStudy(source, 'rc', { ...parameter, values: [1000, 1000] }, host())).rejects.toThrow()
    const invalid = await runStudy(source, 'rc', { ...parameter, values: [-1] }, host()); expect(invalid.scenarios[0]!.status).toBe('failure')
  })
  it('preserves competition records and hands off actual simulated waveform evidence', async () => {
    const doc = await createCompetitionProject('nuedc-2019-d', { name: 'test', version: '3.4.0' }), choice = parameterChoices(doc.project).find(p => p.key === 'resistance')!, study = await runStudy(doc.project, 'rc', { ...choice, values: [1000] }, host()), archived = await storeStudy(doc, study, '仅子训练'), experimentId = doc.project.experiments[0]!.id
    const merged = await receiveToolTransfer(doc, experimentId, { kind: 'snapshot', document: archived })
    expect(merged.project.experiments.some(e => e.id === study.id)).toBe(true); expect(await readStudy(merged)).toEqual(study)
    const dataset = archived.project.measurements[0]!, captured = await receiveToolTransfer(merged, experimentId, { kind: 'signal', document: archived, datasetId: dataset.id, channelId: dataset.channels[0]!.id })
    expect(readWorkspace(captured.project).evidence).toHaveLength(1)
    expect(readWorkspace(captured.project).evidence[0]!.acquisition).toContain('模拟')
  })
})
