import { createEngineeringProject, deriveElectricalNets } from '../engineering'
import type { AnalysisInput } from '../analysis'
import type { ComponentInstance } from '../engineering'
import { solveDc } from '../dc'
import type { DcCircuit, DcElement, DcNode } from '../dc'
import { solveAnalog } from '../analog'
import type { AnalogElement } from '../analog'
import { AcError } from '../ac/types'
import type { AcCircuit, AcElement } from '../ac'
import { validateOpampModel } from './model'
import type { OpampModel, OpampPrepared, OpampSettings } from './types'

function parseSettings(input: AnalysisInput): OpampSettings {
  const o = input.configuration.options
  const keys = ['referenceAnchorId', 'excitationSourceId', 'magnitudeRms', 'phaseDegrees', 'input', 'output', 'frequencyHz', 'startHz', 'endHz', 'points', 'spacing']
  const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
  const pair = (v: unknown): v is [string, string] => Array.isArray(v) && v.length === 2 && v.every(x => typeof x === 'string')
  if (Object.keys(o).some(k => !keys.includes(k)) || typeof o.referenceAnchorId !== 'string' || typeof o.excitationSourceId !== 'string' || !pair(o.input) || !pair(o.output) || !finite(o.magnitudeRms) || o.magnitudeRms <= 0 || !finite(o.phaseDegrees) || !finite(o.frequencyHz) || o.frequencyHz <= 0 || !finite(o.startHz) || o.startHz <= 0 || !finite(o.endHz) || o.endHz <= o.startHz || !Number.isFinite(2 * Math.PI * o.endHz) || !finite(o.points) || !Number.isSafeInteger(o.points) || o.points < 3 || o.points > 401 || o.spacing !== 'linear' && o.spacing !== 'log') throw new AcError('OPAMP_SETTINGS', '请选择参考、单个非零 RMS 激励、输入输出端口和有效扫描范围（3–401 点）。')
  return o as unknown as OpampSettings
}
const parameter = (instance: ComponentInstance, key: string, unit: string): number => {
  const p = instance.parameters[key]
  if (p?.kind !== 'quantity' || p.quantity.unit !== unit || !Number.isFinite(p.quantity.value)) throw new AcError('OPAMP_PARAMETER', `${instance.reference}.${key} 必须使用有限 ${unit}。`, [instance.id])
  return p.quantity.value
}
const valueAt = (circuit: DcCircuit, solution: ReturnType<typeof solveDc>, key: string): number => solution.nodes.find(n => n.key === key)?.volts ?? (key === circuit.referenceKey ? 0 : NaN)
export function prepareOpamp(input: AnalysisInput, signal?: AbortSignal): OpampPrepared {
  const project = createEngineeringProject(input.project), config = input.configuration
  if (config.analysisType !== 'analog.opamp-frequency' || config.scope.kind !== 'circuit' || config.scope.sheetIds.length !== 1) throw new AcError('OPAMP_SCOPE', '仅支持单张平面图纸。', [], 'unsupported')
  if (config.preferredEngine && (config.preferredEngine.id !== 'org.stray.engine.opamp-frequency' || config.preferredEngine.version !== '1')) throw new AcError('OPAMP_ENGINE', '不支持此引擎版本。', [], 'unsupported')
  const settings = parseSettings(input), sheetId = config.scope.sheetIds[0], sheet = project.sheets.find(s => s.id === sheetId)
  if (!sheet) throw new AcError('OPAMP_SHEET', '图纸不存在。')
  const topology = deriveElectricalNets(project), ids = new Set(sheet.anchors.map(a => a.id))
  const nets = topology.nets.filter(n => n.anchorIds.some(a => ids.has(a)))
  if (nets.some(n => n.anchorIds.some(a => !ids.has(a)))) throw new AcError('OPAMP_CROSS_SHEET', '跨图纸网络暂不支持。', [], 'unsupported')
  for (const id of [settings.referenceAnchorId, ...settings.input, ...settings.output]) if (!ids.has(id)) throw new AcError('OPAMP_ANCHOR', '参考、输入及输出必须为当前图纸的稳定连接点。', [id])
  const net = (a: string) => topology.anchorToNet[a]!, referenceKey = net(settings.referenceAnchorId)
  if (net(settings.input[0]) === net(settings.input[1]) || net(settings.output[0]) === net(settings.output[1])) throw new AcError('OPAMP_PORT', '输入和输出正负端必须属于不同网络。')
  const nodes: DcNode[] = nets.map((n, i) => ({ key: n.key, name: `N${i + 1}`, anchorIds: n.anchorIds, pinIds: n.pinIds }))
  const ac: AcElement[] = [], dc: DcElement[] = []
  let model: OpampModel | undefined
  for (const instance of sheet.components) {
    const def = project.definitions.find(d => d.id === instance.definitionId)!, bindings = def.modelBindings.filter(b => b.analysisFamily === 'electrical'), binding = bindings.length === 1 ? bindings[0] : undefined
    if (def.kind === 'dynamic-opamp') {
      if (model || def.resource.id !== 'org.stray.component.dynamic-opamp' || def.resource.version !== '1' || binding?.model.id !== 'org.stray.model.opamp.single-pole' || binding.model.version !== '1') throw new AcError('OPAMP_DEVICE', '必须有且仅有一个固定版本的单极点有限增益运放。', [instance.id], 'unsupported')
      const ports = ['+', '-', 'OUT'].map(k => instance.pins.find(p => p.definitionPinKey === binding.portMap[k]))
      if (instance.pins.length !== 3 || Object.keys(binding.portMap).length !== 3 || ports.some(p => !p) || new Set(ports.map(p => p!.id)).size !== 3) throw new AcError('OPAMP_PINS', '运放端口映射无效。', [instance.id])
      const gain = parameter(instance, 'openLoopGain', '1'), poleHz = parameter(instance, 'poleHz', 'Hz'); validateOpampModel(gain, poleHz)
      model = { id: instance.id, reference: instance.reference, plus: net(ports[0]!.anchorId), minus: net(ports[1]!.anchorId), output: net(ports[2]!.anchorId), pinIds: [ports[0]!.id, ports[1]!.id, ports[2]!.id], gain, poleHz }
      continue
    }
    if (!['resistor', 'capacitor', 'voltage-source', 'current-source'].includes(def.kind)) throw new AcError('OPAMP_COMPONENT', `${instance.reference} 不属于当前单运放 R/C 与独立源范围。`, [instance.id], 'unsupported')
    const kind = def.kind as 'resistor' | 'capacitor' | 'voltage-source' | 'current-source'
    const expected = kind === 'resistor' ? 'org.stray.model.resistor' : `org.stray.model.dc.${kind}`
    if (kind === 'capacitor' ? def.resource.id !== 'org.stray.component.capacitor' || def.resource.version !== '1' || def.modelBindings.length !== 0 : binding?.model.id !== expected || binding.model.version !== '1' || Object.keys(binding.portMap).length !== 2) throw new AcError('OPAMP_BINDING', `${instance.reference} 的固定模型版本不支持。`, [instance.id], 'unsupported')
    const keys = kind === 'capacitor' ? ['1', '2'] : [binding!.portMap.p, binding!.portMap.n]
    const pins = keys.map(k => instance.pins.find(p => p.definitionPinKey === k))
    if (instance.pins.length !== 2 || pins.some(p => !p) || pins[0]!.id === pins[1]!.id) throw new AcError('OPAMP_PINS', `${instance.reference} 的引脚映射无效。`, [instance.id])
    const key = kind === 'resistor' ? 'resistance' : kind === 'capacitor' ? 'capacitance' : kind === 'voltage-source' ? 'voltage' : 'current', unit = kind === 'resistor' ? 'ohm' : kind === 'capacitor' ? 'F' : kind === 'voltage-source' ? 'V' : 'A'
    const value = parameter(instance, key, unit)
    if (kind === 'resistor' && value <= 0 || kind === 'capacitor' && value < 0) throw new AcError('OPAMP_PARAMETER', `${instance.reference} 阻值应为正，电容应为非负。`, [instance.id])
    const element = { id: instance.id, reference: instance.reference, kind, value, p: net(pins[0]!.anchorId), n: net(pins[1]!.anchorId), fromPinId: pins[0]!.id, toPinId: pins[1]!.id }
    if (kind !== 'capacitor' || value > 0) ac.push(element)
    if (kind !== 'capacitor') dc.push({ ...element, kind })
  }
  if (!model) throw new AcError('OPAMP_DEVICE', '请放置明确的有限增益单极点运放；理想运放不会自动转换。', [], 'unsupported')
  if (model.output === referenceKey) throw new AcError('OPAMP_REFERENCE', '运放输出与选定参考短接，无法构造输出约束。', [model.id], 'unsupported')
  if (!dc.some(e => e.id === settings.excitationSourceId && e.kind === 'voltage-source')) throw new AcError('OPAMP_SOURCE', '请选择独立电压源作为交流激励。', [], 'unsupported')
  const extra = { id: `${model.id}:output`, reference: `${model.reference} output`, p: model.output, n: referenceKey, fromPinId: model.pinIds[2], toPinId: model.pinIds[2] }
  const dcCircuit: DcCircuit = { nodes, elements: [...dc, { ...extra, kind: 'vcvs', value: model.gain, cp: model.plus, cn: model.minus }], referenceKey, referenceAnchorId: settings.referenceAnchorId }
  if (signal?.aborted) throw new AcError('OPAMP_CANCELLED', '分析已取消。', [], 'resource')
  const dcSolution = solveDc(dcCircuit)
  const betaCircuit: DcCircuit = { ...dcCircuit, elements: [...dc.map(e => e.kind === 'voltage-source' || e.kind === 'current-source' ? { ...e, value: 0 } : e), { ...extra, kind: 'voltage-source', value: 1 }] }
  const probe = solveDc(betaCircuit), betaDc = valueAt(betaCircuit, probe, model.minus) - valueAt(betaCircuit, probe, model.plus)
  if (!Number.isFinite(betaDc) || betaDc <= 1e-12) throw new AcError('OPAMP_FEEDBACK', '源置零后未建立有效直流负反馈；不将开环或正反馈作为已验证闭环。', [model.id], 'unsupported')
  const small = solveDc({ ...dcCircuit, elements: dcCircuit.elements.map(e => e.kind === 'voltage-source' || e.kind === 'current-source' ? { ...e, value: e.id === settings.excitationSourceId ? 1 : 0 } : e) })
  const difference = (pair: readonly [string, string]) => valueAt(dcCircuit, small, net(pair[0])) - valueAt(dcCircuit, small, net(pair[1]))
  const inputVoltage = difference(settings.input), dcTransfer = difference(settings.output) / inputVoltage
  if (!Number.isFinite(dcTransfer) || Math.abs(inputVoltage) < 1e-12) throw new AcError('OPAMP_INPUT', '直流增量输入接近零，无法定义所选传递比。', settings.input, 'unsupported')
  let idealDcOutput: number | null = null
  try {
    const elements: AnalogElement[] = dc.map(e => ({ id: e.id, reference: e.reference, kind: e.kind as 'resistor' | 'voltage-source' | 'current-source', nodes: [e.p, e.n], pinIds: [e.fromPinId, e.toPinId], parameters: { [e.kind === 'resistor' ? 'resistance' : e.kind === 'voltage-source' ? 'voltage' : 'current']: e.value } }))
    elements.push({ id: model.id, reference: model.reference, kind: 'ideal-opamp', nodes: [model.plus, model.minus, model.output], pinIds: model.pinIds, parameters: { modelVersion: 1 } })
    idealDcOutput = solveAnalog({ nodes, elements, referenceKey, referenceAnchorId: settings.referenceAnchorId }, signal).nodeVolts[model.output] ?? null
  } catch { /* The separate ideal approximation is unavailable, not a finite-solver failure. */ }
  const passive: AcCircuit = { nodes, elements: ac, referenceKey, referenceAnchorId: settings.referenceAnchorId, anchorToNet: topology.anchorToNet }
  const internal = `${model.id}:single-pole-node`, pin = model.pinIds[2], base = { fromPinId: pin, toPinId: pin }
  const dynamic: AcCircuit = { ...passive, nodes: [...nodes, { key: internal, name: `${model.reference} 内部极点`, anchorIds: [], pinIds: [] }], elements: [...ac,
    { ...base, id: `${model.id}:r`, reference: `${model.reference} internal R`, kind: 'resistor', value: 1, p: internal, n: referenceKey },
    { ...base, id: `${model.id}:c`, reference: `${model.reference} internal C`, kind: 'capacitor', value: 1 / (2 * Math.PI * model.poleHz), p: internal, n: referenceKey },
    { ...base, id: `${model.id}:g`, reference: `${model.reference} internal G`, kind: 'vccs', value: 1, p: referenceKey, n: internal, cp: model.plus, cn: model.minus },
    { ...extra, kind: 'vcvs', value: model.gain, cp: internal, cn: referenceKey },
  ] }
  const unknowns = dynamic.nodes.length - 1 + dynamic.elements.filter(e => e.kind === 'voltage-source' || e.kind === 'vcvs').length
  if (unknowns > 64 || dynamic.elements.length > 256 || unknowns ** 3 * settings.points > 8_000_000) throw new AcError('OPAMP_RESOURCE', '超过单次分析的规模或扫描预算。', [], 'resource')
  return { model, settings, dcCircuit, dc: dcSolution, passive, dynamic, betaDc, dcTransfer, idealDcOutput }
}
