import { expect, it } from 'vitest'
import { analogEngine, createAnalogInput, idealOpampEngine } from '../analog'
import { applyEdit } from '../editing'
import { createProjectDocument, deserializeProject, serializeProject } from '../project-format'
import { createCompetitionProject, replaceTrainingCircuit } from './project'
import { evidenceStale, receiveToolTransfer } from './evidence'
import { readWorkspace } from './validation'
import { exportCompetitionReport, extractProjectText } from './report'

it('captures actual analog OP, original snapshot artifact, stale revisions and portable report', async () => {
  const writer = { name: 'analog acceptance', version: '3.0.0' }
  for (const template of ['analog-npn-base', 'analog-opamp-inverting']) {
    let doc = await replaceTrainingCircuit(await createCompetitionProject('nuedc-2019-d', writer), template)
    const p = doc.project, s = p.sheets[0]!, input = await createAnalogInput(p, s.id, s.ports.find(p => p.label === 'COM')!.anchorId)
    const result = await (template.includes('opamp') ? idealOpampEngine : analogEngine).run(input, { signal: new AbortController().signal, readAsset: () => Promise.reject(new Error('Unexpected')), onProgress: () => {} })
    expect(result.outcome.kind).toBe('success')
    doc = await receiveToolTransfer(doc, p.experiments[0]!.id, { kind: 'analysis', document: doc, analysis: { project: p, configuration: input.configuration, result } })
    const state = readWorkspace(doc.project), ev = state.evidence[0]!
    expect(ev.title).toBe('模拟电子工作点'); expect(ev.method).toContain('不支持非线性暂态'); expect(ev.artifactAssetIds).toHaveLength(1)
    expect(evidenceStale(state, ev)).toBe(false)
    const device = s.components.find(c => c.reference === (template.includes('opamp') ? 'RI' : 'RB'))!
    const changed = applyEdit(p, s.id, { type: 'properties', id: device.id, reference: device.reference, parameters: { resistance: { kind: 'quantity', quantity: { value: 20000, unit: 'ohm' } } } })
    expect(evidenceStale(state, ev, { [p.id]: changed.revision })).toBe(true)
    const report = await exportCompetitionReport(doc), text = extractProjectText(report), imported = await deserializeProject(text)
    expect(report).toContain('模拟电子工作点'); expect(imported.kind).toBe('ready')
    expect(await serializeProject(await createProjectDocument(doc.project, writer, doc.inlineAssets))).toContain(result.provenance.inputDigest)
  }
})
