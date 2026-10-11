// @vitest-environment node
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createCircuitNetwork, resistanceOhms } from './index'
import type { CircuitNetwork, ResistanceOhms } from './index'

function sampleNetwork(): CircuitNetwork {
  return {
    id: 'example',
    points: [{ id: 'p-a' }, { id: 'p-b' }, { id: 'p-c' }, { id: 'isolated' }],
    elements: [
      { id: 'w-1', kind: 'wire', endpoints: ['p-a', 'p-b'] },
      { id: 'r-1', kind: 'resistor', endpoints: ['p-b', 'p-c'], resistance: resistanceOhms(100) },
    ],
    terminals: [
      { id: 't-a', label: 'A', pointId: 'p-a' },
      { id: 't-b', label: 'B', pointId: 'p-c' },
      { id: 't-c', label: 'C', pointId: 'isolated' },
    ],
  }
}

describe('有限正电阻', () => {
  it.each([0.001, 1, 100, Number.MIN_VALUE, Number.MAX_VALUE])('接受有限正数 %s Ω', (value) => {
    expect(resistanceOhms(value)).toBe(value)
  })

  it.each([0, -0, -1, NaN, Infinity, -Infinity])('拒绝非法阻值 %s', (value) => {
    expect(() => resistanceOhms(value)).toThrow(RangeError)
  })

  it('类型契约不允许将普通 number 直接赋给阻值', () => {
    expectTypeOf<number>().not.toExtend<ResistanceOhms>()
    expectTypeOf(resistanceOhms(10)).toEqualTypeOf<ResistanceOhms>()
  })
})

describe('电路网络数据完整性', () => {
  it('保留连接点、导线、正电阻、多端子和孤立点，不合并电气节点', () => {
    const input = sampleNetwork()
    const network = createCircuitNetwork(input)
    expect(network).toEqual(input)
    expect(network.points).toHaveLength(4)
    expect(network.elements[0]).toEqual({ id: 'w-1', kind: 'wire', endpoints: ['p-a', 'p-b'] })
    expect(network.terminals.map((terminal) => terminal.label)).toEqual(['A', 'B', 'C'])
    expect(network).not.toHaveProperty('layout')
    expect(network.points[0]).not.toHaveProperty('x')
  })

  it('接受空网络和没有连接的网络，断路不需要 Infinity 元件', () => {
    expect(createCircuitNetwork({ id: 'empty', points: [], elements: [], terminals: [] }).elements).toEqual([])
    const input = sampleNetwork()
    expect(createCircuitNetwork({ ...input, elements: [] }).terminals).toHaveLength(3)
  })

  it.each(['points', 'elements', 'terminals'] as const)('拒绝同类重复 ID：%s', (collection) => {
    const input = sampleNetwork()
    const invalid = { ...input, [collection]: [...input[collection], ...input[collection]] }
    expect(() => createCircuitNetwork(invalid)).toThrow(/重复/)
  })

  it.each(['', ' ', ' leading', 'trailing '])('拒绝空或带首尾空白的 ID：%j', (id) => {
    expect(() => createCircuitNetwork({ ...sampleNetwork(), id })).toThrow(/稳定 ID/)
    expect(() => createCircuitNetwork({ ...sampleNetwork(), points: [{ id }] })).toThrow(/稳定 ID/)
  })

  it('拒绝元件引用不存在的连接点', () => {
    const input = sampleNetwork()
    expect(() => createCircuitNetwork({
      ...input, elements: [{ id: 'bad', kind: 'wire', endpoints: ['p-a', 'missing'] }],
    })).toThrow(/不存在的连接点/)
  })

  it('拒绝端子引用不存在的连接点', () => {
    expect(() => createCircuitNetwork({
      ...sampleNetwork(), terminals: [{ id: 'bad', label: 'A', pointId: 'missing' }],
    })).toThrow(/不存在的连接点/)
  })

  it('拒绝空白端子名称，但允许多个端子关联同一连接点', () => {
    expect(() => createCircuitNetwork({
      ...sampleNetwork(), terminals: [{ id: 'bad', label: ' ', pointId: 'p-a' }],
    })).toThrow(/展示名称/)
    expect(createCircuitNetwork({
      ...sampleNetwork(), terminals: [
        { id: 'a', label: 'A', pointId: 'p-a' }, { id: 'b', label: 'B', pointId: 'p-a' },
      ],
    }).terminals).toHaveLength(2)
  })

  it('在网络边界重新验证被断言绕过的阻值', () => {
    expect(() => createCircuitNetwork({
      ...sampleNetwork(), elements: [{
        id: 'invalid', kind: 'resistor', endpoints: ['p-a', 'p-b'],
        resistance: Infinity as ResistanceOhms,
      }],
    })).toThrow(RangeError)
  })

  it('返回深层冻结的副本，外部输入修改不能破坏已验证网络', () => {
    const firstPoint = { id: 'a' }
    const points = [firstPoint, { id: 'b' }]
    const endpoints: [string, string] = ['a', 'b']
    const firstTerminal = { id: 't', label: 'A', pointId: 'a' }
    const terminals = [firstTerminal]
    const input: CircuitNetwork = {
      id: 'snapshot', points, terminals,
      elements: [{ id: 'w', kind: 'wire', endpoints }],
    }
    const network = createCircuitNetwork(input)
    firstPoint.id = 'changed'
    endpoints[0] = 'changed'
    firstTerminal.label = 'changed'
    expect(network.points[0]?.id).toBe('a')
    expect(network.elements[0]?.endpoints).toEqual(['a', 'b'])
    expect(network.terminals[0]?.label).toBe('A')
    expect(Object.isFrozen(network)).toBe(true)
    expect(Object.isFrozen(network.points)).toBe(true)
    expect(Object.isFrozen(network.points[0])).toBe(true)
    expect(Object.isFrozen(network.elements[0])).toBe(true)
    expect(Object.isFrozen(network.elements[0]?.endpoints)).toBe(true)
    expect(Object.isFrozen(network.terminals[0])).toBe(true)
  })
})
