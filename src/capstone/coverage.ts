/** Source inventory, not inferred from the existence of schematic symbols. */
export const capabilities = [
  ['电路定律与电阻变换', '电阻/导线可编辑；串并联与 Δ/Y 候选、既有独立数值端口验证、MathML课程', '工程JSON；变换课程', '不对混合器件提交电阻等效变换', 'resistor-series', 'dc'],
  ['直流分析', 'R、独立及四类受控源；实际 MNA 电压/电流/功率与残差', '工程及结果/电赛证据', '不包含 C/L 动态与非线性器件；有规模与参考要求', 'voltage-load', 'dc'],
  ['交流相量与谐振', 'RLC与线性源；RMS复数 MNA、Bode与采样交点', '完整频点、工程/电赛', '单图纸；不支持任意半导体模型或未声明激励', 'rc-lowpass', 'ac'],
  ['线性暂态', 'RLC、阶跃/脉冲/初值；自适应后向欧拉、KCL与能量核对', '完整波形资产、信号与电赛', '数值耗散/局部误差明确；无非线性或受控源暂态', 'rc-charge-topology', 'transient'],
  ['二极管与半导体偏置', 'Shockley、入门NPN、长沟道nMOS直流/准静态', '实际工作点、扫描和工程', '无完整热/噪声/击穿/体效应与非线性暂态', 'analog-diode-bias', 'analog'],
  ['晶体管局部增益', '同偏置模型解析导数，区域检查后求局部小信号', '工作点与导数记录', 'NPN放大区/nMOS饱和区；不外推不合适区域', 'analog-npn-base', 'analog'],
  ['晶体管频率响应', '真实新偏置、显式耦合/旁路/教学寄生电容、复数频扫', '所有有限频点/工程记录', '单级NPN/nMOS；无任意多级、器件高频物理', 'amplifier-ce-bypass', 'amplifier'],
  ['理想运放', '电阻负反馈验证、零输入电流与虚短约束', '实际工作点/电赛证据', '独立模型；不预测带宽、电源轨或饱和', 'analog-opamp-inverting', 'analog'],
  ['有限增益运放与反馈', '单极点、有限DC、实际闭环和返回网络', 'schema1原始频响/来源', '仅单运放；纯电阻返回网络可认证裕度，RC仅显示返回频响', 'opamp-follower', 'opamp'],
  ['信号测量', '合成/CSV采样、RMS、四通道示波器、FFT、采样滤波', '浮点资产/CSV/工程', '不代表硬件采集或仪器认证；频谱受采样窗限制', '', 'signal'],
  ['电赛工程证据', '原题来源、自定训练目标、实际证据、单位和历史失效', 'JSON/便携HTML报告', '不是自动官方评分、硬件测试或整题完成', '', 'competition'],
] as const

export const textbookSource = 'https://xuanshu.hep.com.cn/front/book/findBookDetails?bookId=60f7238badb85dae6a2f4523'
// Chapter themes paraphrase the publisher's verified sixth-edition contents,
// ISBN 978-7-04-056553-9, checked 2026-10-30. No full-chapter coverage claim.
export const textbookCoverage = [
  ['模型与电路定律', '部分：参考方向、源、KCL/KVL与功率数值'], ['电阻等效', '部分：串并联/ΔY与端口验证'], ['电阻网络分析', '部分：MNA；无独立网孔/回路教学求解'], ['电路定理', '模板索引；无完整定理自动演示'], ['电阻运放网络', '部分：单理想运放负反馈'], ['储能元件', '部分：理想C/L、初值与能量'], ['一阶和二阶时域', '部分：线性RLC/有限激励；无冲激/卷积求解'], ['相量方法', '部分：正余弦RMS复数数值'], ['正弦稳态分析', '部分：相量/功率；非全章'], ['耦合电感', '未实现互感/变压器分析'], ['频率响应', '部分：受支持网络Bode与谐振'], ['三相电路', '未实现专用三相分析'], ['周期信号与频谱', '部分：采样FFT；无通用傅里叶电路求解'], ['复频域动态方法', '未实现通用Laplace/符号极零点'], ['矩阵电路方法', '部分：MNA矩阵；无全套拓扑矩阵/状态方程工具'], ['二端口', '未实现通用参数提取'], ['非线性网络', '部分：声明器件DC/局部增量；无非线性暂态'], ['传输线', '未实现分布参数网络'],
] as const
