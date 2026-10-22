import { createEngineeringProject, createId } from '../src/engineering'
import type { EngineeringProject, ParameterValue } from '../src/engineering'
import { applyEdit, newEditorProject, PALETTE } from '../src/editing'
import type { PaletteKind } from '../src/editing'

export interface Part { ref: string; kind: PaletteKind; value: number; nodes: string[]; control?: string }
export function dcFixture(parts: Part[], reference = 'g'): EngineeringProject {
  let project = newEditorProject()
  const sheetId = project.sheets[0]!.id
  for (const [i, part] of parts.entries()) {
    project = applyEdit(project, sheetId, { type: 'add', kind: part.kind, position: { x: 160 + i % 3 * 260, y: 160 + Math.floor(i / 3) * 240 } })
    const component = project.sheets[0]!.components.at(-1)!, spec = PALETTE[part.kind]
    project = applyEdit(project, sheetId, { type: 'properties', id: component.id, reference: part.ref, parameters: { ...component.parameters, [spec.parameter]: { kind: 'quantity', quantity: { value: part.value, unit: spec.unit } } } })
  }
  const sheet = project.sheets[0]!, nodes = Object.fromEntries([...new Set(parts.flatMap(p => p.nodes))].map(name => [name, createId()]))
  const components = sheet.components.map((c, i) => {
    const control = parts[i]!.control
    const parameters: Record<string, ParameterValue> = { ...c.parameters }
    if (control) parameters.controlBranchId = { kind: 'text', value: sheet.components.find(c => c.reference === control)!.id }
    return { ...c, parameters }
  })
  return createEngineeringProject({ ...project, title: '直流验收电路', sheets: [{ ...sheet, components,
    anchors: [...sheet.anchors, ...Object.values(nodes).map(id => ({ id }))],
    connections: components.flatMap((c, i) => c.pins.map((p, j) => ({ id: createId(), endpoints: [p.anchorId, nodes[parts[i]!.nodes[j]!]!] }))),
    ports: Object.entries(nodes).map(([label, anchorId]) => ({ id: createId(), label, anchorId })),
    references: nodes[reference] ? [{ id: createId(), anchorId: nodes[reference], domain: 'analog' }] : [],
    geometry: { ...sheet.geometry, anchorPositions: { ...sheet.geometry.anchorPositions, ...Object.fromEntries(Object.values(nodes).map((id, i) => [id, { x: 80 + i * 200, y: 580 }])) } },
  }] })
}
export const load = (): Part[] => [{ ref: 'V1', kind: 'voltage-source', value: 10, nodes: ['a', 'g'] }, { ref: 'R1', kind: 'resistor', value: 1000, nodes: ['a', 'g'] }]
