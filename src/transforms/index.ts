import type { CircuitNetwork, ElementId } from '../domain'

export interface TransformRequest {
  readonly network: CircuitNetwork
  readonly elementIds: readonly ElementId[]
}

export type TransformResult =
  | { readonly kind: 'applied'; readonly network: CircuitNetwork }
  | { readonly kind: 'not-applicable'; readonly reason: string }

/** 后续各变换分别实现此契约；M0 不提供变换或注册表。 */
export type CircuitTransform = (request: TransformRequest) => TransformResult
