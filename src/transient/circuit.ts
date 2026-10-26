import { createEngineeringProject, deriveElectricalNets } from '../engineering'
import type { EngineeringProject } from '../engineering'
import { TransientError } from './types'
import type { TransientCircuit, TransientElement, TransientKind, TransientSettings } from './types'

/** Pinned ideal adapters only. Geometry and numerical references never create connectivity. */
export function resolveTransientCircuit(input: EngineeringProject, sheetId: string, settings: TransientSettings): TransientCircuit {
  const project = createEngineeringProject(input), sheet = project.sheets.find(s => s.id === sheetId)
  if (!sheet?.components.length) throw new TransientError('TRAN_EMPTY', '请选择包含元件的平面图纸。')
  const topology = deriveElectricalNets(project), anchors = new Set(sheet.anchors.map(a => a.id)), nets = topology.nets.filter(n => n.anchorIds.some(id => anchors.has(id)))
  if (nets.some(n => n.anchorIds.some(id => !anchors.has(id)))) throw new TransientError('TRAN_CROSS_SHEET', '暂态暂不支持跨图纸导电网络。', [sheetId], 'unsupported')
  const net = (id: string) => { if (!anchors.has(id)) throw new TransientError('TRAN_ANCHOR', '数值参考须引用当前图纸的稳定连接点。', [id]); return topology.anchorToNet[id]! }
  let referenceAnchorId = settings.referenceAnchorId
  if (referenceAnchorId === undefined) {
    const markers = sheet.references.filter(r => r.domain === 'analog').map(r => r.anchorId), candidates = markers.length ? markers : sheet.labels.filter(l => l.name === 'GND').map(l => l.anchorId)
    if (!candidates.length) throw new TransientError('TRAN_REFERENCE_MISSING', '请显式选择参考节点，或放置模拟参考标记/唯一 GND 标签。')
    if (new Set(candidates.map(net)).size !== 1) throw new TransientError('TRAN_REFERENCE_AMBIGUOUS', '参考标记指向多个网络；请选择一个参考，标记不会连接网络。', candidates)
    referenceAnchorId = candidates[0]!
  }
  const referenceKey = net(referenceAnchorId)
  const elements: TransientElement[] = sheet.components.map(component => {
    const def = project.definitions.find(d => d.id === component.definitionId)!, bindings = def.modelBindings.filter(b => b.analysisFamily === 'electrical'), binding = bindings.length === 1 ? bindings[0] : undefined
    let kind: TransientKind | undefined, ports: Readonly<Record<string, string>> | undefined
    if (binding?.model.version === '1') {
      if (binding.model.id === 'org.stray.model.resistor') { kind = 'resistor'; ports = binding.portMap }
      if (binding.model.id === 'org.stray.model.dc.voltage-source') { kind = 'voltage-source'; ports = binding.portMap }
      if (binding.model.id === 'org.stray.model.dc.current-source') { kind = 'current-source'; ports = binding.portMap }
    }
    if (!def.modelBindings.length && ['capacitor', 'inductor', 'voltage-source', 'current-source'].includes(def.kind) && def.resource.id === `org.stray.component.${def.kind}` && def.resource.version === '1' && def.pins.length === 2 && def.pins.every(p => ['1', '2'].includes(p.key))) { kind = def.kind as TransientKind; ports = { p: '1', n: '2' } }
    if (!kind || !ports) throw new TransientError('TRAN_MODEL', `${component.reference} 没有受支持的固定版本线性暂态模型。当前支持 R/C/L 与独立 V/I 源。`, [component.id], 'unsupported')
    if (component.pins.length !== 2 || Object.keys(ports).length !== 2 || !ports.p || !ports.n || ports.p === ports.n) throw new TransientError('TRAN_PORT_MAP', '模型端口必须完整且一一对应。', [component.id])
    const p = component.pins.find(p => p.definitionPinKey === ports.p), n = component.pins.find(p => p.definitionPinKey === ports.n)
    if (!p || !n) throw new TransientError('TRAN_PORT_MAP', '模型端口映射不完整。', [component.id])
    const spec = kind === 'resistor' ? ['resistance', 'ohm'] : kind === 'capacitor' ? ['capacitance', 'F'] : kind === 'inductor' ? ['inductance', 'H'] : kind === 'voltage-source' ? ['voltage', 'V'] : ['current', 'A']
    const parameter = component.parameters[spec[0]!]
    if (parameter?.kind !== 'quantity' || parameter.quantity.unit !== spec[1] || !Number.isFinite(parameter.quantity.value) || (['resistor', 'capacitor', 'inductor'].includes(kind) && parameter.quantity.value <= 0)) throw new TransientError('TRAN_PARAMETER', `${component.reference} 参数须使用 ${spec[1]}；R/C/L 必须为有限正数。`, [component.id])
    return { id: component.id, reference: component.reference, kind, value: parameter.quantity.value, p: net(p.anchorId), n: net(n.anchorId), fromPinId: p.id, toPinId: n.id }
  })
  const independent = elements.filter(e => e.kind === 'voltage-source' || e.kind === 'current-source'), storage = elements.filter(e => e.kind === 'capacitor' || e.kind === 'inductor')
  if (settings.sources.length !== independent.length || settings.sources.some(s => !independent.some(e => e.id === s.componentId && s.unit === (e.kind === 'voltage-source' ? 'V' : 'A')))) throw new TransientError('TRAN_SOURCES', '必须按稳定 ID、正确单位配置每一个独立源；不会继承 DC 值或 AC 相量。', independent.map(e => e.id))
  if (settings.initialConditions.length !== storage.length || settings.initialConditions.some(s => !storage.some(e => e.id === s.componentId && s.unit === (e.kind === 'capacitor' ? 'V' : 'A')))) throw new TransientError('TRAN_INITIAL', '必须按稳定 ID 配置每个电容电压/V、每个电感电流/A；不静默补零。', storage.map(e => e.id))
  const unknowns = nets.length - 1 + elements.filter(e => ['voltage-source', 'capacitor', 'inductor'].includes(e.kind)).length
  if (unknowns > 48 || elements.length > 64 || (nets.length + elements.length * 2 + storage.length) * (Math.round(settings.durationSeconds / settings.intervalSeconds) + 1) > 500000) throw new TransientError('TRAN_RESOURCE', '暂态上限：48 个未知量、64 个元件、500000 个输出标量；内部求解另有工作预算。', [], 'resource')
  return { referenceKey, referenceAnchorId, elements, nodes: nets.map(n => ({ key: n.key, name: `N${topology.nets.findIndex(t => t.key === n.key) + 1}`, anchorIds: n.anchorIds })) }
}
