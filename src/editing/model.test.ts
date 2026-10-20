// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createEngineeringProject, createId, deriveElectricalNets, instantiateComponent } from '../engineering'
import type { EngineeringProject } from '../engineering'
import { createProjectDocument, deserializeProject, serializeProject } from '../project-format'
import { multiPinDefinition, resistorProject } from '../../tests/v2-fixtures'
import { applyEdit, newEditorProject, PALETTE } from './model'
import type { EditOperation, PaletteKind } from './model'
import { commitEdit, createHistory, redoEdit, undoEdit } from './history'
import { buildEditorView, nearestAnchor } from '../editor/view'

function edit(project: EngineeringProject, op: EditOperation) { return applyEdit(project, project.sheets[0]!.id, op) }
function pair() {
  let p = edit(newEditorProject(), { type: 'add', kind: 'resistor', position: { x: 200, y: 200 } })
  p = edit(p, { type: 'add', kind: 'resistor', position: { x: 400, y: 200 } })
  const [a, b] = p.sheets[0]!.components
  return { p, a: a!, b: b! }
}

describe('engineering editing transactions', () => {
  it.each(Object.keys(PALETTE) as PaletteKind[])('places %s using pinned definitions and unique pin anchors', kind => {
    const initial = newEditorProject(), p = edit(initial, { type: 'add', kind, position: { x: 203, y: 198 } }), s = p.sheets[0]!, c = s.components[0]!
    expect(initial.sheets[0]!.components).toHaveLength(0)
    expect(p.id).toBe(initial.id); expect(p.revision).not.toBe(initial.revision)
    expect(p.definitions[0]!.resource.version).toBe('1')
    expect(c.pins).toHaveLength(2); expect(new Set(c.pins.map(pin => pin.anchorId)).size).toBe(2)
    expect(s.geometry.placements[0]!.origin).toEqual({ x: 200, y: 200 })
    expect(s.geometry.anchorPositions[c.pins[0]!.anchorId]).toEqual({ x: 160, y: 200 })
  })
  it('connects explicit pins, moves and rotates without changing graph or identities', () => {
    let { p } = pair(); const [a, b] = p.sheets[0]!.components
    p = edit(p, { type: 'connect', from: { anchorId: a!.pins[1]!.anchorId }, to: { anchorId: b!.pins[0]!.anchorId } })
    const before = p.sheets[0]!, nets = deriveElectricalNets(p)
    p = edit(p, { type: 'move', id: a!.id, position: { x: 240, y: 300 } })
    p = edit(p, { type: 'rotate', id: a!.id })
    expect(p.sheets[0]!.components).toEqual(before.components)
    expect(p.sheets[0]!.connections).toEqual(before.connections)
    expect(deriveElectricalNets(p).nets).toEqual(nets.nets)
    expect(deriveElectricalNets(p).anchorToNet).toEqual(nets.anchorToNet)
    expect(p.sheets[0]!.geometry.anchorPositions[a!.pins[1]!.anchorId]).toEqual({ x: 240, y: 340 })
    expect(p.sheets[0]!.geometry.connectionRoutes[before.connections[0]!.id]![0]).toEqual({ x: 240, y: 340 })
  })
  it('overlapping components remain electrically distinct', () => {
    const { p: initial, a, b } = pair(); const p = edit(initial, { type: 'move', id: b.id, position: { x: 200, y: 200 } })
    const nets = deriveElectricalNets(p)
    expect(nets.anchorToNet[a.pins[0]!.anchorId]).not.toBe(nets.anchorToNet[b.pins[0]!.anchorId])
  })
  it('crossing wires stay separate until an explicit junction transaction', () => {
    let p = newEditorProject()
    for (const [from, to] of [[{ x: 100, y: 200 }, { x: 500, y: 200 }], [{ x: 300, y: 100 }, { x: 300, y: 300 }]] as const)
      p = edit(p, { type: 'connect', from: { position: from }, to: { position: to } })
    const s = p.sheets[0]!, original = JSON.stringify(p)
    expect(deriveElectricalNets(p).nets).toHaveLength(2)
    const joined = edit(p, { type: 'junction', connectionId: s.connections[0]!.id, position: { x: 300, y: 200 } })
    expect(deriveElectricalNets(joined).nets).toHaveLength(1)
    expect(joined.sheets[0]!.connections).toHaveLength(4)
    expect(joined.sheets[0]!.anchors).toHaveLength(5)
    expect(JSON.stringify(p)).toBe(original)
    const history = undoEdit(commitEdit(createHistory(p), s.id, { type: 'junction', connectionId: s.connections[0]!.id, position: { x: 300, y: 200 } }))
    expect(history.present.sheets).toEqual(p.sheets)
  })
  it('joins coincident endpoints only through explicit graph edges', () => {
    let p = newEditorProject()
    for (const [from, to] of [[{ x: 100, y: 100 }, { x: 200, y: 100 }], [{ x: 200, y: 100 }, { x: 300, y: 100 }]] as const)
      p = edit(p, { type: 'connect', from: { position: from }, to: { position: to } })
    expect(deriveElectricalNets(p).nets).toHaveLength(2)
    p = edit(p, { type: 'junction', connectionId: p.sheets[0]!.connections[0]!.id, position: { x: 200, y: 100 } })
    expect(deriveElectricalNets(p).nets).toHaveLength(1)
  })
  it('references do not connect; labels obey scope and GND explicitly connects', () => {
    const { p: original, a, b } = pair(); let p = original
    for (const c of [a, b]) p = edit(p, { type: 'marker', kind: 'reference', at: { anchorId: c.pins[0]!.anchorId } })
    expect(deriveElectricalNets(p).nets).toHaveLength(4)
    p = edit(p, { type: 'marker', kind: 'label', at: { anchorId: a.pins[1]!.anchorId }, name: 'BUS', scope: 'sheet' })
    p = edit(p, { type: 'marker', kind: 'label', at: { anchorId: b.pins[1]!.anchorId }, name: 'BUS', scope: 'project' })
    expect(deriveElectricalNets(p).nets).toHaveLength(4)
    for (const c of [a, b]) p = edit(p, { type: 'marker', kind: 'ground', at: { anchorId: c.pins[0]!.anchorId } })
    expect(deriveElectricalNets(p).nets).toHaveLength(3)
    const label = p.sheets[0]!.labels.find(l => l.name === 'GND')!
    p = edit(p, { type: 'remove-marker', id: label.id })
    expect(deriveElectricalNets(p).nets).toHaveLength(4)
  })
  it('renames and changes resistance while preserving stable IDs', () => {
    const { p, a } = pair(), next = edit(p, { type: 'properties', id: a.id, reference: 'R_LOAD', parameters: { resistance: { kind: 'quantity', quantity: { value: 330, unit: 'ohm' } } } })
    const c = next.sheets[0]!.components[0]!
    expect(c.id).toBe(a.id); expect(c.pins).toEqual(a.pins); expect(c.definitionId).toBe(a.definitionId)
    expect(c.reference).toBe('R_LOAD'); expect(c.parameters.resistance).toEqual({ kind: 'quantity', quantity: { value: 330, unit: 'ohm' } })
  })
  it('rejects duplicate identifiers, invalid resistance, stale endpoints and self/duplicate wires atomically', () => {
    const { p, a, b } = pair(), before = JSON.stringify(p)
    const invalid: EditOperation[] = [
      { type: 'properties', id: a.id, reference: b.reference, parameters: a.parameters },
      { type: 'properties', id: a.id, reference: '', parameters: a.parameters },
      { type: 'properties', id: a.id, reference: a.reference, parameters: { resistance: { kind: 'quantity', quantity: { value: -1, unit: 'ohm' } } } },
      { type: 'connect', from: { anchorId: a.pins[0]!.anchorId }, to: { anchorId: a.pins[0]!.anchorId } },
      { type: 'connect', from: { anchorId: createId() }, to: { anchorId: b.pins[0]!.anchorId } },
      { type: 'delete', selection: { kind: 'anchor', id: a.pins[0]!.anchorId } },
      { type: 'marker', kind: 'label', at: { position: { x: 0, y: 0 } }, name: ' ' },
      { type: 'junction', connectionId: createId(), position: { x: 0, y: 0 } },
    ]
    for (const op of invalid) expect(() => edit(p, op)).toThrow()
    const op: EditOperation = { type: 'connect', from: { anchorId: a.pins[0]!.anchorId }, to: { anchorId: b.pins[0]!.anchorId } }
    expect(() => edit(edit(p, op), op)).toThrow()
    expect(JSON.stringify(p)).toBe(before)
  })
  it('deletes wires separately and removes owned pins/routes when deleting a component', () => {
    const { p: initial, a, b } = pair(), p = edit(initial, { type: 'connect', from: { anchorId: a.pins[0]!.anchorId }, to: { anchorId: b.pins[0]!.anchorId } })
    const edge = p.sheets[0]!.connections[0]!
    const noWire = edit(p, { type: 'delete', selection: { kind: 'connection', id: edge.id } })
    expect(noWire.sheets[0]!.anchors).toEqual(p.sheets[0]!.anchors)
    expect(deriveElectricalNets(noWire).nets).toHaveLength(4)
    const removed = edit(p, { type: 'delete', selection: { kind: 'component', id: a.id } }).sheets[0]!
    expect(removed.components).toEqual([b]); expect(removed.anchors).toHaveLength(2)
    expect(removed.connections).toHaveLength(0); expect(removed.geometry.connectionRoutes).toEqual({})
  })
  it('preserves unsupported engineering metadata and blocks destructive unknown analysis edits', () => {
    const { p: initial, a } = pair()
    const p = createEngineeringProject({ ...initial, extensions: { 'org.stray.owner': { text: '保留' } }, analyses: [{ id: createId(), analysisType: 'future-analysis', scope: { kind: 'circuit', sheetIds: [initial.sheets[0]!.id] }, options: {} }] })
    const moved = edit(p, { type: 'move', id: a.id, position: { x: 100, y: 100 } })
    expect(moved.analyses).toEqual(p.analyses); expect(moved.extensions).toEqual(p.extensions)
    expect(() => edit(p, { type: 'delete', selection: { kind: 'component', id: a.id } })).toThrow(/分析引用/)
  })
  it('places a five-pin imported component through the same geometry operation', () => {
    const initial = newEditorProject(), def = multiPinDefinition(), instance = instantiateComponent(def, 'U1', {})
    const p = createEngineeringProject({ ...initial, definitions: [def], sheets: [{ ...initial.sheets[0]!, components: [instance.component], anchors: instance.anchors }] })
    const placed = edit(p, { type: 'move', id: instance.component.id, position: { x: 200, y: 200 } })
    expect(placed.sheets[0]!.geometry.placements).toHaveLength(1)
    expect(Object.keys(placed.sheets[0]!.geometry.anchorPositions)).toHaveLength(5)
    expect(placed.sheets[0]!.components).toEqual(p.sheets[0]!.components)
  })
  it('undo/redo restores content and IDs with fresh revisions; new edits clear redo', () => {
    const p = newEditorProject(), s = p.sheets[0]!.id
    const added = commitEdit(createHistory(p), s, { type: 'add', kind: 'resistor', position: { x: 200, y: 200 } })
    const undone = undoEdit(added), redone = redoEdit(undone)
    expect(undone.present.sheets).toEqual(p.sheets)
    expect(redone.present.sheets).toEqual(added.present.sheets)
    expect(new Set([p.revision, added.present.revision, undone.present.revision, redone.present.revision]).size).toBe(4)
    expect(commitEdit(undone, s, { type: 'title', title: 'Branch' }).future).toEqual([])
    expect(undoEdit(createHistory(p)).present).toEqual(p)
  })
  it('drag preview and anchor snapping never mutate data or history', () => {
    const { p, a } = pair(), h = createHistory(p), before = JSON.stringify(p)
    const preview = buildEditorView(p, p.sheets[0]!.id, { id: a.id, origin: { x: 300, y: 300 } })
    expect(preview.positions[a.pins[0]!.anchorId]).toEqual({ x: 260, y: 300 })
    expect(nearestAnchor(preview.positions, { x: 263, y: 301 })).toBe(a.pins[0]!.anchorId)
    expect(nearestAnchor(preview.positions, { x: 800, y: 500 })).toBeUndefined()
    expect(JSON.stringify(p)).toBe(before); expect(h.past).toHaveLength(0)
    const committed = commitEdit(h, p.sheets[0]!.id, { type: 'move', id: a.id, position: { x: 300, y: 300 } })
    expect(committed.past).toHaveLength(1)
  })
  it('round trips edited project geometry, metadata and stable connectivity through B format', async () => {
    const { p: initial, a, b } = pair()
    let p = edit(initial, { type: 'connect', from: { anchorId: a.pins[1]!.anchorId }, to: { anchorId: b.pins[0]!.anchorId } })
    p = createEngineeringProject({ ...p, extensions: { 'org.stray.notes': ['保留', true, 42] } })
    const doc = await createProjectDocument(p, { name: 'Editor test', version: '0.1.0' })
    const result = await deserializeProject(await serializeProject(doc))
    expect(result.kind).toBe('ready')
    if (result.kind !== 'ready') throw new Error('Expected ready')
    expect(await serializeProject(result.document)).toBe(await serializeProject(doc))
    expect(deriveElectricalNets(result.document.project)).toEqual(deriveElectricalNets(p))
  })
  it('imported electrically valid geometry-free projects remain available for placement', () => {
    const p = resistorProject(), view = buildEditorView(p, p.sheets[0]!.id)
    expect(view.unplaced).toHaveLength(1); expect(view.missingAnchors).toHaveLength(2)
    const placed = edit(p, { type: 'move', id: p.sheets[0]!.components[0]!.id, position: { x: 200, y: 200 } })
    expect(placed.sheets[0]!.ports).toEqual(p.sheets[0]!.ports)
  })
})
