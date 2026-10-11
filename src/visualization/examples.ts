import { createCircuitNetwork, resistanceOhms } from '../domain'
import type { CircuitNetwork } from '../domain'
import type { CircuitLayout } from './types'

export interface CircuitExample { readonly id: string; readonly name: string; readonly description: string; readonly network: CircuitNetwork; readonly layout: CircuitLayout }
function example(id: string, name: string, description: string, coordinates: Record<string, readonly [number, number]>, resistors: readonly (readonly [string, string, string, number])[], terminals: readonly string[], wires: readonly (readonly [string, string, string])[] = []): CircuitExample {
  return { id, name, description,
    network: createCircuitNetwork({ id, points: Object.keys(coordinates).map(id => ({ id })),
      elements: [...resistors.map(([id, a, b, value]) => ({ id, kind: 'resistor' as const, endpoints: [a, b] as const, resistance: resistanceOhms(value) })),
        ...wires.map(([id, a, b]) => ({ id, kind: 'wire' as const, endpoints: [a, b] as const }))],
      terminals: terminals.map(label => ({ id: `terminal-${label}`, label, pointId: label })) }),
    layout: { pointPositions: Object.fromEntries(Object.entries(coordinates).map(([id, [x, y]]) => [id, { x, y }])) } }
}
const triangle = { A: [80, 290], B: [480, 290], C: [280, 60] } as const
export const circuitExamples: readonly CircuitExample[] = [
  example('series', '串联电阻', '两个串联电阻，共用一个内部节点。', { A: [70, 200], N: [280, 200], B: [490, 200] }, [['R1', 'A', 'N', 100], ['R2', 'N', 'B', 220]], ['A', 'B']),
  example('parallel', '并联电阻', '三条独立支路连接同一对电气节点。', { A: [80, 200], B: [480, 200] }, [['R1', 'A', 'B', 100], ['R2', 'A', 'B', 200], ['R3', 'A', 'B', 300]], ['A', 'B']),
  example('delta', 'Δ 三角形网络', '三个外部端子保持独立，可预览 Δ → Y。', triangle, [['R1', 'A', 'B', 300], ['R2', 'B', 'C', 600], ['R3', 'C', 'A', 900]], ['A', 'B', 'C']),
  example('star', 'Y 星形网络', '内部中心连接三个外部端子，可预览 Y → Δ。', { ...triangle, N: [280, 210] }, [['R1', 'A', 'N', 100], ['R2', 'B', 'N', 200], ['R3', 'C', 'N', 300]], ['A', 'B', 'C']),
  example('bridge', '平衡惠斯通电桥', '保留中央桥臂；候选完全由变换引擎识别。', { A: [60, 200], B: [500, 200], U: [280, 70], D: [280, 330] }, [['R1', 'A', 'U', 100], ['R2', 'U', 'B', 100], ['R3', 'A', 'D', 100], ['R4', 'D', 'B', 100], ['R5', 'U', 'D', 220]], ['A', 'B']),
  example('bypass', '理想导线旁路', 'R1 被导线短接，仍保留其元件身份与真实阻值。', { A: [80, 200], B: [480, 200] }, [['R1', 'A', 'B', 100]], ['A', 'B'], [['W1', 'A', 'B']]),
  example('residual', '保留内部导线', '串联化简后，原内部导线作为独立残留分量展示。', { A: [70, 200], N: [280, 200], X: [280, 310], B: [490, 200], Z: [400, 320] }, [['R1', 'A', 'N', 100], ['R2', 'N', 'B', 220]], ['A', 'B'], [['W1', 'N', 'X']]),
  example('crossing', '无连接的导线交叉', '交叉处没有连接点；间断标记表示跨越，圆点仅表示声明的连接点。', { A: [90, 80], B: [470, 320], C: [90, 320], D: [470, 80] }, [], ['A', 'B', 'C', 'D'], [['W1', 'A', 'B'], ['W2', 'C', 'D']]),
]
