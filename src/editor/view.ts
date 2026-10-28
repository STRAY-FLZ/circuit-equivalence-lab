import { deriveElectricalNets } from '../engineering'
import { ANALOG_DEVICES } from '../engineering'
import type { AnalogKind, ComponentInstance, EngineeringProject, Id, Position } from '../engineering'
import { connectionRoute, pinPosition, wireRoute } from '../editing'

export function buildEditorView(project: EngineeringProject, sheetId: Id, drag?: { readonly id: Id; readonly origin: Position }) {
  const sheet = project.sheets.find(s => s.id === sheetId)!
  const positions = { ...sheet.geometry.anchorPositions }
  const components = sheet.components.flatMap(component => {
    const placement = sheet.geometry.placements.find(p => p.componentId === component.id)
    if (!placement) return []
    const symbol = project.symbols.find(s => s.id === placement.symbolId)!, definition = project.definitions.find(d => d.id === component.definitionId)!
    const origin = drag?.id === component.id ? drag.origin : placement.origin
    if (drag?.id === component.id) for (const pin of component.pins) positions[pin.anchorId] = pinPosition(symbol.pinPositions[pin.definitionPinKey]!, origin, placement.rotationDegrees, placement.mirrored)
    return [{ component, definition, symbol, placement: { ...placement, origin } }]
  })
  const movedPins = new Set(drag ? sheet.components.find(c => c.id === drag.id)?.pins.map(p => p.anchorId) : [])
  const wires = sheet.connections.map(connection => {
    const a = positions[connection.endpoints[0]], b = positions[connection.endpoints[1]]
    const route = drag && a && b && connection.endpoints.some(id => movedPins.has(id)) ? wireRoute(a, b) : connectionRoute(sheet, connection.id)
    return { connection, route }
  })
  return { sheet, positions, components, wires, unplaced: sheet.components.filter(c => !components.some(v => v.component.id === c.id)), missingAnchors: sheet.anchors.filter(a => !positions[a.id]) }
}
export function nearestAnchor(positions: Readonly<Record<Id, Position>>, point: Position, radius = 12): Id | undefined {
  return Object.entries(positions).map(([id, p]) => ({ id, distance: Math.hypot(point.x - p.x, point.y - p.y) })).filter(p => p.distance <= radius).sort((a, b) => a.distance - b.distance)[0]?.id
}
export function netInspection(project: EngineeringProject) { return deriveElectricalNets(project) }

/** Keep full parameters in properties; multi-parameter device labels stay readable. */
export function componentValueText(component: ComponentInstance, kind: string): string {
  const parameters = kind in ANALOG_DEVICES ? [component.parameters[ANALOG_DEVICES[kind as AnalogKind].parameter]] : Object.values(component.parameters)
  return parameters.filter(p => p?.kind === 'quantity').map(p => p?.kind === 'quantity' ? `${p.quantity.value} ${p.quantity.unit === 'ohm' ? 'Ω' : p.quantity.unit}` : '').join(' / ')
}
