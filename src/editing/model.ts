import { ANALOG_DEVICES, analogDefaults, createAnalogDefinition, DYNAMIC_OPAMP, dynamicOpampDefaults, createDynamicOpampDefinition, DC_SOURCES, createDcSourceDefinition, createEmptyProject, createEngineeringProject, createId, createResistorDefinition, instantiateComponent, reviseProject } from '../engineering'
import type { AnalogKind } from '../engineering'
import type { ComponentDefinition, EngineeringProject, Id, ParameterValue, Position, SchematicSheet, SymbolDefinition } from '../engineering'

export type PaletteKind = 'resistor' | 'capacitor' | 'inductor' | 'voltage-source' | 'current-source' | 'vcvs' | 'vccs' | 'ccvs' | 'cccs' | 'dynamic-opamp' | AnalogKind
export const PALETTE = {
  ...ANALOG_DEVICES,
  'dynamic-opamp': DYNAMIC_OPAMP,
  resistor: { title: '电阻', prefix: 'R', parameter: 'resistance', unit: 'ohm', value: 100 },
  capacitor: { title: '电容', prefix: 'C', parameter: 'capacitance', unit: 'F', value: 0.000001 },
  inductor: { title: '电感', prefix: 'L', parameter: 'inductance', unit: 'H', value: 0.001 },
  'voltage-source': { title: '电压源', prefix: 'V', parameter: 'voltage', unit: 'V', value: 5 },
  'current-source': { title: '电流源', prefix: 'I', parameter: 'current', unit: 'A', value: 0.001 },
  vcvs: { title: '压控电压源 VCVS', prefix: 'E', ...DC_SOURCES.vcvs },
  vccs: { title: '压控电流源 VCCS', prefix: 'G', ...DC_SOURCES.vccs },
  ccvs: { title: '流控电压源 CCVS', prefix: 'H', ...DC_SOURCES.ccvs },
  cccs: { title: '流控电流源 CCCS', prefix: 'F', ...DC_SOURCES.cccs },
} as const
export const GRID = 20
export type Selection = { readonly kind: 'component' | 'connection' | 'anchor'; readonly id: Id } | null
export type Endpoint = { readonly anchorId: Id } | { readonly position: Position }
export type EditOperation =
  | { readonly type: 'add'; readonly kind: PaletteKind; readonly position: Position }
  | { readonly type: 'move'; readonly id: Id; readonly position: Position }
  | { readonly type: 'rotate'; readonly id: Id }
  | { readonly type: 'properties'; readonly id: Id; readonly reference: string; readonly parameters: Readonly<Record<string, ParameterValue>> }
  | { readonly type: 'delete'; readonly selection: NonNullable<Selection> }
  | { readonly type: 'connect'; readonly from: Endpoint; readonly to: Endpoint }
  | { readonly type: 'junction'; readonly connectionId: Id; readonly position: Position }
  | { readonly type: 'marker'; readonly kind: 'ground' | 'label' | 'reference' | 'port'; readonly at: Endpoint; readonly name?: string; readonly scope?: 'sheet' | 'project' }
  | { readonly type: 'remove-marker'; readonly id: Id }
  | { readonly type: 'title'; readonly title: string }

export class EditingError extends Error { }
export function emptySheet(): SchematicSheet {
  return { id: createId(), title: '图纸 1', components: [], anchors: [], connections: [], labels: [], references: [], ports: [], geometry: { placements: [], anchorPositions: {}, connectionRoutes: {} } }
}
export function newEditorProject(): EngineeringProject { return createEngineeringProject({ ...createEmptyProject('未命名电路'), sheets: [emptySheet()] }) }
export function snap(position: Position): Position { return { x: Math.round(position.x / GRID) * GRID, y: Math.round(position.y / GRID) * GRID } }
export function pinPosition(local: Position, origin: Position, rotation: number, mirrored: boolean): Position {
  const x = mirrored ? -local.x : local.x, y = local.y
  const p = rotation === 90 ? { x: -y, y: x } : rotation === 180 ? { x: -x, y: -y } : rotation === 270 ? { x: y, y: -x } : { x, y }
  return { x: origin.x + p.x, y: origin.y + p.y }
}
export function wireRoute(a: Position, b: Position): readonly Position[] { return a.x === b.x || a.y === b.y ? [a, b] : [a, { x: b.x, y: a.y }, b] }
export function connectionRoute(sheet: SchematicSheet, id: Id): readonly Position[] {
  const edge = sheet.connections.find(c => c.id === id)
  if (!edge) return []
  const route = sheet.geometry.connectionRoutes[id]
  if (route) return route
  const a = sheet.geometry.anchorPositions[edge.endpoints[0]], b = sheet.geometry.anchorPositions[edge.endpoints[1]]
  return a && b ? wireRoute(a, b) : []
}
export function closestOnRoute(route: readonly Position[], point: Position): { readonly point: Position; readonly segment: number; readonly distance: number } | null {
  let best: { point: Position; segment: number; distance: number } | null = null
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i]!, b = route[i + 1]!, dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy
    const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length)) : 0
    const p = { x: a.x + t * dx, y: a.y + t * dy }, distance = Math.hypot(p.x - point.x, p.y - point.y)
    if (!best || distance < best.distance) best = { point: p, segment: i, distance }
  }
  return best
}
function getSheet(project: EngineeringProject, id: Id): SchematicSheet {
  const s = project.sheets.find(s => s.id === id)
  if (!s) throw new EditingError('当前图纸不存在。')
  return s
}
function symbolFor(def: ComponentDefinition, project: EngineeringProject): SymbolDefinition {
  const existing = project.symbols.find(s => s.id === def.defaultSymbolId) ?? project.symbols.find(s => s.resource.id === `org.stray.symbol.${def.kind}` && s.resource.version === '1' && def.pins.every(p => Object.hasOwn(s.pinPositions, p.key)))
  if (existing) return existing
  const positions = Object.fromEntries(def.pins.map((p, i) => [p.key, def.kind === 'npn' || def.kind === 'nmos' ? [{ x: -40, y: 0 }, { x: 40, y: -40 }, { x: 40, y: 40 }][i]! : def.kind === 'ideal-opamp' || def.kind === 'dynamic-opamp' ? [{ x: -40, y: -20 }, { x: -40, y: 20 }, { x: 40, y: 0 }][i]! : (def.kind === 'vcvs' || def.kind === 'vccs') ? { x: i % 2 === 0 ? -40 : 40, y: i < 2 ? 0 : 60 } : def.pins.length === 2 ? { x: i === 0 ? -40 : 40, y: 0 } : { x: i % 2 === 0 ? -60 : 60, y: Math.floor(i / 2) * 20 - 20 }]))
  return { id: createId(), resource: { id: `org.stray.symbol.${def.kind}`, version: '1' }, pinPositions: positions }
}
/** Updates supplied geometry only; pin IDs, edges and their endpoints are retained. */
function positionComponent(project: EngineeringProject, sheet: SchematicSheet, id: Id, origin: Position, rotate = false): { readonly sheet: SchematicSheet; readonly symbol: SymbolDefinition } {
  const component = sheet.components.find(c => c.id === id)
  if (!component) throw new EditingError('请选择一个现有元件。')
  const definition = project.definitions.find(d => d.id === component.definitionId)!
  const previous = sheet.geometry.placements.find(p => p.componentId === id)
  const symbol = previous ? project.symbols.find(s => s.id === previous.symbolId)! : symbolFor(definition, project)
  const placement = { componentId: id, symbolId: symbol.id, origin: snap(origin), rotationDegrees: ((previous?.rotationDegrees ?? 0) + (rotate ? 90 : 0)) % 360 as 0 | 90 | 180 | 270, mirrored: previous?.mirrored ?? false }
  const positions = { ...sheet.geometry.anchorPositions }
  for (const pin of component.pins) {
    const local = symbol.pinPositions[pin.definitionPinKey]
    if (!local) throw new EditingError('符号缺少此元件的引脚位置，暂时无法放置。')
    positions[pin.anchorId] = pinPosition(local, placement.origin, placement.rotationDegrees, placement.mirrored)
  }
  const routes = { ...sheet.geometry.connectionRoutes }, pins = new Set(component.pins.map(p => p.anchorId))
  for (const edge of sheet.connections) if (edge.endpoints.some(id => pins.has(id))) {
    const a = positions[edge.endpoints[0]], b = positions[edge.endpoints[1]]
    if (a && b) routes[edge.id] = wireRoute(a, b)
  }
  return { symbol, sheet: { ...sheet, geometry: { placements: [...sheet.geometry.placements.filter(p => p.componentId !== id), placement], anchorPositions: positions, connectionRoutes: routes } } }
}
function ensureUnobserved(project: EngineeringProject, sheet: SchematicSheet, removed: ReadonlySet<string>): void {
  if (project.measurements.some(d => d.channels.some(c => c.probeAnchorId && removed.has(c.probeAnchorId))) || project.boards.some(b => b.assignments.some(a => removed.has(a.componentId) || a.pinPadMappings.some(m => removed.has(m.instancePinId))))) throw new EditingError('此对象被测量或 PCB 映射引用，不能直接删除。')
  for (const a of project.analyses) if (a.scope.kind === 'circuit' && a.scope.sheetIds.includes(sheet.id)) {
    if (!['topology', 'resistance-equivalent'].includes(a.analysisType)) throw new EditingError('此图纸包含本编辑器尚未支持的分析引用，不能直接删除对象。')
    for (const [key, value] of Object.entries(a.options)) {
      if (!['referenceAnchorId', 'probeAnchorIds', 'probePinIds', 'terminalIds'].includes(key)) throw new EditingError('此图纸的分析选项尚不支持安全删除，请保留引用对象。')
      if ((typeof value === 'string' && removed.has(value)) || (Array.isArray(value) && value.some(v => typeof v === 'string' && removed.has(v)))) throw new EditingError('此对象被分析配置引用，不能直接删除。')
    }
  }
}

export function applyEdit(project: EngineeringProject, sheetId: Id, operation: EditOperation): EngineeringProject {
  if (operation.type === 'title') return reviseProject(project, project.revision, { title: operation.title })
  let sheet = getSheet(project, sheetId), definitions = project.definitions, symbols = project.symbols
  const positions = { ...sheet.geometry.anchorPositions }
  const anchors = [...sheet.anchors], connections = [...sheet.connections], routes = { ...sheet.geometry.connectionRoutes }
  const resolve = (endpoint: Endpoint): Id => {
    if ('anchorId' in endpoint) { if (!anchors.some(a => a.id === endpoint.anchorId)) throw new EditingError('接线端点不在当前图纸内。'); return endpoint.anchorId }
    const id = createId(); anchors.push({ id }); positions[id] = snap(endpoint.position); return id
  }
  switch (operation.type) {
    case 'add': {
      const config = PALETTE[operation.kind]
      let def = definitions.find(d => d.resource.id === `org.stray.component.${operation.kind}` && d.resource.version === '1')
      if (!def) { def = operation.kind === 'dynamic-opamp' ? createDynamicOpampDefinition() : operation.kind in ANALOG_DEVICES ? createAnalogDefinition(operation.kind as AnalogKind) : operation.kind === 'resistor' ? createResistorDefinition() : operation.kind in DC_SOURCES ? createDcSourceDefinition(operation.kind as keyof typeof DC_SOURCES) : { id: createId(), resource: { id: `org.stray.component.${operation.kind}`, version: '1' }, kind: operation.kind, pins: [{ key: '1', name: '1', electricalRole: 'passive' }, { key: '2', name: '2', electricalRole: 'passive' }], parameters: [{ key: config.parameter, kind: 'quantity', unit: config.unit, required: true }], modelBindings: [] }; definitions = [...definitions, def] }
      let serial = 1
      while (project.sheets.some(s => s.components.some(c => c.reference === `${config.prefix}${serial}`))) serial++
      const added = instantiateComponent(def, `${config.prefix}${serial}`, { ...(operation.kind === 'dynamic-opamp' ? dynamicOpampDefaults() : operation.kind in ANALOG_DEVICES ? analogDefaults(operation.kind as AnalogKind) : {}), [config.parameter]: { kind: 'quantity', quantity: { value: config.value, unit: config.unit } }, ...((operation.kind === 'ccvs' || operation.kind === 'cccs') ? { controlBranchId: { kind: 'text' as const, value: '' } } : {}) })
      sheet = { ...sheet, components: [...sheet.components, added.component], anchors: [...sheet.anchors, ...added.anchors] }
      const placed = positionComponent({ ...project, definitions }, sheet, added.component.id, operation.position)
      sheet = placed.sheet; if (!symbols.some(s => s.id === placed.symbol.id)) symbols = [...symbols, placed.symbol]
      break
    }
    case 'move': case 'rotate': {
      const old = sheet.geometry.placements.find(p => p.componentId === operation.id)
      const placed = positionComponent(project, sheet, operation.id, operation.type === 'move' ? operation.position : old?.origin ?? { x: 200, y: 200 }, operation.type === 'rotate')
      sheet = placed.sheet; if (!symbols.some(s => s.id === placed.symbol.id)) symbols = [...symbols, placed.symbol]
      break
    }
    case 'properties': {
      if (!operation.reference.trim() || operation.reference !== operation.reference.trim()) throw new EditingError('元件标识不能为空，也不能包含首尾空格。')
      if (!sheet.components.some(c => c.id === operation.id)) throw new EditingError('所选元件已不存在。')
      if (sheet.components.some(c => c.id !== operation.id && c.reference === operation.reference)) throw new EditingError('当前图纸已有同名元件，请使用不同标识。')
      sheet = { ...sheet, components: sheet.components.map(c => c.id === operation.id ? { ...c, reference: operation.reference, parameters: operation.parameters } : c) }; break
    }
    case 'connect': {
      const a = resolve(operation.from), b = resolve(operation.to)
      if (a === b) throw new EditingError('请选择另一个引脚或连接点。')
      if (connections.some(c => c.endpoints.includes(a) && c.endpoints.includes(b))) throw new EditingError('这两个连接点之间已有导线。')
      const pa = positions[a], pb = positions[b]
      if (!pa || !pb) throw new EditingError('端点尚未放置，请先补充画布位置。')
      const id = createId(); connections.push({ id, endpoints: [a, b] }); routes[id] = wireRoute(pa, pb)
      sheet = { ...sheet, anchors, connections, geometry: { ...sheet.geometry, anchorPositions: positions, connectionRoutes: routes } }; break
    }
    case 'marker': {
      const id = resolve(operation.at), name = operation.name?.trim() ?? ''
      if ((operation.kind === 'label' || operation.kind === 'port') && !name) throw new EditingError('请填写标签或端口名称。')
      sheet = { ...sheet, anchors, geometry: { ...sheet.geometry, anchorPositions: positions } }
      if (operation.kind === 'reference') sheet = { ...sheet, references: [...sheet.references, { id: createId(), anchorId: id, domain: 'analog' }] }
      else if (operation.kind === 'port') sheet = { ...sheet, ports: [...sheet.ports, { id: createId(), anchorId: id, label: name }] }
      else sheet = { ...sheet, labels: [...sheet.labels, { id: createId(), anchorId: id, name: operation.kind === 'ground' ? 'GND' : name, scope: operation.kind === 'ground' ? 'project' : operation.scope ?? 'sheet' }] }
      break
    }
    case 'remove-marker': {
      ensureUnobserved(project, sheet, new Set([operation.id]))
      sheet = { ...sheet, labels: sheet.labels.filter(l => l.id !== operation.id), references: sheet.references.filter(r => r.id !== operation.id), ports: sheet.ports.filter(p => p.id !== operation.id) }; break
    }
    case 'junction': {
      const picked = closestOnRoute(connectionRoute(sheet, operation.connectionId), snap(operation.position))
      if (!picked || picked.distance > GRID) throw new EditingError('请在现有导线上选择结点位置。')
      const point = picked.point, existing = sheet.anchors.find(a => { const p = positions[a.id]; return p && Math.hypot(p.x - point.x, p.y - point.y) < 0.01 }), id = existing?.id ?? createId()
      if (!existing) { anchors.push({ id }); positions[id] = point }
      let affected = 0
      const retained = []
      for (const edge of connections) {
        const route = connectionRoute(sheet, edge.id), hit = closestOnRoute(route, point)
        if (!hit || hit.distance > 0.01) { retained.push(edge); continue }
        affected++
        const atStart = Math.hypot(route[0]!.x - point.x, route[0]!.y - point.y) < 0.01, atEnd = Math.hypot(route.at(-1)!.x - point.x, route.at(-1)!.y - point.y) < 0.01
        if (atStart || atEnd) { retained.push(edge); const endpoint = edge.endpoints[atStart ? 0 : 1]; if (endpoint !== id) { const join = createId(); retained.push({ id: join, endpoints: [id, endpoint] as const }); routes[join] = [point, point] }; continue }
        const left = createId(), right = createId()
        retained.push({ id: left, endpoints: [edge.endpoints[0], id] as const }, { id: right, endpoints: [id, edge.endpoints[1]] as const })
        routes[left] = [...route.slice(0, hit.segment + 1), point]; routes[right] = [point, ...route.slice(hit.segment + 1)]; delete routes[edge.id]
      }
      if (!affected) throw new EditingError('此处没有可连接的导线。')
      sheet = { ...sheet, anchors, connections: retained, geometry: { ...sheet.geometry, anchorPositions: positions, connectionRoutes: routes } }; break
    }
    case 'delete': {
      const target = operation.selection, removed = new Set<string>([target.id])
      if (target.kind === 'component') {
        const component = sheet.components.find(c => c.id === target.id); if (!component) throw new EditingError('所选元件已不存在。')
        for (const pin of component.pins) { removed.add(pin.id); removed.add(pin.anchorId) }
      }
      if (target.kind === 'anchor' && sheet.components.some(c => c.pins.some(p => p.anchorId === target.id))) throw new EditingError('引脚属于元件；请选择元件后删除。')
      const associated = [...sheet.labels, ...sheet.references, ...sheet.ports].filter(item => removed.has(item.anchorId))
      associated.forEach(item => removed.add(item.id)); ensureUnobserved(project, sheet, removed)
      const keptConnections = sheet.connections.filter(c => !removed.has(c.id) && !c.endpoints.some(id => removed.has(id)))
      const keptAnchors = sheet.anchors.filter(a => !removed.has(a.id))
      const anchorPositions = Object.fromEntries(Object.entries(positions).filter(([id]) => !removed.has(id)))
      const connectionRoutes = Object.fromEntries(Object.entries(routes).filter(([id]) => keptConnections.some(c => c.id === id)))
      sheet = { ...sheet, components: sheet.components.filter(c => !removed.has(c.id)), anchors: keptAnchors, connections: keptConnections, labels: sheet.labels.filter(l => !removed.has(l.id)), references: sheet.references.filter(r => !removed.has(r.id)), ports: sheet.ports.filter(p => !removed.has(p.id)), geometry: { placements: sheet.geometry.placements.filter(p => !removed.has(p.componentId)), anchorPositions, connectionRoutes } }; break
    }
  }
  return reviseProject(project, project.revision, { definitions, symbols, sheets: project.sheets.map(s => s.id === sheetId ? sheet : s) })
}
