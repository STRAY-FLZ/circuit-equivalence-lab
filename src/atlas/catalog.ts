import { freezeSnapshot } from '../engineering'
import type { Position } from '../engineering'
import { PALETTE } from '../editing'
import type { PaletteKind } from '../editing'

export interface TemplatePart { readonly reference: string; readonly kind: PaletteKind; readonly value: number; readonly nodes: readonly [string, string]; readonly position: Position; readonly rotationDegrees: 0 | 90 | 270 }
export interface CircuitRecipe { readonly nodes: Readonly<Record<string, Position>>; readonly parts: readonly TemplatePart[]; readonly ports: Readonly<Record<string, string>> }
export interface CircuitTemplate {
  readonly id: string; readonly categoryId: string; readonly familyId: string; readonly name: string; readonly description: string
  readonly difficulty: '入门' | '进阶'; readonly components: readonly string[]; readonly topics: readonly string[]; readonly methods: readonly string[]; readonly chapters: readonly number[]
  readonly status: 'implemented'; readonly capabilities: { readonly schematic: true; readonly editable: true; readonly numerical: boolean; readonly dc: boolean; readonly ac: boolean; readonly experiment: boolean }
  readonly acExperiment?: { readonly inputPorts: readonly [string, string]; readonly outputPorts: readonly [string, string]; readonly passband: 'low' | 'high' | 'peak' }
  readonly actions: readonly ['view', 'edit', 'export']; readonly note: string; readonly recipe: CircuitRecipe
}
const at = (x: number, y: number): Position => ({ x, y })
const part = (reference: string, kind: PaletteKind, value: number, a: string, b: string, x: number, y: number, vertical = false): TemplatePart => ({ reference, kind, value, nodes: [a, b], position: at(x, y), rotationDegrees: vertical ? kind === 'current-source' ? 270 : 90 : 0 })
const r = (reference: string, a: string, b: string, x: number, y: number, value = 100, vertical = false) => part(reference, 'resistor', value, a, b, x, y, vertical)
const recipe = (nodes: CircuitRecipe['nodes'], parts: readonly TemplatePart[], ports: CircuitRecipe['ports'] = { A: 'a', B: 'b' }): CircuitRecipe => ({ nodes, parts, ports })
const series = recipe({ a: at(120, 180), m: at(400, 180), b: at(680, 180) }, [r('R1', 'a', 'm', 260, 180, 100), r('R2', 'm', 'b', 540, 180, 220)])
const parallel = recipe({ a: at(120, 240), b: at(680, 240) }, [r('R1', 'a', 'b', 400, 100, 100), r('R2', 'a', 'b', 400, 380, 220)])
const mixed = recipe({ a: at(100, 240), m: at(380, 240), b: at(720, 240) }, [r('R1', 'a', 'm', 240, 240), r('R2', 'm', 'b', 540, 100, 220), r('R3', 'm', 'b', 540, 380, 330)])
const bridge = recipe({ a: at(420, 60), l: at(240, 260), r: at(600, 260), b: at(420, 460) }, [r('R1', 'a', 'l', 240, 160, 100, true), r('R2', 'l', 'b', 240, 360, 200, true), r('R3', 'a', 'r', 600, 160, 150, true), r('R4', 'r', 'b', 600, 360, 300, true), r('R5', 'l', 'r', 420, 260, 470)])
const star = recipe({ a: at(120, 260), b: at(720, 260), c: at(420, 500), o: at(420, 260) }, [r('R1', 'a', 'o', 260, 260), r('R2', 'o', 'b', 580, 260, 220), r('R3', 'o', 'c', 420, 400, 330, true)], { A: 'a', B: 'b', C: 'c' })
const delta = recipe({ a: at(120, 100), b: at(720, 100), c: at(420, 500) }, [r('R1', 'a', 'b', 420, 100, 300), r('R2', 'b', 'c', 720, 300, 470, true), r('R3', 'a', 'c', 120, 300, 680, true)], { A: 'a', B: 'b', C: 'c' })
const ladder = recipe({ a: at(120, 100), m: at(400, 100), b: at(680, 100), g: at(400, 500) }, [r('R1', 'a', 'm', 260, 100), r('R2', 'm', 'b', 540, 100, 220), r('R3', 'm', 'g', 400, 300, 330, true), r('R4', 'b', 'g', 680, 300, 470, true)], { IN: 'a', OUT: 'b', COM: 'g' })
const voltageLoad = recipe({ a: at(160, 100), b: at(160, 500) }, [part('V1', 'voltage-source', 5, 'a', 'b', 160, 300, true), r('R1', 'a', 'b', 640, 300, 1000, true)])
const currentLoad = recipe({ a: at(160, 100), m: at(640, 300), b: at(160, 500) }, [part('I1', 'current-source', .002, 'b', 'a', 160, 300, true), r('R1', 'a', 'm', 640, 180, 1000, true), r('R2', 'm', 'b', 640, 420, 2000, true)])
const twoSources = recipe({ a: at(160, 100), m: at(420, 100), b: at(420, 500), c: at(680, 100) }, [part('V1', 'voltage-source', 5, 'a', 'b', 160, 300, true), r('R1', 'a', 'm', 280, 100, 1000), r('R2', 'm', 'c', 560, 100, 2000), part('V2', 'voltage-source', 3, 'c', 'b', 680, 300, true), r('R3', 'm', 'b', 420, 300, 1500, true)])
const multiLoop = recipe({ a: at(140, 100), m: at(420, 100), b: at(420, 500), c: at(700, 100) }, [part('V1', 'voltage-source', 12, 'a', 'b', 140, 300, true), r('R1', 'a', 'm', 280, 100, 1000), r('R2', 'm', 'c', 560, 100, 2200), r('R3', 'm', 'b', 420, 300, 3300, true), r('R4', 'c', 'b', 700, 300, 4700, true)])
const superposition = recipe({ a: at(160, 100), b: at(420, 500), c: at(680, 100) }, [part('V1', 'voltage-source', 6, 'a', 'b', 160, 300, true), r('R1', 'a', 'c', 420, 100, 1000), r('R2', 'c', 'b', 420, 300, 2000, true), part('I1', 'current-source', .001, 'b', 'c', 680, 300, true)], { OUT: 'c', COM: 'b' })
const thevenin = recipe({ a: at(160, 100), b: at(420, 500), c: at(680, 100) }, [part('V1', 'voltage-source', 10, 'a', 'b', 160, 300, true), r('R1', 'a', 'c', 420, 100, 1000), r('R2', 'c', 'b', 680, 300, 2000, true)], { OUT: 'c', COM: 'b' })
const norton = recipe({ a: at(160, 100), b: at(160, 500) }, [part('I1', 'current-source', .005, 'b', 'a', 160, 300, true), r('R1', 'a', 'b', 640, 300, 2000, true)], { OUT: 'a', COM: 'b' })
const passiveRC = recipe({ a: at(120, 180), m: at(400, 180), b: at(680, 180) }, [r('R1', 'a', 'm', 260, 180, 1000), part('C1', 'capacitor', .000001, 'm', 'b', 540, 180)])
const chargeRC = recipe({ a: at(160, 100), m: at(640, 100), b: at(160, 500) }, [part('V1', 'voltage-source', 5, 'a', 'b', 160, 300, true), r('R1', 'a', 'm', 400, 100, 1000), part('C1', 'capacitor', .000001, 'm', 'b', 640, 300, true)], { IN: 'a', OUT: 'm', COM: 'b' })
const dischargeRC = recipe({ a: at(120, 100), b: at(680, 100) }, [r('R1', 'a', 'b', 400, 100, 1000), part('C1', 'capacitor', .000001, 'a', 'b', 400, 380)])
const seriesRL = recipe({ a: at(160, 100), m: at(640, 100), b: at(160, 500) }, [part('V1', 'voltage-source', 5, 'a', 'b', 160, 300, true), r('R1', 'a', 'm', 400, 100, 100), part('L1', 'inductor', .01, 'm', 'b', 640, 300, true)])
const zeroRL = recipe({ a: at(120, 100), b: at(680, 100) }, [r('R1', 'a', 'b', 400, 100, 100), part('L1', 'inductor', .01, 'a', 'b', 400, 380)])
const seriesRLC = recipe({ a: at(140, 100), m: at(420, 100), c: at(700, 100), b: at(140, 500) }, [part('V1', 'voltage-source', 5, 'a', 'b', 140, 300, true), r('R1', 'a', 'm', 280, 100, 100), part('L1', 'inductor', .01, 'm', 'c', 560, 100), part('C1', 'capacitor', .000001, 'c', 'b', 700, 300, true)], { IN: 'a', COM: 'b', 'R+': 'a', 'R-': 'm' })
const parallelRLC = recipe({ a: at(120, 100), b: at(120, 500) }, [r('R1', 'a', 'b', 240, 300, 1000, true), part('L1', 'inductor', .01, 'a', 'b', 440, 300, true), part('C1', 'capacitor', .000001, 'a', 'b', 640, 300, true)])
const filter = (seriesKind: PaletteKind, shuntKind: PaletteKind) => recipe({ a: at(120, 100), b: at(680, 100), g: at(120, 500) }, [part('V1', 'voltage-source', 5, 'a', 'g', 120, 300, true), part(seriesKind === 'resistor' ? 'R1' : seriesKind === 'inductor' ? 'L1' : 'C1', seriesKind, seriesKind === 'resistor' ? 1000 : seriesKind === 'inductor' ? .01 : .000001, 'a', 'b', 400, 100), part(shuntKind === 'resistor' ? 'R1' : 'C1', shuntKind, shuntKind === 'resistor' ? 1000 : .000001, 'b', 'g', 680, 300, true)], { IN: 'a', OUT: 'b', COM: 'g' })
const bandpass = recipe({ a: at(120, 100), m: at(400, 100), b: at(680, 100), g: at(120, 500) }, [part('V1', 'voltage-source', 5, 'a', 'g', 120, 300, true), part('L1', 'inductor', .01, 'a', 'm', 260, 100), part('C1', 'capacitor', .000001, 'm', 'b', 540, 100), r('R1', 'b', 'g', 680, 300, 100, true)], { IN: 'a', OUT: 'b', COM: 'g' })
const tNetwork = recipe({ a: at(120, 100), m: at(400, 100), b: at(680, 100), g: at(400, 500) }, [r('R1', 'a', 'm', 260, 100), r('R2', 'm', 'b', 540, 100, 220), r('R3', 'm', 'g', 400, 300, 330, true)], { IN: 'a', OUT: 'b', COM: 'g' })
const piNetwork = recipe({ a: at(120, 100), b: at(680, 100), g: at(400, 500) }, [r('R1', 'a', 'b', 400, 100), r('R2', 'a', 'g', 120, 300, 220, true), r('R3', 'b', 'g', 680, 300, 330, true)], { IN: 'a', OUT: 'b', COM: 'g' })

function template(id: string, familyId: string, name: string, description: string, recipe: CircuitRecipe, chapters: readonly number[], methods: readonly string[], difficulty: CircuitTemplate['difficulty'] = '入门'): CircuitTemplate {
  const resistive = recipe.parts.every(p => p.kind === 'resistor')
  const ac = ['rc-lowpass', 'rc-highpass', 'rl-lowpass', 'series-rlc', 'rlc-bandpass'].includes(id)
  return { ...(ac ? { acExperiment: { inputPorts: ['IN', 'COM'] as const, outputPorts: id === 'series-rlc' ? ['R+', 'R-'] as const : ['OUT', 'COM'] as const, passband: id === 'rc-highpass' ? 'high' as const : ['series-rlc', 'rlc-bandpass'].includes(id) ? 'peak' as const : 'low' as const } } : {}), id, categoryId: familyId.split('.')[0]!, familyId, name, description, recipe, chapters, methods, difficulty, topics: [name, ...methods], components: [...new Set(recipe.parts.map(p => PALETTE[p.kind].title))], status: 'implemented', capabilities: { schematic: true, editable: true, ac, dc: recipe.parts.every(p => ['resistor', 'voltage-source', 'current-source'].includes(p.kind)), numerical: resistive, experiment: resistive }, actions: ['view', 'edit', 'export'], note: ac ? '可编辑激励、参数与端口，运行 RMS 相量及真实频率扫描；解析参考与采样估计分列。暂态请使用信号实验室限定的采样 RC 模型。' : resistive ? '可使用现有电阻等效变换、端口数值核对与五阶段课程，具体操作取决于当前结构和候选条件；可使用独立 MNA 直流分析；纯电阻无激励时电压与电流为零。' : recipe.parts.every(p => ['resistor', 'voltage-source', 'current-source'].includes(p.kind)) ? '可使用 MNA 直流工作点分析；方法标签仍是学习索引，不代表已单独实现叠加、等效源或网孔求解。' : '当前可查看、编辑与保存拓扑；直流与任意暂态模型尚不支持；交流分析需另行配置独立激励和参考，并通过引擎检查。' }
}

export const circuitTemplates: readonly CircuitTemplate[] = freezeSnapshot([
  template('resistor-series', 'resistive.series-parallel', '电阻串联电路', '两个电阻串联，观察内部节点与保留的外部端口。', series, [2], ['等效变换', 'KVL']),
  template('resistor-parallel', 'resistive.series-parallel', '电阻并联电路', '两个支路共享一对节点，比较阻值与连接。', parallel, [2], ['等效变换', 'KCL']),
  template('resistor-mixed', 'resistive.mixed', '串并联混合电路', '串联一个双支路并联网络，支持分步化简。', mixed, [2], ['等效变换', 'KCL', 'KVL']),
  template('wheatstone-bridge', 'resistive.bridge', '惠斯通电桥', '五电阻桥式结构，桥臂比值为 1:2；数值结果由现有引擎产生。', bridge, [2, 3], ['节点分析', '等效变换'], '进阶'),
  template('resistor-star', 'resistive.star-delta', 'Y 形电阻网络', '三个外部端口和一个内部星点，保留观测边界。', star, [2], ['等效变换']),
  template('resistor-delta', 'resistive.star-delta', 'Δ 形电阻网络', '三端口的三条电阻支路，几何采用正交布线。', delta, [2], ['等效变换']),
  template('resistor-ladder', 'resistive.basic', '双节电阻梯形网络', '两条串联支路与两个对公共端的支路。', ladder, [2, 3], ['等效变换', '节点分析'], '进阶'),
  template('voltage-load', 'resistive.sources', '电压源与电阻负载', '5V 独立源和 1kΩ 负载，保留真实端口与数值参数。', voltageLoad, [1, 3], ['KVL']),
  template('current-load', 'resistive.sources', '电流源与串联负载', '2mA 源连接两电阻串联支路；箭头方向按元件引脚定义。', currentLoad, [1, 3], ['KCL']),
  template('two-voltage-loops', 'resistive.multi-loop', '双电压源双回路', '两个独立电压源与三电阻共享中间支路。', twoSources, [3], ['网孔分析', 'KVL'], '进阶'),
  template('source-ladder', 'resistive.multi-loop', '含源多节点梯形网络', '12V 源驱动多节点电阻拓扑，用于节点法学习。', multiLoop, [3], ['节点分析', 'KCL'], '进阶'),
  template('superposition-network', 'resistive.multi-loop', '电压源与电流源叠加网络', '两类独立源共享电阻支路；此版本不自动执行叠加计算。', superposition, [4], ['叠加定理', '节点分析'], '进阶'),
  template('thevenin-network', 'resistive.equivalent-source', '戴维南定理学习网络', '独立源、分压电阻与未接负载的输出端口，供后续分析。', thevenin, [4], ['戴维南定理']),
  template('norton-network', 'resistive.equivalent-source', '诺顿形式源网络', '电流源与并联内阻、输出端口；未宣称自动等效求解。', norton, [4], ['诺顿定理']),
  template('passive-rc-series', 'first-order.complete', '无源 RC 串联二端网络', '电阻与电容串联，仅提供结构与参数。', passiveRC, [6, 7], ['暂态响应']),
  template('rc-charge-topology', 'first-order.rc-charge', 'RC 充电连接拓扑', '独立电压源经电阻连接电容；未定义切换时刻或初始电压。', chargeRC, [7], ['暂态响应', 'KVL']),
  template('rc-discharge-topology', 'first-order.rc-discharge', 'RC 放电连接拓扑', '电容与电阻闭合连接；初始能量和响应尚不建模。', dischargeRC, [7], ['暂态响应']),
  template('rl-series-topology', 'first-order.rl-transient', '含源 RL 串联拓扑', '真实电阻、电感和电压源，尚无阶跃或暂态计算。', seriesRL, [6, 7], ['暂态响应', 'KVL']),
  template('rl-zero-input-topology', 'first-order.zero-input', 'RL 无源回路拓扑', '电感与电阻形成无源回路；初始电流另待模型支持。', zeroRL, [7], ['暂态响应']),
  template('series-rlc', 'second-order.series', '含源 RLC 串联电路', '串联 RLC，输出跨电阻；配置 RMS 激励，扫描谐振与半功率带宽。', seriesRLC, [7, 11], ['暂态响应', '频率响应'], '进阶'),
  template('parallel-rlc', 'second-order.parallel', '无源 RLC 并联电路', '三个储能/耗能支路共享端口，用于二阶结构学习。', parallelRLC, [7, 11], ['暂态响应', '频率响应'], '进阶'),
  template('rc-lowpass', 'filters.rc-lowpass', 'RC 低通连接拓扑', '串联电阻、对公共端电容，OUT 位于电容端；支持实际 Bode 求解。', filter('resistor', 'capacitor'), [11], ['频率响应']),
  template('rc-highpass', 'filters.rc-highpass', 'RC 高通连接拓扑', '串联电容、对公共端电阻，OUT 位于电阻端；支持相量与频率扫描。', filter('capacitor', 'resistor'), [11], ['频率响应']),
  template('rl-lowpass', 'filters.rl', 'RL 低通滤波实验', '串联电感、对公共端电阻；输出跨电阻，截止参考 R/(2πL)。', filter('inductor', 'resistor'), [11], ['频率响应']),
  template('rlc-bandpass', 'filters.bandpass', 'RLC 电阻输出带通拓扑', 'L、C 串联接电阻负载，输出跨负载；支持实际带通与谐振分析。', bandpass, [11], ['频率响应'], '进阶'),
  template('resistive-t', 'two-port.t', '公共端 T 形电阻网络', '三电阻与 IN / OUT / COM 三个端口；不计算二端口参数。', tNetwork, [16], ['KCL', 'KVL', '等效变换'], '进阶'),
  template('resistive-pi', 'two-port.pi', '公共端 Π 形电阻网络', '输入输出间支路及两条公共端支路；二端口参数求解待实现。', piNetwork, [16], ['KCL', 'KVL', '等效变换'], '进阶'),
])
