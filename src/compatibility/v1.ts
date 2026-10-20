import { createCircuitNetwork, resistanceOhms } from '../domain'
import type { CircuitElement, CircuitNetwork } from '../domain'
import { createEmptyProject, createEngineeringProject, createId, createResistorDefinition, deriveElectricalNets, freezeSnapshot, instantiateComponent, ProjectValidationError, RESISTOR_MODEL, RESISTOR_RESOURCE } from '../engineering'
import type { EngineeringProject, Id, JsonValue, Position, Revision } from '../engineering'

export interface IdentityPair { readonly v1Id: string; readonly projectId: Id }
export interface V1IdentityMap {
  readonly points: readonly IdentityPair[]
  readonly elements: readonly IdentityPair[]
  readonly terminals: readonly IdentityPair[]
  readonly syntheticWireIds: readonly string[]
  readonly syntheticTerminalIds: readonly string[]
}
export interface Projection {
  readonly projectId: Id
  readonly revision: Revision
  readonly sheetId: Id
  readonly network: CircuitNetwork
  readonly identities: V1IdentityMap
  readonly protectedPointIds: readonly string[]
}
export type ProjectionResult =
  | { readonly kind: 'ready'; readonly projection: Projection }
  | { readonly kind: 'unsupported'; readonly reasons: readonly { readonly code: string; readonly entityIds: readonly Id[] }[] }
  | { readonly kind: 'invalid'; readonly message: string }
/** Structural input; no dependency on the V1 React/SVG visualization module. */
export interface V1ImportLayout { readonly pointPositions: Readonly<Partial<Record<string, Position>>> }

export function importV1Network(input: CircuitNetwork, layout?: V1ImportLayout): EngineeringProject {
  const source = createCircuitNetwork(input), base = createEmptyProject(source.id), definition = createResistorDefinition(), sheetId = createId()
  const points = source.points.map(p => ({ v1Id: p.id, projectId: createId() }))
  const pointMap = new Map(points.map(p => [p.v1Id, p.projectId]))
  const anchors = points.map(p => ({ id: p.projectId })), components = [], connections = []
  const elements: IdentityPair[] = [], connectorIds: string[] = []
  const anchorPositions: Record<string, Position> = Object.fromEntries(points.flatMap(p => {
    const at = layout && Object.hasOwn(layout.pointPositions, p.v1Id) ? layout.pointPositions[p.v1Id] : undefined
    return at ? [[p.projectId, { ...at }]] : []
  }))
  for (const element of source.elements) {
    if (element.kind === 'wire') {
      const id = createId()
      connections.push({ id, endpoints: [pointMap.get(element.endpoints[0])!, pointMap.get(element.endpoints[1])!] as const })
      elements.push({ v1Id: element.id, projectId: id })
    } else {
      const instance = instantiateComponent(definition, element.id, { resistance: { kind: 'quantity', quantity: { value: element.resistance, unit: 'ohm' } } })
      components.push(instance.component); anchors.push(...instance.anchors)
      elements.push({ v1Id: element.id, projectId: instance.component.id })
      instance.component.pins.forEach((pin, index) => {
        const id = createId(), oldPoint = element.endpoints[index]!, endpoint = pointMap.get(oldPoint)!
        connections.push({ id, endpoints: [pin.anchorId, endpoint] as const }); connectorIds.push(id)
        const at = layout && Object.hasOwn(layout.pointPositions, oldPoint) ? layout.pointPositions[oldPoint] : undefined
        if (at) anchorPositions[pin.anchorId] = { ...at }
      })
    }
  }
  const terminals = source.terminals.map(t => ({ v1Id: t.id, projectId: createId() }))
  const ports = source.terminals.map((t,i) => ({ id: terminals[i]!.projectId, label: t.label, anchorId: pointMap.get(t.pointId)! }))
  return createEngineeringProject({ ...base, definitions: components.length ? [definition] : [], sheets: [{
    id: sheetId, title: source.id, components, anchors, connections, labels: [], references: [], ports,
    geometry: { placements: [], anchorPositions, connectionRoutes: {} },
  }], extensions: { 'org.stray.v1': {
    sourceNetwork: source, sourceRevision: base.revision, points, elements, terminals, connectorIds,
    ...(layout ? { sourceLayout: layout } : {}),
  } } })
}

function jsonRecord(value: JsonValue | undefined): Record<string, JsonValue> | undefined {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, JsonValue> : undefined
}
function aliases(project: EngineeringProject, collection: string): Map<string, string> {
  const values = jsonRecord(project.extensions['org.stray.v1'])?.[collection]
  const result = new Map<string, string>()
  if (Array.isArray(values)) for (const raw of values as readonly JsonValue[]) {
    const pair = jsonRecord(raw)
    if (typeof pair?.projectId === 'string' && typeof pair.v1Id === 'string' && pair.v1Id.trim() && pair.v1Id === pair.v1Id.trim()) result.set(pair.projectId, pair.v1Id)
  }
  return result
}
function allocator(): (preferred: string | undefined, fallback: string) => string {
  const used = new Set<string>()
  return (preferred, fallback) => {
    let id = preferred ?? fallback, suffix = 0
    while (used.has(id)) id = `${fallback}:${++suffix}`
    used.add(id); return id
  }
}

/** Read-only projection. No discovery, verification, commit, or writeback is run. */
export function projectToV1(input: EngineeringProject, sheetId: Id, protectedAnchorIds: readonly Id[] = []): ProjectionResult {
  let project: EngineeringProject
  try { project = createEngineeringProject(input) }
  catch (error) { if (error instanceof ProjectValidationError) return { kind: 'invalid', message: error.message }; throw error }
  const sheet = project.sheets.find(s => s.id === sheetId)
  if (!sheet) return { kind: 'invalid', message: `Unknown sheet: ${sheetId}` }
  const selected = new Set(sheet.anchors.map(a => a.id)), topology = deriveElectricalNets(project)
  if (topology.nets.some(n => n.anchorIds.some(a => selected.has(a)) && n.anchorIds.some(a => !selected.has(a)))) return { kind: 'unsupported', reasons: [{ code: 'cross-sheet-connectivity', entityIds: [sheetId] }] }
  if (protectedAnchorIds.some(id => !selected.has(id))) return { kind: 'invalid', message: 'Protected anchors must exist on the projected sheet.' }
  const definitions = new Map(project.definitions.map(d => [d.id, d]))
  const unsupported = sheet.components.filter(c => {
    const d = definitions.get(c.definitionId)!
    return d.resource.id !== RESISTOR_RESOURCE.id || d.resource.version !== RESISTOR_RESOURCE.version || d.kind !== 'resistor' || d.pins.length !== 2 ||
      c.pins.length !== 2 || !c.pins.some(p => p.definitionPinKey === '1') || !c.pins.some(p => p.definitionPinKey === '2') ||
      !d.modelBindings.some(b => b.analysisFamily === 'electrical' && b.model.id === RESISTOR_MODEL.id && b.model.version === RESISTOR_MODEL.version && b.portMap.p === '1' && b.portMap.n === '2' && Object.keys(b.portMap).length === 2)
  })
  if (unsupported.length) return { kind: 'unsupported', reasons: unsupported.map(c => ({ code: 'unsupported-component-model', entityIds: [c.id] })) }
  const pointAliases = aliases(project,'points'), elementAliases = aliases(project,'elements'), terminalAliases = aliases(project,'terminals')
  const pointId = allocator(), elementId = allocator(), terminalId = allocator()
  const points = [...sheet.anchors].sort((a,b) => a.id < b.id ? -1 : 1).map(a => ({ v1Id: pointId(pointAliases.get(a.id), `v2:point:${a.id}`), projectId: a.id }))
  const pointMap = new Map(points.map(p => [p.projectId,p.v1Id])), elements: IdentityPair[] = [], wires: CircuitElement[] = []
  for (const connection of [...sheet.connections].sort((a,b) => a.id < b.id ? -1 : 1)) {
    const id = elementId(elementAliases.get(connection.id), `v2:wire:${connection.id}`)
    wires.push({ id, kind: 'wire', endpoints: [pointMap.get(connection.endpoints[0])!, pointMap.get(connection.endpoints[1])!] })
    elements.push({ v1Id: id, projectId: connection.id })
  }
  const resistors: CircuitElement[] = sheet.components.toSorted((a,b) => a.id < b.id ? -1 : 1).map(c => {
    const id = elementId(elementAliases.get(c.id), `v2:resistor:${c.id}`), resistance = c.parameters.resistance
    if (resistance?.kind !== 'quantity') throw new TypeError('Validated resistor parameter missing.')
    elements.push({ v1Id: id, projectId: c.id })
    return { id, kind: 'resistor', resistance: resistanceOhms(resistance.quantity.value), endpoints: ['1','2'].map(key => pointMap.get(c.pins.find(p => p.definitionPinKey === key)!.anchorId)!) as [string,string] }
  })
  const syntheticWireIds: string[] = [], groups = new Map<string, string[]>()
  for (const label of sheet.labels) {
    const key = JSON.stringify([label.scope, label.scope === 'sheet' ? sheet.id : null, label.name]), group = groups.get(key) ?? []
    group.push(label.anchorId); groups.set(key, group)
  }
  for (const [groupKey, anchors] of [...groups].sort(([a],[b]) => a < b ? -1 : 1)) {
    const sorted = [...new Set(anchors)].sort()
    for (let i = 1; i < sorted.length; i++) {
      const id = elementId(undefined, `v2:labelwire:${groupKey}:${i}`)
      wires.push({ id, kind: 'wire', endpoints: [pointMap.get(sorted[0]!)!,pointMap.get(sorted[i]!)!] }); syntheticWireIds.push(id)
    }
  }
  const observations = new Set([...protectedAnchorIds, ...sheet.references.map(r => r.anchorId)])
  for (const d of project.measurements) for (const c of d.channels) if (c.probeAnchorId && selected.has(c.probeAnchorId)) observations.add(c.probeAnchorId)
  const scopePins = new Map(sheet.components.flatMap(c => c.pins.map(p => [p.id,p.anchorId] as const)))
  for (const b of project.boards) for (const a of b.assignments) for (const m of a.pinPadMappings) {
    const anchor = scopePins.get(m.instancePinId); if (anchor) observations.add(anchor)
  }
  for (const a of project.analyses) if (a.scope.kind === 'circuit' && a.scope.sheetIds.includes(sheet.id)) {
    if (!['resistance-equivalent','topology'].includes(a.analysisType)) return { kind: 'unsupported', reasons: [{ code: 'unsupported-analysis-observations', entityIds: [a.id] }] }
    for (const [key, value] of Object.entries(a.options)) {
      if (!['referenceAnchorId', 'probeAnchorIds', 'probePinIds', 'terminalIds'].includes(key)) return { kind: 'unsupported', reasons: [{ code: 'unsupported-analysis-observations', entityIds: [a.id] }] }
      if (key === 'referenceAnchorId') {
        if (typeof value !== 'string' || !selected.has(value)) return { kind: 'invalid', message: `Reference anchor must belong to the selected sheet in analysis ${a.id}.` }
        observations.add(value)
      }
      if (key === 'probeAnchorIds' || key === 'probePinIds' || key === 'terminalIds') {
        if (!Array.isArray(value) || !value.every(v => typeof v === 'string')) return { kind: 'invalid', message: `Invalid observation list in analysis ${a.id}.` }
        for (const id of value) {
          const anchor = key === 'probePinIds' ? scopePins.get(id) : key === 'terminalIds' ? sheet.ports.find(p => p.id === id)?.anchorId : selected.has(id) ? id : undefined
          if (!anchor) return { kind: 'invalid', message: `Unknown selected-scope observation ${id} in analysis ${a.id}.` }
          observations.add(anchor)
        }
      }
    }
  }
  const terminalPairs: IdentityPair[] = [], syntheticTerminalIds: string[] = []
  const terminals = sheet.ports.toSorted((a,b) => a.id < b.id ? -1 : 1).map(port => {
    const id = terminalId(terminalAliases.get(port.id), `v2:port:${port.id}`)
    terminalPairs.push({ v1Id: id, projectId: port.id })
    return { id, label: port.label, pointId: pointMap.get(port.anchorId)! }
  })
  for (const anchor of [...observations].sort()) if (!sheet.ports.some(p => p.anchorId === anchor)) {
    const id = terminalId(undefined, `v2:probe:${anchor}`)
    terminals.push({ id, label: `Probe ${anchor}`, pointId: pointMap.get(anchor)! })
    terminalPairs.push({ v1Id: id, projectId: anchor }); syntheticTerminalIds.push(id)
  }
  const network = createCircuitNetwork({ id: `v2:network:${project.id}:${sheet.id}`, points: points.map(p => ({ id: p.v1Id })), elements: [...wires,...resistors], terminals })
  const protectedPoints = new Set([...observations, ...sheet.ports.map(p => p.anchorId)])
  return freezeSnapshot({ kind: 'ready', projection: { projectId: project.id, revision: project.revision, sheetId, network,
    identities: { points, elements, terminals: terminalPairs, syntheticWireIds, syntheticTerminalIds },
    protectedPointIds: [...protectedPoints].map(id => pointMap.get(id)!).sort(),
  } })
}
