import { describe, expect, it } from 'vitest'
import { createEngineeringProject, createId, reviseProject } from '../src/engineering'
import { createDcInput, dcEngine } from '../src/dc'
import type { DcSolution } from '../src/dc'
import { applyEdit, emptySheet } from '../src/editing'
import { circuitTemplates, instantiateTemplate } from '../src/atlas'
import { createProjectDocument, deserializeProject, serializeProject } from '../src/project-format'
import { solveLinear } from '../src/dc/linear'
import { dcFixture, load } from './dc-fixtures'
import type { Part } from './dc-fixtures'
import type { EngineeringProject } from '../src/engineering'

const host = () => ({ signal: new AbortController().signal, readAsset: () => Promise.resolve(new Uint8Array()), onProgress: () => {} })
async function run(p: EngineeringProject, ref?: string) { return dcEngine.run(await createDcInput(p, p.sheets[0]!.id, ref), host()) }
async function solve(parts: Part[]): Promise<DcSolution> { const r = await run(dcFixture(parts)); expect(r.outcome.kind).toBe('success'); if (r.outcome.kind !== 'success') throw new Error(JSON.stringify(r.outcome)); return r.outcome.value }
const r = (ref: string, a: string, b: string, value: number): Part => ({ ref, kind: 'resistor', value, nodes: [a, b] })
const branch = (s: DcSolution, ref: string) => s.branches.find(b => b.reference === ref)!
async function code(p: EngineeringProject, expected: string) { const result = await run(p); expect(result.outcome.kind).not.toBe('success'); expect('diagnostics' in result.outcome && result.outcome.diagnostics[0]!.code).toBe(expected) }

describe('independent DC MNA provider', () => {
  it('solves a load with passive sign, exact matrix and stable IDs/provenance', async () => {
    const p = dcFixture(load()), input = await createDcInput(p, p.sheets[0]!.id)
    expect(dcEngine.inspect(input).kind).toBe('supported')
    const result = await dcEngine.run(input, host())
    expect(result.provenance).toMatchObject({ projectId: p.id, inputRevision: p.revision, inputDigest: input.inputDigest })
    if (result.outcome.kind !== 'success') throw new Error(JSON.stringify(result))
    const s = result.outcome.value
    expect(branch(s, 'R1')).toMatchObject({ volts: 10, amps: .01, watts: .1 })
    expect(branch(s, 'V1').amps).toBeCloseTo(-.01, 12)
    expect(s.equations.matrix).toEqual([[.001, 1], [1, 0]])
    expect(s.equations.rhs).toEqual([0, 10]); expect(s.equations.unknowns[1]!.entityIds).toEqual([p.sheets[0]!.components[0]!.id])
    expect(s.checks.powerImbalanceWatts).toBeCloseTo(0, 12)
  })
  it('solves a divider and a parallel load', async () => {
    const s = await solve([load()[0]!, r('R1', 'a', 'b', 1000), r('R2', 'b', 'g', 2000), r('R3', 'b', 'g', 2000)])
    expect(branch(s, 'R2').volts).toBeCloseTo(5); expect(branch(s, 'V1').amps).toBeCloseTo(-.005)
  })
  it('solves a current source using p→n orientation', async () => {
    const s = await solve([{ ref: 'I1', kind: 'current-source', value: .002, nodes: ['g', 'a'] }, r('R1', 'a', 'g', 3000)])
    expect(branch(s, 'R1').volts).toBeCloseTo(6); expect(branch(s, 'I1').watts).toBeCloseTo(-.012)
  })
  it('solves supernodes and multiple independent sources', async () => {
    const s = await solve([{ ref: 'V1', kind: 'voltage-source', value: 5, nodes: ['a', 'b'] }, r('R1', 'a', 'g', 1000), r('R2', 'b', 'g', 1000), { ref: 'I1', kind: 'current-source', value: .001, nodes: ['g', 'a'] }])
    expect(branch(s, 'R1').volts).toBeCloseTo(3); expect(branch(s, 'R2').volts).toBeCloseTo(-2)
  })
  it.each([0, -5])('accepts a %s V ideal source', async value => {
    const parts = load(); parts[0]!.value = value
    expect(branch(await solve(parts), 'R1').amps).toBeCloseTo(value / 1000)
  })
  it('accepts a zero current source and a real open-ended resistive branch', async () => {
    const s = await solve([...load(), { ref: 'I1', kind: 'current-source', value: 0, nodes: ['a', 'g'] }, r('R2', 'a', 'open', 100)])
    expect(branch(s, 'R2').amps).toBeCloseTo(0); expect(branch(s, 'I1').amps).toBe(0)
  })
  it.each(['vcvs', 'vccs'] as const)('stamps %s with distinct control terminals and correct gain units', async kind => {
    const s = await solve([{ ref: 'V1', kind: 'voltage-source', value: 2, nodes: ['c', 'g'] }, { ref: 'D1', kind, value: kind === 'vcvs' ? 3 : .003, nodes: ['o', 'g', 'c', 'g'] }, r('R1', 'o', 'g', 1000)])
    expect(branch(s, 'R1').volts).toBeCloseTo(kind === 'vcvs' ? 6 : -6)
    expect(s.checks.maxKclAmps).toBeLessThan(1e-12)
  })
  it.each(['ccvs', 'cccs'] as const)('stamps %s using a stable zero-volt sensing branch', async kind => {
    const s = await solve([{ ref: 'I1', kind: 'current-source', value: .002, nodes: ['g', 's'] }, { ref: 'V0', kind: 'voltage-source', value: 0, nodes: ['s', 'g'] }, { ref: 'D1', kind, value: kind === 'ccvs' ? 1000 : 3, nodes: ['o', 'g'], control: 'V0' }, r('R1', 'o', 'g', 1000)])
    expect(branch(s, 'V0').amps).toBeCloseTo(.002); expect(branch(s, 'R1').volts).toBeCloseTo(kind === 'ccvs' ? 2 : -6)
  })
  it('rejects missing/non-voltage control references', async () => {
    await code(dcFixture([...load(), { ref: 'F1', kind: 'cccs', value: 2, nodes: ['a', 'g'] }]), 'DC_CONTROL_BRANCH')
    await code(dcFixture([...load(), { ref: 'H1', kind: 'ccvs', value: 2, nodes: ['a', 'g'], control: 'R1' }]), 'DC_CONTROL_BRANCH')
  })
  it('rejects missing and ambiguous references without creating connectivity', async () => {
    await code(dcFixture(load(), 'absent'), 'DC_REFERENCE_MISSING')
    const p = dcFixture(load()), sheet = p.sheets[0]!, a = sheet.ports.find(x => x.label === 'a')!.anchorId
    const ambiguous = createEngineeringProject({ ...p, sheets: [{ ...sheet, references: [...sheet.references, { id: createId(), anchorId: a, domain: 'analog' }] }] })
    await code(ambiguous, 'DC_REFERENCE_AMBIGUOUS')
    expect((await run(ambiguous, a)).outcome.kind).toBe('success')
    expect(ambiguous.sheets[0]!.connections).toEqual(p.sheets[0]!.connections)
  })
  it('supports explicit GND label policy, without confusing it with markers', async () => {
    const p = dcFixture(load()), sheet = p.sheets[0]!
    const labeled = createEngineeringProject({ ...p, sheets: [{ ...sheet, references: [], labels: [{ id: createId(), name: 'GND', scope: 'sheet', anchorId: sheet.references[0]!.anchorId }] }] })
    expect((await run(labeled)).outcome.kind).toBe('success')
  })
  it('diagnoses floating islands, redundant ideal sources, and contradictions distinctly', async () => {
    await code(dcFixture([...load(), r('R2', 'floating1', 'floating2', 100)]), 'DC_UNDERDETERMINED')
    await code(dcFixture([...load(), { ref: 'V2', kind: 'voltage-source', value: 10, nodes: ['a', 'g'] }]), 'DC_UNDERDETERMINED')
    await code(dcFixture([...load(), { ref: 'V2', kind: 'voltage-source', value: 9, nodes: ['a', 'g'] }]), 'DC_INCONSISTENT')
    await code(dcFixture([{ ref: 'V1', kind: 'voltage-source', value: 1, nodes: ['g', 'g'] }]), 'DC_INCONSISTENT')
  })
  it.each(['capacitor', 'inductor'] as const)('does not invent a DC model for %s', async kind => { await code(dcFixture([...load(), { ref: 'X1', kind, value: 1, nodes: ['a', 'g'] }]), 'DC_MODEL_UNSUPPORTED') })
  it('rejects unknown/nonlinear bindings, future versions and wrong units', async () => {
    const p = dcFixture(load()), source = p.definitions.find(d => d.kind === 'voltage-source')!
    for (const id of ['org.example.diode', 'org.stray.model.dc.voltage-source']) {
      const definitions = p.definitions.map(d => d.id === source.id ? { ...d, modelBindings: [{ ...d.modelBindings[0]!, model: { id, version: '99' } }] } : d)
      await code(createEngineeringProject({ ...p, definitions }), 'DC_MODEL_UNSUPPORTED')
    }
    const sheet = p.sheets[0]!, components = sheet.components.map((c, i) => i === 0 ? { ...c, parameters: { voltage: { kind: 'quantity', quantity: { value: 10, unit: 'A' } } } } : c)
    // Project validation rejects unit errors before they can reach a numerical solve.
    expect(() => createEngineeringProject({ ...p, sheets: [{ ...sheet, components }] })).toThrow()
  })
  it('adapts only exact legacy independent-source resources', async () => {
    const p = dcFixture(load()), definitions = p.definitions.map(d => d.kind === 'voltage-source' ? { ...d, modelBindings: [] } : d)
    expect((await run(createEngineeringProject({ ...p, definitions }))).outcome.kind).toBe('success')
    await code(createEngineeringProject({ ...p, definitions: definitions.map(d => d.kind === 'voltage-source' ? { ...d, resource: { id: 'org.other.source', version: '1' } } : d) }), 'DC_MODEL_UNSUPPORTED')
    await code(createEngineeringProject({ ...p, definitions: definitions.map(d => d.kind === 'voltage-source' ? { ...d, modelBindings: [{ analysisFamily: 'digital', model: { id: 'org.other.digital-source', version: '1' }, portMap: { p: '1', n: '2' } }] } : d) }), 'DC_MODEL_UNSUPPORTED')
  })
  it('rejects cross-sheet unions while permitting unrelated independent sheets', async () => {
    const p = dcFixture(load()), a = p.sheets[0]!, b = emptySheet(), anchor = createId()
    expect((await run(createEngineeringProject({ ...p, sheets: [a, b] }))).outcome.kind).toBe('success')
    await code(createEngineeringProject({ ...p, sheets: [{ ...a, labels: [{ id: createId(), name: 'X', scope: 'project', anchorId: a.anchors[0]!.id }] }, { ...b, anchors: [{ id: anchor }], labels: [{ id: createId(), name: 'X', scope: 'project', anchorId: anchor }] }] }), 'DC_CROSS_SHEET')
  })
  it('checks digest tampering, cancellation and new revisions', async () => {
    const p = dcFixture(load()), input = await createDcInput(p, p.sheets[0]!.id)
    const edited = applyEdit(p, p.sheets[0]!.id, { type: 'move', id: p.sheets[0]!.components[0]!.id, position: { x: 500, y: 100 } })
    expect(edited.revision).not.toBe(input.project.revision)
    const bad = await dcEngine.run({ ...input, project: edited }, host())
    expect('diagnostics' in bad.outcome && bad.outcome.diagnostics[0]!.code).toBe('DC_DIGEST')
    const controller = new AbortController(); controller.abort()
    expect((await dcEngine.run(input, { ...host(), signal: controller.signal })).outcome.kind).toBe('cancelled')
    expect(reviseProject(p, p.revision, { title: 'rename' }).id).toBe(p.id)
  })
  it('retains stable control IDs and numerical behavior through schema-1 serialization', async () => {
    const p = dcFixture([...load(), { ref: 'F1', kind: 'cccs', value: 2, nodes: ['o', 'g'], control: 'V1' }, r('R2', 'o', 'g', 1000)])
    const reopened = await deserializeProject(await serializeProject(await createProjectDocument(p, { name: 'STRAY Electronics Lab', version: '2.3.0' })))
    expect(reopened.kind).toBe('ready')
    if (reopened.kind !== 'ready') throw new Error('not ready')
    const result = await run(reopened.document.project)
    expect(result.outcome.kind).toBe('success')
    if (result.outcome.kind === 'success') expect(branch(result.outcome.value, 'R2').volts).toBeCloseTo(20)
  })
  it('solves all sixteen compatible existing Atlas templates and rejects the ten C/L templates', async () => {
    let supported = 0
    for (const template of circuitTemplates) {
      const p = instantiateTemplate(template.id), sheet = p.sheets[0]!, ref = sheet.ports.find(port => ['COM', 'B'].includes(port.label))!.anchorId
      const result = await run(p, ref)
      if (template.recipe.parts.every(part => ['resistor', 'voltage-source', 'current-source'].includes(part.kind))) { expect(result.outcome.kind, template.id).toBe('success'); supported++ }
      else expect(result.outcome.kind, template.id).toBe('unsupported')
    }
    expect(supported).toBe(16)
  })
  it('uses complete column pivoting, reports inconsistency, conditioning and original-unit residuals', () => {
    const result = solveLinear([[0, 2], [3, 0]], [4, 9])
    expect(result.values).toEqual([3, 2]); expect(result.backwardError).toBe(0)
    expect(() => solveLinear([[1, 1], [1, 1 + 1e-11]], [2, 2 + 1e-11])).toThrow('主元差异')
    expect(() => solveLinear([[1, 1], [1, 1]], [2, 3])).toThrow('矛盾')
  })
  it('reversing a source changes signs without changing the stable branch convention', async () => {
    const parts = load(); parts[0]!.nodes = ['g', 'a']
    const s = await solve(parts)
    expect(branch(s, 'R1').volts).toBeCloseTo(-10)
    expect(branch(s, 'R1').amps).toBeCloseTo(-.01)
    expect(branch(s, 'R1').watts).toBeCloseTo(.1)
    expect(branch(s, 'V1').watts).toBeCloseTo(-.1)
  })
  it.each(['vcvs', 'vccs', 'ccvs', 'cccs'] as const)('accepts zero and negative %s gains', async kind => {
    for (const gain of [0, -2]) {
      const s = await solve([{ ref: 'V1', kind: 'voltage-source', value: 2, nodes: ['c', 'g'] }, r('R0', 'c', 'g', 1000), { ref: 'D1', kind, value: gain, nodes: kind === 'vcvs' || kind === 'vccs' ? ['o', 'g', 'c', 'g'] : ['o', 'g'], ...((kind === 'ccvs' || kind === 'cccs') ? { control: 'V1' } : {}) }, r('R1', 'o', 'g', 1000)])
      const expected = kind === 'vcvs' ? gain * 2 : kind === 'vccs' ? -gain * 2000 : kind === 'ccvs' ? gain * -.002 : gain * 2
      expect(branch(s, 'R1').volts).toBeCloseTo(expected)
    }
  })
  it('retains current-control references on renaming and rejects deletion instead of substituting zero', async () => {
    const p = dcFixture([...load(), { ref: 'F1', kind: 'cccs', value: 2, nodes: ['o', 'g'], control: 'V1' }, r('R2', 'o', 'g', 1000)]), sheet = p.sheets[0]!, controller = sheet.components[0]!
    const renamed = applyEdit(p, sheet.id, { type: 'properties', id: controller.id, reference: 'VSENSE', parameters: controller.parameters })
    expect((await run(renamed)).outcome.kind).toBe('success')
    const deleted = applyEdit(renamed, sheet.id, { type: 'delete', selection: { kind: 'component', id: controller.id } })
    await code(deleted, 'DC_CONTROL_BRANCH')
  })
  it('permits controlled-voltage branch currents as current controllers', async () => {
    const s = await solve([{ ref: 'V1', kind: 'voltage-source', value: 2, nodes: ['c', 'g'] }, { ref: 'E1', kind: 'vcvs', value: 3, nodes: ['o', 'g', 'c', 'g'] }, r('R1', 'o', 'g', 1000), { ref: 'H1', kind: 'ccvs', value: 1000, nodes: ['out', 'g'], control: 'E1' }, r('R2', 'out', 'g', 1000)])
    expect(branch(s, 'R2').volts).toBeCloseTo(-6)
  })
  it('reports resource and finite-range failures as numerical/resource outcomes', async () => {
    const large = dcFixture(Array.from({ length: 193 }, (_, i) => r(`R${i + 1}`, `n${i}`, 'g', 1000)))
    await code(large, 'DC_LIMIT')
    const input = await createDcInput(large, large.sheets[0]!.id)
    expect(dcEngine.inspect(input)).toMatchObject({ kind: 'unsupported', diagnostics: [{ code: 'DC_LIMIT' }] })
    const result = await dcEngine.run(input, host()); expect(result.outcome).toMatchObject({ kind: 'failure', category: 'resource' })
    await code(dcFixture([load()[0]!, r('R1', 'a', 'g', 1e-320)]), 'DC_RANGE')
  })
})
