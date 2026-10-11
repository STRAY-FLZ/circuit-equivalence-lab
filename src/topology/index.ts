import type { CircuitNetwork, ConnectionPointId } from '../domain'

/** 电气节点与几何连接点不同：未来由理想导线的连通关系确定。 */
export interface ElectricalNode {
  readonly id: string
  readonly pointIds: readonly ConnectionPointId[]
}

export interface TopologyResult {
  readonly networkId: CircuitNetwork['id']
  readonly nodes: readonly ElectricalNode[]
}

/** M1 契约；M0 不提供实现。 */
export type TopologyAnalyzer = (network: CircuitNetwork) => TopologyResult
