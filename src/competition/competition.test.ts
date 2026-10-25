import { describe, expect, it } from 'vitest'
import { createEngineeringProject, createId } from '../engineering'
import { createProjectDocument, deserializeProject, serializeProject } from '../project-format'
import { createAcInput, acEngine, parseAcSettings } from '../ac'
import { createDcInput, dcEngine } from '../dc'
import { appendGenerated, DEFAULT_GENERATOR, importCsv, loadWaveform } from '../signal'
import { problems, problemById, searchProblems } from './catalog'
import { compareMetric, convertQuantity } from './metrics'
import { addManualEvidence, evaluateAttempt, receiveToolTransfer } from './evidence'
import { createCompetitionProject, editWorkspace, now, replaceTrainingCircuit, workspaceExtension } from './project'
import { readWorkspace } from './validation'
import { exportCompetitionReport, extractProjectText } from './report'
import type { Criterion } from './types'
import type { JsonObject } from '../engineering'
const writer = { name: 'competition acceptance', version: '2.5.0' }, host = () => ({ signal: new AbortController().signal, readAsset: () => Promise.resolve(new Uint8Array()), onProgress: () => {} })

describe('verified problem index and attribution', () => {
  it('has six individually located original statements, five national and one Guangdong regional', () => {
    expect(problems).toHaveLength(6); expect(new Set(problems.map(p => p.id)).size).toBe(6)
    expect(problems.filter(p => p.classification === 'national')).toHaveLength(5)
    const gd = problemById('guangdong-2026-g'); expect(gd.classification).toBe('regional'); expect(gd.year).toBe(2026); expect(gd.sourceLocator).toContain('G题_周期信号测量分析装置.pdf'); expect(gd.publishedRequirement.criterion).toEqual({ kind: 'maximum', limit: .005, inclusive: true })
    for (const p of problems) { expect(new URL(p.sourceUrl).hostname).toMatch(/\.edu\.cn$/); expect(p.verifiedOn).toBe('2026-10-25'); expect(p.sourceLocator.length).toBeGreaterThan(10); expect(p.division.length).toBeGreaterThan(0); expect(p.limitation.length).toBeGreaterThan(10) }
    expect(searchProblems('广东', 'regional')).toEqual([gd]); expect(searchProblems('2019', 'national')).toHaveLength(5); expect(searchProblems('FFT')).toContain(gd)
  })
  it('distinguishes original, derived and user targets and rejects falsified official attribution', async () => {
    const doc = await createCompetitionProject('nuedc-2019-d', writer), state = readWorkspace(doc.project)
    expect(state.requirements.map(r => r.origin)).toEqual(['published', 'derived', 'training'])
    expect(state.requirements[0]!.criterion).toEqual({ kind: 'maximum', limit: 25, inclusive: true })
    await expect(editWorkspace(doc, s => ({ ...s, requirements: s.requirements.map((r, i) => i === 0 ? { ...r, title: '伪造官方目标' } : r) }))).rejects.toThrow('官方需求被改写')
    await expect(editWorkspace(doc, s => ({ ...s, requirements: s.requirements.map((r, i) => i === 1 ? { ...r, derivation: '' } : r) }))).rejects.toThrow('推导依据')
  })
})
describe('engineering metric comparisons', () => {
  it.each([['mV', .001, 'V'], ['kHz', 1000, 'Hz'], ['MHz', 1e6, 'Hz'], ['ms', .001, 's'], ['%', .01, '1'], ['kohm', 1000, 'ohm']] as const)('converts %s to %s coherently', (from, expected, to) => expect(convertQuantity({ value: 1, unit: from }, to)).toBe(expected))
  it.each([
    [{ kind: 'minimum', limit: 1, inclusive: true }, 1, 'pass'], [{ kind: 'minimum', limit: 1, inclusive: false }, 1, 'fail'],
    [{ kind: 'maximum', limit: 1, inclusive: true }, 1, 'pass'], [{ kind: 'maximum', limit: 1, inclusive: false }, 1, 'fail'],
    [{ kind: 'interval', lower: 1, upper: 2, includeLower: true, includeUpper: false }, 1, 'pass'], [{ kind: 'interval', lower: 1, upper: 2, includeLower: true, includeUpper: false }, 2, 'fail'],
    [{ kind: 'exact', expected: 1, absoluteTolerance: .1, relativeTolerance: .1 }, 1.125, 'pass'], [{ kind: 'exact', expected: 1, absoluteTolerance: .1, relativeTolerance: .1 }, 1.25, 'fail'],
  ] as readonly (readonly [Criterion, number, string])[])('compares boundary %#', (rule, value, kind) => expect(compareMetric({ value, unit: 'V' }, 'V', rule).kind).toBe(kind))
  it('does not invent outcomes for missing evidence, invalid units, stale results or zero-target relative errors', () => {
    const rule: Criterion = { kind: 'exact', expected: 0, absoluteTolerance: .001, relativeTolerance: 0 }
    expect(compareMetric(undefined, 'V', rule).kind).toBe('indeterminate'); expect(compareMetric({ value: NaN, unit: 'V' }, 'V', rule).kind).toBe('indeterminate')
    expect(compareMetric({ value: 1, unit: 'A' }, 'V', rule).kind).toBe('indeterminate'); expect(compareMetric({ value: 0, unit: 'V' }, 'V', rule, true, true).kind).toBe('indeterminate')
    expect(compareMetric({ value: 0, unit: 'mV' }, 'V', rule)).toMatchObject({ kind: 'pass', absoluteError: 0, relativeError: null })
    expect(compareMetric({ value: 0, unit: 'V' }, 'V', { kind: 'interval', lower: 2, upper: 1, includeLower: true, includeUpper: true }).kind).toBe('indeterminate')
  })
})
describe('competition project, actual engine evidence and portable reports', () => {
  it('creates independent project, competition and experiment identities without mutating recipes', async () => {
    const a = await createCompetitionProject('guangdong-2026-g', writer), b = await createCompetitionProject('guangdong-2026-g', writer)
    expect(a.project.id).not.toBe(b.project.id); expect(a.project.competitions[0]!.id).not.toBe(b.project.competitions[0]!.id)
    expect(a.project.experiments.some(e => b.project.experiments.some(x => x.id === e.id))).toBe(false)
    expect(readWorkspace(a.project).evidence).toEqual([]); expect(readWorkspace(a.project).attempts).toEqual([])
  })
  it('captures actual AC solver results, preserves IDs and marks previous design evidence historical', async () => {
    let doc = await createCompetitionProject('nuedc-2019-d', writer); const sheet = doc.project.sheets[0]!, experimentId = doc.project.experiments[1]!.id
    const settings = parseAcSettings((doc.project.extensions['org.stray.ac'] as JsonObject)[sheet.id] as JsonObject), input = await createAcInput(doc.project, sheet.id, settings), result = await acEngine.run(input, host())
    doc = await receiveToolTransfer(doc, experimentId, { kind: 'analysis', document: await createProjectDocument(input.project, writer), analysis: { project: input.project, configuration: input.configuration, result } })
    let state = readWorkspace(doc.project); expect(state.evidence).toHaveLength(1); expect(state.evidence[0]!.data.find(d => d.key === 'sweep:crossing:0')!.quantity.value).toBeCloseTo(159.1549, 0)
    const metric = state.metrics[1]!, evidence = state.evidence[0]!, id = createId()
    doc = await editWorkspace(doc, s => ({ ...s, attempts: [...s.attempts, { id, metricId: metric.id, evidenceId: evidence.id, datumKey: 'sweep:crossing:0', label: '真实RC计算', recordedAtUtc: now() }] }))
    state = readWorkspace(doc.project); expect(evaluateAttempt(state, id).kind).toBe('pass'); expect(evaluateAttempt(state, id, { [doc.project.id]: createId() }).kind).toBe('indeterminate')
    const reopened = await deserializeProject(await serializeProject(doc)); expect(reopened.kind).toBe('ready'); if (reopened.kind === 'ready') expect(readWorkspace(reopened.document.project)).toEqual(state)
    const invalid = { ...result, provenance: { ...result.provenance, inputDigest: '0'.repeat(64) } }
    await expect(receiveToolTransfer(doc, experimentId, { kind: 'analysis', document: await createProjectDocument(input.project, writer), analysis: { project: input.project, configuration: input.configuration, result: invalid } })).rejects.toThrow('摘要')
  })
  it('associates real DC results using the existing Atlas load recipe', async () => {
    const doc = await createCompetitionProject('nuedc-2019-a', writer), sheet = doc.project.sheets[0]!, input = await createDcInput(doc.project, sheet.id, sheet.ports.find(p => p.label === 'B')!.anchorId), result = await dcEngine.run(input, host())
    const captured = await receiveToolTransfer(doc, doc.project.experiments[2]!.id, { kind: 'analysis', document: await createProjectDocument(input.project, writer), analysis: { project: input.project, configuration: input.configuration, result } })
    expect(readWorkspace(captured.project).evidence[0]!.data.some(d => d.title === 'R1电流' && d.quantity.value === .005)).toBe(true)
  })
  it('keeps real signal datasets and assets, provenance and printable/report reimport intact', async () => {
    let doc = await createCompetitionProject('guangdong-2026-g', writer); const experimentId = doc.project.experiments[0]!.id
    const signal = await appendGenerated(doc, { ...DEFAULT_GENERATOR, frequencyHz: 20000, amplitude: .1, sampleRateHz: 256000, count: 4096 }), waveform = loadWaveform(signal.document, signal.datasetId)
    doc = await receiveToolTransfer(doc, experimentId, { kind: 'signal', document: signal.document, datasetId: signal.datasetId, channelId: waveform.channels[0]!.channel.id })
    let state = readWorkspace(doc.project), evidence = state.evidence[0]!, metric = state.metrics[2]!
    expect(evidence.origin).toBe('derived'); expect(evidence.acquisition).toContain('软件合成'); expect(doc.inlineAssets.slice(0, signal.document.inlineAssets.length)).toEqual(signal.document.inlineAssets)
    expect(evidence.data.find(d => d.key === 'totalRms')!.quantity.value).toBeCloseTo(.1 / Math.sqrt(2), 12)
    doc = await editWorkspace(doc, s => ({ ...s, notebooks: s.notebooks.map(n => n.experimentId === experimentId ? { ...n, conclusion: '<script>alert("x")</script> & 真实观察' } : n), attempts: [{ id: createId(), metricId: metric.id, evidenceId: evidence.id, datumKey: 'totalRms', label: '方案A', recordedAtUtc: now() }] }))
    const report = await exportCompetitionReport(doc); expect(report).toContain('用户可调整'); expect(report).toContain('&lt;script&gt;alert'); expect(report).not.toContain('<script>alert')
    const restored = await deserializeProject(extractProjectText(report)); expect(restored.kind).toBe('ready'); if (restored.kind !== 'ready') throw new Error('report')
    state = readWorkspace(restored.document.project); expect(evaluateAttempt(state, state.attempts[0]!.id).kind).toBe('pass'); expect(doc.inlineAssets.every(a => restored.document.inlineAssets.find(b => b.assetId === a.assetId)?.data === a.data)).toBe(true)
    doc = await addManualEvidence(doc, experimentId, { value: 150, unit: 'mV' }, '用户报告条件', '用户报告，未连接仪器', '方案B手动记录')
    evidence = readWorkspace(doc.project).evidence.at(-1)!; metric = readWorkspace(doc.project).metrics[2]!
    doc = await editWorkspace(doc, s => ({ ...s, attempts: [...s.attempts, { id: createId(), metricId: metric.id, evidenceId: evidence.id, datumKey: 'reported', label: '方案B', recordedAtUtc: now() }] }))
    state = readWorkspace(doc.project); expect(evaluateAttempt(state, state.attempts.at(-1)!.id).kind).toBe('fail'); expect(evidence.acquisition).toContain('手动填报')
  })
  it('does not call CSV instrument acquisition and diagnoses invalid metadata/references', async () => {
    const doc = await createCompetitionProject('guangdong-2026-g', writer)
    const imported = await importCsv(doc, new TextEncoder().encode('time_s,voltage_V\n0,0\n0.001,1\n0.002,0\n0.003,-1'), 'user.csv', { timeColumn: 0, timeUnit: 's', channels: [{ column: 1, name: 'V', unit: 'V' }] })
    const waveform = loadWaveform(imported.document, imported.datasetId), linked = await receiveToolTransfer(doc, doc.project.experiments[0]!.id, { kind: 'signal', document: imported.document, datasetId: imported.datasetId, channelId: waveform.channels[0]!.channel.id })
    expect(readWorkspace(linked.project).evidence[0]!.acquisition).toContain('仪器获取方式未经本应用核实')
    await expect(addManualEvidence(doc, doc.project.experiments[0]!.id, { value: 1, unit: 'V' }, '', 'method', 'manual')).rejects.toThrow('来源')
    const state = readWorkspace(doc.project), bad = createEngineeringProject({ ...doc.project, extensions: { ...doc.project.extensions, 'org.stray.competition.workspace': workspaceExtension({ ...state, metrics: state.metrics.map((m, i) => i ? m : { ...m, requirementId: createId() }) }) } })
    expect(() => readWorkspace(bad)).toThrow('指标')
    await expect(replaceTrainingCircuit(linked, 'rl-lowpass')).resolves.toBeDefined()
  })
})
