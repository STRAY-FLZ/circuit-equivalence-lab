import { useId, useState } from 'react'
import type { DrawingResult } from './types'

interface Props { readonly drawing: DrawingResult; readonly title: string; readonly selectedIds?: readonly string[]; readonly replacementIds?: readonly string[]; readonly affectedNodeIds?: readonly string[] }
export function CircuitDiagram({ drawing, title, selectedIds = [], replacementIds = [], affectedNodeIds = [] }: Props) {
  const titleId = useId()
  const [inspected, setInspected] = useState<{ kind: 'element' | 'point'; id: string } | null>(null)
  if (drawing.kind === 'unsupported') return <p role="alert">{drawing.message}</p>
  const { model } = drawing
  const detail = inspected?.kind === 'element' ? model.network.elements.find(e => e.id === inspected.id) : null
  const inspectedPoint = inspected?.kind === 'point' ? model.network.points.find(p => p.id === inspected.id) : null
  return <div className="diagram-container">
    <svg className="circuit-svg" style={{ minWidth: Math.max(360, model.width * 0.75) }} viewBox={`0 0 ${model.width} ${model.height}`} role="group" aria-labelledby={titleId}>
      <title id={titleId}>{title}</title>
      {model.residualPointIds.length > 0 && <g className="residual-section"><rect x="20" y="435" width={model.width - 40} height={model.height - 455} rx="8" /><text x="35" y="463">独立分量 / 孤立连接点（与端子网络无连接）</text></g>}
      {model.elements.map(({ element, route, center, angle, shorted }) => {
        const state = replacementIds.includes(element.id) ? 'replacement' : selectedIds.includes(element.id) ? 'selected' : 'unaffected'
        const path = route.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')
        const label = element.kind === 'resistor' ? `${element.id} · ${Number(element.resistance.toPrecision(6))} Ω` : `${element.id} · 理想导线`
        return <g key={element.id} data-element-id={element.id} data-state={state} data-shorted={shorted} className={`circuit-element ${state}`} role="button" tabIndex={0}
          aria-label={`${label}${shorted ? '（已短接）' : ''}`} aria-pressed={inspected?.kind === 'element' && inspected.id === element.id}
          onClick={() => setInspected({ kind: 'element', id: element.id })} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setInspected({ kind: 'element', id: element.id }) } }}>
          <title>{label}；连接点 {element.endpoints.join(' ↔ ')}{shorted ? '；已被短接' : ''}</title>
          <path className="crossing-gap" d={path} /><path className="element-line" d={path} /><path className="hit-target" d={path} />
          {element.kind === 'resistor' && <g transform={`translate(${center.x} ${center.y}) rotate(${angle})`}><rect className="resistor-symbol" x="-27" y="-9" width="54" height="18" /></g>}
        </g>
      })}
      <g pointerEvents="none" aria-hidden="true">{model.elements.map(({ element, shorted, labelPosition, labelAnchor }) => {
        const state = replacementIds.includes(element.id) ? 'replacement' : selectedIds.includes(element.id) ? 'selected' : 'unaffected'
        return <text key={element.id} className={`element-label circuit-element ${state}`} x={labelPosition.x} y={labelPosition.y} textAnchor={labelAnchor}>
          {element.id} · {element.kind === 'resistor' ? `${Number(element.resistance.toPrecision(6))} Ω${shorted ? ' · 短接' : ''}` : '理想导线'}
        </text>
      })}</g>
      {model.network.points.map(point => {
        const position = model.layout.pointPositions[point.id]
        if (!position) return null
        const nodeId = model.topology.pointToNode[point.id] ?? ''
        const terminals = model.network.terminals.filter(t => t.pointId === point.id)
        return <g key={point.id} data-point-id={point.id} data-node-id={nodeId} data-affected={affectedNodeIds.includes(nodeId)} className={`circuit-node ${affectedNodeIds.includes(nodeId) ? 'affected' : ''}`}
          role="button" tabIndex={0} aria-label={`连接点 ${point.id}；电气节点 ${nodeId}${terminals.length ? `；端子 ${terminals.map(t => t.label).join('、')}` : ''}`}
          aria-pressed={inspected?.kind === 'point' && inspected.id === point.id}
          onClick={() => setInspected({ kind: 'point', id: point.id })} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setInspected({ kind: 'point', id: point.id }) } }}>
          <title>{point.id}；电气节点 {nodeId}{terminals.length ? `；端子 ${terminals.map(t => t.label).join('、')}` : ''}</title>
          <circle className="node-hit-target" cx={position.x} cy={position.y} r="16" />
          <circle cx={position.x} cy={position.y} r={terminals.length ? 7 : 4} className={terminals.length ? 'terminal-dot' : 'junction-dot'} />
          <text className="node-label" x={position.x} y={position.y + 25} textAnchor="middle">{point.id}</text>
          {terminals.map((terminal, i) => <text key={terminal.id} data-terminal-id={terminal.id} className="terminal-label" x={position.x + 16} y={position.y - 16 - i * 23}>{terminal.label}</text>)}
        </g>
      })}
    </svg>
    <p className="inspection" aria-live="polite">{detail ? `${detail.id}：${detail.kind === 'wire' ? '理想导线' : `${detail.resistance} Ω`}；连接点 ${detail.endpoints.join(' ↔ ')}；电气节点 ${detail.endpoints.map(id => model.topology.pointToNode[id]).join(' ↔ ')}` : inspectedPoint ? `连接点 ${inspectedPoint.id}；电气节点 ${model.topology.pointToNode[inspectedPoint.id]}；端子 ${model.network.terminals.filter(t => t.pointId === inspectedPoint.id).map(t => `${t.label} (${t.id})`).join('、') || '无'}` : '点击或键盘选择元件、节点以查看连接信息。'}</p>
  </div>
}
