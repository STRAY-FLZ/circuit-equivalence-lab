import type { CircuitNetwork, ConnectionPointId } from '../domain'

export interface Position {
  readonly x: number
  readonly y: number
}

/** 独立视图数据；遗漏坐标意味着尚未布局，不意味着断路。 */
export interface CircuitLayout {
  readonly pointPositions: Readonly<Partial<Record<ConnectionPointId, Position>>>
}

/** 未来 SVG 视图的输入；M0 不实现绘图与编辑器。 */
export interface CircuitViewModel {
  readonly network: CircuitNetwork
  readonly layout: CircuitLayout
}
