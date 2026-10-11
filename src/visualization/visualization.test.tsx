import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createCircuitNetwork, resistanceOhms } from '../domain'
import { applyTransformation, discoverTransformations } from '../transforms'
import { buildDrawing } from './layout'
import { circuitExamples } from './examples'
import { CircuitDiagram } from './CircuitDiagram'
import type { CircuitLayout, CircuitViewModel, DrawingResult } from './types'

function ready(result: DrawingResult): CircuitViewModel {
  expect(result.kind).toBe('ready')
  if (result.kind !== 'ready') throw new Error(result.message)
  return result.model
}
function example(id: string) {
  const value = circuitExamples.find(e => e.id === id)
  if (!value) throw new Error('Missing fixture')
  return value
}

describe('M4 drawing model and SVG', () => {
  it.each(circuitExamples.map(e => ({ id: e.id, e })))('renders every declared element and point in $id', ({ e }) => {
    const drawing = buildDrawing(e.network, e.layout)
    const model = ready(drawing)
    const { container } = render(<CircuitDiagram drawing={drawing} title="测试电路" />)
    expect(model.elements).toHaveLength(e.network.elements.length)
    expect(container.querySelectorAll('[data-element-id]')).toHaveLength(e.network.elements.length)
    expect(container.querySelectorAll('[data-point-id]')).toHaveLength(e.network.points.length)
    expect(container.querySelectorAll('[data-terminal-id]')).toHaveLength(e.network.terminals.length)
    for (const e of model.elements) if (e.element.kind === 'resistor') {
      expect(screen.getByRole('button', { name: new RegExp(`${e.element.id} · ${e.element.resistance} Ω`) })).toBeInTheDocument()
    }
  })

  it('draws three parallel resistor branches with distinct paths and centers', () => {
    const e = example('parallel')
    const model = ready(buildDrawing(e.network, e.layout))
    expect(new Set(model.elements.map(e => JSON.stringify(e.route))).size).toBe(3)
    expect(new Set(model.elements.map(e => e.center.y)).size).toBe(3)
    expect(model.topology.nodes).toHaveLength(2)
  })

  it('marks a wire-bypassed resistor without hiding it or its resistance', () => {
    const e = example('bypass')
    const { container } = render(<CircuitDiagram drawing={buildDrawing(e.network, e.layout)} title="旁路" />)
    expect(container.querySelector('[data-element-id="R1"]')).toHaveAttribute('data-shorted', 'true')
    expect(screen.getByRole('button', { name: /100 Ω（已短接）/ })).toBeInTheDocument()
    expect(container.querySelectorAll('[data-element-id]')).toHaveLength(2)
  })

  it('uses gaps at unconnected crossings and adds no junction at the intersection', () => {
    const e = example('crossing')
    const model = ready(buildDrawing(e.network, e.layout))
    const { container } = render(<CircuitDiagram drawing={{ kind: 'ready', model }} title="交叉" />)
    expect(model.topology.nodes).toHaveLength(2)
    expect(model.topology.pointToNode.A).not.toBe(model.topology.pointToNode.C)
    expect(container.querySelectorAll('.crossing-gap')).toHaveLength(2)
    expect(container.querySelector('circle[cx="280"][cy="200"]')).toBeNull()
  })

  it('draws an explicit junction at a connected wire crossing', () => {
    const network = createCircuitNetwork({ id: 'junction', points: ['A', 'B', 'C', 'D', 'N'].map(id => ({ id })), terminals: [], elements: ['A', 'B', 'C', 'D'].map(id => ({ id: `W${id}`, kind: 'wire', endpoints: [id, 'N'] })) })
    const layout: CircuitLayout = { pointPositions: { A: { x: 80, y: 80 }, B: { x: 480, y: 320 }, C: { x: 80, y: 320 }, D: { x: 480, y: 80 }, N: { x: 280, y: 200 } } }
    const drawing = buildDrawing(network, layout)
    expect(ready(drawing).topology.nodes).toHaveLength(1)
    const { container } = render(<CircuitDiagram drawing={drawing} title="连接交叉" />)
    expect(container.querySelector('[data-point-id="N"] .junction-dot')).toHaveAttribute('cx', '280')
  })

  it('shows each original point with its M1 electrical-node identity and terminal ID', () => {
    const e = example('residual')
    const model = ready(buildDrawing(e.network, e.layout))
    const { container } = render(<CircuitDiagram drawing={{ kind: 'ready', model }} title="节点" />)
    expect(container.querySelector('[data-point-id="N"]')).toHaveAttribute('data-node-id', model.topology.pointToNode.X)
    expect(container.querySelector('[data-terminal-id="terminal-A"]')).toHaveTextContent('A')
  })

  it('supports keyboard inspection with actual endpoints and values', () => {
    const e = example('series')
    render(<CircuitDiagram drawing={buildDrawing(e.network, e.layout)} title="检查" />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'R1 · 100 Ω' }), { key: 'Enter' })
    expect(screen.getByText(/R1：100 Ω；连接点 A ↔ N；电气节点 node:A ↔ node:N/)).toBeInTheDocument()
  })

  it.each(['series', 'parallel', 'delta', 'star'])('adapts actual M3 %s results and preserves terminal labels/positions', id => {
    const e = example(id)
    const discovery = discoverTransformations(e.network)
    if (discovery.kind !== 'candidates') throw new Error('Discovery failed')
    const candidate = discovery.candidates[0]!
    const result = applyTransformation({ network: e.network, type: candidate.type, elementIds: candidate.elementIds })
    if (result.kind !== 'applied') throw new Error('Transformation failed')
    const before = ready(buildDrawing(e.network, e.layout))
    const after = ready(buildDrawing(result.network, undefined, { previous: before.layout, createdPointIds: result.metadata.createdPointIds, boundaryPointIds: before.topology.nodes.filter(n => result.metadata.boundaryNodeIds.includes(n.id)).flatMap(n => n.pointIds) }))
    const { container } = render(<CircuitDiagram drawing={{ kind: 'ready', model: after }} title="之后" replacementIds={result.metadata.replacementResistorIds} affectedNodeIds={result.metadata.createdNodeIds} />)
    expect(result.network.terminals).toEqual(e.network.terminals)
    for (const terminal of e.network.terminals) {
      expect(after.layout.pointPositions[terminal.pointId]).toEqual(before.layout.pointPositions[terminal.pointId])
      expect(container.querySelector(`[data-terminal-id="${terminal.id}"]`)).toHaveTextContent(terminal.label)
    }
    for (const id of result.metadata.replacementResistorIds) expect(container.querySelector(`[data-element-id="${id}"]`)).toHaveAttribute('data-state', 'replacement')
    for (const id of result.metadata.originalResistorIds) expect(container.querySelector(`[data-element-id="${id}"]`)).toBeNull()
  })

  it('distinguishes selected, replacement and unaffected resistors, plus affected nodes', () => {
    const e = example('bridge')
    const { container } = render(<CircuitDiagram drawing={buildDrawing(e.network, e.layout)} title="高亮" selectedIds={['R1']} replacementIds={['R2']} affectedNodeIds={['node:U']} />)
    expect(container.querySelector('[data-element-id="R1"]')).toHaveAttribute('data-state', 'selected')
    expect(container.querySelector('[data-element-id="R2"]')).toHaveAttribute('data-state', 'replacement')
    expect(container.querySelector('[data-element-id="R5"]')).toHaveAttribute('data-state', 'unaffected')
    expect(container.querySelector('[data-point-id="U"]')).toHaveAttribute('data-affected', 'true')
  })

  it('places disconnected retained center wires and isolated points in a labeled separate area', () => {
    const e = example('residual')
    const result = applyTransformation({ network: e.network, type: 'series', elementIds: ['R1', 'R2'] })
    if (result.kind !== 'applied') throw new Error('Transformation failed')
    const model = ready(buildDrawing(result.network, e.layout))
    expect(model.residualPointIds).toEqual(['N', 'X', 'Z'])
    expect(model.layout.pointPositions.N?.y).toBeGreaterThan(435)
    expect(model.elements.some(e => e.element.id === 'W1')).toBe(true)
    render(<CircuitDiagram drawing={{ kind: 'ready', model }} title="残留" />)
    expect(screen.getByText(/独立分量 \/ 孤立连接点/)).toBeInTheDocument()
  })

  it('draws disconnected resistors and explicit self-loops', () => {
    const network = createCircuitNetwork({ id: 'loops', points: ['A', 'B', 'X', 'Y'].map(id => ({ id })), terminals: [{ id: 'a', label: 'A', pointId: 'A' }], elements: [{ id: 'loop', kind: 'resistor', endpoints: ['A', 'A'], resistance: resistanceOhms(50) }, { id: 'floating', kind: 'resistor', endpoints: ['X', 'Y'], resistance: resistanceOhms(75) }] })
    const model = ready(buildDrawing(network))
    expect(model.elements.find(e => e.element.id === 'loop')?.route).toHaveLength(6)
    expect(model.elements.find(e => e.element.id === 'loop')?.shorted).toBe(true)
    expect(model.residualPointIds).toContain('X')
    expect(model.elements).toHaveLength(2)
  })

  it('is deterministic across calls and collection permutations without modifying inputs', () => {
    const e = example('bridge')
    const snapshot = JSON.stringify(e)
    const first = ready(buildDrawing(e.network))
    const reordered = ready(buildDrawing({ ...e.network, points: [...e.network.points].reverse(), elements: [...e.network.elements].reverse(), terminals: [...e.network.terminals].reverse() }))
    expect(first.layout).toEqual(reordered.layout)
    expect(first.elements).toEqual(reordered.elements)
    expect(first.topology).toEqual(reordered.topology)
    // The source network remains in its original order inside the model.
    expect(JSON.stringify(e)).toBe(snapshot)
  })

  it('keeps input and template coordinates unchanged', () => {
    const e = example('delta')
    const snapshot = JSON.stringify(e)
    expect(buildDrawing(e.network, e.layout)).toEqual(buildDrawing(e.network, e.layout))
    expect(JSON.stringify(e)).toBe(snapshot)
  })

  it('reports unsupported resource bounds without returning a partial drawing', () => {
    const network = createCircuitNetwork({ id: 'large', points: Array.from({ length: 17 }, (_, i) => ({ id: `P${i}` })), elements: [], terminals: [] })
    const drawing = buildDrawing(network)
    expect(drawing.kind).toBe('unsupported')
    render(<CircuitDiagram drawing={drawing} title="不支持" />)
    expect(screen.getByRole('alert')).toHaveTextContent('最多 16 个连接点')
  })

  it('reports invalid coordinates rather than silently omitting an element', () => {
    const e = example('series')
    expect(buildDrawing(e.network, { pointPositions: { A: { x: NaN, y: 100 } } }).kind).toBe('unsupported')
  })

  it('refuses a point lying on an unrelated wire instead of drawing a false junction', () => {
    const e = example('crossing')
    const network = createCircuitNetwork({ ...e.network, points: [...e.network.points, { id: 'N' }] })
    const drawing = buildDrawing(network, { pointPositions: { ...e.layout.pointPositions, N: { x: 280, y: 200 } } })
    // N is residual and is intentionally relocated, so use an external terminal
    // to keep its requested position in the active drawing.
    expect(ready(drawing).residualPointIds).toContain('N')
    const anchored = createCircuitNetwork({ ...network, terminals: [...network.terminals, { id: 'n', label: 'N', pointId: 'N' }] })
    expect(buildDrawing(anchored, { pointPositions: { ...e.layout.pointPositions, N: { x: 280, y: 200 } } }).kind).toBe('unsupported')
  })

  it('renders every available example transformation without losing unaffected elements', () => {
    for (const e of circuitExamples) {
      const discovery = discoverTransformations(e.network)
      if (discovery.kind !== 'candidates') throw new Error('Discovery failed')
      for (const candidate of discovery.candidates) {
        const result = applyTransformation({ network: e.network, type: candidate.type, elementIds: candidate.elementIds })
        if (result.kind !== 'applied') throw new Error('Transformation failed')
        const before = ready(buildDrawing(e.network, e.layout))
        const drawing = buildDrawing(result.network, undefined, { previous: before.layout, createdPointIds: result.metadata.createdPointIds, boundaryPointIds: before.topology.nodes.filter(n => result.metadata.boundaryNodeIds.includes(n.id)).flatMap(n => n.pointIds.slice(0, 1)) })
        expect(drawing.kind, `${e.id} ${candidate.id} ${drawing.kind === 'unsupported' ? drawing.message : ''}`).toBe('ready')
        const after = ready(drawing)
        expect(after.elements).toHaveLength(result.network.elements.length)
        for (const original of e.network.elements.filter(element => !candidate.elementIds.includes(element.id))) {
          expect(after.elements.find(e => e.element.id === original.id)?.element).toEqual(original)
        }
      }
    }
  })

  it('inspects node and terminal identity using keyboard activation', () => {
    const e = example('series')
    render(<CircuitDiagram drawing={buildDrawing(e.network, e.layout)} title="节点检查" />)
    fireEvent.keyDown(screen.getByRole('button', { name: '连接点 A；电气节点 node:A；端子 A' }), { key: ' ' })
    expect(screen.getByText('连接点 A；电气节点 node:A；端子 A (terminal-A)')).toBeInTheDocument()
  })
})
