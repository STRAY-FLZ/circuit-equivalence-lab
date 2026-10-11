import type { CircuitElement, CircuitNetwork, Endpoints, ResistanceOhms, Resistor } from './types'

export function resistanceOhms(value: number): ResistanceOhms {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError('电阻阻值必须是有限正数（Ω）；短路请使用理想导线，断路请不建立连接。')
  }
  return value as ResistanceOhms
}

function assertId(value: string, description: string): void {
  if (typeof value !== 'string' || value.trim().length === 0 || value !== value.trim()) {
    throw new TypeError(`${description}必须是非空且无首尾空白的稳定 ID。`)
  }
}

function assertUniqueIds(ids: readonly string[], description: string): void {
  const seen = new Set<string>()
  for (const id of ids) {
    assertId(id, description)
    if (seen.has(id)) throw new TypeError(`${description}重复：${id}`)
    seen.add(id)
  }
}

function validatedResistance(element: Resistor): ResistanceOhms {
  try {
    return resistanceOhms(element.resistance)
  } catch (cause) {
    throw new RangeError(`电阻元件 "${element.id}" 的阻值必须是有限正数（Ω）。`, { cause })
  }
}

/** Validate data integrity and copy a frozen snapshot; do not analyze or solve it. */
export function createCircuitNetwork(input: CircuitNetwork): CircuitNetwork {
  assertId(input.id, '网络 ID')
  assertUniqueIds(input.points.map((point) => point.id), '连接点 ID')
  assertUniqueIds(input.elements.map((element) => element.id), '元件 ID')
  assertUniqueIds(input.terminals.map((terminal) => terminal.id), '端子 ID')
  const pointIds = new Set(input.points.map((point) => point.id))

  function assertPointExists(id: string, context: string): void {
    if (!pointIds.has(id)) throw new TypeError(`${context} 引用了不存在的连接点：${id}`)
  }

  const elements = input.elements.map((element): CircuitElement => {
    const context = `元件 "${element.id}"`
    if (!Array.isArray(element.endpoints) || element.endpoints.length !== 2) {
      throw new TypeError(`${context} 必须恰好引用两个连接点。`)
    }
    assertPointExists(element.endpoints[0], context)
    assertPointExists(element.endpoints[1], context)
    const endpoints: Endpoints = Object.freeze([element.endpoints[0], element.endpoints[1]])
    switch (element.kind) {
      case 'wire':
        return Object.freeze({ id: element.id, kind: 'wire', endpoints })
      case 'resistor':
        return Object.freeze({
          id: element.id, kind: 'resistor', endpoints,
          resistance: validatedResistance(element),
        })
      default:
        throw new TypeError(`${context} 类型无效；本版本仅支持理想导线与线性正电阻。`)
    }
  })

  const terminals = input.terminals.map((terminal) => {
    assertPointExists(terminal.pointId, `外部端子 "${terminal.id}"`)
    if (typeof terminal.label !== 'string' || terminal.label.trim().length === 0) {
      throw new TypeError(`外部端子 "${terminal.id}" 的展示名称不能为空。`)
    }
    return Object.freeze({ id: terminal.id, label: terminal.label, pointId: terminal.pointId })
  })

  return Object.freeze({
    id: input.id,
    points: Object.freeze(input.points.map((point) => Object.freeze({ id: point.id }))),
    elements: Object.freeze(elements),
    terminals: Object.freeze(terminals),
  })
}
