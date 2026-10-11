import type { CircuitNetwork, Resistor } from '../domain'
import { analyzeTopology } from '../topology'
import type { EquivalenceResult, TransformCandidate, TransformResult } from '../transforms'
import { formatNumber } from './format'
import type { DerivationStep, LessonBuildResult, LessonContent, LessonStepIndex, VariableMapping } from './types'

const names = { series: '串联化简', parallel: '并联化简', 'delta-to-star': 'Δ → Y', 'star-to-delta': 'Y → Δ' }
const variable = (suffix: string) => `R_{${suffix}}`

/** Explain authoritative M3 records; never evaluate a resistance formula here. */
export function buildLesson(source: CircuitNetwork, candidate: TransformCandidate, applied: Extract<TransformResult, { kind: 'applied' }>, verification: EquivalenceResult): LessonBuildResult {
  const metadata = applied.metadata
  if (metadata.candidateId !== candidate.id || metadata.type !== candidate.type) return { kind: 'unavailable', message: '候选与变换记录不一致，请重新选择。' }
  const topology = analyzeTopology(source)
  const boundary = candidate.boundaryNodeIds
  const rawLabels = boundary.map(id => {
    const node = topology.nodes.find(n => n.id === id)
    const terminal = source.terminals.find(t => topology.terminalToNode[t.id] === id)
    return terminal?.label ?? node?.pointIds[0] ?? id
  })
  const useLabels = rawLabels.every(label => /^[A-Za-z0-9]+$/.test(label)) && new Set(rawLabels).size === rawLabels.length
  const nodeMappings = boundary.map((id, i) => ({ alias: useLabels ? rawLabels[i]! : String.fromCharCode(65 + i), nodeId: id, pointIds: topology.nodes.find(n => n.id === id)?.pointIds ?? [], terminalLabels: source.terminals.filter(t => topology.terminalToNode[t.id] === id).map(t => t.label) }))
  const aliases = nodeMappings.map(n => n.alias)
  const variables: VariableMapping[] = []
  const originals = metadata.originals
  const replacements = metadata.replacements
  const formulas: string[] = []
  const substitutions: string[] = []
  const assign = (symbol: string, resistor: Resistor): string => {
    variables.push({ variable: symbol, elementId: resistor.id, resistance: resistor.resistance })
    return formatNumber(resistor.resistance)
  }
  const connects = (r: Resistor, a: string, b?: string) => {
    const ids = r.endpoints.map(id => topology.pointToNode[id])
    return ids.includes(a) && (b === undefined || ids.includes(b))
  }
  const required = <T>(value: T | undefined): T => { if (value === undefined) throw new Error('Incomplete transformation mapping') ; return value }
  let concept: string
  let conditions: string[]
  let basis: string
  let mistake: string
  try {
    if (candidate.type === 'series' || candidate.type === 'parallel') {
      const values = originals.map((r, i) => assign(variable(String(i + 1)), r))
      const symbols = originals.map((_, i) => variable(String(i + 1)))
      const eq = variable('eq')
      const result = assign(eq, required(replacements[0]))
      if (candidate.type === 'series') {
        concept = '串联支路承载同一电流，各电阻的电压降相加。'
        conditions = [`这次候选包含 ${candidate.elementIds.join('、')}，共用内部电气节点 ${candidate.internalNodeId}。`, '变换引擎已确认内部节点只有两条未短接电阻支路，连接两个不同边界节点，且不是外部端子或受保护节点。', '由理想导线连通的多个点会合并为同一电气节点；视觉相邻不构成串联。']
        basis = '由欧姆定律 U_i = I × R_i 和电压相加关系，得到一般串联公式。本次候选只化简两个电阻，下面列出这两个电阻的实际变量。'
        formulas.push('R_{eq} = R_{1} + R_{2} + … + R_{n}', `${eq} = ${symbols.join(' + ')}`)
        substitutions.push(`${eq} = ${values.join(' + ')} = ${result} Ω`)
        mistake = '中间节点若接入其他未短接支路，就不能保证选中电阻的电流相同。外部端子也不能因化简而消失。'
      } else {
        concept = '并联支路连接同一对电气节点，因此承受相同电压。'
        conditions = [`${candidate.elementIds.join('、')} 的端点经拓扑识别后，都连接 ${boundary.join(' 与 ')}。`, '每条选中电阻都未被理想导线短接；几何平行或图上交叉不是并联判据。']
        basis = '各支路电流 I_i = U / R_i，总电流等于支路电流之和，所以电导相加，而不是电阻直接相加。'
        formulas.push('1 / R_{eq} = Σ_i (1 / R_{i})', `1 / ${eq} = ${symbols.map(s => `1 / ${s}`).join(' + ')}`)
        substitutions.push(`${eq} = 1 / (${values.map(v => `1 / ${v}`).join(' + ')}) = ${result} Ω`)
        mistake = '不能把并联电阻直接相加。若两端已由理想导线连通，电阻被短接，变换引擎不会把它作为可化简支路。'
      }
    } else {
      const a = required(boundary[0]); const b = required(boundary[1]); const c = required(boundary[2])
      const va = required(aliases[0]); const vb = required(aliases[1]); const vc = required(aliases[2])
      const edgeSuffix = (x: string, y: string) => x.length === 1 && y.length === 1 ? x + y : `${x},${y}`
      const edgeSymbols = [variable(edgeSuffix(va, vb)), variable(edgeSuffix(vb, vc)), variable(edgeSuffix(vc, va))]
      const legSymbols = [variable(va), variable(vb), variable(vc)]
      if (candidate.type === 'delta-to-star') {
        const edges = [[a, b], [b, c], [c, a]] as const
        const edgeValues = edges.map(([x, y], i) => assign(required(edgeSymbols[i]), required(originals.find(r => connects(r, x, y)))))
        formulas.push(`S = ${edgeSymbols.join(' + ')}`)
        const adjacent = [[0, 2], [0, 1], [1, 2]] as const
        boundary.forEach((node, i) => {
          const [left, right] = required(adjacent[i])
          const symbol = required(legSymbols[i])
          const value = assign(symbol, required(replacements.find(r => connects(r, node))))
          formulas.push(`${symbol} = (${required(edgeSymbols[left])} × ${required(edgeSymbols[right])}) / S`)
          substitutions.push(`${symbol} = (${required(edgeValues[left])} × ${required(edgeValues[right])}) / (${edgeValues.join(' + ')}) = ${value} Ω`)
        })
        concept = '三角形网络的三个顶点分别对应星形网络的三条支路端点，新增中心不是外部端子。'
        conditions = [`变换引擎已确认 ${candidate.elementIds.join('、')} 在三个不同电气节点之间形成完整三角形，每一对顶点都有一条选中支路。`, '三个边界节点及其外部端子、未选中支路均保留；边界上存在其他支路并不妨碍这次 Δ → Y。']
        basis = '对选中的子网络，令第三个边界开路，分别匹配三对顶点间的电阻：星形中两条星臂串联，三角形中直接边与其余两边的串联路径并联。解这三个关系，就得到星形支路公式。每条星臂的分子取与该顶点相邻的两个电阻之积。'
        mistake = '不能按图上的左右位置选分子。先对应电气顶点，再找与该顶点相邻的两条三角形支路。'
      } else {
        const legValues = boundary.map((node, i) => assign(required(legSymbols[i]), required(originals.find(r => connects(r, node, required(candidate.internalNodeId ?? undefined))))))
        const p = `${required(legSymbols[0])} × ${required(legSymbols[1])} + ${required(legSymbols[1])} × ${required(legSymbols[2])} + ${required(legSymbols[2])} × ${required(legSymbols[0])}`
        const numericP = `${required(legValues[0])} × ${required(legValues[1])} + ${required(legValues[1])} × ${required(legValues[2])} + ${required(legValues[2])} × ${required(legValues[0])}`
        formulas.push(`P = ${p}`)
        const edges = [[a, b, 2], [b, c, 0], [c, a, 1]] as const
        edges.forEach(([x, y, opposite], i) => {
          const symbol = required(edgeSymbols[i])
          const value = assign(symbol, required(replacements.find(r => connects(r, x, y))))
          formulas.push(`${symbol} = P / ${required(legSymbols[opposite])}`)
          substitutions.push(`${symbol} = (${numericP}) / ${required(legValues[opposite])} = ${value} Ω`)
        })
        concept = '星形网络通过一个内部电气节点连接三个不同边界节点，可替换成边界之间的三角形支路。'
        conditions = [`变换引擎已确认内部中心 ${candidate.internalNodeId} 只有三条未短接支路，且不包含外部端子或受保护连接点。`, '三个外部边界保持不变。旧中心若仍有导线组或短接电阻，变换引擎会保留为独立残留分量，不能把残留分量画成仍接在端子网络中。']
        basis = '由与 Δ → Y 相同的端口约束反向求解，先写出三对星臂乘积之和 P；每条三角形边除以不连接该边两个顶点的那条星臂电阻。'
        mistake = '三角形边的分母是对面的星臂。若中心是外部端子或接有额外有效支路，就不能直接消去中心。'
      }
    }
  } catch {
    return { kind: 'unavailable', message: '无法将元件记录对应到教学公式，请重新选择候选。' }
  }
  const step = (id: string, title: string, explanation: string, extra: Partial<DerivationStep> = {}): DerivationStep => ({ id, title, explanation, conditions: [], formulas: [], substitutions: [], conclusion: '', commonMistake: '', ...extra })
  const steps: LessonContent['steps'] = [
    step('identify', '识别电路与适用条件', concept, { conditions, commonMistake: '判断连接关系要看电气节点，而不是元件在屏幕上的距离。理想导线可以让多个连接点属于同一节点。' }),
    step('principle', '理解数学原理', basis, { formulas, commonMistake: mistake }),
    step('substitute', '代入实际电阻值', '下列变量均与真实元件标识对应。代入式仅展示计算过程，等号右侧的阻值直接来自 变换记录。', { substitutions, conclusion: '显示数字保留 10 位有效数字；验证仍使用未舍入的阻值。', commonMistake: '显示舍入不应回写电路，也不能先把输入值舍入后重新计算结果。' }),
    step('transform', '对照变换前后的结构', '左图保留原网络，右图显示变换引擎生成的新网络。橙色虚线标记选中支路，绿色粗线标记替换支路。绿色双圈标记新增节点，橙色虚线圈标记被移除的节点；保留边界用实线圈标记。', { conclusion: '元件个数、内部节点和图形可以不同；电气等效讨论的是保留边界上的端口行为。', commonMistake: '保留的内部导线或短接元件可能已成为独立分量，不能仅因它还出现在图中就认为它参与端口连接。' }),
    step('verify', '验证外部端口等效', '使用端口等效验证：分别识别前后网络的电气节点，再独立求解。多端子网络核对所有保留外部端子的两两组合，而不是要求内部结构相同。', { conclusion: '已验证表示在数值容差内一致；无法确定表示缺少足够数值证据；验证失败表示已发现差异。', commonMistake: '结构上允许的变换与数值验证成功是不同结论。求解器报错、缺少端口对或数值范围问题都不能当作验证通过。' }),
  ]
  return { kind: 'ready', lesson: { id: `${source.id}:${candidate.id}`, title: names[candidate.type], source, candidate, metadata, verification, nodeMappings, variables, preservedElementIds: source.elements.filter(e => !metadata.originalResistorIds.includes(e.id)).map(e => e.id), steps } }
}

export function lessonHighlights(lesson: LessonContent, step: LessonStepIndex) {
  const metadata = lesson.metadata
  return {
    selectedIds: step === 4 ? [] : metadata.originalResistorIds,
    replacementIds: step === 3 ? metadata.replacementResistorIds : [],
    originalNodeIds: step === 0 || step === 3 ? metadata.affectedNodeIds : metadata.boundaryNodeIds,
    transformedNodeIds: step === 3 ? [...metadata.affectedNodeIds, ...metadata.createdNodeIds] : metadata.boundaryNodeIds,
    createdNodeIds: step === 3 ? metadata.createdNodeIds : [],
    removedNodeIds: step === 3 ? metadata.removedNodeIds : [],
    boundaryNodeIds: step >= 3 ? metadata.boundaryNodeIds : [],
    showAfter: step >= 3,
  }
}


