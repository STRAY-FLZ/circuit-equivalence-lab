import type { ComponentDefinition, ComponentInstance, EngineeringProject, Id, ParameterValue } from './types'
import { ProjectValidationError, validateEngineeringProject } from './validation'

export function createId(): Id { return crypto.randomUUID() }

/** Only JSON domain values enter this helper, after validation. */
export function freezeSnapshot<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeSnapshot(child)
    Object.freeze(value)
  }
  return value
}

export function createEngineeringProject(input: unknown): EngineeringProject {
  const issues = validateEngineeringProject(input)
  if (issues.length) throw new ProjectValidationError(issues)
  return freezeSnapshot(structuredClone(input as EngineeringProject))
}

export function createEmptyProject(title = 'Untitled project'): EngineeringProject {
  return createEngineeringProject({
    id: createId(), revision: createId(), title, definitions: [], symbols: [], sheets: [],
    analyses: [], results: [], measurements: [], boards: [], experiments: [], competitions: [],
    assets: [], extensions: {},
  })
}

export type ProjectChanges = Partial<Omit<EngineeringProject, 'id' | 'revision'>>

/** A validated replacement transaction; editing/history UI is intentionally absent. */
export function reviseProject(project: EngineeringProject, expectedRevision: string, changes: ProjectChanges): EngineeringProject {
  if (project.revision !== expectedRevision) throw new ProjectValidationError([{ path: '$.revision', code: 'stale-revision', message: 'Project changed; rebase the edit on the current snapshot.' }])
  if (Object.hasOwn(changes, 'id') || Object.hasOwn(changes, 'revision')) throw new ProjectValidationError([{ path: '$', code: 'identity-edit', message: 'A revision transaction cannot replace project identity or supply its own revision.' }])
  return createEngineeringProject({ ...project, ...changes, id: project.id, revision: createId() })
}

export const RESISTOR_RESOURCE = Object.freeze({ id: 'org.stray.component.resistor', version: '1' })
export const RESISTOR_MODEL = Object.freeze({ id: 'org.stray.model.resistor', version: '1' })

export function createResistorDefinition(): ComponentDefinition {
  return freezeSnapshot({
    id: createId(), resource: { ...RESISTOR_RESOURCE }, kind: 'resistor',
    pins: [{ key: '1', name: '1', electricalRole: 'passive' }, { key: '2', name: '2', electricalRole: 'passive' }],
    parameters: [{ key: 'resistance', kind: 'quantity', unit: 'ohm', required: true }],
    modelBindings: [{ analysisFamily: 'electrical', model: { ...RESISTOR_MODEL }, portMap: { p: '1', n: '2' } }],
  })
}

/** Allocates pins/anchors without inferring any connections or model behavior. */
export function instantiateComponent(definition: ComponentDefinition, reference: string, parameters: Readonly<Record<string, ParameterValue>>): { readonly component: ComponentInstance; readonly anchors: readonly { readonly id: Id }[] } {
  const pins = definition.pins.map(pin => ({ id: createId(), definitionPinKey: pin.key, anchorId: createId() }))
  const component = { id: createId(), reference, definitionId: definition.id, pins, parameters: structuredClone(parameters) }
  // Reuse the actual domain boundary so this public constructor cannot return bad instances.
  const project = createEmptyProject()
  const sheet = { id: createId(), title: '', components: [component], anchors: pins.map(p => ({ id: p.anchorId })), connections: [], labels: [], references: [], ports: [], geometry: { placements: [], anchorPositions: {}, connectionRoutes: {} } }
  const definitionForValidation = { ...definition }
  delete definitionForValidation.defaultSymbolId // Symbol resources are resolved by the owning project.
  createEngineeringProject({ ...project, definitions: [definitionForValidation], sheets: [sheet] })
  return freezeSnapshot({ component, anchors: sheet.anchors })
}
