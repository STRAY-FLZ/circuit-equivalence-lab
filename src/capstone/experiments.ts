import { instantiateTemplate } from '../atlas'
import { applyEdit } from '../editing'
import { configureTransientExperiment } from '../transient'
import type { CapstoneKind } from './types'

export const capstoneExperiments: readonly { readonly kind: CapstoneKind; readonly title: string; readonly templateId: string; readonly objective: string }[] = [
  { kind: 'rc', title: 'RC 时间与频率联合实验', templateId: 'rc-charge-topology', objective: '同一 RC 网络的实际阶跃、交流频响与 τ·fc 参考；分别检查 V 和 A。' },
  { kind: 'rlc', title: 'RLC 阻尼与频率联合实验', templateId: 'series-rlc', objective: '比较自然频率、阻尼、实际暂态与电阻输出的驱动峰值；不同频率定义分列。' },
  { kind: 'ce', title: 'NPN 共射综合实验', templateId: 'amplifier-ce-bypass', objective: '每个场景重新求实际偏置、区域与同模型 gm/rπ，再计算频率响应。显式电容为教学假设。' },
  { kind: 'cs', title: 'nMOS 共源综合实验', templateId: 'amplifier-cs-parasitic', objective: '重新验证饱和区和 gm/gds；比较实际源极退化、旁路与显式栅电容。' },
  { kind: 'follower', title: '运放跟随综合实验', templateId: 'opamp-follower', objective: '对比理想近似、有限增益直流、开环、闭环及可验证的环路指标。' },
  { kind: 'inverting', title: '运放反相综合实验', templateId: 'opamp-inverting', objective: '修改反馈阻值或开环模型参数，对比实际增益带宽；理想输出单独标注。' },
  { kind: 'noninverting', title: '运放同相综合实验', templateId: 'opamp-noninverting', objective: '比较反馈分压、有限增益误差与实际频响。' },
  { kind: 'active-lowpass', title: '有源低通综合实验', templateId: 'opamp-active-lowpass', objective: '计算频率相关反馈；保留未认证的交越与相位裕度状态。' },
]
export function capstoneAssumptions(kind: CapstoneKind): string {
  if (kind === 'rc' || kind === 'rlc') return '理想线性 R/C/L，显式零初值与从0开始的独立电压阶跃；阶跃幅值采用源参数，AC采用独立1 V RMS。自适应后向欧拉含数值耗散，局部误差不是全局精度保证；解析参考仅对识别的实际拓扑显示。'
  if (kind === 'ce') return '单级入门NPN，先重新求实际直流并检查放大区；gm/rπ来自同一模型精确导数，无虚构Early电阻。R/C与显式Cπ/Cμ为教学假设，交流激励0.0001 V RMS。'
  if (kind === 'cs') return '单级长沟道nMOS，先重新求实际直流并检查饱和区；gm来自同一模型，未建模沟道长度调制，gds=0。显式栅/耦合/旁路电容为教学假设，交流激励0.0001 V RMS。'
  return '单运放有限增益单极点，理想零输入电流/零输出电阻；选定参考是输出返回端。无供电轨、饱和、限流、转换速率或商业器件精度；交流0.01 V RMS，其他源增量置零。仅纯电阻返回网络认证裕度，RC仅展示实际返回样本。理想DC近似单独调用既有理想运放模型。'
}
export function createCapstoneProject(kind: CapstoneKind) {
  const experiment = capstoneExperiments.find(e => e.kind === kind)
  if (!experiment) throw Error('实验类型不支持。')
  let p = instantiateTemplate(experiment.templateId)
  if (kind === 'rlc') p = configureTransientExperiment(p, p.sheets[0]!.id, 'under')
  if (kind === 'rc') {
    const sheet = p.sheets[0]!, source = sheet.components.find(c => c.reference === 'V1')!
    p = applyEdit(p, sheet.id, { type: 'properties', id: source.id, reference: source.reference, parameters: { voltage: { kind: 'quantity', quantity: { value: 10, unit: 'V' } } } })
  }
  return p
}
