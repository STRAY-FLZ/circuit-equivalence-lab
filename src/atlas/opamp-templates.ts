import type { CircuitRecipe, CircuitTemplate, TemplatePart } from './catalog'
import type { PaletteKind } from '../editing'

const p = (reference: string, kind: PaletteKind, value: number, nodes: readonly string[], x: number, y: number, vertical = false): TemplatePart => ({ reference, kind, value, nodes, position: { x, y }, rotationDegrees: vertical ? 90 : 0 })
const r = (name: string, value: number, a: string, b: string, x: number, y: number, vertical = false) => p(name, 'resistor', value, [a, b], x, y, vertical)
const voltage = (name: string, value: number, node: string, x: number) => p(name, 'voltage-source', value, [node, 'g'], x, 360, true)
const amp = (plus: string, minus: string) => p('U1', 'dynamic-opamp', 100000, [plus, minus, 'out'], 520, 260)
const positions = { in: { x: 100, y: 100 }, in2: { x: 100, y: 420 }, out: { x: 800, y: 180 }, g: { x: 100, y: 560 }, minus: { x: 350, y: 280 }, plus: { x: 350, y: 400 } }
function recipe(parts: readonly TemplatePart[]): CircuitRecipe {
  const used = new Set(parts.flatMap(x => x.nodes))
  return { nodes: Object.fromEntries(Object.entries(positions).filter(([key]) => used.has(key))), parts, ports: { IN: 'in', OUT: 'out', COM: 'g' } }
}
function template(id: string, name: string, description: string, parts: readonly TemplatePart[]): CircuitTemplate {
  return { id: `opamp-${id}`, opampFrequency: true, categoryId: 'analog', familyId: 'analog.ideal-opamp', name, description, recipe: recipe(parts), difficulty: '进阶', components: [...new Set(parts.map(part => part.kind))], topics: [name, '运算放大器频率特性'], methods: ['有限增益直流', '复数 MNA', '负反馈'], chapters: [], status: 'implemented', capabilities: { schematic: true, editable: true, numerical: false, dc: false, ac: false, experiment: false }, actions: ['view', 'edit', 'export'], note: '单极点有限增益教学模型；无供电轨、饱和、转换速率或真实器件寄生。交流和环路响应通过实际连接计算。' }
}
const source = voltage('V1', .1, 'in', 100)
const inv = [source, r('RI', 10000, 'in', 'minus', 240, 180), r('RF', 100000, 'out', 'minus', 580, 80), amp('g', 'minus')]
export const opampTemplates: readonly CircuitTemplate[] = [
  template('follower', '有限增益运放 · 电压跟随', '直接负反馈，比较有限增益与理想单位增益。', [source, amp('in', 'out')]),
  template('inverting', '有限增益运放 · 反相放大', '10 kΩ 输入、100 kΩ 反馈，改变反馈电阻观察增益与带宽。', inv),
  template('noninverting', '有限增益运放 · 同相放大', '10 kΩ 接地、90 kΩ 反馈，实际反馈系数为 0.1。', [source, r('RG', 10000, 'minus', 'g', 340, 420, true), r('RF', 90000, 'out', 'minus', 580, 80), amp('in', 'minus')]),
  template('summing', '有限增益运放 · 反相求和', '两路直流源分别经输入电阻接入反馈节点；交流只激励选定源。', [...inv, voltage('V2', .2, 'in2', 80), r('R2', 20000, 'in2', 'minus', 250, 400)]),
  template('differential', '有限增益运放 · 差分放大', '两路输入与四个电阻构成可编辑差分放大网络。', [...inv.filter(x => x.reference !== 'U1'), voltage('V2', .3, 'in2', 80), r('R3', 10000, 'in2', 'plus', 220, 440), r('R4', 100000, 'plus', 'g', 400, 500), amp('plus', 'minus')]),
  template('active-lowpass', '有限增益运放 · 有源低通', '反馈电阻并联电容；直流反馈路径仍然存在，交流反馈随频率改变。', [...inv, p('CF', 'capacitor', 1e-9, ['out', 'minus'], 580, 140)]),
]
