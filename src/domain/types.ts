/** ID 在网络内稳定且唯一，不由数组下标、标签或坐标推导。 */
export type ConnectionPointId = string
export type ElementId = string
export type TerminalId = string

declare const resistanceOhmsBrand: unique symbol

/** 单位 Ω。仅通过 resistanceOhms() 构造有限正阻值。 */
export type ResistanceOhms = number & { readonly [resistanceOhmsBrand]: true }

export interface ConnectionPoint {
  readonly id: ConnectionPointId
}

/** 两个连接点的显式连接；交叉、重叠与位置都不产生电气连接。 */
export type Endpoints = readonly [ConnectionPointId, ConnectionPointId]

export interface IdealWire {
  readonly id: ElementId
  readonly kind: 'wire'
  readonly endpoints: Endpoints
}

export interface Resistor {
  readonly id: ElementId
  readonly kind: 'resistor'
  readonly endpoints: Endpoints
  readonly resistance: ResistanceOhms
}

export type CircuitElement = IdealWire | Resistor

export interface ExternalTerminal {
  readonly id: TerminalId
  /** 展示名称，如 A、B、C；不作为身份标识或求解依据。 */
  readonly label: string
  readonly pointId: ConnectionPointId
}

/** 不包含坐标；允许空网络、孤立连接点、不连通子网与多端子。 */
export interface CircuitNetwork {
  readonly id: string
  readonly points: readonly ConnectionPoint[]
  readonly elements: readonly CircuitElement[]
  readonly terminals: readonly ExternalTerminal[]
}
