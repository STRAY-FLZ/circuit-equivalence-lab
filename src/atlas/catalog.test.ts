import { describe, expect, it } from 'vitest'
import { circuitCategories, circuitTemplates, instantiateTemplate, matchesTemplate } from './index'
import { deriveElectricalNets, validateEngineeringProject } from '../engineering'
import { applyEdit, PALETTE } from '../editing'
import { createProjectDocument, deserializeProject, serializeProject } from '../project-format'
import { discoverForProject, previewTransformation } from '../integration'

describe('circuit atlas catalog and real project recipes', () => {
  it('represents all twelve categories and every requested family with translation-independent unique keys', () => {
    expect(circuitCategories).toHaveLength(12)
    expect(circuitCategories.map(c => c.families.length)).toEqual([8, 9, 7, 7, 6, 8, 7, 8, 6, 8, 7, 8])
    const ids = [...circuitCategories.map(c => c.id), ...circuitCategories.flatMap(c => c.families.map(f => f.id)), ...circuitTemplates.map(t => t.id)]
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every(id => /^[a-z][a-z0-9.-]+$/.test(id))).toBe(true)
    expect(circuitTemplates.length).toBeGreaterThanOrEqual(20)
    for (const t of circuitTemplates) expect(circuitCategories.find(c => c.id === t.categoryId)?.families.some(f => f.id === t.familyId)).toBe(true)
    expect(circuitCategories.filter(c => !circuitTemplates.some(t => t.categoryId === c.id)).map(c => c.id)).toContain('nonlinear')
  })
  it.each(circuitTemplates)('$id instantiates valid connections, exact parameters and portable schema-1 project', async template => {
    const project = instantiateTemplate(template.id), sheet = project.sheets[0]!, nets = deriveElectricalNets(project)
    expect(validateEngineeringProject(project)).toEqual([])
    expect(sheet.components).toHaveLength(template.recipe.parts.length)
    expect(nets.nets).toHaveLength(Object.keys(template.recipe.nodes).length)
    const logicalNets = new Map<string, string>()
    sheet.components.forEach((c, i) => {
      const part = template.recipe.parts[i]!, config = PALETTE[part.kind]
      expect(c.reference).toBe(part.reference)
      expect(c.parameters[config.parameter]).toEqual({ kind: 'quantity', quantity: { value: part.value, unit: config.unit } })
      expect(sheet.geometry.placements.find(p => p.componentId === c.id)?.rotationDegrees).toBe(part.rotationDegrees)
      c.pins.forEach((pin, j) => { const node = part.nodes[j]!, net = nets.anchorToNet[pin.anchorId]!; if (logicalNets.has(node)) expect(net).toBe(logicalNets.get(node)); else logicalNets.set(node, net) })
      expect(nets.anchorToNet[c.pins[0]!.anchorId]).not.toBe(nets.anchorToNet[c.pins[1]!.anchorId])
    })
    expect(new Set(logicalNets.values()).size).toBe(Object.keys(template.recipe.nodes).length)
    for (const port of sheet.ports) expect(nets.anchorToNet[port.anchorId]).toBe(logicalNets.get(template.recipe.ports[port.label]!))
    const document = await createProjectDocument(project, { name: 'atlas test', version: '2.2.0' }, [])
    const text = await serializeProject(document), restored = await deserializeProject(text)
    expect(restored.kind).toBe('ready')
    if (restored.kind === 'ready') {
      expect(await serializeProject(restored.document)).toBe(text)
      expect(restored.document.project.id).toBe(project.id)
      expect(deriveElectricalNets(restored.document.project).anchorToNet).toEqual(nets.anchorToNet)
      for (const component of sheet.components) expect(restored.document.project.sheets[0]!.components.find(c => c.id === component.id)).toEqual(component)
      expect(restored.document.formatVersion).toBe(1)
    }
  })
  it('opens independent UUID instances and editing cannot mutate the shared catalog or another instance', () => {
    const before = JSON.stringify(circuitTemplates), first = instantiateTemplate('resistor-series'), second = instantiateTemplate('resistor-series')
    expect(first.id).not.toBe(second.id)
    const ids = (p: typeof first) => [p.id, p.revision, ...p.definitions.map(d => d.id), ...p.symbols.map(s => s.id), ...p.sheets.flatMap(s => [s.id, ...s.components.flatMap(c => [c.id, ...c.pins.map(pin => pin.id)]), ...s.anchors.map(a => a.id), ...s.connections.map(c => c.id), ...s.ports.map(p => p.id)])]
    const other = new Set(ids(second)); expect(ids(first).some(id => other.has(id))).toBe(false)
    const c = first.sheets[0]!.components[0]!, edited = applyEdit(first, first.sheets[0]!.id, { type: 'properties', id: c.id, reference: c.reference, parameters: { resistance: { kind: 'quantity', quantity: { value: 1234, unit: 'ohm' } } } })
    expect(edited.sheets[0]!.components[0]!.parameters.resistance).not.toEqual(second.sheets[0]!.components[0]!.parameters.resistance)
    expect(JSON.stringify(circuitTemplates)).toBe(before); expect(Object.isFrozen(circuitTemplates[0]!.recipe.parts)).toBe(true)
  })
  it('advertises only the real resistor transformation/lesson path and verifies its numerical evidence', () => {
    for (const template of circuitTemplates) {
      const p = instantiateTemplate(template.id), discovery = discoverForProject(p, p.sheets[0]!.id)
      if (!template.capabilities.numerical) { expect(discovery.kind).not.toBe('ready'); expect(template.capabilities.experiment).toBe(false); continue }
      expect(discovery.kind).toBe('ready')
      if (discovery.kind === 'ready') { expect(discovery.session.candidates.length).toBeGreaterThan(0); const preview = previewTransformation(discovery.session, discovery.session.candidates[0]!.id); expect(preview.evidence?.kind).toBe('equivalent'); expect(preview.lesson?.kind).toBe('ready') }
    }
  })
  it('indexes methods and verified secondary chapter metadata without duplicate records', () => {
    expect(matchesTemplate('superposition-network', '叠加')).toBe(true)
    expect(matchesTemplate('rc-lowpass', '第11章')).toBe(true)
    expect(matchesTemplate('resistor-series', 'RC')).toBe(false)
    expect(() => instantiateTemplate('nonexistent')).toThrow('尚未提供')
  })
})
