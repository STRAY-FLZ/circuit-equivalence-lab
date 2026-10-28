import type { CircuitRecipe, CircuitTemplate, TemplatePart } from './catalog'
import type { PaletteKind } from '../editing'

const p = (reference: string, kind: PaletteKind, value: number, nodes: readonly string[], x: number, y: number, vertical = false): TemplatePart => ({ reference, kind, value, nodes, position: { x, y }, rotationDegrees: vertical ? 90 : 0 })
const r = (name: string, value: number, a: string, b: string, x: number, y: number, vertical = false) => p(name, 'resistor', value, [a, b], x, y, vertical)
const voltage = (name: string, value: number, node: string, x: number) => p(name, 'voltage-source', value, [node, 'g'], x, 300, true)
const nodes = { in: { x: 120, y: 100 }, out: { x: 680, y: 180 }, g: { x: 120, y: 500 }, b: { x: 380, y: 280 }, cc: { x: 680, y: 60 }, m: { x: 380, y: 400 }, in2: { x: 120, y: 380 } }
function recipe(parts: readonly TemplatePart[], input = 'in'): CircuitRecipe {
  const used = new Set(parts.flatMap(p => p.nodes))
  return { nodes: Object.fromEntries(Object.entries(nodes).filter(([key]) => used.has(key))), parts, ports: { IN: input, OUT: 'out', COM: 'g' } }
}
function t(id: string, model: NonNullable<CircuitTemplate['analog']>, name: string, description: string, parts: readonly TemplatePart[]): CircuitTemplate {
  return { id: `analog-${id}`, analog: model, categoryId: 'analog', familyId: `analog.${model}`, name, description, recipe: recipe(parts), difficulty: '入门', components: [...new Set(parts.map(p => p.kind))], topics: [name, '模拟电子'], methods: ['工作点', ...(model === 'diode' ? ['I–V 曲线', '准静态扫描'] : model === 'ideal-opamp' ? ['负反馈约束'] : ['小信号局部增益'])], chapters: [], status: 'implemented', capabilities: { schematic: true, editable: true, numerical: false, dc: false, ac: false, experiment: false }, actions: ['view', 'edit', 'export'], note: model === 'ideal-opamp' ? '实际电阻网络与理想运放 MNA；先验证负反馈。不预测电源轨、饱和、带宽、转换速率。' : model === 'diode' ? 'Shockley 非线性直流；输入扫描每点重新求解。半波与限幅为准静态教学，不是非线性暂态或电容滤波。' : '声明的入门器件模型；工作区检查区域后才给出同模型雅可比的小信号低频增益。不预测非线性暂态、热效应或高频响应。' }
}
const diodeSeries = [voltage('V1', 5, 'in', 120), p('D1', 'diode', 1e-12, ['in', 'out'], 400, 100), r('R1', 1000, 'out', 'g', 680, 340, true)]
const npnBase = [voltage('V1', .65, 'in', 120), voltage('V2', 5, 'cc', 780), r('RB', 10000, 'in', 'b', 260, 180), r('RC', 1000, 'cc', 'out', 680, 100, true), p('Q1', 'npn', 100, ['b', 'out', 'g'], 500, 300)]
const mosBase = [voltage('V1', 3, 'in', 120), voltage('V2', 10, 'cc', 780), r('RD', 1000, 'cc', 'out', 680, 100, true), p('M1', 'nmos', 1, ['in', 'out', 'g'], 500, 300)]
const inv = [voltage('V1', .1, 'in', 120), r('RI', 10000, 'in', 'b', 260, 180), r('RF', 100000, 'out', 'b', 500, 80), p('U1', 'ideal-opamp', 1, ['g', 'b', 'out'], 500, 300)]
export const analogTemplates: readonly CircuitTemplate[] = [
  t('diode-bias', 'diode', '二极管串联偏置与负载线', '5 V 经二极管和 1 kΩ 负载；观察实际电流和 I–V 工作点。', diodeSeries),
  t('diode-halfwave', 'diode', '二极管半波 · 准静态', '扫描正负输入，逐点解非线性直流；没有时间积分和储能。', diodeSeries),
  t('diode-limiter', 'diode', '二极管并联限幅 · 准静态', '电阻限流、二极管对地限幅，输出由实际工作点决定。', [voltage('V1', 2, 'in', 120), r('R1', 1000, 'in', 'out', 400, 100), p('D1', 'diode', 1e-12, ['out', 'g'], 680, 340, true)]),
  t('npn-base', 'npn', 'NPN 基极偏置与共射', '基极串联电阻，发射极接参考；改变偏置可进入截止、放大、饱和。', npnBase),
  t('npn-divider', 'npn', 'NPN 分压偏置', '基极分压网络实际加载，不能忽略基极电流。', [voltage('V1', 5, 'in', 120), voltage('V2', 5, 'cc', 780), r('RB', 100000, 'in', 'b', 260, 180), r('R2', 22000, 'b', 'g', 300, 400, true), r('RC', 1000, 'cc', 'out', 680, 100, true), p('Q1', 'npn', 100, ['b', 'out', 'g'], 500, 300)]),
  t('mos-bias', 'nmos', 'nMOS 栅极偏置与共源', 'VGS=3 V、k=1 mA/V²，电阻负载实际工作点。', mosBase),
  t('mos-triode', 'nmos', 'nMOS 电阻负载与三极区', '降低漏极电源，在相同栅压下核对三极区和饱和区边界。', mosBase.map(p => p.reference === 'V2' ? { ...p, value: 1 } : p)),
  t('opamp-follower', 'ideal-opamp', '理想运放电压跟随器', '输出反馈至负输入；实际检查负反馈，求解单位增益。', [voltage('V1', .1, 'in', 120), p('U1', 'ideal-opamp', 1, ['in', 'out', 'out'], 500, 300)]),
  t('opamp-inverting', 'ideal-opamp', '理想运放反相放大', '10 kΩ 输入、100 kΩ 反馈、0.1 V 输入，计算 −1 V。', inv),
  t('opamp-noninverting', 'ideal-opamp', '理想运放同相放大', '10 kΩ 接地、90 kΩ 反馈、0.1 V 输入，计算 1 V。', [voltage('V1', .1, 'in', 120), r('RG', 10000, 'b', 'g', 300, 400, true), r('RF', 90000, 'out', 'b', 500, 80), p('U1', 'ideal-opamp', 1, ['in', 'b', 'out'], 500, 300)]),
  t('opamp-summing', 'ideal-opamp', '理想运放反相求和', '两路输入真实叠加，按输入电阻加权；默认输出 −2 V。', [...inv, voltage('V2', .2, 'in2', 60), r('R2', 20000, 'in2', 'b', 260, 380)]),
  t('opamp-differential', 'ideal-opamp', '理想运放差分放大', '匹配电阻比10，输入0.1/0.3 V，实际求解输出2 V。', [...inv.filter(p => p.reference !== 'U1'), voltage('V2', .3, 'in2', 60), r('R3', 10000, 'in2', 'm', 260, 400), r('R4', 100000, 'm', 'g', 500, 480), p('U1', 'ideal-opamp', 1, ['m', 'b', 'out'], 500, 300)]),
]
