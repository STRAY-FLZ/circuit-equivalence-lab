import { projectToV1 } from '../compatibility'
import type { Projection, ProjectionResult } from '../compatibility'
import { createEngineeringProject, createId, createResistorDefinition, deriveElectricalNets, freezeSnapshot, instantiateComponent, reviseProject, RESISTOR_MODEL, RESISTOR_RESOURCE } from '../engineering'
import type { ComponentInstance, EngineeringProject, Id, JsonValue, SymbolDefinition } from '../engineering'
import { applyTransformation, discoverTransformations, verifyTerminalEquivalence } from '../transforms'
import type { EquivalenceResult, TransformCandidate, TransformResult } from '../transforms'
import { buildLesson } from '../education'
import type { LessonBuildResult } from '../education'
import { analyzeTopology } from '../topology'
import { pinPosition, snap, wireRoute } from '../editing'

export class IntegrationError extends Error { }
export interface TransformationSession {
  readonly project: EngineeringProject
  readonly projection: Projection
  readonly observedAnchorIds: readonly Id[]
  readonly candidates: readonly TransformCandidate[]
}
export type IntegrationDiscovery =
  | { readonly kind: 'ready'; readonly session: TransformationSession }
  | Exclude<ProjectionResult, { readonly kind: 'ready' }>
export interface TransformationPreview {
  readonly session: TransformationSession
  readonly candidate: TransformCandidate
  readonly result: TransformResult
  readonly evidence: EquivalenceResult | null
  readonly lesson: LessonBuildResult | null
  /** Structural references that would dangle; this is not a numerical verification gate. */
  readonly writebackIssue: string | null
}
export interface TransformationHighlight {
  readonly revision: string
  readonly sheetId: Id
  readonly componentIds: readonly Id[]
  readonly anchorIds: readonly Id[]
}

export function discoverForProject(input: EngineeringProject, sheetId: Id, observedAnchorIds: readonly Id[] = []): IntegrationDiscovery {
  const result = projectToV1(input, sheetId, observedAnchorIds)
  if (result.kind !== 'ready') return result
  const { projection } = result
  const discovery = discoverTransformations(projection.network, { protectedPointIds: projection.protectedPointIds })
  if (discovery.kind === 'error') return { kind: 'invalid', message: discovery.message }
  return freezeSnapshot({ kind: 'ready', session: { project: createEngineeringProject(input), projection, observedAnchorIds: [...observedAnchorIds], candidates: discovery.candidates } })
}

export function candidateLabel(session: TransformationSession, candidate: TransformCandidate): string {
  const sheet = session.project.sheets.find(s => s.id === session.projection.sheetId)!
  return candidate.elementIds.map(id => {
    const pair = session.projection.identities.elements.find(p => p.v1Id === id)
    return sheet.components.find(c => c.id === pair?.projectId)?.reference ?? id
  }).join(' + ')
}

export function candidateHighlight(session: TransformationSession, candidate: TransformCandidate): TransformationHighlight {
  const topology = analyzeTopology(session.projection.network)
  const nodes = new Set([...candidate.boundaryNodeIds, ...(candidate.internalNodeId ? [candidate.internalNodeId] : [])])
  const points = new Set(topology.nodes.filter(n => nodes.has(n.id)).flatMap(n => n.pointIds))
  return {
revision: session.projection.revision, sheetId: session.projection.sheetId,
    componentIds: session.projection.identities.elements.filter(p => candidate.elementIds.includes(p.v1Id)).map(p => p.projectId),
    anchorIds: session.projection.identities.points.filter(p => points.has(p.v1Id)).map(p => p.projectId)
}
}

function referencedRemoval(session: TransformationSession, candidate: TransformCandidate): string | null {
  const ids = new Set(session.projection.identities.elements.filter(p => candidate.elementIds.includes(p.v1Id)).map(p => p.projectId))
  if (session.project.boards.some(b => b.assignments.some(a => ids.has(a.componentId)))) return '选中元件被 PCB 封装映射引用；尚无显式重绑定流程，不能移除该元件。'
  const sheet = session.project.sheets.find(s => s.id === session.projection.sheetId)!
  const pins = new Set(sheet.components.filter(c => ids.has(c.id)).flatMap(c => c.pins.map(p => p.id)))
  if (session.project.analyses.some(a => a.scope.kind === 'circuit' && a.scope.sheetIds.includes(sheet.id) && Array.isArray(a.options.probePinIds) && a.options.probePinIds.some(p => typeof p === 'string' && pins.has(p)))) return '选中元件的引脚被分析探针引用；需显式重绑定后才能移除。'
  return null
}

export function previewTransformation(session: TransformationSession, candidateId: string): TransformationPreview {
  const candidate = session.candidates.find(c => c.id === candidateId)
  if (!candidate) throw new IntegrationError('候选已失效，请重新识别。')
  const result = applyTransformation({ network: session.projection.network, type: candidate.type, elementIds: candidate.elementIds, protectedPointIds: session.projection.protectedPointIds })
  const evidence = result.kind === 'applied' ? verifyTerminalEquivalence(session.projection.network, result.network) : null
  const lesson = result.kind === 'applied' && evidence ? buildLesson(session.projection.network, candidate, result, evidence) : null
  return freezeSnapshot({ session, candidate, result, evidence, lesson, writebackIssue: referencedRemoval(session, candidate) })
}

/** Revalidate the snapshot/candidate and reuse the same independent numerical verifier. */
export function writebackTransformation(project: EngineeringProject, preview: TransformationPreview): EngineeringProject {
  const original = preview.session.projection
  if (project.id !== original.projectId || project.revision !== original.revision) throw new IntegrationError('工程已改变，请重新识别并预览变换。')
  if (preview.result.kind !== 'applied' || preview.evidence?.kind !== 'equivalent') throw new IntegrationError('只有现有独立数值端口等效验证通过的变换才能写回；当前预览不可提交。')
  const discovery = discoverForProject(project, original.sheetId, preview.session.observedAnchorIds)
  if (discovery.kind !== 'ready') throw new IntegrationError('当前工程不再满足 V1 投影契约。')
  const current = previewTransformation(discovery.session, preview.candidate.id)
  if (current.result.kind !== 'applied' || current.evidence?.kind !== 'equivalent') throw new IntegrationError('重新应用或数值验证未通过，工程保持不变。')
  if (current.writebackIssue) throw new IntegrationError(current.writebackIssue)
  return reconcile(project, current.session.projection, current.result, current.evidence, current.session.observedAnchorIds)
}

function reconcile(project: EngineeringProject, projection: Projection, applied: Extract<TransformResult, { kind: 'applied' }>, evidence: EquivalenceResult, observations: readonly Id[]): EngineeringProject {
  const sheet = project.sheets.find(s => s.id === projection.sheetId)!
  const elementMap = new Map(projection.identities.elements.map(p => [p.v1Id, p.projectId]))
  const selected = new Set(applied.metadata.originalResistorIds.map(id => elementMap.get(id)!))
  const pointMap = new Map(projection.identities.points.map(p => [p.v1Id, p.projectId]))
  const positions = { ...sheet.geometry.anchorPositions }
  const sourceTopology = analyzeTopology(projection.network)
  const boundaryPositions = sourceTopology.nodes.filter(n => applied.metadata.boundaryNodeIds.includes(n.id)).flatMap(n => n.pointIds.flatMap(id => {
    const anchor = pointMap.get(id), at = anchor ? positions[anchor] : undefined
    return at ? [at] : []
  }))
  const center = boundaryPositions.length ? { x: boundaryPositions.reduce((s, p) => s + p.x / boundaryPositions.length, 0), y: boundaryPositions.reduce((s, p) => s + p.y / boundaryPositions.length, 0) } : { x: 400, y: 300 }
  for (const id of applied.metadata.createdPointIds) { const anchor = createId(); pointMap.set(id, anchor); positions[anchor] = snap(center) }
  const anchors = applied.network.points.map((point, i) => {
    const id = pointMap.get(point.id)
    if (!id) throw new IntegrationError('变换输出包含无法映射的连接点。')
    positions[id] ??= { x: 100 + (i % 5) * 160, y: 100 + Math.floor(i / 5) * 120 }
    return { id }
  })
  const retainedAnchors = new Set(anchors.map(a => a.id))
  for (const id of Object.keys(positions)) if (!retainedAnchors.has(id)) delete positions[id]
  const connections = [...sheet.connections] // V1 preserves all authoritative wires; synthetic label wires stay synthetic.
  const routes = { ...sheet.geometry.connectionRoutes }
  const components = sheet.components.filter(c => !selected.has(c.id))
  const placements = sheet.geometry.placements.filter(p => !selected.has(p.componentId))
  const retainedWires = new Set(applied.network.elements.filter(e => e.kind === 'wire').map(e => e.id))
  for (const edge of sheet.connections) {
    const mapping = projection.identities.elements.find(p => p.projectId === edge.id)
    if (!mapping || !retainedWires.has(mapping.v1Id)) throw new IntegrationError('变换输出未保留原有导线。')
  }
  let definitions = project.definitions, symbols = project.symbols
  let definition = definitions.find(d => d.resource.id === RESISTOR_RESOURCE.id && d.resource.version === RESISTOR_RESOURCE.version && d.kind === 'resistor' && d.pins.length === 2 && d.pins.some(p => p.key === '1') && d.pins.some(p => p.key === '2') && d.parameters.length === 1 && d.parameters[0]?.key === 'resistance' && d.parameters[0].kind === 'quantity' && d.parameters[0].unit === 'ohm' && d.modelBindings.some(b => b.analysisFamily === 'electrical' && b.model.id === RESISTOR_MODEL.id && b.model.version === RESISTOR_MODEL.version && b.portMap.p === '1' && b.portMap.n === '2' && Object.keys(b.portMap).length === 2))
  if (!definition) { definition = createResistorDefinition(); definitions = [...definitions, definition] }
  let symbol = symbols.find(s => s.resource.id === 'org.stray.symbol.resistor' && s.resource.version === '1' && s.pinPositions['1']?.x === -40 && s.pinPositions['1']?.y === 0 && s.pinPositions['2']?.x === 40 && s.pinPositions['2']?.y === 0)
  if (!symbol) { symbol = { id: createId(), resource: { id: 'org.stray.symbol.resistor', version: '1' }, pinPositions: { '1': { x: -40, y: 0 }, '2': { x: 40, y: 0 } } } satisfies SymbolDefinition; symbols = [...symbols, symbol] }
  const replacementPairs: { v1Id: string; projectId: Id }[] = [], connectorIds: Id[] = []
  const usedReferences = new Set(project.sheets.flatMap(s => s.components.map(c => c.reference)))
  const replacements: ComponentInstance[] = []
  const layoutFloor = [...Object.values(positions), ...Object.values(routes).flat()].reduce((max, p) => Math.max(max, p.y), 0) + 120
  applied.metadata.replacements.forEach((resistor, i) => {
    let serial = 1; while (usedReferences.has(`R${serial}`)) serial++
    const reference = `R${serial}`; usedReferences.add(reference)
    const created = instantiateComponent(definition, reference, { resistance: { kind: 'quantity', quantity: { value: resistor.resistance, unit: 'ohm' } } })
    const endpoints = resistor.endpoints.map(id => pointMap.get(id)!)
    const a = positions[endpoints[0]!]!, b = positions[endpoints[1]!]!
    // Keep old anchor/route geometry intact and place replacements below it.
    // Residual wires must not be drawn through the new resistor body.
    const at = snap({ x: a.x / 2 + b.x / 2, y: layoutFloor + i * 120 })
    placements.push({ componentId: created.component.id, symbolId: symbol.id, origin: at, rotationDegrees: 0, mirrored: false })
    for (const pin of created.component.pins) {
      anchors.push({ id: pin.anchorId }); positions[pin.anchorId] = pinPosition(symbol.pinPositions[pin.definitionPinKey]!, at, 0, false)
      const target = endpoints[pin.definitionPinKey === '1' ? 0 : 1]!, id = createId()
      connections.push({ id, endpoints: [pin.anchorId, target] }); connectorIds.push(id)
      routes[id] = wireRoute(positions[pin.anchorId]!, positions[target]!)
    }
    replacements.push(created.component); replacementPairs.push({ v1Id: resistor.id, projectId: created.component.id })
  })
  const next = reviseProject(project, projection.revision, { definitions, symbols, sheets: project.sheets.map(s => s.id === sheet.id ? { ...sheet, components: [...components, ...replacements], anchors, connections, geometry: { placements, anchorPositions: positions, connectionRoutes: routes } } : s) })
  deriveElectricalNets(next)
  const record = {
sourceRevision: project.revision, resultRevision: next.revision, sheetId: sheet.id, observedAnchorIds: observations,
    source: projection.network, transformed: applied.network, metadata: applied.metadata, verification: evidence,
    sourceIdentities: projection.identities, replacementIdentities: replacementPairs,
    resultPointIdentities: applied.network.points.map(p => ({ v1Id: p.id, projectId: pointMap.get(p.id)! })), connectorIds
}
  const previous = project.extensions['org.stray.transformations']
  const serialized = JSON.parse(JSON.stringify(record)) as JsonValue
  const records: readonly JsonValue[] = Array.isArray(previous) ? previous as readonly JsonValue[] : previous === undefined ? [] : [previous]
  return createEngineeringProject({ ...next, extensions: { ...next.extensions, 'org.stray.transformations': [...records, serialized] } })
}
