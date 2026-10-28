import type { EngineeringProject } from '../engineering'
import { buildEditorView, componentValueText } from './view'
import { SymbolBody } from './SymbolBody'

/** Read-only projection of the same engineering graph, geometry and symbols as the editor. */
export function SchematicPreview({ project }: { readonly project: EngineeringProject }) {
  const view = buildEditorView(project, project.sheets[0]!.id), points = Object.values(view.positions)
  const minX = Math.min(...points.map(p => p.x)) - 80, minY = Math.min(...points.map(p => p.y)) - 80
  const width = Math.max(400, Math.max(...points.map(p => p.x)) - minX + 160), height = Math.max(280, Math.max(...points.map(p => p.y)) - minY + 80)
  return <svg className="atlas-schematic" viewBox={`${minX} ${minY} ${width} ${height}`} role="img" aria-label={`${project.title} 原理图预览`}>
    {view.wires.map(({ connection, route }) => <g className="editor-wire" key={connection.id}><path className="wire-underlay" d={route.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ')} /><path className="wire-ink" d={route.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ')} /></g>)}
    {view.components.map(({ component, definition, placement }) => <g className="editor-component" key={component.id}>
      <g transform={`translate(${placement.origin.x} ${placement.origin.y}) rotate(${placement.rotationDegrees})`}><SymbolBody kind={definition.kind} /></g>
      <text x={placement.origin.x + (placement.rotationDegrees ? 36 : 0)} y={placement.origin.y - 30} textAnchor={placement.rotationDegrees ? 'start' : 'middle'}>{component.reference}</text>
      <text className="component-value" x={placement.origin.x + (placement.rotationDegrees ? 36 : 0)} y={placement.origin.y + 36} textAnchor={placement.rotationDegrees ? 'start' : 'middle'}>{componentValueText(component, definition.kind)}</text>
    </g>)}
    {view.sheet.anchors.map(a => { const p = view.positions[a.id]!; return <circle key={a.id} cx={p.x} cy={p.y} r={view.sheet.connections.filter(c => c.endpoints.includes(a.id)).length > 2 ? 5 : 3} fill="var(--ink)" /> })}
    {view.sheet.ports.map(port => { const p = view.positions[port.anchorId]!; return <text className="atlas-port" key={port.id} x={p.x + 10} y={p.y - 14}>{port.label}</text> })}
  </svg>
}
