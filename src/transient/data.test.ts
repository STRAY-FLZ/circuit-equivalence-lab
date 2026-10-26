import { beforeAll, describe, expect, it } from 'vitest'
import { instantiateTemplate } from '../atlas'
import { createProjectDocument, deserializeProject, serializeProject } from '../project-format'
import { applyEdit } from '../editing'
import { appendGenerated, DEFAULT_GENERATOR, loadWaveform, readSeries } from '../signal'
import { compareMetric, createCompetitionProject, receiveToolTransfer, readWorkspace, evidenceStale } from '../competition'
import { createId } from '../engineering'
import { appendTransient, configureTransientExperiment, createTransientInput, loadTransientSeries, readTransientRecord, resolveTransientCircuit, secondOrderAt, selectTransientWaveforms, storedTransientSettings, transientBasis, transientEngine, transientReference } from './index'

const writer = { name: 'STRAY Electronics Lab', version: '3.0.0' }
// Same project identity through independent raw generation and actual numerical capture.
async function makeRecording() {
  const base = instantiateTemplate('rc-charge-topology'), project = configureTransientExperiment(base, base.sheets[0]!.id, 'zero-state'), sheetId = project.sheets[0]!.id
  const raw = await appendGenerated(await createProjectDocument(project, writer), { ...DEFAULT_GENERATOR, count: 256 })
  const input = await createTransientInput(raw.document.project, sheetId, storedTransientSettings(project, sheetId)!), result = await transientEngine.run(input, { signal: new AbortController().signal, readAsset: () => Promise.reject(Error('none')), onProgress: () => {} })
  if (result.outcome.kind !== 'success') throw Error(JSON.stringify(result.outcome))
  const stored = await appendTransient(raw.document, { project: input.project, configuration: input.configuration, result }, sheetId)
  return { ...stored, raw, input, result, sheetId }
}
describe('portable transient data and independent references', () => {
  let f: Awaited<ReturnType<typeof makeRecording>>
  beforeAll(async () => { f = await makeRecording() }, 20000)
  it('keeps every sample in four-channel groups, raw bytes, stable IDs and original provenance', () => {
    const { document, record, raw, input } = f
    expect(record.provenance.inputDigest).toBe(input.inputDigest)
    expect(document.project.measurements.length).toBeGreaterThan(2)
    for (const id of record.datasetIds) { const d = document.project.measurements.find(d => d.id === id)!; expect(d.channels.length).toBeLessThanOrEqual(4); expect(d.axis).toEqual(record.axis); expect(d.source.kind).toBe('simulated') }
    expect(document.inlineAssets.filter(a => raw.document.inlineAssets.some(old => old.assetId === a.assetId))).toEqual(raw.document.inlineAssets)
    const actual = loadTransientSeries(document, record), output = f.result.outcome.kind === 'success' ? f.result.outcome.value : null
    expect(actual).toEqual(output!.series)
    expect(actual.find(s => s.name === 'U(C1)')!.values[100]).toBeCloseTo(6.321205588, 2)
  })
  it('schema1 canonical export/reopen keeps asset identity/bytes and electrical freshness', async () => {
    const text = await serializeProject(f.document), imported = await deserializeProject(text)
    expect(imported.kind).toBe('ready'); if (imported.kind !== 'ready') throw Error('format')
    expect(await serializeProject(imported.document)).toBe(text)
    const restored = readTransientRecord(imported.document, f.sheetId)!
    expect(restored).toEqual(f.record); expect(loadTransientSeries(imported.document, restored)).toEqual(loadTransientSeries(f.document, f.record))
    expect(await transientBasis(imported.document.project)).toBe(f.record.basisDigest)
    const c = imported.document.project.sheets[0]!.components.find(c => c.reference === 'R1')!, next = applyEdit(imported.document.project, f.sheetId, { type: 'properties', id: c.id, reference: c.reference, parameters: { resistance: { kind: 'quantity', quantity: { value: 2000, unit: 'ohm' } } } })
    expect(await transientBasis(next)).not.toBe(f.record.basisDigest)
    expect(restored.circuit.elements.find(e => e.reference === 'R1')!.value).toBe(1000)
  })
  it('two saved simulations restore the explicit latest result ID independently of UUID array order', async () => {
    const input = await createTransientInput(f.document.project, f.sheetId, { ...f.record.settings, durationSeconds: .00002 }), result = await transientEngine.run(input, { signal: new AbortController().signal, readAsset: () => Promise.reject(Error('none')), onProgress: () => {} })
    const next = await appendTransient(f.document, { project: input.project, configuration: input.configuration, result }, f.sheetId), reopened = await deserializeProject(await serializeProject(next.document))
    expect(reopened.kind).toBe('ready'); if (reopened.kind !== 'ready') throw Error('format')
    const reverseOrder = { ...reopened.document, project: { ...reopened.document.project, results: [...reopened.document.project.results].reverse() } }
    expect(readTransientRecord(reverseOrder, f.sheetId)!.resultId).toBe(next.record.resultId)
    expect(readTransientRecord(reverseOrder, f.sheetId)!.axis.count).toBe(3)
    expect(reopened.document.project.results.some(r => r.id === f.record.resultId)).toBe(true)
  })
  it('rejects corrupted assets and never supplies a partial document when budgets fail', async () => {
    const json = JSON.parse(await serializeProject(f.document)) as { inlineAssets: { data: string }[] }
    json.inlineAssets[0]!.data = 'AAAAAAAAAAA='
    expect((await deserializeProject(JSON.stringify(json))).kind).toBe('invalid')
    await expect(serializeProject(f.document, { maxTextBytes: 1024, maxAssetBytes: 1024, maxTotalAssetBytes: 1024 })).rejects.toThrow()
    expect(readTransientRecord(f.document, f.sheetId)!.resultId).toBe(f.record.resultId)
  })
  it('selected view preserves originals and simulated ancestry, with no duplicated bytes', async () => {
    const indices = [f.record.series.findIndex(s => s.name === 'U(C1)'), f.record.series.findIndex(s => s.name === 'I(R1)')], selected = await selectTransientWaveforms(f.document, f.record, indices), d = selected.document.project.measurements.find(d => d.id === selected.datasetId)!
    expect(selected.document.inlineAssets).toEqual(f.document.inlineAssets); expect(d.source.kind).toBe('derived')
    expect(d.metadata.simulated).toBe(true); expect(d.channels[0]!.id).not.toBe(f.record.series[indices[0]!]!.channelId)
    expect(readSeries(selected.document, d.channels[0]!)).toEqual(Float64Array.from(loadTransientSeries(f.document, f.record)[indices[0]!]!.values))
    expect(loadWaveform(selected.document, d.id).axis.count).toBe(501)
    await expect(selectTransientWaveforms(f.document, f.record, [0, 1, 2, 3, 4])).rejects.toThrow()
  })
  it('real simulated samples can associate with competition records and energy units remain dimensional', async () => {
    const doc = await createCompetitionProject('nuedc-2019-d', writer)
    const project = configureTransientExperiment(doc.project, doc.project.sheets[0]!.id, 'zero-state'), sheetId = project.sheets[0]!.id, input = await createTransientInput(project, sheetId, storedTransientSettings(project, sheetId)!), result = await transientEngine.run(input, { signal: new AbortController().signal, readAsset: () => Promise.reject(Error('none')), onProgress: () => {} })
    const saved = await appendTransient(await createProjectDocument(project, writer, doc.inlineAssets), { project, configuration: input.configuration, result }, sheetId), view = await selectTransientWaveforms(saved.document, saved.record, [saved.record.series.findIndex(s => s.name === 'U(C1)')])
    const dataset = view.document.project.measurements.find(d => d.id === view.datasetId)!, received = await receiveToolTransfer(doc, doc.project.experiments[0]!.id, { kind: 'signal', document: view.document, datasetId: view.datasetId, channelId: dataset.channels[0]!.id }), state = readWorkspace(received.project), evidence = state.evidence.at(-1)!
    expect(evidence.acquisition).toContain('transient-mna'); expect(evidenceStale(state, evidence)).toBe(false)
    expect(evidence.data.some(d => d.key === 'maximum' && d.quantity.value > 9)).toBe(true)
    expect(compareMetric({ value: 500, unit: 'uJ' }, 'mJ', { kind: 'exact', expected: .5, absoluteTolerance: 0, relativeTolerance: 1e-12 }).kind).toBe('pass')
  }, 20000)
  it('independent reference recognizes only the real series/parallel topology', () => {
    const settings = storedTransientSettings(f.input.project, f.sheetId)!, circuit = resolveTransientCircuit(f.input.project, f.sheetId, settings), reference = transientReference(circuit, settings)!
    expect(reference.kind).toBe('RC'); expect(reference.tauSeconds).toBe(.001); expect(reference.at(.001)).toBeCloseTo(6.321205588, 8)
    expect(transientReference(circuit, { ...settings, sources: settings.sources.map(s => ({ componentId: s.componentId, unit: s.unit, mode: 'pulse', initial: 0, final: 10, startSeconds: 0, endSeconds: .001 })) })).toBeNull()
    const arbitrary = { ...circuit, elements: [...circuit.elements, { ...circuit.elements[0]!, id: createId() }] }; expect(transientReference(arbitrary, settings)).toBeNull()
  })
  it('critical and near-critical reference stays continuous without subtractive root cancellation', () => {
    const at = secondOrderAt(200, 200, 5, 0, .01)
    expect(at).toBeCloseTo(5 * 3 * Math.exp(-2), 12)
    expect(secondOrderAt(200 + 1e-8, 200, 5, 0, .01)).toBeCloseTo(at, 9)
    expect(secondOrderAt(200 - 1e-8, 200, 5, 0, .01)).toBeCloseTo(at, 9)
    expect(Number.isFinite(secondOrderAt(1e6, 200, 5, 0, 100))).toBe(true)
  })
})
