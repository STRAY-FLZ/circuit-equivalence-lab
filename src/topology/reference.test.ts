// @vitest-environment node
import { expect, it } from 'vitest'
import { resistanceOhms } from '../domain'
import type { CircuitElement, CircuitNetwork, Endpoints } from '../domain'
import { analyzeTopology } from './index'

function compareIds(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0
}

function sortedGroups(groups: readonly (readonly string[])[]): string[][] {
  return groups.map((group) => group.toSorted(compareIds))
    .sort((first, second) => compareIds(JSON.stringify(first), JSON.stringify(second)))
}

/** Independent graph-traversal oracle: no DSU or production helpers. */
function reachableGroups(ids: readonly string[], edges: readonly Endpoints[]): string[][] {
  const remaining = new Set(ids)
  const groups: string[][] = []
  for (const start of ids) {
    if (!remaining.has(start)) continue
    const queue = [start]
    const group: string[] = []
    for (const current of queue) {
      if (!remaining.delete(current)) continue
      group.push(current)
      for (const [first, second] of edges) {
        if (first === current && remaining.has(second)) queue.push(second)
        if (second === current && remaining.has(first)) queue.push(first)
      }
    }
    groups.push(group)
  }
  return sortedGroups(groups)
}

it('matches independent traversal on 64 reproducible graphs and their reordered inputs', () => {
  let state = 0x41c017
  function next(limit: number): number {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return Math.floor((state / 2 ** 32) * limit)
  }

  for (let sample = 0; sample < 64; sample += 1) {
    const count = 1 + next(8)
    const ids = Array.from({ length: count }, (_, index) => `p${index}`)
    const elements: CircuitElement[] = []
    const edgeCount = next(18)
    for (let index = 0; index < edgeCount; index += 1) {
      const endpoints: Endpoints = [`p${next(count)}`, `p${next(count)}`]
      if (next(4) === 0) elements.push({ id: `w${index}`, kind: 'wire', endpoints })
      else elements.push({ id: `r${index}`, kind: 'resistor', endpoints, resistance: resistanceOhms(index + 1) })
    }
    const input: CircuitNetwork = {
      id: `sample-${sample}`, points: ids.map((id) => ({ id })), elements,
      terminals: ids.map((pointId) => ({ id: `t:${pointId}`, label: pointId, pointId })),
    }
    const result = analyzeTopology(input)
    const expectedNodes = reachableGroups(ids, elements.filter((element) => element.kind === 'wire').map((wire) => wire.endpoints))
    const expectedComponents = reachableGroups(ids, elements.map((element) => element.endpoints))
    expect(sortedGroups(result.nodes.map((node) => node.pointIds)), input.id).toEqual(expectedNodes)

    for (const members of expectedNodes) {
      const canonical = `node:${members[0]}`
      for (const pointId of members) {
        expect(result.pointToNode[pointId], input.id).toBe(canonical)
        expect(result.terminalToNode[`t:${pointId}`], input.id).toBe(canonical)
      }
    }

    const nodeMembers = new Map(result.nodes.map((node) => [node.id, node.pointIds]))
    expect(sortedGroups(result.components.map((component) => component.nodeIds.flatMap((nodeId) => {
      const members = nodeMembers.get(nodeId)
      if (!members) throw new Error(`Unknown normalized node: ${nodeId}`)
      expect(result.nodeToComponent[nodeId]).toBe(component.id)
      return [...members]
    }))), input.id).toEqual(expectedComponents)

    const sourceResistors = elements.filter((element) => element.kind === 'resistor')
    expect(result.resistors.map((resistor) => resistor.id), input.id).toEqual(sourceResistors.map((resistor) => resistor.id).toSorted(compareIds))
    for (const branch of sourceResistors) {
      const firstGroup = expectedNodes.find((members) => members.includes(branch.endpoints[0]))
      const secondGroup = expectedNodes.find((members) => members.includes(branch.endpoints[1]))
      if (!firstGroup || !secondGroup) throw new Error('Incomplete reference partition')
      const normalized = result.resistors.find((resistor) => resistor.id === branch.id)
      expect(normalized, input.id).toEqual({
        id: branch.id, nodeIds: [`node:${firstGroup[0]}`, `node:${secondGroup[0]}`],
        resistance: branch.resistance, isShortCircuited: firstGroup === secondGroup,
      })
      const owners = result.components.filter((component) => component.resistorIds.includes(branch.id))
      expect(owners, input.id).toHaveLength(1)
      expect(owners[0]?.nodeIds, input.id).toContain(`node:${firstGroup[0]}`)
      expect(owners[0]?.nodeIds, input.id).toContain(`node:${secondGroup[0]}`)
    }

    expect(analyzeTopology({
      ...input, points: input.points.toReversed(), elements: elements.toReversed(), terminals: input.terminals.toReversed(),
    }), input.id).toEqual(result)
  }
})
