// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createEmptyProject, createEngineeringProject, createId, instantiateComponent, reviseProject, validateEngineeringProject, ProjectValidationError } from './index'
import { draft, emptySheet, multiPinDefinition, resistorProject } from '../../tests/v2-fixtures'

describe('V2 project snapshots and component contracts', () => {
  it('creates UUID project/entity identities, deeply frozen independent snapshots', () => {
    const input = draft(resistorProject()), project = createEngineeringProject(input)
    expect(project.id).toMatch(/^[\da-f-]{36}$/)
    expect(project).not.toBe(input)
    expect(Object.isFrozen(project.sheets[0]?.components[0]?.parameters)).toBe(true)
    expect(Object.isFrozen(input)).toBe(false)
    input.title = 'Changed'
    expect(project.title).toBe('Resistor')
    expect(project.sheets[0]?.components[0]?.pins).toHaveLength(2)
  })
  it('allocates distinct identities for two five-pin instances of one pinned definition', () => {
    const def = multiPinDefinition(), a = instantiateComponent(def, 'U1', {}), b = instantiateComponent(def, 'U2', {})
    const p = createEngineeringProject({ ...createEmptyProject(), definitions: [def], sheets: [{ ...emptySheet(), components: [a.component, b.component], anchors: [...a.anchors, ...b.anchors] }] })
    expect(new Set(p.sheets[0]?.components.flatMap(c => c.pins.map(pin => pin.id))).size).toBe(10)
    expect(p.definitions[0]?.resource.version).toBe('1')
  })
  it('represents RLC-ready components without requiring a solver model', () => {
    const base = resistorProject(), sheet = base.sheets[0]!
    const definitions = ['capacitor', 'inductor'].map((kind, i) => ({ ...multiPinDefinition(), kind,
      resource: { id: `fixture.${kind}`, version: '1' }, pins: multiPinDefinition().pins.slice(0, 2),
      parameters: [{ key: 'value', kind: 'quantity' as const, unit: i ? 'H' : 'F', required: true }],
    }))
    const instances = definitions.map((d, i) => instantiateComponent(d, i ? 'L1' : 'C1', { value: { kind: 'quantity', quantity: { value: 1e-6, unit: i ? 'H' : 'F' } } }))
    const p = createEngineeringProject({ ...base, definitions: [...base.definitions, ...definitions], sheets: [{ ...sheet, components: [...sheet.components, ...instances.map(i => i.component)], anchors: [...sheet.anchors, ...instances.flatMap(i => i.anchors)] }] })
    expect(p.sheets[0]?.components).toHaveLength(3)
    expect(p.definitions.map(d => d.kind)).toEqual(['resistor', 'capacitor', 'inductor'])
  })
  it('revises content atomically with fresh revisions and stable identities', () => {
    const original = resistorProject(), updated = reviseProject(original, original.revision, { title: 'Renamed' })
    expect(updated.id).toBe(original.id)
    expect(updated.revision).not.toBe(original.revision)
    expect(updated.sheets).toEqual(original.sheets)
    expect(() => reviseProject(updated, original.revision, { title: 'Stale' })).toThrow(/rebase/)
    expect(original.title).toBe('Resistor')
    expect(() => reviseProject(original, original.revision, { sheets: [{ ...original.sheets[0]!, anchors: [] }] })).toThrow(ProjectValidationError)
  })
  it.each<[string, (p: ReturnType<typeof draft<ReturnType<typeof resistorProject>>>) => void]>([
    ['duplicate project/entity ID', (p: ReturnType<typeof draft<ReturnType<typeof resistorProject>>>) => { p.sheets[0]!.id = p.id }],
    ['missing definition', p => { p.sheets[0]!.components[0]!.definitionId = createId() }],
    ['missing anchor', p => { p.sheets[0]!.components[0]!.pins[0]!.anchorId = createId() }],
    ['unknown pin key', p => { p.sheets[0]!.components[0]!.pins[0]!.definitionPinKey = 'oops' }],
    ['shared pin anchor', p => { const pins = p.sheets[0]!.components[0]!.pins; pins[1]!.anchorId = pins[0]!.anchorId }],
    ['missing instance pin', p => { p.sheets[0]!.components[0]!.pins.pop() }],
    ['missing required parameter', p => { p.sheets[0]!.components[0]!.parameters = {} }],
    ['wrong unit', p => { p.sheets[0]!.components[0]!.parameters.resistance = { kind: 'quantity', quantity: { value: 1, unit: 'V' } } }],
    ['zero resistance', p => { p.sheets[0]!.components[0]!.parameters.resistance = { kind: 'quantity', quantity: { value: 0, unit: 'ohm' } } }],
    ['bad UUID', p => { p.sheets[0]!.id = 'sheet-1' }],
    ['nonfinite metadata', p => { p.extensions['fixture.meta'] = { value: Infinity } }],
  ])('rejects %s with a useful path', (_label, mutate) => {
    const input = draft(resistorProject())
    mutate(input)
    const issues = validateEngineeringProject(input)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.path.length).toBeGreaterThan(0)
    expect(() => createEngineeringProject(input)).toThrow(ProjectValidationError)
  })
  it('rejects cross-sheet anchor references, unknown structural keys, cycles and sparse arrays', () => {
    const p = draft(resistorProject()), other = draft(emptySheet()), anchor = { id: createId() }
    other.anchors.push(anchor); p.sheets.push(other)
    p.sheets[0]!.connections.push({ id: createId(), endpoints: [p.sheets[0]!.anchors[0]!.id, anchor.id] })
    expect(validateEngineeringProject(p)[0]?.code).toBe('reference')
    expect(validateEngineeringProject({ ...createEmptyProject(), extra: 1 })[0]?.code).toBe('unknown-field')
    const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic
    expect(validateEngineeringProject(cyclic)[0]?.code).toBe('cycle')
    expect(validateEngineeringProject({ ...createEmptyProject(), sheets: Array.from({ length: 1 }) })[0]?.code).toBe('json-value')
  })
  it('retains unknown component definitions and namespaced optional metadata without interpreting them', () => {
    const p = createEngineeringProject({ ...createEmptyProject(), extensions: JSON.parse('{"fixture.meta":{"__proto__":{"safe":true},"value":1}}') as unknown })
    const metadata = p.extensions['fixture.meta']
    expect(metadata !== null && typeof metadata === 'object' && Object.hasOwn(metadata, '__proto__')).toBe(true)
    expect(Object.getPrototypeOf({})).toBe(Object.prototype)
  })
  it('validates oriented symbol geometry without treating it as connectivity', () => {
    const p = resistorProject(), s = p.sheets[0]!, component = s.components[0]!, symbolId = createId()
    const symbol = { id: symbolId, resource: { id: 'fixture.resistor-symbol', version: '1' }, pinPositions: { '1': { x: -1, y: 0 }, '2': { x: 1, y: 0 } } }
    const placed = createEngineeringProject({ ...p, symbols: [symbol], sheets: [{ ...s, geometry: {
      placements: [{ componentId: component.id, symbolId, origin: { x: 5, y: 5 }, rotationDegrees: 90, mirrored: true }],
      anchorPositions: { [component.pins[0]!.anchorId]: { x: 5, y: 6 }, [component.pins[1]!.anchorId]: { x: 5, y: 4 } }, connectionRoutes: {},
    } }] })
    const invalid = draft(placed)
    invalid.sheets[0]!.geometry.anchorPositions[component.pins[0]!.anchorId] = { x: 5, y: 9 }
    expect(validateEngineeringProject(invalid)[0]?.code).toBe('pin-position')
  })
  it('preserves typed analysis/result/experiment and future pin-to-pad references', () => {
    const p = resistorProject(), component = p.sheets[0]!.components[0]!, assetId = createId(), analysisId = createId(), boardId = createId(), experimentId = createId()
    const full = createEngineeringProject({ ...p,
      assets: [{ id: assetId, mediaType: 'application/octet-stream', byteLength: 0, sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }],
      analyses: [{ id: analysisId, analysisType: 'resistance-equivalent', scope: { kind: 'circuit', sheetIds: [p.sheets[0]!.id] }, options: { terminalIds: p.sheets[0]!.ports.map(port=>port.id) } }],
      results: [{ id: createId(), analysisId, engine: { id: 'fixture.engine', version: '1' }, inputRevision: p.revision, inputDigest: '0'.repeat(64), outcome: 'inconclusive', artifactAssetIds: [assetId] }],
      boards: [{ id: boardId, title: 'Mapping only', sourceRevision: p.revision, sourceDigest: '0'.repeat(64), assignments: [{ id: createId(), componentId: component.id, footprint: { id: 'fixture.footprint', version: '1' }, footprintAssetId: assetId, pinPadMappings: component.pins.map((pin,i)=>({ instancePinId: pin.id, padKeys: [String(i+1)] })) }], checks: [] }],
      experiments: [{ id: experimentId, title: 'Fixture', analysisIds: [analysisId], datasetIds: [], notes: '' }],
      competitions: [{ id: createId(), title: 'Unverified fixture only', sourceUrls: [], experimentIds: [experimentId] }],
    })
    expect(full.boards[0]?.assignments[0]?.componentId).toBe(component.id)
    const invalid = draft(full)
    invalid.boards[0]!.assignments[0]!.pinPadMappings[0]!.instancePinId = createId()
    expect(validateEngineeringProject(invalid)[0]?.code).toBe('reference')
    expect(() => reviseProject(full,full.revision,{analyses:[]})).toThrow(/analysis/)
  })
})
