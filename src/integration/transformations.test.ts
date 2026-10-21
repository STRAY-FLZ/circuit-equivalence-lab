// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { applyEdit, commitSnapshot, createHistory, emptySheet, newEditorProject, redoEdit, undoEdit } from '../editing'
import { createEngineeringProject, createId, deriveElectricalNets, reviseProject } from '../engineering'
import type { EngineeringProject, Id, MeasurementDataset } from '../engineering'
import { importV1Network, projectToV1 } from '../compatibility'
import { circuitExamples } from '../visualization'
import * as transforms from '../transforms'
import type { TransformType } from '../transforms'
import { createProjectDocument, deserializeProject, serializeProject } from '../project-format'
import { candidateHighlight, candidateLabel, discoverForProject, previewTransformation, writebackTransformation } from './index'
import type { TransformationSession } from './index'

const wiring: Record<TransformType, readonly (readonly [string, string])[]> = { series: [['A', 'N'], ['N', 'B']], parallel: [['A', 'B'], ['A', 'B']], 'delta-to-star': [['A', 'B'], ['B', 'C'], ['C', 'A']], 'star-to-delta': [['A', 'N'], ['B', 'N'], ['C', 'N']] }
export function drawnProject(type: TransformType, ports = true, values: readonly number[] = [100, 200, 300]): EngineeringProject {
  let p = newEditorProject(); const id = p.sheets[0]!.id
  const groups = new Map<string, Id[]>()
  wiring[type].forEach(([a, b], i) => {
    p = applyEdit(p, id, { type: 'add', kind: 'resistor', position: { x: 200 + i * 240, y: 200 } })
    const c = p.sheets[0]!.components.at(-1)!
    p = applyEdit(p, id, { type: 'properties', id: c.id, reference: c.reference, parameters: { resistance: { kind: 'quantity', quantity: { value: values[i]!, unit: 'ohm' } } } })
    for (const [key, node] of [['1', a], ['2', b]] as const) { const list = groups.get(node) ?? []; list.push(c.pins.find(pin => pin.definitionPinKey === key)!.anchorId); groups.set(node, list) }
  })
  for (const anchors of groups.values()) for (const anchor of anchors.slice(1)) p = applyEdit(p, id, { type: 'connect', from: { anchorId: anchors[0]! }, to: { anchorId: anchor } })
  if (ports) for (const name of ['A', 'B', ...(groups.has('C') ? ['C'] : [])]) p = applyEdit(p, id, { type: 'marker', kind: 'port', name, at: { anchorId: groups.get(name)![0]! } })
  return p
}
function session(p: EngineeringProject, observed: readonly Id[] = []): TransformationSession {
  const result = discoverForProject(p, p.sheets[0]!.id, observed)
  if (result.kind !== 'ready') throw new Error('Expected eligible project')
  return result.session
}
function preview(p: EngineeringProject, type: TransformType) { const s = session(p), candidate = s.candidates.find(c => c.type === type)!; return previewTransformation(s, candidate.id) }

describe('V2 editor integration with existing V1 engines', () => {
  it.each(Object.keys(wiring) as TransformType[])('%s: draws, discovers, previews, verifies and writes back real project data', type => {
    const p = drawnProject(type), before = JSON.stringify(p), pr = preview(p, type)
    expect(pr.result.kind).toBe('applied'); expect(pr.evidence?.kind).toBe('equivalent')
    expect(JSON.stringify(p)).toBe(before)
    expect(candidateLabel(pr.session, pr.candidate)).toContain('R1')
    expect(candidateHighlight(pr.session, pr.candidate).componentIds).toHaveLength(wiring[type].length)
    const next = writebackTransformation(p, pr), s = next.sheets[0]!, projected = projectToV1(next, s.id)
    expect(next.id).toBe(p.id); expect(next.revision).not.toBe(p.revision)
    expect(s.ports).toEqual(p.sheets[0]!.ports)
    expect(s.connections.slice(0, p.sheets[0]!.connections.length)).toEqual(p.sheets[0]!.connections)
    expect(s.components).toHaveLength(type === 'series' || type === 'parallel' ? 1 : 3)
    expect(s.components.every(c => !p.sheets[0]!.components.some(old => old.id === c.id))).toBe(true)
    expect(s.components.flatMap(c => c.pins.map(pin => pin.id)).every(id => /^[0-9a-f-]{36}$/.test(id))).toBe(true)
    expect(s.geometry.placements).toHaveLength(s.components.length)
    expect(Math.min(...s.geometry.placements.map(v => v.origin.y)) - 36).toBeGreaterThan(Math.max(...Object.values(p.sheets[0]!.geometry.anchorPositions).map(v => v.y)))
    expect(projected.kind).toBe('ready')
    if (projected.kind !== 'ready') throw new Error('Expected written project projection')
    expect(transforms.verifyTerminalEquivalence(pr.session.projection.network, projected.projection.network).kind).toBe('equivalent')
    expect(JSON.stringify(p)).toBe(before)
  })
  it('uses actual values and metadata in the existing five lesson stages', () => {
    const p = drawnProject('series', true, [120, 330]), pr = preview(p, 'series')
    expect(pr.lesson?.kind).toBe('ready')
    if (pr.lesson?.kind !== 'ready') throw new Error('Expected lesson')
    const lesson = pr.lesson.lesson
    expect(lesson.steps).toHaveLength(5)
    expect(lesson.steps[2].substitutions.join(' ')).toContain('450')
    const values = lesson.variables.map(v => v.resistance).sort((a, b) => a - b)
    expect(values.slice(0, 2)).toEqual([120, 330]); expect(values[2]).toBeCloseTo(450, 10)
    expect(lesson.verification).toEqual(pr.evidence)
    expect(lesson.source).toEqual(pr.session.projection.network)
    expect(pr.result.kind === 'applied' && lesson.metadata).toEqual(pr.result.kind === 'applied' && pr.result.metadata)
  })
  it.each(circuitExamples.filter(e => ['series', 'parallel', 'delta', 'star', 'residual', 'bridge'].includes(e.id)))('writes back imported $id while retaining original wires, aliases and boundary ports', example => {
    const p = importV1Network(example.network, example.layout), s = session(p), pr = previewTransformation(s, s.candidates[0]!.id)
    expect(pr.evidence?.kind).toBe('equivalent')
    const next = writebackTransformation(p, pr), after = session(next)
    expect(transforms.verifyTerminalEquivalence(s.projection.network, after.projection.network).kind).toBe('equivalent')
    expect(next.sheets[0]!.ports).toEqual(p.sheets[0]!.ports)
    for (const connection of p.sheets[0]!.connections) expect(next.sheets[0]!.connections).toContainEqual(connection)
    expect(next.extensions['org.stray.v1']).toEqual(p.extensions['org.stray.v1'])
  })
  it('keeps an anchor-bound measurement and all-pairs numerical protection when its old pin becomes free', () => {
    const base = drawnProject('parallel'), probe = base.sheets[0]!.components[1]!.pins[1]!.anchorId, assetId = createId()
    const dataset: MeasurementDataset = { id: createId(), title: 'Measured node', kind: 'waveform', source: { kind: 'hardware', instrument: 'Fixture', acquisitionId: 'fixture', acquiredAtUtc: '2026-10-21T03:00:00Z', configuration: {} }, axis: { kind: 'uniform-time', startSeconds: 0, intervalSeconds: 0.001, count: 1 }, channels: [{ id: createId(), name: 'CH1', probeAnchorId: probe, samples: { assetId, encoding: 'float64-le', count: 1, unit: 'V' } }], metadata: {} }
    const p = createEngineeringProject({ ...base, assets: [{ id: assetId, mediaType: 'application/vnd.stray.float64-le', byteLength: 8, sha256: '0'.repeat(64) }], measurements: [dataset] })
    const pr = preview(p, 'parallel'), next = writebackTransformation(p, pr)
    expect(pr.session.projection.identities.syntheticTerminalIds).toHaveLength(1)
    expect(pr.evidence?.pairs).toHaveLength(3)
    expect(next.measurements).toEqual(p.measurements); expect(next.assets).toEqual(p.assets)
    expect(next.sheets[0]!.anchors).toContainEqual({ id: probe })
    const nets = deriveElectricalNets(next)
    expect(nets.anchorToNet[probe]).toBe(nets.anchorToNet[p.sheets[0]!.ports.find(port => port.label === 'B')!.anchorId])
  })
  it('protects temporary observations on the series center and verifies their mapped terminal', () => {
    const p = drawnProject('series'), center = p.sheets[0]!.components[0]!.pins[1]!.anchorId, s = session(p, [center])
    expect(s.candidates.filter(c => c.type === 'series')).toHaveLength(0)
    const probe = s.projection.identities.terminals.find(t => t.projectId === center)!
    expect(s.projection.identities.syntheticTerminalIds).toContain(probe.v1Id)
    expect(s.projection.protectedPointIds).toContain(s.projection.identities.points.find(pair => pair.projectId === center)!.v1Id)
    expect(p.sheets[0]!.ports).toHaveLength(2)
  })
  it('leaves previews with fewer than two terminals inconclusive and uncommittable', () => {
    const p = drawnProject('series', false), pr = preview(p, 'series'), before = JSON.stringify(p)
    expect(pr.result.kind).toBe('applied'); expect(pr.evidence?.kind).toBe('inconclusive')
    expect(() => writebackTransformation(p, pr)).toThrow(/数值/)
    expect(JSON.stringify(p)).toBe(before)
    expect(() => writebackTransformation(p, { ...pr, evidence: { kind: 'equivalent', pairs: [], reason: 'forged flag' } })).toThrow(/数值/)
  })
  it('honors a different numerical verdict without accidental writeback', () => {
    const p = drawnProject('parallel'), before = JSON.stringify(p)
    const verifier = vi.spyOn(transforms, 'verifyTerminalEquivalence').mockReturnValue({ kind: 'different', reason: 'Fixture: independent solver reports a mismatch', pairs: [] })
    try {
      const pr = preview(p, 'parallel')
      expect(pr.evidence?.kind).toBe('different')
      expect(() => writebackTransformation(p, pr)).toThrow(/数值/)
      expect(JSON.stringify(p)).toBe(before)
    } finally { verifier.mockRestore() }
  })
  it('surfaces existing transformation numerical failure, with no computed result or history edit', () => {
    const p = drawnProject('series', true, [1e308, 1e308]), pr = preview(p, 'series')
    expect(pr.result).toMatchObject({ kind: 'error', code: 'numerical-failure' })
    expect(pr.evidence).toBeNull(); expect(pr.lesson).toBeNull()
    expect(() => writebackTransformation(p, pr)).toThrow()
  })
  it('rejects stale revisions and candidates using the same protected boundary policy', () => {
    const p = drawnProject('series'), pr = preview(p, 'series')
    expect(() => previewTransformation(pr.session, 'stale')).toThrow()
    const changed = reviseProject(p, p.revision, { title: 'Changed title' })
    expect(() => writebackTransformation(changed, pr)).toThrow(/已改变/)
    expect(() => writebackTransformation(p, { ...pr, candidate: { ...pr.candidate, id: 'stale' } })).toThrow(/失效/)
  })
  it('commits the entire transformation as one undo entry, preserving IDs on redo', () => {
    const p = drawnProject('series'), next = writebackTransformation(p, preview(p, 'series'))
    const committed = commitSnapshot(createHistory(p), p.revision, next)
    expect(committed.past).toHaveLength(1)
    const undone = undoEdit(committed), redone = redoEdit(undone)
    expect(undone.present.sheets).toEqual(p.sheets)
    expect(redone.present.sheets).toEqual(next.sheets)
    expect(redone.present.extensions).toEqual(next.extensions)
    expect(new Set([p.revision, next.revision, undone.present.revision, redone.present.revision]).size).toBe(4)
    expect(() => commitSnapshot(undone, p.revision, next)).toThrow()
  })
  it('preserves unaffected components, routes, sheets, metadata and historical records', () => {
    let p = drawnProject('series'); const id = p.sheets[0]!.id
    p = applyEdit(p, id, { type: 'add', kind: 'resistor', position: { x: 800, y: 400 } })
    const other = emptySheet()
    p = createEngineeringProject({ ...p, sheets: [...p.sheets, other], extensions: { 'fixture.keep': { order: ['z', 'a'] } }, analyses: [{ id: createId(), analysisType: 'topology', scope: { kind: 'circuit', sheetIds: [other.id] }, options: {} }] })
    p = applyEdit(p, other.id, { type: 'add', kind: 'capacitor', position: { x: 200, y: 200 } })
    const unaffected = p.sheets[0]!.components.at(-1)!, placement = p.sheets[0]!.geometry.placements.find(v => v.componentId === unaffected.id)!
    const next = writebackTransformation(p, preview(p, 'series'))
    expect(next.sheets[0]!.components).toContainEqual(unaffected)
    expect(next.sheets[0]!.geometry.placements).toContainEqual(placement)
    expect(next.sheets[1]).toEqual(p.sheets[1]); expect(next.analyses).toEqual(p.analyses)
    expect(next.extensions['fixture.keep']).toEqual(p.extensions['fixture.keep'])
  })
  it('retains reference markers and synthetic labels without importing projection wires or terminals', () => {
    let p = drawnProject('parallel'); const id = p.sheets[0]!.id
    for (const component of p.sheets[0]!.components) p = applyEdit(p, id, { type: 'marker', kind: 'ground', at: { anchorId: component.pins[0]!.anchorId } })
    p = applyEdit(p, id, { type: 'marker', kind: 'reference', at: { anchorId: p.sheets[0]!.components[0]!.pins[1]!.anchorId } })
    const pr = preview(p, 'parallel'), next = writebackTransformation(p, pr), s = next.sheets[0]!
    expect(pr.session.projection.identities.syntheticWireIds.length).toBeGreaterThan(0)
    expect(s.labels).toEqual(p.sheets[0]!.labels); expect(s.references).toEqual(p.sheets[0]!.references)
    expect(s.ports).toEqual(p.sheets[0]!.ports)
    expect(s.connections.length).toBe(p.sheets[0]!.connections.length + 2)
    expect(s.connections.every(c => !pr.session.projection.identities.syntheticWireIds.includes(c.id))).toBe(true)
  })
  it('does not rescue an observed pin identity merely by preserving its electrical node', () => {
    const base = drawnProject('parallel'), pin = base.sheets[0]!.components[0]!.pins[0]!
    const p = createEngineeringProject({ ...base, analyses: [{ id: createId(), analysisType: 'topology', scope: { kind: 'circuit', sheetIds: [base.sheets[0]!.id] }, options: { probePinIds: [pin.id] } }] })
    const pr = preview(p, 'parallel')
    expect(pr.evidence?.kind).toBe('equivalent'); expect(pr.writebackIssue).toMatch(/引脚/)
    expect(() => writebackTransformation(p, pr)).toThrow(/重绑定/)
  })
  it('rejects removing a PCB-mapped component without changing its assignment', () => {
    const base = drawnProject('parallel'), c = base.sheets[0]!.components[0]!, assetId = createId()
    const p = createEngineeringProject({ ...base, assets: [{ id: assetId, mediaType: 'application/json', byteLength: 2, sha256: '0'.repeat(64) }], boards: [{ id: createId(), title: 'Board', sourceRevision: base.revision, sourceDigest: '0'.repeat(64), checks: [], assignments: [{ id: createId(), componentId: c.id, footprint: { id: 'fixture.resistor', version: '1' }, footprintAssetId: assetId, pinPadMappings: c.pins.map(pin => ({ instancePinId: pin.id, padKeys: [pin.definitionPinKey] })) }] }] })
    const pr = preview(p, 'parallel')
    expect(pr.evidence?.kind).toBe('equivalent'); expect(pr.writebackIssue).toMatch(/PCB/)
    expect(() => writebackTransformation(p, pr)).toThrow(/PCB/)
  })
  it('rejects unsupported mixed sheets without silently dropping a disconnected capacitor', () => {
    const base = drawnProject('series'), p = applyEdit(base, base.sheets[0]!.id, { type: 'add', kind: 'capacitor', position: { x: 800, y: 400 } })
    expect(discoverForProject(p, p.sheets[0]!.id)).toMatchObject({ kind: 'unsupported', reasons: [{ code: 'unsupported-component-model' }] })
    expect(p.sheets[0]!.components).toHaveLength(3)
  })
  it('rejects cross-sheet label connectivity and unknown analysis observations', () => {
    const base = drawnProject('series'), other = emptySheet(), anchor = createId()
    const s = { ...other, anchors: [{ id: anchor }], labels: [{ id: createId(), anchorId: anchor, name: 'BUS', scope: 'project' as const }] }
    const p = createEngineeringProject({ ...base, sheets: [{ ...base.sheets[0]!, labels: [{ id: createId(), anchorId: base.sheets[0]!.anchors[0]!.id, name: 'BUS', scope: 'project' }] }, s] })
    expect(discoverForProject(p, p.sheets[0]!.id)).toMatchObject({ kind: 'unsupported', reasons: [{ code: 'cross-sheet-connectivity' }] })
    const unknown = createEngineeringProject({ ...base, analyses: [{ id: createId(), analysisType: 'unknown', scope: { kind: 'circuit', sheetIds: [base.sheets[0]!.id] }, options: {} }] })
    expect(discoverForProject(unknown, unknown.sheets[0]!.id).kind).toBe('unsupported')
  })
  it('round trips committed IDs, observations, geometry and complete numerical provenance', async () => {
    const p = drawnProject('delta-to-star'), next = writebackTransformation(p, preview(p, 'delta-to-star'))
    const text = await serializeProject(await createProjectDocument(next, { name: 'Integration fixture', version: '0.1.0' }))
    const result = await deserializeProject(text)
    expect(result.kind).toBe('ready')
    if (result.kind !== 'ready') throw new Error('Expected project round trip')
    expect(await serializeProject(result.document)).toBe(text)
    expect(deriveElectricalNets(result.document.project)).toEqual(deriveElectricalNets(next))
    expect(result.document.project.extensions['org.stray.transformations']).toMatchObject([{ sourceRevision: p.revision, resultRevision: next.revision, verification: { kind: 'equivalent' } }])
    const nextSession = session(result.document.project)
    expect(nextSession.candidates.some(c => c.type === 'star-to-delta')).toBe(true)
  })
})
