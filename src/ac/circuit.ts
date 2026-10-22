import { createEngineeringProject, DC_SOURCES, deriveElectricalNets } from '../engineering'
import type { EngineeringProject, DcSourceKind } from '../engineering'
import { voltageDefined } from '../dc'
import { AcError } from './types'
import type { AcCircuit, AcElement, AcKind, AcSettings } from './types'

export function resolveAcCircuit(projectInput: EngineeringProject, sheetId: string, settings: AcSettings): AcCircuit {
  const project = createEngineeringProject(projectInput), sheet = project.sheets.find(s => s.id === sheetId)
  if (!sheet?.components.length) throw new AcError('AC_EMPTY', '请选择包含元件的平面图纸。')
  const topology = deriveElectricalNets(project), anchors = new Set(sheet.anchors.map(a => a.id)), nets = topology.nets.filter(n => n.anchorIds.some(id => anchors.has(id)))
  if (nets.some(n => n.anchorIds.some(id => !anchors.has(id)))) throw new AcError('AC_CROSS_SHEET', '当前交流引擎不支持跨图纸导电网络。', [sheet.id], 'unsupported')
  const net = (id: string): string => { if (!anchors.has(id)) throw new AcError('AC_ANCHOR', '探针或参考引用的连接点不在当前图纸。', [id]); return topology.anchorToNet[id]! }
  let referenceAnchorId = settings.referenceAnchorId
  if (referenceAnchorId === undefined) {
    const markers = sheet.references.filter(r => r.domain === 'analog').map(r => r.anchorId), candidates = markers.length ? markers : sheet.labels.filter(l => l.name === 'GND').map(l => l.anchorId)
    if (!candidates.length) throw new AcError('AC_REFERENCE_MISSING', '请选择数值参考节点，或添加模拟参考标记/唯一 GND 网。')
    if (new Set(candidates.map(net)).size !== 1) throw new AcError('AC_REFERENCE_AMBIGUOUS', '参考标记指向不同网络；请选择一个参考，标记不会连接网络。', candidates)
    referenceAnchorId = candidates[0]!
  }
  const referenceKey = net(referenceAnchorId)
  const elements: AcElement[] = sheet.components.map(component => {
    const def = project.definitions.find(d => d.id === component.definitionId)!, bindings = def.modelBindings.filter(b => b.analysisFamily === 'electrical'), binding = bindings.length === 1 ? bindings[0] : undefined
    let kind: AcKind | undefined, ports: Readonly<Record<string, string>> | undefined
    if (binding?.model.version === '1') {
      if (binding.model.id === 'org.stray.model.resistor') { kind = 'resistor'; ports = binding.portMap }
      for (const source of Object.keys(DC_SOURCES) as DcSourceKind[]) if (binding.model.id === `org.stray.model.dc.${source}`) { kind = source; ports = binding.portMap }
    }
    // Narrow, explicit ideal AC adapters for the existing empty-binding built-ins.
    if (!def.modelBindings.length && ['capacitor', 'inductor', 'voltage-source', 'current-source'].includes(def.kind) && def.resource.id === `org.stray.component.${def.kind}` && def.resource.version === '1' && def.pins.length === 2 && def.pins.every(p => ['1', '2'].includes(p.key))) { kind = def.kind as AcKind; ports = { p: '1', n: '2' } }
    if (!kind || !ports) throw new AcError('AC_MODEL_UNSUPPORTED', `${component.reference} 没有受支持的固定版本理想线性交流模型；非线性、运放、变压器等暂不支持。`, [component.id], 'unsupported')
    const expected = kind === 'vcvs' || kind === 'vccs' ? ['p', 'n', 'cp', 'cn'] : ['p', 'n']
    if (Object.keys(ports).length !== expected.length || component.pins.length !== expected.length || new Set(expected.map(p => ports[p])).size !== expected.length) throw new AcError('AC_PORT_MAP', '模型端口须完整且一一对应。', [component.id])
    const pin = (key: string) => { const p = component.pins.find(p => p.definitionPinKey === ports[key]); if (!p) throw new AcError('AC_PORT_MAP', '模型端口映射不完整。', [component.id]); return p }
    const p = pin('p'), n = pin('n'), spec = kind === 'resistor' ? { parameter: 'resistance', unit: 'ohm' } : kind === 'capacitor' ? { parameter: 'capacitance', unit: 'F' } : kind === 'inductor' ? { parameter: 'inductance', unit: 'H' } : DC_SOURCES[kind]
    const parameter = component.parameters[spec.parameter]
    if (parameter?.kind !== 'quantity' || parameter.quantity.unit !== spec.unit || !Number.isFinite(parameter.quantity.value) || (['resistor', 'capacitor', 'inductor'].includes(kind) && parameter.quantity.value <= 0)) throw new AcError('AC_PARAMETER', `${component.reference} 参数须使用 ${spec.unit}，R/L/C 须为有限正数。`, [component.id])
    const control = component.parameters.controlBranchId
    return { id: component.id, reference: component.reference, kind, value: parameter.quantity.value, p: net(p.anchorId), n: net(n.anchorId), fromPinId: p.id, toPinId: n.id,
      ...(kind === 'vcvs' || kind === 'vccs' ? { cp: net(pin('cp').anchorId), cn: net(pin('cn').anchorId) } : {}),
      ...(kind === 'ccvs' || kind === 'cccs' ? { controlBranchId: control?.kind === 'text' ? control.value : '' } : {}),
    }
  })
  for (const e of elements) if ((e.kind === 'ccvs' || e.kind === 'cccs') && !elements.some(c => c.id === e.controlBranchId && voltageDefined(c.kind))) throw new AcError('AC_CONTROL_BRANCH', `${e.reference} 的控制引用须为显式电压定义支路 ID（允许 0 V 检测源）。`, [e.id])
  const independent = elements.filter(e => e.kind === 'voltage-source' || e.kind === 'current-source')
  if (settings.sources.length !== independent.length || new Set(settings.sources.map(s => s.componentId)).size !== independent.length || settings.sources.some(s => !independent.some(e => e.id === s.componentId))) throw new AcError('AC_SOURCES', '必须恰好配置当前图纸的每一个独立源；未声明的源不会继承直流值。', independent.map(e => e.id))
  const unknowns = nets.length - 1 + elements.filter(e => voltageDefined(e.kind)).length
  if (unknowns > 64 || elements.length > 256 || (settings.sweep && unknowns ** 3 * settings.sweep.points > 8_000_000)) throw new AcError('AC_RESOURCE', '交流分析上限为 64 个复未知量/256 个元件；扫描还需满足 点数×未知量³≤8,000,000。', [], 'resource')
  if (settings.sweep) {
    const sweep = settings.sweep, enabled = settings.sources.filter(s => s.magnitudeRms > 0)
    if (enabled.length !== 1 || enabled[0]!.componentId !== sweep.excitationSourceId) throw new AcError('AC_EXCITATION', '传递扫描要求明确选中唯一非零测试源；其余电压源设 0 V（短路），电流源设 0 A（开路）。')
    for (const pair of [sweep.input, sweep.output]) if (net(pair[0]) === net(pair[1])) throw new AcError('AC_PROBES', '输入/输出探针的正、负端必须属于不同电气网络。', pair)
  }
  return { elements, referenceKey, referenceAnchorId, anchorToNet: topology.anchorToNet, nodes: nets.map(n => ({ key: n.key, name: `N${topology.nets.findIndex(t => t.key === n.key) + 1}`, anchorIds: n.anchorIds, pinIds: n.pinIds })) }
}
