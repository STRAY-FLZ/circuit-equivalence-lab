import { createEngineeringProject, deriveElectricalNets } from '../engineering'
import type { AnalysisInput } from '../analysis'
import { resolveAnalogCircuit, solveAnalog } from '../analog'
import type { AnalogElement } from '../analog'
import { AcError } from '../ac/types'
import { DcError } from '../dc/types'
import { solveAmplifierDcFallback } from './dc-fallback'
import type { AcCircuit, AcElement, AcNode } from '../ac'
import type { AmplifierBias, AmplifierSettings } from './types'
import type { DevicePoint } from '../analog'

/** Exact incremental stamp, exposed independently for fixed-gm teaching fixtures. */
export function linearizedDevice(e: AnalogElement, device: DevicePoint): AcElement[] {
  const [a, b, c] = e.nodes as readonly [string, string, string], [pa, pb, pc] = e.pinIds as readonly [string, string, string]
  if (e.id !== device.componentId || !['npn', 'nmos'].includes(e.kind) || device.gm === undefined || !Number.isFinite(device.gm) || device.gm <= 0) throw new AcError('AMP_DEVICE', '增量模型及其工作点导数不匹配。', [e.id])
  const gm: AcElement = { id: `${e.id}:gm`, reference: `${e.reference} gm`, kind: 'vccs', value: device.gm, p: b, n: c, cp: a, cn: c, fromPinId: pb, toPinId: pc }
  if (e.kind === 'npn') {
    if (!device.rpi || !Number.isFinite(device.rpi) || device.rpi <= 0) throw new AcError('AMP_DERIVATIVE', 'NPN 工作点 rπ 无效。', [e.id])
    return [gm, { id: `${e.id}:rpi`, reference: `${e.reference} rπ`, kind: 'resistor', value: device.rpi, p: a, n: c, fromPinId: pa, toPinId: pc }]
  }
  if (device.gds !== 0) throw new AcError('AMP_DERIVATIVE', '当前固定版本 nMOS 饱和模型的 gds 必须为零。', [e.id], 'unsupported')
  return [gm]
}

function settingsFrom(input: AnalysisInput): AmplifierSettings {
  const o = input.configuration.options, keys = ['referenceAnchorId', 'excitationSourceId', 'magnitudeRms', 'phaseDegrees', 'input', 'output', 'frequencyHz', 'startHz', 'endHz', 'points', 'spacing']
  const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
  const pair = (v: unknown): v is readonly [string, string] => Array.isArray(v) && v.length === 2 && v.every(id => typeof id === 'string')
  if (Object.keys(o).some(k => !keys.includes(k)) || typeof o.referenceAnchorId !== 'string' || typeof o.excitationSourceId !== 'string' || !pair(o.input) || !pair(o.output) || !finite(o.magnitudeRms) || o.magnitudeRms <= 0 || !finite(o.phaseDegrees) || !finite(o.frequencyHz) || o.frequencyHz <= 0 || !finite(2 * Math.PI * o.frequencyHz) || !finite(o.startHz) || o.startHz <= 0 || !finite(o.endHz) || o.endHz <= o.startHz || !finite(2 * Math.PI * o.endHz) || !finite(o.points) || !Number.isSafeInteger(o.points) || o.points < 3 || o.points > 401 || o.spacing !== 'linear' && o.spacing !== 'log') throw new AcError('AMP_SETTINGS', '请指定有效参考、一个非零 RMS 电压激励、正负探针和正频率；扫描点数为 3–401。')
  return o as unknown as AmplifierSettings
}
/** Projection is temporary: capacitor branches open in DC; no wire/anchor is changed. */
export function prepareAmplifier(input: AnalysisInput, signal?: AbortSignal): AmplifierBias {
  const project = createEngineeringProject(input.project), config = input.configuration
  if (config.analysisType !== 'analog.amplifier-frequency' || config.scope.kind !== 'circuit' || config.scope.sheetIds.length !== 1) throw new AcError('AMP_SCOPE', '放大器频率分析仅支持单张平面图纸。', [], 'unsupported')
  if (config.preferredEngine && (config.preferredEngine.id !== 'org.stray.engine.amplifier-frequency' || config.preferredEngine.version !== '1')) throw new AcError('AMP_PROVIDER', '不支持所选放大器引擎版本。', [], 'unsupported')
  const settings = settingsFrom(input), sheetId = config.scope.sheetIds[0], sheet = project.sheets.find(s => s.id === sheetId)
  if (!sheet) throw new AcError('AMP_SHEET', '图纸不存在。')
  const topology = deriveElectricalNets(project), anchorIds = new Set(sheet.anchors.map(a => a.id)), nets = topology.nets.filter(n => n.anchorIds.some(id => anchorIds.has(id)))
  if (nets.some(n => n.anchorIds.some(id => !anchorIds.has(id)))) throw new AcError('AMP_CROSS_SHEET', '跨图纸电气网络暂不支持。', [], 'unsupported')
  for (const id of [settings.referenceAnchorId, ...settings.input, ...settings.output]) if (!anchorIds.has(id)) throw new AcError('AMP_ANCHOR', '参考和输入输出探针必须属于当前图纸。', [id])
  const net = (anchorId: string) => topology.anchorToNet[anchorId]!
  if (net(settings.input[0]) === net(settings.input[1]) || net(settings.output[0]) === net(settings.output[1])) throw new AcError('AMP_PROBES', '输入和输出的正负端必须分别属于不同网络。')
  const components = sheet.components.map(instance => ({ instance, definition: project.definitions.find(d => d.id === instance.definitionId)! }))
  const transistors = components.filter(c => c.definition.kind === 'npn' || c.definition.kind === 'nmos')
  if (transistors.length !== 1 || components.some(c => !['resistor', 'capacitor', 'voltage-source', 'current-source', 'npn', 'nmos'].includes(c.definition.kind))) throw new AcError('AMP_MODELS', '仅支持单级 NPN 或 nMOS、明确的 R/C 与独立源；其他器件及多级电路暂不支持。', [], 'unsupported')
  const transistor = transistors[0]!, outputPin = transistor.definition.modelBindings.find(b => b.analysisFamily === 'electrical')?.portMap[transistor.definition.kind === 'npn' ? 'E' : 'S']
  const emitter = transistor.instance.pins.find(p => p.definitionPinKey === outputPin)
  if (!emitter) throw new AcError('AMP_PIN', '晶体管模型的发射极/源极映射无效。')
  const source = components.find(c => c.instance.id === settings.excitationSourceId)
  if (!source || source.definition.kind !== 'voltage-source') throw new AcError('AMP_EXCITATION', '请选择一个独立电压源作为唯一的增量激励。', [], 'unsupported')
  const caps = components.filter(c => c.definition.kind === 'capacitor'), capIds = new Set(caps.map(c => c.instance.id))
  const acCaps: AcElement[] = caps.flatMap(({ instance, definition }) => {
    if (definition.resource.id !== 'org.stray.component.capacitor' || definition.resource.version !== '1' || definition.modelBindings.length || instance.pins.length !== 2) throw new AcError('AMP_CAP_MODEL', `${instance.reference} 不是受支持的固定版本理想电容。`, [instance.id], 'unsupported')
    const parameter = instance.parameters.capacitance, p = instance.pins.find(pin => pin.definitionPinKey === '1'), n = instance.pins.find(pin => pin.definitionPinKey === '2')
    if (parameter?.kind !== 'quantity' || parameter.quantity.unit !== 'F' || !Number.isFinite(parameter.quantity.value) || parameter.quantity.value < 0 || !p || !n) throw new AcError('AMP_CAP_PARAMETER', `${instance.reference} 电容必须为有限非负值，单位 F。`, [instance.id])
    return parameter.quantity.value === 0 ? [] : [{ id: instance.id, reference: instance.reference, kind: 'capacitor' as const, value: parameter.quantity.value, p: net(p.anchorId), n: net(n.anchorId), fromPinId: p.id, toPinId: n.id }]
  })
  // Retain anchors/wires, including terminals of open capacitors. Non-circuit
  // project associations stay on the immutable source, not this ephemeral solve.
  const dcSheet = { ...sheet, components: sheet.components.filter(c => !capIds.has(c.id)), geometry: { ...sheet.geometry, placements: sheet.geometry.placements.filter(p => !capIds.has(p.componentId)) } }
  const projected = createEngineeringProject({ ...project, sheets: project.sheets.map(s => s.id === sheet.id ? dcSheet : s), analyses: [], results: [], measurements: [], boards: [], experiments: [], competitions: [], assets: [], extensions: {} })
  const dcInput: AnalysisInput = { project: projected, inputDigest: input.inputDigest, configuration: { id: config.id, analysisType: 'analog.operating-point', preferredEngine: { id: 'org.stray.engine.analog-dc', version: '1' }, scope: { kind: 'circuit', sheetIds: [sheet.id] }, options: { referenceAnchorId: transistor.definition.kind === 'npn' ? emitter.anchorId : settings.referenceAnchorId } } }
  const resolvedDc = resolveAnalogCircuit(dcInput)
  // Matrix equation order is based on stable schematic roles, not random UUID order.
  // This preserves precisely the same nets/physical equations and improves repeatability.
  const order = [transistor.instance, ...components.filter(c => !capIds.has(c.instance.id) && c.instance.id !== transistor.instance.id).sort((a, b) => a.instance.reference.localeCompare(b.instance.reference, 'en')).map(c => c.instance)].flatMap(c => c.pins.map(p => net(p.anchorId)))
  const rank = (key: string) => { const index = order.indexOf(key); return index < 0 ? order.length : index }
  const orderedDc = { ...resolvedDc, nodes: [...resolvedDc.nodes].sort((a, b) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key, 'en')) }
  let dc
  try { dc = solveAnalog(orderedDc, signal) }
  catch (error) { if (!(error instanceof DcError) || error.code !== 'DC_RESIDUAL') throw error; dc = solveAmplifierDcFallback(orderedDc, signal) }
  const device = dc.devices.find(d => d.componentId === transistor.instance.id)!
  if (device.kind === 'npn' && device.region !== 'active') throw new AcError('AMP_BIAS_REGION', 'NPN 必须处于放大区；请调整偏置并重新验证。', [device.componentId], 'unsupported')
  if (device.kind === 'nmos' && device.region !== 'saturation') throw new AcError('AMP_BIAS_REGION', 'nMOS 必须处于饱和区；请调整偏置并重新验证。', [device.componentId], 'unsupported')
  if (device.kind === 'npn' && device.terminalVolts[1]! - device.terminalVolts[2]! < orderedDc.elements.find(e => e.id === device.componentId)!.parameters.saturationVoltage! - 1e-8) throw new AcError('AMP_BIAS_REGION', 'NPN 不满足放大区 VCE 下限；不使用不合适的线性模型。', [device.componentId], 'unsupported')
  if (device.kind === 'nmos' && device.terminalVolts[1]! - device.terminalVolts[2]! < -1e-9) throw new AcError('AMP_BIAS_REGION', 'nMOS 反向 VDS 不支持。', [device.componentId], 'unsupported')
  if (device.gm === undefined || !Number.isFinite(device.gm) || device.gm <= 0 || device.kind === 'npn' && (!device.rpi || !Number.isFinite(device.rpi))) throw new AcError('AMP_DERIVATIVE', '工作点的增量导数不可用。', [device.componentId], 'numerical')
  const ref = net(settings.referenceAnchorId), offset = dc.nodeVolts[ref]
  if (offset === undefined) throw new AcError('AMP_REFERENCE', '直流参考不属于求解结果。')
  const displayNodeVolts = Object.fromEntries(Object.entries(dc.nodeVolts).map(([key, value]) => [key, value - offset]))
  const nodes: AcNode[] = nets.map((n, i) => ({ key: n.key, name: `N${i + 1}`, anchorIds: n.anchorIds, pinIds: n.pinIds }))
  const mapped = (e: AnalogElement): AcElement[] => {
    const [a, b] = e.nodes as readonly [string, string], [pa, pb] = e.pinIds as readonly [string, string]
    if (e.kind === 'resistor' || e.kind === 'voltage-source' || e.kind === 'current-source') return [{ id: e.id, reference: e.reference, kind: e.kind, value: e.parameters[e.kind === 'resistor' ? 'resistance' : e.kind === 'voltage-source' ? 'voltage' : 'current']!, p: a, n: b, fromPinId: pa, toPinId: pb }]
    return linearizedDevice(e, device)
  }
  const elements = [...dc.circuit.elements.flatMap(mapped), ...acCaps], unknowns = nodes.length - 1 + elements.filter(e => e.kind === 'voltage-source').length
  if (unknowns > 64 || elements.length > 256 || unknowns ** 3 * settings.points > 8_000_000) throw new AcError('AMP_RESOURCE', '超过 64 个复未知量、256 元件或扫描计算预算。', [], 'resource')
  const circuit: AcCircuit = { elements, nodes, anchorToNet: topology.anchorToNet, referenceAnchorId: settings.referenceAnchorId, referenceKey: ref }
  return { dc, displayNodeVolts, device, circuit, settings, modelExplanation: device.kind === 'npn' ? '放大区：iB=gπ·vBE，iC=gm·vBE，iE=−iB−iC；gm 与 rπ 为此工作点的精确导数，未假设 Early 电阻。' : '饱和区：iG=0，iD=gm·vGS+gds·vDS，iS=−iD；当前模型 gds=0，不添加虚构输出电导。' }
}
