import { ANALOG_DEVICES, createEngineeringProject, deriveElectricalNets } from '../engineering'
import type { AnalogKind } from '../engineering'
import type { AnalysisInput } from '../analysis'
import { AnalogError } from './types'
import type { AnalogCircuit, AnalogElement } from './types'

export function resolveAnalogCircuit(input: AnalysisInput): AnalogCircuit {
  const project = createEngineeringProject(input.project), config = input.configuration
  if (!['analog.operating-point', 'analog.ideal-opamp'].includes(config.analysisType) || config.scope.kind !== 'circuit' || config.scope.sheetIds.length !== 1) throw new AnalogError('ANALOG_SCOPE', '模拟电子仅支持单张平面图纸。', 'unsupported')
  const expected = config.analysisType === 'analog.ideal-opamp' ? 'org.stray.engine.ideal-opamp' : 'org.stray.engine.analog-dc'
  if (config.preferredEngine && (config.preferredEngine.id !== expected || config.preferredEngine.version !== '1')) throw new AnalogError('ANALOG_PROVIDER', '引擎版本不支持。', 'unsupported')
  if (Object.keys(config.options).some(k => k !== 'referenceAnchorId')) throw new AnalogError('ANALOG_OPTIONS', '分析选项不支持。')
  const sheetId = config.scope.sheetIds[0]
  const sheet = project.sheets.find(s => s.id === sheetId)
  if (!sheet?.components.length) throw new AnalogError('ANALOG_EMPTY', '请选择包含元件的图纸。')
  const topology = deriveElectricalNets(project), anchors = new Set(sheet.anchors.map(a => a.id))
  const nets = topology.nets.filter(n => n.anchorIds.some(a => anchors.has(a)))
  if (nets.some(n => n.anchorIds.some(a => !anchors.has(a)))) throw new AnalogError('ANALOG_CROSS_SHEET', '跨图纸网络尚不支持。', 'unsupported')
  const net = (a: string) => topology.anchorToNet[a]!
  const markers = sheet.references.filter(r => r.domain === 'analog').map(r => r.anchorId)
  const candidates = markers.length ? markers : sheet.labels.filter(l => l.name === 'GND').map(l => l.anchorId)
  let referenceAnchorId = config.options.referenceAnchorId
  if (referenceAnchorId === undefined) {
    if (!candidates.length || new Set(candidates.map(net)).size !== 1) throw new AnalogError('ANALOG_REFERENCE', '请明确选择一个参考网络；参考标记不会连接不同网络。')
    referenceAnchorId = candidates[0]!
  }
  if (typeof referenceAnchorId !== 'string' || !anchors.has(referenceAnchorId)) throw new AnalogError('ANALOG_REFERENCE', '参考必须是当前图纸的稳定连接点。')
  const elements: AnalogElement[] = sheet.components.map(c => {
    const d = project.definitions.find(d => d.id === c.definitionId)!, binding = d.modelBindings.filter(b => b.analysisFamily === 'electrical')
    const b = binding.length === 1 ? binding[0] : undefined
    let kind: AnalogElement['kind'] | undefined, ports: readonly string[] = [], keys: Readonly<Record<string, string>> = {}
    if (b?.model.version === '1') {
      if (b.model.id === 'org.stray.model.resistor') { kind = 'resistor'; ports = ['p', 'n']; keys = b.portMap }
      for (const source of ['voltage-source', 'current-source'] as const) if (b.model.id === `org.stray.model.dc.${source}`) { kind = source; ports = ['p', 'n']; keys = b.portMap }
      for (const analog of Object.keys(ANALOG_DEVICES) as AnalogKind[]) if (b.model.id === `org.stray.model.analog.${analog}`) { kind = analog; ports = ANALOG_DEVICES[analog].pins; keys = b.portMap }
    }
    if (!kind) throw new AnalogError('ANALOG_MODEL', `${c.reference} 没有受支持的固定版本模型；不支持非线性暂态、C/L、受控源或任意 SPICE 元件。`, 'unsupported')
    if (c.pins.length !== ports.length || Object.keys(keys).length !== ports.length || new Set(ports.map(p => keys[p])).size !== ports.length) throw new AnalogError('ANALOG_PINS', `${c.reference} 的引脚映射不完整。`)
    const pins = ports.map(p => c.pins.find(pin => pin.definitionPinKey === keys[p]))
    if (pins.some(p => !p)) throw new AnalogError('ANALOG_PINS', '模型端口映射无效。')
    const specs: Readonly<Record<string, readonly [number, string]>> = kind in ANALOG_DEVICES ? ANALOG_DEVICES[kind as AnalogKind].params : { [kind === 'resistor' ? 'resistance' : kind === 'voltage-source' ? 'voltage' : 'current']: [0, kind === 'resistor' ? 'ohm' : kind === 'voltage-source' ? 'V' : 'A'] }
    const parameters = Object.fromEntries(Object.entries(specs).map(([key, [, unit]]) => {
      const p = c.parameters[key]
      if (p?.kind !== 'quantity' || p.quantity.unit !== unit || !Number.isFinite(p.quantity.value)) throw new AnalogError('ANALOG_PARAMETER', `${c.reference}.${key} 应使用有限 ${unit}。`)
      const value = p.quantity.value
      if (!['voltage', 'current'].includes(key) && value <= 0 || key === 'temperature' && (value < 200 || value > 500) || key === 'modelVersion' && value !== 1) throw new AnalogError('ANALOG_PARAMETER', `${c.reference}.${key} 超出声明的模型范围。`)
      return [key, value]
    }))
    return { id: c.id, reference: c.reference, kind, nodes: pins.map(p => net(p!.anchorId)), pinIds: pins.map(p => p!.id), parameters }
  })
  const opamps = elements.filter(e => e.kind === 'ideal-opamp'), npns = elements.filter(e => e.kind === 'npn')
  if (config.analysisType === 'analog.ideal-opamp' ? opamps.length !== 1 || elements.some(e => !['resistor', 'voltage-source', 'current-source', 'ideal-opamp'].includes(e.kind)) : opamps.length > 0) throw new AnalogError('ANALOG_CAPABILITY', '理想运放请使用独立负反馈分析；每次仅支持一个运放与电阻/独立源。', 'unsupported')
  if (npns.length > 1 || npns.some(e => e.nodes[2] !== net(referenceAnchorId))) throw new AnalogError('ANALOG_NPN_SCOPE', '入门 NPN 仅支持一个发射极接参考网络的器件。', 'unsupported')
  if (nets.length + elements.length > 160) throw new AnalogError('ANALOG_LIMIT', '本教学稠密求解器规模上限为 160 个网络与器件合计。', 'resource')
  return { referenceAnchorId, referenceKey: net(referenceAnchorId), nodes: nets.map(n => ({ key: n.key, anchorIds: n.anchorIds })), elements }
}
