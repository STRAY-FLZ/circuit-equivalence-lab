import { createEmptyProject, createEngineeringProject, createId, createResistorDefinition, instantiateComponent } from '../src/engineering'
import type { ComponentDefinition, EngineeringProject, SchematicSheet } from '../src/engineering'

export type Mutable<T> = T extends object ? string extends keyof T ? { -readonly [K in keyof T]: T[K] } : { -readonly [K in keyof T]: Mutable<T[K]> } : T
export function draft<T>(value: T): Mutable<T> { return structuredClone(value) as Mutable<T> }

export function emptySheet(): SchematicSheet {
  return { id: createId(), title: 'Sheet', components: [], anchors: [], connections: [], labels: [], references: [], ports: [], geometry: { placements: [], anchorPositions: {}, connectionRoutes: {} } }
}
export function resistorProject(): EngineeringProject {
  const definition = createResistorDefinition()
  const instance = instantiateComponent(definition, 'R1', { resistance: { kind: 'quantity', quantity: { value: 100, unit: 'ohm' } } })
  const sheet = emptySheet()
  return createEngineeringProject({ ...createEmptyProject('Resistor'), definitions: [definition], sheets: [{ ...sheet,
    components: [instance.component], anchors: instance.anchors,
    ports: instance.anchors.map((a, i) => ({ id: createId(), label: i ? 'B' : 'A', anchorId: a.id })),
  }] })
}
export function multiPinDefinition(): ComponentDefinition {
  return { id: createId(), resource: { id: 'fixture.opamp', version: '1' }, kind: 'opamp',
    pins: ['IN+', 'IN-', 'OUT', 'V+', 'V-'].map(key => ({ key, name: key, electricalRole: 'unspecified' })),
    parameters: [], modelBindings: [],
  }
}
