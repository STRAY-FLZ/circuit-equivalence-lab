import type { CircuitNetwork } from '../domain'
import { compareIds, invalidInput, pairKey, prepare } from './context'
import type { TransformContext } from './context'
import type { DiscoveryResult, TransformCandidate, TransformOptions, TransformType } from './types'

function candidate(type: TransformType, ids: readonly string[], boundary: readonly string[], center: string | null): TransformCandidate {
  const elementIds = Object.freeze(ids.toSorted(compareIds))
  return Object.freeze({
    id: JSON.stringify([type, elementIds]), type, elementIds,
    boundaryNodeIds: Object.freeze(boundary.toSorted(compareIds)), internalNodeId: center,
  })
}

/** Recompute eligibility from the current graph; never trust a UI's cached candidate. */
export function validateSelection(context: TransformContext, type: TransformType, ids: readonly string[]): TransformCandidate | undefined {
  const selectedIds = new Set(ids)
  if (selectedIds.size !== ids.length) return undefined
  const selected = context.active.filter(branch => selectedIds.has(branch.id))
  if (selected.length !== ids.length) return undefined
  const nodes = [...new Set(selected.flatMap(branch => branch.nodeIds))].sort(compareIds)
  if (type === 'parallel') {
    return selected.length >= 2 && nodes.length === 2 ? candidate(type, ids, nodes, null) : undefined
  }
  if (type === 'delta-to-star') {
    const pairs = new Set(selected.map(branch => pairKey(...branch.nodeIds)))
    return selected.length === 3 && nodes.length === 3 && pairs.size === 3 ? candidate(type, ids, nodes, null) : undefined
  }
  const degree = type === 'series' ? 2 : type === 'star-to-delta' ? 3 : 0
  if (degree === 0 || selected.length !== degree || nodes.length !== degree + 1) return undefined
  const center = nodes.find(id => selected.every(branch => branch.nodeIds.includes(id)))
  if (center === undefined || context.protectedNodes.has(center) || context.incident.get(center)?.length !== degree) return undefined
  return candidate(type, ids, nodes.filter(id => id !== center), center)
}

export function discoverTransformations(network: CircuitNetwork, options: TransformOptions = {}): DiscoveryResult {
  try {
    const context = prepare(network, options)
    const candidates: TransformCandidate[] = []
    const add = (type: TransformType, ids: readonly string[]) => {
      const result = validateSelection(context, type, ids)
      if (result) candidates.push(result)
    }
    for (const branches of context.parallel.values()) {
      if (branches.length >= 2) add('parallel', branches.map(branch => branch.id))
    }
    for (const branches of context.incident.values()) {
      if (branches.length === 2) add('series', branches.map(branch => branch.id))
      if (branches.length === 3) add('star-to-delta', branches.map(branch => branch.id))
    }
    // Enumerate each triangle once (a < b < c), with exact edge choices for multigraphs.
    for (const a of [...context.incident.keys()].sort(compareIds)) {
      const neighbors = [...new Set((context.incident.get(a) ?? []).flatMap(branch => branch.nodeIds))]
        .filter(id => compareIds(id, a) > 0).sort(compareIds)
      for (let i = 0; i < neighbors.length; i++) {
        const b = neighbors[i]
        if (b === undefined) continue
        for (const c of neighbors.slice(i + 1)) {
          for (const ab of context.parallel.get(pairKey(a, b)) ?? []) {
            for (const ac of context.parallel.get(pairKey(a, c)) ?? []) {
              for (const bc of context.parallel.get(pairKey(b, c)) ?? []) add('delta-to-star', [ab.id, ac.id, bc.id])
            }
          }
        }
      }
    }
    const unique = new Map(candidates.map(item => [item.id, item]))
    return Object.freeze({ kind: 'candidates', candidates: Object.freeze([...unique.values()].sort((a, b) => compareIds(a.id, b.id))) })
  } catch (error) { return invalidInput(error) }
}
