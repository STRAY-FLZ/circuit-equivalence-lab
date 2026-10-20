// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createEmptyProject, createEngineeringProject, createId, ProjectValidationError, reviseProject } from '../engineering'
import type { MeasurementDataset } from '../engineering'
import { createInlineAsset, createProjectDocument, decodeInlineAsset, deserializeProject, serializeProject } from './index'
import { draft, resistorProject } from '../../tests/v2-fixtures'

const writer = { name: 'STRAY Electronics Lab', version: '0.1.0' }
function float64(values: readonly number[]): Uint8Array {
  const bytes = new Uint8Array(values.length * 8), view = new DataView(bytes.buffer)
  values.forEach((value,i) => view.setFloat64(i * 8,value,true)); return bytes
}
async function waveform(values: readonly number[] = [0,1,0,-1]) {
  const inline = await createInlineAsset(float64(values),'application/vnd.stray.float64-le')
  const dataset: MeasurementDataset = { id: createId(), title: 'Four samples', kind: 'waveform',
    source: { kind: 'hardware', instrument: 'Fixture', acquisitionId: 'fixture-capture', acquiredAtUtc: '2026-10-20T12:00:00Z', configuration: {} },
    axis: { kind: 'uniform-time', startSeconds: 0, intervalSeconds: 0.001, count: values.length },
    channels: [{ id: createId(), name: 'CH1', samples: { assetId: inline.entry.id, encoding: 'float64-le', count: values.length, unit: 'V' } }], metadata: {},
  }
  return { project: createEngineeringProject({ ...resistorProject(), assets: [inline.entry], measurements: [dataset] }), inline }
}
describe('V2 portable project format', () => {
  it('round-trips UTF-8 identity, values, geometry, pin order and opaque extension arrays', async () => {
    const base = resistorProject(), p = reviseProject(base,base.revision,{ title: '工程试验 Ω', extensions: { 'fixture.extra': { sheets: [{ id: 'z' },{ id: 'a' }], value: 0.12345678901234566 } } })
    const doc = await createProjectDocument(p,writer), text = await serializeProject(doc)
    const result = await deserializeProject(new TextEncoder().encode(text))
    expect(result.kind).toBe('ready')
    if (result.kind !== 'ready') throw new Error('Expected ready document')
    const restored = result.document.project
    expect({ ...restored, sheets: [] }).toEqual({ ...p, sheets: [] })
    expect({ ...restored.sheets[0], anchors: [], ports: [] }).toEqual({ ...p.sheets[0], anchors: [], ports: [] })
    for (const anchor of p.sheets[0]!.anchors) expect(restored.sheets[0]?.anchors).toContainEqual(anchor)
    for (const port of p.sheets[0]!.ports) expect(restored.sheets[0]?.ports).toContainEqual(port)
    expect(restored.sheets[0]?.anchors).toHaveLength(p.sheets[0]!.anchors.length)
    expect(restored.sheets[0]?.ports).toHaveLength(p.sheets[0]!.ports.length)
    expect(result.document.writer.version).toBe('0.1.0')
    expect(result.document.formatVersion).toBe(1)
    expect(Object.isFrozen(result.document.project)).toBe(true)
  })
  it('serializes identity collections deterministically without sorting ordered pins', async () => {
    const base = resistorProject(), s = base.sheets[0]!, doc = await createProjectDocument(base,writer)
    const reverse = { ...doc, project: { ...base, sheets: [{ ...s, anchors: [...s.anchors].reverse(), ports: [...s.ports].reverse() }] } }
    expect(await serializeProject(reverse)).toBe(await serializeProject(doc))
    const changedPins = { ...doc, project: { ...base, sheets: [{ ...s, components: [{ ...s.components[0]!, pins: [...s.components[0]!.pins].reverse() }] }] } }
    const read = await deserializeProject(await serializeProject(changedPins))
    expect(read.kind === 'ready' && read.document.project.sheets[0]?.components[0]?.pins).toEqual(changedPins.project.sheets[0]?.components[0]?.pins)
  })
  it.each([
    ['other format', { format: 'another.format' }, 'format'],
    ['new schema', { formatVersion: 2 }, 'newer-version'],
    ['required extension', { requiredExtensions: ['fixture.future'] }, 'required-extension'],
  ])('retains the original for %s', async (_label, patch, reason) => {
    const text = JSON.stringify({ ...await createProjectDocument(createEmptyProject(),writer), ...patch }), result = await deserializeProject(text)
    expect(result).toEqual({ kind: 'unrecognized', reason, originalText: text })
  })
  it('rejects schema 0, malformed JSON/UTF-8, unknown fields and invalid structure', async () => {
    const doc = await createProjectDocument(createEmptyProject(),writer)
    for (const value of [{ ...doc, formatVersion: 0 }, { ...doc, formatVersion: '1' }, { ...doc, extra: true }, { ...doc, project: { ...doc.project, id: 'bad' } }]) expect((await deserializeProject(JSON.stringify(value))).kind).toBe('invalid')
    expect((await deserializeProject('{')).kind).toBe('invalid')
    expect(await deserializeProject(new Uint8Array([0xff]))).toMatchObject({ kind: 'invalid', issues: [{ code: 'utf8' }] })
  })
  it('verifies a small four-sample waveform and portable asset bytes', async () => {
    const { project, inline } = await waveform(), doc = await createProjectDocument(project,writer,[inline.asset])
    const result = await deserializeProject(await serializeProject(doc))
    expect(result.kind).toBe('ready')
    if (result.kind !== 'ready') throw new Error('Expected valid waveform')
    expect(decodeInlineAsset(result.document.inlineAssets[0]!)).toEqual(float64([0,1,0,-1]))
    expect(result.document.project.measurements[0]?.source.kind).toBe('hardware')
    expect(result.document.project.measurements[0]?.channels[0]?.samples.assetId).toBe(inline.entry.id)
  })
  it.each(['checksum','byte-length','missing-asset','asset-reference','base64'] as const)('rejects %s corruption without touching the source', async code => {
    const { project, inline } = await waveform(), raw = draft(await createProjectDocument(project,writer,[inline.asset]))
    if (code === 'checksum') raw.inlineAssets[0]!.data = btoa(String.fromCharCode(...float64([0,2,0,-1])))
    if (code === 'byte-length') raw.project.assets[0]!.byteLength++
    if (code === 'missing-asset') raw.inlineAssets = []
    if (code === 'asset-reference') raw.inlineAssets.push(raw.inlineAssets[0]!)
    if (code === 'base64') raw.inlineAssets[0]!.data = '!!!'
    expect(await deserializeProject(JSON.stringify(raw))).toMatchObject({ kind: 'invalid', issues: [{ code }] })
    expect(project.assets[0]?.byteLength).toBe(32)
  })
  it('enforces documented configurable resource budgets without truncation', async () => {
    const { project, inline } = await waveform(), doc = await createProjectDocument(project,writer,[inline.asset]), text = await serializeProject(doc)
    expect(await deserializeProject(text,{ maxTextBytes: 10 })).toMatchObject({ kind: 'invalid', issues: [{ code: 'resource-limit' }] })
    expect(await deserializeProject(text,{ maxAssetBytes: 16 })).toMatchObject({ kind: 'invalid', issues: [{ code: 'resource-limit' }] })
    expect(await deserializeProject(text,{ maxTotalAssetBytes: 16 })).toMatchObject({ kind: 'invalid', issues: [{ code: 'resource-limit' }] })
    expect(doc.project.assets[0]?.byteLength).toBe(32)
  })
  it('rejects nonfinite binary samples and inconsistent sample counts', async () => {
    const { project, inline } = await waveform()
    const corrupt = await createInlineAsset(float64([NaN,1,0,-1]),inline.entry.mediaType,inline.entry.id)
    const doc = { format: 'org.stray.electronics.project', formatVersion: 1, writer, requiredExtensions: [], project: { ...project, assets: [corrupt.entry] }, inlineAssets: [corrupt.asset] }
    expect(await deserializeProject(JSON.stringify(doc))).toMatchObject({ kind: 'invalid', issues: [{ code: 'nonfinite-sample' }] })
    const raw = draft(await createProjectDocument(project,writer,[inline.asset]))
    raw.project.measurements[0]!.channels[0]!.samples.count = 3
    expect((await deserializeProject(JSON.stringify(raw))).kind).toBe('invalid')
  })
  it('rejects reversed explicit timestamps and preserves irregular increasing timestamps', async () => {
    const { project, inline } = await waveform(), times = await createInlineAsset(float64([0,0.1,0.3,0.6]),'application/vnd.stray.float64-le')
    const dataset = { ...project.measurements[0]!, axis: { kind: 'explicit-time' as const, times: { assetId: times.entry.id, encoding: 'float64-le' as const, count: 4, unit: 's' } } }
    const p = createEngineeringProject({ ...project, assets: [...project.assets,times.entry], measurements: [dataset] })
    const doc = await createProjectDocument(p,writer,[inline.asset,times.asset])
    expect((await deserializeProject(await serializeProject(doc))).kind).toBe('ready')
    const reversed = await createInlineAsset(float64([0,0.2,0.1,0.4]),times.entry.mediaType,times.entry.id)
    expect(await deserializeProject(JSON.stringify({ ...doc, project: { ...p, assets: [inline.entry,reversed.entry] }, inlineAssets: [inline.asset,reversed.asset] }))).toMatchObject({ kind: 'invalid', issues: [{ code: 'axis-order' }] })
  })
  it('rejects self-cyclic derived provenance and unserializable numeric metadata', async () => {
    const { project, inline } = await waveform(), data = project.measurements[0]!
    const bad = { ...data, source: { kind: 'derived', inputDatasetIds: [data.id], operation: { id: 'fixture.filter', version: '1' }, options: {} } }
    expect(() => createEngineeringProject({ ...project, measurements: [bad] })).toThrow(/acyclic/)
    const doc = await createProjectDocument(project,writer,[inline.asset])
    await expect(serializeProject({ ...doc, project: { ...project, extensions: { 'fixture.meta': { x: Infinity } } } })).rejects.toBeInstanceOf(ProjectValidationError)
  })
  it('rejects missing media type syntax and collapsed uniform sample times', async () => {
    const { project, inline } = await waveform()
    expect(() => createEngineeringProject({ ...project, assets: [{ ...inline.entry, mediaType: 'not-a-media-type' }] })).toThrow(/media type/)
    const dataset = project.measurements[0]!
    expect(() => createEngineeringProject({ ...project, measurements: [{ ...dataset, axis: { kind: 'uniform-time', startSeconds: 1e30, intervalSeconds: 0.001, count: 4 } }] })).toThrow(/distinguishable/)
  })
  it('checks long provenance chains iteratively and rejects cycles with a domain diagnostic', async () => {
    const { project } = await waveform(), template = project.measurements[0]!
    const datasets: MeasurementDataset[] = []
    let previous = template
    for (let i = 0; i < 1500; i++) {
      const dataset: MeasurementDataset = { ...template, id: createId(), channels: template.channels.map(c=>({...c,id:createId()})), source: { kind: 'derived', inputDatasetIds: [previous.id], operation: { id: 'fixture.copy', version: '1' }, options: {} } }
      datasets.unshift(dataset); previous = dataset
    }
    expect(createEngineeringProject({ ...project, measurements: [...datasets,template] }).measurements).toHaveLength(1501)
    expect(() => createEngineeringProject({ ...project, measurements: [...datasets,{ ...template, source: { kind: 'derived', inputDatasetIds: [previous.id], operation: { id: 'fixture.copy', version: '1' }, options: {} } }] })).toThrow(/acyclic/)
  })
})
