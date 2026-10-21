import { freezeSnapshot } from '../engineering'

export interface CircuitFamily { readonly id: string; readonly name: string }
export interface CircuitCategory { readonly id: string; readonly name: string; readonly families: readonly CircuitFamily[] }
const category = (id: string, name: string, families: readonly (readonly [string, string])[]): CircuitCategory => ({ id, name, families: families.map(([key, title]) => ({ id: `${id}.${key}`, name: title })) })

/** IDs are stable catalog keys, independent of UI translations and project UUIDs. */
export const circuitCategories = freezeSnapshot([
  category('resistive', '电源与电阻网络', [
    ['basic', '基础电阻电路'], ['sources', '独立电源电路'], ['series-parallel', '串联与并联网络'], ['mixed', '混合电阻网络'], ['bridge', '桥式电路'], ['star-delta', '星形与三角形网络'], ['multi-loop', '多电源与多回路网络'], ['equivalent-source', '等效电源网络'],
  ]),
  category('controlled', '受控源与运算放大器电路', [
    ['vcvs', '电压控制电压源'], ['vccs', '电压控制电流源'], ['ccvs', '电流控制电压源'], ['cccs', '电流控制电流源'], ['ideal-opamp', '理想运算放大器'], ['inverting', '反相放大'], ['non-inverting', '同相放大'], ['follower', '电压跟随'], ['summing-differential', '求和与差分'],
  ]),
  category('first-order', 'RC / RL 一阶动态电路', [
    ['rc-charge', 'RC 充电拓扑'], ['rc-discharge', 'RC 放电拓扑'], ['rl-transient', 'RL 暂态拓扑'], ['zero-input', '零输入响应'], ['zero-state', '零状态响应'], ['complete', '全响应'], ['step-impulse', '阶跃与冲激响应'],
  ]),
  category('second-order', 'RLC 二阶动态与振荡电路', [
    ['series', '串联 RLC'], ['parallel', '并联 RLC'], ['overdamped', '过阻尼响应'], ['critical', '临界阻尼响应'], ['underdamped', '欠阻尼响应'], ['energy', '储能交换'], ['response', '二阶动态响应'],
  ]),
  category('ac', '正弦交流与功率电路', [
    ['pure', '纯 R / L / C 交流电路'], ['networks', '交流串并联网络'], ['impedance', '复阻抗网络'], ['phasor', '相量分析电路'], ['power', '交流功率测量'], ['power-factor', '功率因数校正'],
  ]),
  category('filters', '滤波、谐振与选频电路', [
    ['rc-lowpass', 'RC 低通'], ['rc-highpass', 'RC 高通'], ['rl', 'RL 滤波'], ['bandpass', 'RLC 带通'], ['bandstop', 'RLC 带阻'], ['series-resonance', '串联谐振'], ['parallel-resonance', '并联谐振'], ['multistage', '多级滤波网络'],
  ]),
  category('coupled', '耦合电感与变压器电路', [
    ['coils', '耦合线圈'], ['dots', '同名端'], ['aiding', '串联助磁'], ['opposing', '串联反磁'], ['mutual', '互感网络'], ['ideal-transformer', '理想变压器'], ['core', '磁路与铁心线圈'],
  ]),
  category('three-phase', '三相电路', [
    ['sources', '三相电源'], ['star', '星形负载'], ['delta', '三角形负载'], ['three-wire', '三线制'], ['four-wire', '四线制'], ['balanced', '对称负载'], ['unbalanced', '不对称负载'], ['power', '三相功率测量'],
  ]),
  category('harmonics', '非正弦周期与谐波电路', [
    ['square', '方波激励'], ['pulse', '脉冲激励'], ['superposition', '谐波叠加'], ['networks', '非正弦 RC / RL / RLC'], ['current', '谐波电流'], ['fourier', '傅里叶电路分析'],
  ]),
  category('two-port', '二端口与复杂网络', [
    ['t', 'T 形网络'], ['pi', 'Π 形网络'], ['z', 'Z 参数'], ['y', 'Y 参数'], ['h', 'H 参数'], ['abcd', 'ABCD 参数'], ['cascade', '级联网络'], ['matrix', '图与矩阵表示'],
  ]),
  category('nonlinear', '非线性电路', [
    ['resistive', '非线性电阻网络'], ['diode', '二极管电路'], ['operating-point', '工作点'], ['piecewise', '分段线性网络'], ['storage', '非线性储能元件'], ['limiting', '限幅电路'], ['oscillator', '非线性振荡器'],
  ]),
  category('transmission', '传输线与分布参数电路', [
    ['distributed', '分布参数线模型'], ['matched', '匹配传输线'], ['open', '开路终端'], ['short', '短路终端'], ['mismatched', '失配负载'], ['reflection', '反射'], ['discontinuity', '阻抗突变'], ['standing-wave', '驻波'],
  ]),
])

export const textbookReference = { title: '《电路》第六版 · 邱关源原著，罗先觉主编', url: 'https://xuanshu.hep.com.cn/front/book/findBookDetails?bookId=60f7238badb85dae6a2f4523' } as const
