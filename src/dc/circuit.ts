import { createEngineeringProject, deriveElectricalNets, DC_SOURCES } from '../engineering'
import type { AnalysisInput } from '../analysis/types'
import type { DcSourceKind } from '../engineering'
import { DcError } from './types'
import type { DcCircuit, DcElement, ElementKind } from './types'

export const voltageDefined = (kind: string): boolean => ['voltage-source', 'vcvs', 'ccvs'].includes(kind)
export function resolveDcCircuit(input: AnalysisInput): DcCircuit {
  const project = createEngineeringProject(input.project), config = input.configuration
  if (config.analysisType !== 'dc.operating-point' || config.scope.kind !== 'circuit' || config.scope.sheetIds.length !== 1) throw new DcError('DC_SCOPE', '直流工作点分析仅支持单张平面图纸。')
  if (config.preferredEngine && (config.preferredEngine.id !== 'org.stray.engine.dc-mna' || config.preferredEngine.version !== '1')) throw new DcError('DC_PROVIDER', '指定的直流引擎版本不受支持。', [], 'unsupported')
  if (Object.keys(config.options).some(k => k !== 'referenceAnchorId')) throw new DcError('DC_OPTIONS', '包含不支持的直流分析选项。')
  const sheetId = config.scope.sheetIds[0]
  const sheet = project.sheets.find(s => s.id === sheetId)
  if (!sheet || !sheet.components.length) throw new DcError('DC_EMPTY', '请选择包含元件的图纸。')
  const topology = deriveElectricalNets(project), anchors = new Set(sheet.anchors.map(a => a.id))
  const nets = topology.nets.filter(n => n.anchorIds.some(id => anchors.has(id)))
  if (nets.some(n => n.anchorIds.some(id => !anchors.has(id)))) throw new DcError('DC_CROSS_SHEET', '检测到跨图纸的电气网络；当前直流引擎仅支持单张平面图纸。', [sheet.id], 'unsupported')
  const net = (anchor: string): string => topology.anchorToNet[anchor]!
  const explicit = config.options.referenceAnchorId
  let referenceAnchorId: string
  if (explicit !== undefined) {
    if (typeof explicit !== 'string' || !anchors.has(explicit)) throw new DcError('DC_REFERENCE_INVALID', '参考节点必须是当前图纸中的稳定连接点。')
    referenceAnchorId = explicit
  } else {
    const markers = sheet.references.filter(r => r.domain === 'analog').map(r => r.anchorId)
    const candidates = markers.length ? markers : sheet.labels.filter(l => l.name === 'GND').map(l => l.anchorId)
    if (!candidates.length) throw new DcError('DC_REFERENCE_MISSING', '请明确选择参考节点，或放置模拟参考标记/电气 GND 标签。')
    if (new Set(candidates.map(net)).size !== 1) throw new DcError('DC_REFERENCE_AMBIGUOUS', '多个不同网络被指定为参考；参考标记不会把网络短接，请明确选择一个参考节点。', candidates)
    referenceAnchorId = candidates[0]!
  }
  const elements: DcElement[] = sheet.components.map(component => {
    const def = project.definitions.find(d => d.id === component.definitionId)!
    const bindings = def.modelBindings.filter(b => b.analysisFamily === 'electrical')
    const binding = bindings.length === 1 ? bindings[0] : undefined
    let kind: ElementKind | undefined, ports: Readonly<Record<string, string>> | undefined
    if (binding?.model.version === '1') {
      if (binding.model.id === 'org.stray.model.resistor') { kind = 'resistor'; ports = binding.portMap }
      else for (const source of Object.keys(DC_SOURCES) as DcSourceKind[]) if (binding.model.id === `org.stray.model.dc.${source}`) { kind = source; ports = binding.portMap }
    }
    // Explicit adapter for the exact pre-2.3 built-in independent source definitions.
    if (!bindings.length && (def.kind === 'voltage-source' || def.kind === 'current-source') && def.resource.id === `org.stray.component.${def.kind}` && def.resource.version === '1' && def.pins.length === 2 && def.pins.every(p => ['1', '2'].includes(p.key))) { kind = def.kind; ports = { p: '1', n: '2' } }
    if (!kind || !ports) throw new DcError('DC_MODEL_UNSUPPORTED', `${component.reference} 没有受支持的固定版本直流模型；电容、电感和非线性器件暂不支持。`, [component.id], 'unsupported')
    const expectedPorts = kind === 'vcvs' || kind === 'vccs' ? ['p', 'n', 'cp', 'cn'] : ['p', 'n']
    if (component.pins.length !== expectedPorts.length || Object.keys(ports).length !== expectedPorts.length || new Set(expectedPorts.map(port => ports[port])).size !== expectedPorts.length) throw new DcError('DC_PORT_MAP', `${component.reference} 的模型端口必须完整且一一对应。`, [component.id])
    const pin = (port: string) => {
      const key = ports[port]
      const found = component.pins.find(p => p.definitionPinKey === key)
      if (!found) throw new DcError('DC_PORT_MAP', `${component.reference} 的模型端口映射不完整。`, [component.id])
      return found
    }
    const p = pin('p'), n = pin('n'), spec = kind === 'resistor' ? { parameter: 'resistance', unit: 'ohm' } : DC_SOURCES[kind]
    const parameter = component.parameters[spec.parameter]
    if (parameter?.kind !== 'quantity' || parameter.quantity.unit !== spec.unit || !Number.isFinite(parameter.quantity.value) || (kind === 'resistor' && parameter.quantity.value <= 0)) throw new DcError('DC_PARAMETER', `${component.reference} 的参数或单位无效；应使用 ${spec.unit}。`, [component.id])
    const control = component.parameters.controlBranchId
    return { id: component.id, reference: component.reference, kind, p: net(p.anchorId), n: net(n.anchorId), fromPinId: p.id, toPinId: n.id, value: parameter.quantity.value,
      ...(kind === 'vcvs' || kind === 'vccs' ? { cp: net(pin('cp').anchorId), cn: net(pin('cn').anchorId) } : {}),
      ...(kind === 'ccvs' || kind === 'cccs' ? { controlBranchId: control?.kind === 'text' ? control.value : '' } : {}),
    }
  })
  for (const element of elements) if (element.kind === 'ccvs' || element.kind === 'cccs') {
    const controller = elements.find(e => e.id === element.controlBranchId)
    if (!controller || !voltageDefined(controller.kind)) throw new DcError('DC_CONTROL_BRANCH', `${element.reference} 必须通过稳定元件 ID 引用显式电压定义支路（可使用 0 V 电流检测源）；不能引用电阻或不存在的支路。`, [element.id, ...(element.controlBranchId ? [element.controlBranchId] : [])])
  }
  if (nets.length - 1 + elements.filter(e => voltageDefined(e.kind)).length > 192 || elements.length > 512) throw new DcError('DC_LIMIT', '当前稠密直流引擎最多支持 192 个未知量和 512 个元件。', [], 'resource')
  return { referenceAnchorId, referenceKey: net(referenceAnchorId), elements,
    nodes: nets.map(n => ({ key: n.key, name: `N${topology.nets.findIndex(other => other.key === n.key) + 1}`, anchorIds: n.anchorIds, pinIds: n.pinIds })) }
}
