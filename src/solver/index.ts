import type { CircuitNetwork, ResistanceOhms, TerminalId } from '../domain'

export interface ResistanceQuery {
  readonly network: CircuitNetwork
  readonly terminals: readonly [TerminalId, TerminalId]
}

/** 短路和开路用独立状态表达，不把 0 或 Infinity 伪装为正电阻。 */
export type EquivalentResistanceResult =
  | { readonly kind: 'finite'; readonly resistance: ResistanceOhms }
  | { readonly kind: 'short-circuit' }
  | { readonly kind: 'open-circuit' }
  | { readonly kind: 'error'; readonly message: string }

/** M2 契约；M0 不提供实现。 */
export type ResistanceSolver = (query: ResistanceQuery) => EquivalentResistanceResult
