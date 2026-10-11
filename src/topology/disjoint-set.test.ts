// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { DisjointSet } from './disjoint-set'

describe('internal disjoint sets', () => {
  it('initializes every member as a singleton', () => {
    const sets = new DisjointSet(['A', 'B', 'isolated'])
    expect(sets.find('A')).toBe('A')
    expect(sets.find('B')).toBe('B')
    expect(sets.find('isolated')).toBe('isolated')
  })

  it('unions transitively without joining unrelated sets', () => {
    const sets = new DisjointSet(['A', 'B', 'C', 'D'])
    sets.union('B', 'C')
    sets.union('A', 'B')
    expect(sets.find('A')).toBe(sets.find('C'))
    expect(sets.find('D')).not.toBe(sets.find('A'))
  })

  it('accepts redundant, reversed and self unions', () => {
    const sets = new DisjointSet(['A', 'B', 'C'])
    sets.union('A', 'B')
    const root = sets.find('B')
    sets.union('A', 'B')
    sets.union('B', 'A')
    sets.union('A', 'A')
    expect(sets.find('A')).toBe(root)
    expect(sets.find('B')).toBe(root)
    expect(sets.find('C')).toBe('C')
  })

  it('attaches a smaller tree to a larger tree even when arguments are reversed', () => {
    const sets = new DisjointSet(['A', 'B', 'C', 'D'])
    sets.union('B', 'C')
    sets.union('C', 'D')
    const largerRoot = sets.find('D')
    sets.union('A', 'D')
    expect(sets.find('A')).toBe(largerRoot)
    expect(sets.find('B')).toBe(largerRoot)
  })

  it('supports property-like and Unicode string identifiers', () => {
    const sets = new DisjointSet(['__proto__', 'constructor', '节点:一', 'toString'])
    sets.union('__proto__', 'constructor')
    sets.union('节点:一', 'constructor')
    expect(sets.find('节点:一')).toBe(sets.find('__proto__'))
    expect(sets.find('toString')).not.toBe(sets.find('__proto__'))
  })

  it('finds all members correctly after repeated balanced merges and repeated queries', () => {
    const size = 2048
    const ids = Array.from({ length: size }, (_, index) => `p${index}`)
    const sets = new DisjointSet([...ids, 'isolated'])
    for (let stride = 1; stride < size; stride *= 2) {
      for (let index = 0; index < size; index += stride * 2) {
        sets.union(`p${index}`, `p${index + stride}`)
      }
    }
    const root = sets.find('p0')
    for (const id of ids.toReversed()) expect(sets.find(id)).toBe(root)
    for (const id of ids) expect(sets.find(id)).toBe(root)
    expect(sets.find('isolated')).toBe('isolated')
  })

  it('rejects unknown members instead of creating implicit sets', () => {
    expect(() => new DisjointSet([]).find('missing')).toThrow(/missing/)
    const sets = new DisjointSet(['A', 'B'])
    expect(() => sets.union('A', 'missing')).toThrow(RangeError)
    expect(() => sets.union('missing', 'B')).toThrow(/missing/)
    expect(sets.find('A')).not.toBe(sets.find('B'))
  })
})
