// @vitest-environment node
import { expect, it } from 'vitest'
import { createCircuitNetwork, resistanceOhms } from '../domain'
import { analyzeTopology } from '../topology'
import { assembleNodalSystem } from './nodal-system'

it('D4: stamps the analytically derived symmetric reduced matrix and current vector', () => {
  const t = analyzeTopology(createCircuitNetwork({
    id: 'matrix', points: ['A', 'B', 'X', 'Z'].map(id => ({ id })),
    terminals: ['A', 'B'].map(id => ({ id, label: id, pointId: id })),
    elements: [
      { id: 'ax1', kind: 'resistor', endpoints: ['A', 'X'], resistance: resistanceOhms(2) },
      { id: 'ax2', kind: 'resistor', endpoints: ['X', 'A'], resistance: resistanceOhms(4) },
      { id: 'xb', kind: 'resistor', endpoints: ['X', 'B'], resistance: resistanceOhms(8) },
      { id: 'ab', kind: 'resistor', endpoints: ['A', 'B'], resistance: resistanceOhms(16) },
      { id: 'loop', kind: 'resistor', endpoints: ['A', 'A'], resistance: resistanceOhms(1e-100) },
    ],
  }))
  const component = t.components.find(item => item.id === t.nodeToComponent['node:A'])
  if (!component) throw new Error('Missing test component')
  const system = assembleNodalSystem(t, component, 'node:A', 'node:B')
  expect(system.nodeIds).toEqual(['node:A', 'node:X'])
  expect([...system.rhs]).toEqual([1, 0])
  expect(system.resistanceScale).toBeCloseTo(2, 12)
  // G = [[13/16, -3/4], [-3/4, 7/8]] S; H = 2 * G.
  const expected = [[13 / 8, -3 / 2], [-3 / 2, 7 / 4]]
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    expect(system.matrix.get(i, j)).toBeCloseTo(expected[i]?.[j] ?? NaN, 12)
    expect(system.matrix.get(i, j)).toBeCloseTo(system.matrix.get(j, i), 12)
  }
  expect(system.weights.has('loop')).toBe(false)
  expect(system.branches.map(branch => branch.id)).toContain('loop')
})
