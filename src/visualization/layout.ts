import type { CircuitNetwork } from '../domain'
import { analyzeTopology } from '../topology'
import type { CircuitLayout, DrawingResult, LayoutTransition, Position } from './types'

const order = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
const midpoint = (a: Position, b: Position): Position => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/** Bounded deterministic drawing, never used to infer electrical connectivity. */
export function buildDrawing(network: CircuitNetwork, explicit?: CircuitLayout, transition?: LayoutTransition): DrawingResult {
  const topology = analyzeTopology(network)
  if (network.points.length > 16 || network.elements.length > 24) return { kind: 'unsupported', message: '此布局支持最多 16 个连接点、24 个元件。请查看完整元件清单。' }
  const positions: Record<string, Position> = Object.create(null) as Record<string, Position>
  const terminalComponents = new Set(network.terminals.map(t => topology.nodeToComponent[topology.terminalToNode[t.id] ?? '']))
  const residualPointIds: string[] = []
  let activeIndex = 0
  let residualIndex = 0
  for (const component of topology.components) {
    const ids = topology.nodes.filter(n => component.nodeIds.includes(n.id)).flatMap(n => n.pointIds).sort(order)
    const residual = network.terminals.length > 0 && !terminalComponents.has(component.id)
    if (residual) residualPointIds.push(...ids)
    const index = residual ? residualIndex++ : activeIndex++
    const origin = { x: residual ? 280 : 280 + index * 560, y: residual ? 550 + index * 240 : 200 }
    ids.forEach((id, i) => {
      const angle = Math.PI + 2 * Math.PI * i / ids.length
      positions[id] = ids.length === 1 ? origin : { x: origin.x + 190 * Math.cos(angle), y: origin.y + (residual ? 75 : 130) * Math.sin(angle) }
    })
  }
  const seeds = explicit?.pointPositions ?? transition?.previous.pointPositions ?? {}
  for (const point of network.points) {
    const seed = seeds[point.id]
    if (seed && !residualPointIds.includes(point.id)) {
      if (!Number.isFinite(seed.x) || !Number.isFinite(seed.y) || seed.x < 50 || seed.y < 50 || seed.x > 10000 || seed.y > 10000) return { kind: 'unsupported', message: `连接点 ${point.id} 的坐标超出支持范围。请查看完整元件清单。` }
      positions[point.id] = { ...seed }
    }
  }
  if (transition) {
    const boundary = transition.boundaryPointIds.map(id => positions[id]).filter((p): p is Position => p !== undefined)
    if (boundary.length) for (const id of transition.createdPointIds) if (positions[id]) positions[id] = { x: boundary.reduce((sum, p) => sum + p.x, 0) / boundary.length, y: boundary.reduce((sum, p) => sum + p.y, 0) / boundary.length }
  }
  const sorted = network.elements.toSorted((a, b) => order(a.id, b.id))
  const groups = new Map<string, typeof sorted>()
  for (const element of sorted) {
    const key = JSON.stringify([...element.endpoints].sort(order))
    const group = groups.get(key) ?? []
    group.push(element)
    groups.set(key, group)
  }
  const labelBoxes: { x: number; y: number; width: number }[] = []
  const elements = sorted.map(element => {
    const ids = [...element.endpoints].sort(order)
    const a = positions[ids[0] ?? ''] as Position
    const b = positions[ids[1] ?? ''] as Position
    const siblings = groups.get(JSON.stringify(ids)) ?? []
    const offset = (siblings.indexOf(element) - (siblings.length - 1) / 2) * 76
    const distance = Math.hypot(b.x - a.x, b.y - a.y)
    let route: Position[]
    if (distance < 1) {
      const radius = 65 + siblings.indexOf(element) * 45
      route = [a, { x: a.x + radius, y: a.y }, { x: a.x + radius, y: a.y + radius }, { x: a.x - radius, y: a.y + radius }, { x: a.x - radius, y: a.y }, b]
    } else {
      const normal = { x: -(b.y - a.y) / distance, y: (b.x - a.x) / distance }
      const shift = (p: Position): Position => ({ x: p.x + normal.x * offset, y: p.y + normal.y * offset })
      route = offset === 0 ? [a, b] : [a, shift(a), shift(b), b]
    }
    const central = Math.floor((route.length - 1) / 2)
    const start = route[central] as Position
    const end = route[central + 1] as Position
    const center = midpoint(start, end)
    const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI
    const vertical = Math.abs(Math.sin(angle * Math.PI / 180)) > 0.92
    const labelPosition = { x: center.x + (vertical ? 30 : 0), y: center.y + (vertical ? 5 : -23) }
    const width = (element.id.length + (element.kind === 'wire' ? 14 : String(Number(element.resistance.toPrecision(6))).length + 8)) * 8
    const labelBox = { x: labelPosition.x - (vertical ? 0 : width / 2), y: labelPosition.y, width }
    // Modest label separation is independent of routing and electrical meaning.
    while (labelBoxes.some(box => Math.abs(box.y - labelBox.y) < 22 && box.x < labelBox.x + width && labelBox.x < box.x + box.width)) {
      labelBox.y -= 25
      labelPosition.y -= 25
    }
    labelBoxes.push(labelBox)
    return { element, route, center, angle, labelPosition, labelAnchor: vertical ? 'start' as const : 'middle' as const,
      shorted: topology.resistors.find(r => r.id === element.id)?.isShortCircuited ?? false }
  })
  if (labelBoxes.some(box => box.x < 15 || box.y < 25)) return { kind: 'unsupported', message: '元件标签间距不足，无法可靠绘制。请查看完整元件清单。' }
  const allPositions = [...Object.values(positions), ...elements.flatMap(e => e.route), ...labelBoxes.map(box => ({ x: box.x + box.width, y: box.y + 20 }))]
  if (allPositions.some(p => p.x < 35 || p.y < 35)) return { kind: 'unsupported', message: '支路间距不足，无法可靠绘制。请查看完整元件清单。' }
  // A dot over an unrelated segment would imply a false tap. Refuse ambiguous
  // geometry instead of changing connectivity or hiding the declared point.
  for (const point of network.points) {
    const p = positions[point.id] as Position
    for (const branch of elements) {
      if (branch.element.endpoints.includes(point.id)) continue
      for (let i = 1; i < branch.route.length; i++) {
        const a = branch.route[i - 1] as Position
        const b = branch.route[i] as Position
        const lengthSquared = (b.x - a.x) ** 2 + (b.y - a.y) ** 2
        if (!lengthSquared) continue
        const t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / lengthSquared
        if (t >= 0 && t <= 1 && Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y))) < 8) {
          return { kind: 'unsupported', message: `连接点 ${point.id} 与非关联支路重叠，无法可靠绘制。请查看完整元件清单。` }
        }
      }
    }
  }
  return { kind: 'ready', model: { network, topology, layout: { pointPositions: positions }, elements, residualPointIds,
    width: Math.max(560, ...allPositions.map(p => p.x + 65)), height: Math.max(400, ...allPositions.map(p => p.y + 65)) } }
}
