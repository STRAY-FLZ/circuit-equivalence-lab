import { createCircuitNetwork, resistanceOhms } from './domain'
import { circuitExamples } from './visualization'
const delta = circuitExamples.find(e => e.id === 'delta')!
/** Additional educational input, with all results still obtained from M3. */
export const labExamples = [...circuitExamples, {
  ...delta, id: 'delta3', name: '对称 Δ（3 Ω）', description: '三条 3 Ω 电阻组成三角形，用真实变换结果逐步学习。',
  network: createCircuitNetwork({ ...delta.network, id: 'delta3', elements: delta.network.elements.map(e => e.kind === 'resistor' ? { ...e, resistance: resistanceOhms(3) } : e) }),
}]
