import type { CircuitRecipe, CircuitTemplate, TemplatePart } from './catalog'
import type { PaletteKind } from '../editing'

const p = (reference: string, kind: PaletteKind, value: number, nodes: readonly string[], x: number, y: number, vertical = false): TemplatePart => ({ reference, kind, value, nodes, position: { x, y }, rotationDegrees: vertical ? 90 : 0 })
const resistor = (name: string, value: number, a: string, b: string, x: number, y: number, vertical = false) => p(name, 'resistor', value, [a, b], x, y, vertical)
const capacitor = (name: string, value: number, a: string, b: string, x: number, y: number, vertical = false) => p(name, 'capacitor', value, [a, b], x, y, vertical)
const nodes = { in: { x: 100, y: 120 }, g: { x: 100, y: 560 }, cc: { x: 700, y: 60 }, b: { x: 360, y: 260 }, e: { x: 520, y: 400 }, c: { x: 700, y: 200 }, out: { x: 900, y: 260 }, mid: { x: 220, y: 180 } }
function recipe(parts: readonly TemplatePart[]): CircuitRecipe {
  const used = new Set(parts.flatMap(part => part.nodes))
  return { nodes: Object.fromEntries(Object.entries(nodes).filter(([key]) => used.has(key))), parts, ports: { IN: 'in', OUT: 'out', COM: 'g' } }
}
function design(family: 'npn' | 'nmos', coupled: boolean, degeneration: boolean, bypass: boolean, parasitic: boolean): readonly TemplatePart[] {
  const transistor = family === 'npn' ? 'npn' : 'nmos', output = coupled ? 'c' : 'out', emitter = degeneration ? 'e' : 'g'
  const parts: TemplatePart[] = [
    p('V1', 'voltage-source', coupled ? 0 : family === 'npn' ? .65 : 3, ['in', 'g'], 100, 360, true),
    p('V2', 'voltage-source', 10, ['cc', 'g'], 780, 360, true),
    ...(coupled ? [resistor('RS', 1000, 'in', 'mid', 160, 120), capacitor('CIN', 1e-6, 'mid', 'b', 280, 180), resistor('RBIAS1', family === 'npn' ? 430000 : 700000, 'cc', 'b', 380, 80), resistor('RBIAS2', family === 'npn' ? 33000 : 300000, 'b', 'g', 300, 400, true)] : [resistor('RS', family === 'npn' ? 10000 : 1000, 'in', 'b', 260, 180)]),
    resistor(family === 'npn' ? 'RC' : 'RD', 2000, 'cc', output, 700, 120, true),
    p(family === 'npn' ? 'Q1' : 'M1', transistor, family === 'npn' ? 100 : 1, ['b', output, emitter], 520, 260),
    ...(degeneration ? [resistor(family === 'npn' ? 'RE' : 'RDG', 1000, 'e', 'g', 520, 480, true)] : []),
    ...(bypass ? [capacitor('CBYP', 100e-6, 'e', 'g', 620, 480, true)] : []),
    ...(coupled ? [capacitor('COUT', 1e-6, 'c', 'out', 800, 200)] : []),
    resistor('RL', 2000, 'out', 'g', 900, 410, true),
    ...(parasitic ? [capacitor(family === 'npn' ? 'CPI' : 'CGS', 100e-12, 'b', emitter, 400, 360, true), capacitor(family === 'npn' ? 'CMU' : 'CGD', 20e-12, 'b', output, 480, 120)] : []),
  ]
  return parts
}
function template(id: string, family: 'npn' | 'nmos', name: string, description: string, parts: readonly TemplatePart[]): CircuitTemplate {
  return { id: `amplifier-${id}`, amplifier: true, categoryId: 'analog', familyId: `analog.${family}`, name, description, recipe: recipe(parts), difficulty: '进阶', components: [...new Set(parts.map(p => p.kind))], topics: [name, '放大器频率响应'], methods: ['真实直流偏置', '增量复数 MNA', '频率扫描'], chapters: [], status: 'implemented', capabilities: { schematic: true, editable: true, numerical: false, dc: false, ac: false, experiment: false }, actions: ['view', 'edit', 'export'], note: '先求当前直流工作点、检查区域，再用同模型导数构造小信号频率网络。图中电容为显式教学假设；不代表实测器件参数或非线性暂态。' }
}
export const amplifierTemplates: readonly CircuitTemplate[] = [
  template('ce-basic', 'npn', '共射放大器 · 直接偏置', '电压偏置经输入电阻驱动基极，实际集电极负载决定中频增益。', design('npn', false, false, false, false)),
  template('ce-degenerated', 'npn', '共射放大器 · 发射极退化', '发射极电阻同时改变直流偏置与增量反馈。', design('npn', false, true, false, false)),
  template('ce-coupled', 'npn', '共射放大器 · 输入输出耦合', '输入/输出电容与源、负载网络共同决定低频响应。', design('npn', true, true, false, true)),
  template('ce-bypass', 'npn', '共射放大器 · 发射极旁路', '旁路电容随频率改变退化作用；Cπ/Cμ 为显式教学假设。', design('npn', true, true, true, true)),
  template('cs-basic', 'nmos', '共源放大器 · 直接偏置', '独立栅压偏置，漏极电阻与实际负载共同决定增益。', design('nmos', false, false, false, false)),
  template('cs-degenerated', 'nmos', '共源放大器 · 源极退化', '源极电阻改变直流饱和工作点与增量增益。', design('nmos', false, true, false, false)),
  template('cs-coupled', 'nmos', '共源放大器 · 电容耦合', '输入输出电容和分压栅极偏置构成实际低频网络。', design('nmos', true, true, false, false)),
  template('cs-parasitic', 'nmos', '共源放大器 · 显式栅电容与旁路', 'Cgs、Cgd 和源极旁路为图中明确数值；改变它们观察真实频响。', design('nmos', true, true, true, true)),
]
