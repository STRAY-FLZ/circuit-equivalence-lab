// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createEmptyProject, createEngineeringProject, createId, deriveElectricalNets, reviseProject } from './index'
import { draft, emptySheet, resistorProject } from '../../tests/v2-fixtures'

describe('V2 electrical connectivity snapshots', () => {
  it('does not connect component pins through a resistor or infer geometry intersections', () => {
    expect(deriveElectricalNets(resistorProject()).nets).toHaveLength(2)
    const s = draft(emptySheet())
    s.anchors = Array.from({ length: 4 }, () => ({ id: createId() }))
    const [a,b,c,d] = s.anchors.map(a => a.id) as [string,string,string,string]
    s.connections = [{ id: createId(), endpoints: [a,b] }, { id: createId(), endpoints: [c,d] }]
    s.geometry.anchorPositions = { [a]: { x: 0, y: 0 }, [b]: { x: 10, y: 10 }, [c]: { x: 0, y: 10 }, [d]: { x: 10, y: 0 } }
    const p = createEngineeringProject({ ...createEmptyProject(), sheets: [s] }), before = deriveElectricalNets(p)
    expect(before.nets).toHaveLength(2)
    const joined = reviseProject(p, p.revision, { sheets: [{ ...s, connections: [...s.connections, { id: createId(), endpoints: [b,c] }] }] })
    expect(deriveElectricalNets(joined).nets).toHaveLength(1)
  })
  it('keeps coincident isolated anchors and same-domain reference markers electrically separate', () => {
    const s = draft(emptySheet()), a = createId(), b = createId()
    s.anchors = [{ id: a }, { id: b }]
    s.references = [a,b].map(anchorId => ({ id: createId(), anchorId, domain: 'analog' }))
    s.geometry.anchorPositions = { [a]: { x: 0, y: 0 }, [b]: { x: 0, y: 0 } }
    expect(deriveElectricalNets(createEngineeringProject({ ...createEmptyProject(), sheets: [s] })).nets).toHaveLength(2)
  })
  it('implements precise local/project GND label scope and case-sensitive names', () => {
    const sheets = [emptySheet(),emptySheet()].map(s => ({ ...s, anchors: [{ id: createId() }, { id: createId() }, { id: createId() }] }))
    const labelled = sheets.map(s => ({ ...s, labels: s.anchors.map((a,i) => ({ id: createId(), anchorId: a.id, name: i === 2 ? 'gnd' : 'GND', scope: i === 0 ? 'sheet' as const : 'project' as const })) }))
    const p = createEngineeringProject({ ...createEmptyProject(), sheets: labelled }), nets = deriveElectricalNets(p)
    expect(nets.nets).toHaveLength(4)
    expect(nets.anchorToNet[labelled[0]!.anchors[1]!.id]).toBe(nets.anchorToNet[labelled[1]!.anchors[1]!.id])
    expect(nets.anchorToNet[labelled[0]!.anchors[0]!.id]).not.toBe(nets.anchorToNet[labelled[1]!.anchors[0]!.id])
    expect(nets.anchorToNet[labelled[0]!.anchors[0]!.id]).not.toBe(nets.anchorToNet[labelled[0]!.anchors[1]!.id])
  })
  it('retains source IDs while derived keys change after merging/splitting', () => {
    const p = resistorProject(), s = p.sheets[0]!, a = s.anchors[0]!.id, b = s.anchors[1]!.id
    const before = deriveElectricalNets(p)
    const joined = reviseProject(p,p.revision,{ sheets: [{ ...s, connections: [{ id: createId(), endpoints: [a,b] }] }] })
    const after = deriveElectricalNets(joined)
    expect(after.projectRevision).toBe(joined.revision)
    expect(after.nets[0]?.key).toBe(`net:${[a,b].sort()[0]!}`)
    expect([a,b].some(id => before.anchorToNet[id] !== after.anchorToNet[id])).toBe(true)
    expect(joined.sheets[0]?.components).toEqual(s.components)
    const split = reviseProject(joined,joined.revision,{ sheets: [s] })
    expect(deriveElectricalNets(split).nets).toEqual(before.nets)
  })
  it('produces deterministic frozen snapshots under reordered graph input and redundant edges', () => {
    const p = resistorProject(), s = p.sheets[0]!, a = s.anchors[0]!.id, b = s.anchors[1]!.id
    const connected = createEngineeringProject({ ...p, sheets: [{ ...s, connections: [{ id: createId(), endpoints: [a,b] }, { id: createId(), endpoints: [b,a] }, { id: createId(), endpoints: [a,a] }] }] })
    const reordered = createEngineeringProject({ ...connected, sheets: [{ ...connected.sheets[0]!, anchors: [...s.anchors].reverse(), connections: [...connected.sheets[0]!.connections].reverse() }] })
    expect(deriveElectricalNets(reordered)).toEqual(deriveElectricalNets(connected))
    expect(Object.isFrozen(deriveElectricalNets(p).anchorToNet)).toBe(true)
  })
})
