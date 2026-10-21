import { createEngineeringProject, createId } from '../engineering'
import type { EngineeringProject, Position } from '../engineering'
import { applyEdit, newEditorProject, PALETTE, wireRoute } from '../editing'
import { circuitTemplates } from './catalog'
import { circuitCategories } from './taxonomy'

/** Fresh UUIDs on each open; the frozen catalog contains only recipes, never user state. */
export function instantiateTemplate(id: string): EngineeringProject {
  const template = circuitTemplates.find(t => t.id === id)
  if (!template) throw new Error('此电路模板尚未提供。')
  let project = newEditorProject()
  const sheetId = project.sheets[0]!.id
  for (const item of template.recipe.parts) {
    project = applyEdit(project, sheetId, { type: 'add', kind: item.kind, position: item.position })
    const component = project.sheets[0]!.components.at(-1)!, config = PALETTE[item.kind]
    project = applyEdit(project, sheetId, { type: 'properties', id: component.id, reference: item.reference, parameters: { [config.parameter]: { kind: 'quantity', quantity: { value: item.value, unit: config.unit } } } })
    for (let angle = 0; angle < item.rotationDegrees; angle += 90) project = applyEdit(project, sheetId, { type: 'rotate', id: component.id })
  }
  const sheet = project.sheets[0]!, nodeIds = Object.fromEntries(Object.keys(template.recipe.nodes).map(key => [key, createId()]))
  const positions: Record<string, Position> = { ...sheet.geometry.anchorPositions }
  for (const [name, position] of Object.entries(template.recipe.nodes)) positions[nodeIds[name]!] = position
  const connections = template.recipe.parts.flatMap((item, i) => sheet.components[i]!.pins.map((pin, index) => ({ id: createId(), endpoints: [pin.anchorId, nodeIds[item.nodes[index]!]!] as const })))
  const ports = Object.entries(template.recipe.ports).map(([label, name]) => ({ id: createId(), label, anchorId: nodeIds[name]! }))
  return createEngineeringProject({ ...project, title: template.name, extensions: { 'org.stray.atlas': { templateId: template.id, catalogVersion: '1' } }, sheets: [{ ...sheet, title: template.name, anchors: [...sheet.anchors, ...Object.values(nodeIds).map(id => ({ id }))], connections, ports, geometry: { ...sheet.geometry, anchorPositions: positions, connectionRoutes: Object.fromEntries(connections.map(c => [c.id, wireRoute(positions[c.endpoints[0]]!, positions[c.endpoints[1]]!)])) } }] })
}

export function matchesTemplate(id: string, query: string): boolean {
  const t = circuitTemplates.find(t => t.id === id)
  if (!t) return false
  const category = circuitCategories.find(c => c.id === t.categoryId)!, family = category.families.find(f => f.id === t.familyId)!
  return [t.name, t.description, category.name, family.name, ...t.topics, ...t.components, ...t.chapters.map(n => `第${n}章`)].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
}
