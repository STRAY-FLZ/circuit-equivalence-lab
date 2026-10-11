import type { CircuitNetwork } from '../domain'
import { analyzeTopology } from '../topology'
import { solveEquivalentResistance } from '../solver'
import type { EquivalentResistanceResult } from '../solver'
import { compareIds } from './context'
import type { EquivalenceOptions, EquivalenceResult, ResistanceSummary, TerminalComparison } from './types'

function summary(result: EquivalentResistanceResult): ResistanceSummary {
  if (result.kind === 'finite') return Object.freeze({ kind: 'finite', resistance: result.resistance })
  return result
}

/** Optional all-pairs numerical evidence, independent of candidate discovery/application. */
export function verifyTerminalEquivalence(
  before: CircuitNetwork, after: CircuitNetwork, options: EquivalenceOptions = {},
): EquivalenceResult {
  const pairs: TerminalComparison[] = []
  const finish = (kind: EquivalenceResult['kind'], reason: string): EquivalenceResult =>
    Object.freeze({ kind, reason, pairs: Object.freeze(pairs) })
  try {
    const relative = options.relativeTolerance ?? 1e-8
    const absolute = options.absoluteToleranceOhms ?? 0
    if (!Number.isFinite(relative) || relative < 0 || relative >= 1 || !Number.isFinite(absolute) || absolute < 0) {
      return finish('inconclusive', 'Tolerances must be finite: 0 <= relative < 1 and absolute >= 0 ohms.')
    }
    const first = analyzeTopology(before)
    const second = analyzeTopology(after)
    const ids = before.terminals.map(t => t.id).sort(compareIds)
    const other = after.terminals.map(t => t.id).sort(compareIds)
    if (JSON.stringify(ids) !== JSON.stringify(other)) return finish('different', 'External terminal ID sets differ.')
    if (ids.length < 2) return finish('inconclusive', 'At least two external terminals are required for a pair comparison.')
    for (let i = 0; i < ids.length; i++) {
      const a = ids[i]
      if (a === undefined) continue
      for (const b of ids.slice(i + 1)) {
        const left = summary(solveEquivalentResistance(first, a, b))
        const right = summary(solveEquivalentResistance(second, a, b))
        let verdict: TerminalComparison['verdict']
        if (left.kind === 'error' || right.kind === 'error') verdict = 'inconclusive'
        else if (left.kind !== right.kind) verdict = 'different'
        else if (left.kind === 'finite' && right.kind === 'finite') {
          const scale = Math.max(left.resistance, right.resistance)
          // Divide first so tolerance multiplication cannot overflow near MAX_VALUE.
          verdict = Math.abs(left.resistance - right.resistance) / scale <= relative + absolute / scale ? 'equivalent' : 'different'
        } else verdict = 'equivalent'
        pairs.push(Object.freeze({ terminals: Object.freeze([a, b] as const), before: left, after: right, verdict }))
      }
    }
    if (pairs.some(pair => pair.verdict === 'different')) return finish('different', 'At least one external-terminal pair differs.')
    if (pairs.some(pair => pair.verdict === 'inconclusive')) return finish('inconclusive', 'At least one M2 query failed; equivalence is not established.')
    return finish('equivalent', 'Every distinct external-terminal pair agrees within the requested tolerances.')
  } catch (error) {
    if (!(error instanceof TypeError) && !(error instanceof RangeError)) throw error
    return finish('inconclusive', `Invalid input: ${error.message}`)
  }
}
