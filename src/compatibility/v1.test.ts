// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { importV1Network, projectToV1 } from './index'
import { circuitExamples } from '../visualization'
import { createCircuitNetwork, resistanceOhms } from '../domain'
import { analyzeTopology } from '../topology'
import { solveEquivalentResistance } from '../solver'
import { discoverTransformations, verifyTerminalEquivalence } from '../transforms'
import { createEmptyProject, createEngineeringProject, createId, instantiateComponent, reviseProject } from '../engineering'
import { createProjectDocument, deserializeProject, serializeProject } from '../project-format'
import { draft, emptySheet, multiPinDefinition, resistorProject } from '../../tests/v2-fixtures'

describe('V2 read-only V1 compatibility', () => {
  it.each(circuitExamples)('preserves $id connectivity, ports, resistance and existing numerical equivalence', example => {
    const sourceText = JSON.stringify(example.network), imported = importV1Network(example.network,example.layout), sheet = imported.sheets[0]!
    const projected = projectToV1(imported,sheet.id)
    expect(projected.kind).toBe('ready')
    if (projected.kind !== 'ready') throw new Error('Expected compatible example')
    const { network, identities } = projected.projection
    expect(network.terminals).toEqual([...example.network.terminals].sort((a,b) => {
      const pa = identities.terminals.find(p => p.v1Id === a.id)!, pb = identities.terminals.find(p => p.v1Id === b.id)!
      return pa.projectId < pb.projectId ? -1 : 1
    }))
    // Point IDs differ at resistor pins; original user terminal identities still resolve.
    const originalTopology = analyzeTopology(example.network), projectedTopology = analyzeTopology(network)
    for (let i = 0; i < example.network.terminals.length; i++) for (let j = i + 1; j < example.network.terminals.length; j++) {
      const a = example.network.terminals[i]!.id, b = example.network.terminals[j]!.id
      const before = solveEquivalentResistance(originalTopology,a,b), after = solveEquivalentResistance(projectedTopology,a,b)
      expect(after.kind).toBe(before.kind)
      if (before.kind === 'finite' && after.kind === 'finite') expect(after.resistance).toBeCloseTo(before.resistance,8)
    }
    expect(verifyTerminalEquivalence(example.network,network).kind).toBe('equivalent')
    expect(identities.elements.filter(pair => example.network.elements.some(e => e.id === pair.v1Id))).toHaveLength(example.network.elements.length)
    expect(new Set(sheet.components.flatMap(c => c.pins.map(p => p.anchorId))).size).toBe(sheet.components.length * 2)
    expect(JSON.stringify(example.network)).toBe(sourceText)
  })
  it('handles overlapping V1 namespaces, self-loop resistors, duplicate labels and isolated points', () => {
    const source = createCircuitNetwork({ id: 'x', points: [{ id: 'x' },{ id: '__proto__' },{ id: 'isolated' }],
      elements: [{ id: 'x', kind: 'resistor', endpoints: ['x','x'], resistance: resistanceOhms(10) }, { id: 'constructor', kind: 'wire', endpoints: ['x','__proto__'] }],
      terminals: [{ id: 'x', label: 'Same', pointId: 'x' },{ id: '__proto__', label: 'Same', pointId: '__proto__' }],
    })
    const imported = importV1Network(source), projection = projectToV1(imported,imported.sheets[0]!.id)
    expect(projection.kind).toBe('ready')
    if (projection.kind !== 'ready') throw new Error('Expected ready')
    expect(projection.projection.network.elements.find(e => e.kind === 'resistor')?.endpoints[0]).not.toBe(projection.projection.network.elements.find(e => e.kind === 'resistor')?.endpoints[1])
    expect(verifyTerminalEquivalence(source,projection.projection.network).kind).toBe('equivalent')
    const json = imported.extensions['org.stray.v1']
    expect(json).toMatchObject({ sourceNetwork: source })
  })
  it('represents an empty V1 network without inventing terminals or successful evidence', () => {
    const p = importV1Network(createCircuitNetwork({ id: 'empty', points: [],elements: [],terminals: [] })), result = projectToV1(p,p.sheets[0]!.id)
    expect(result.kind === 'ready' && result.projection.network.elements).toEqual([])
    if (result.kind !== 'ready') throw new Error('Expected ready')
    expect(verifyTerminalEquivalence(result.projection.network,result.projection.network).kind).toBe('inconclusive')
  })
  it('rejects unsupported components, even disconnected, without truncating a resistor scope', () => {
    const p = resistorProject(), def = multiPinDefinition(), instance = instantiateComponent(def,'U1',{}), s = p.sheets[0]!
    const mixed = createEngineeringProject({ ...p, definitions: [...p.definitions,def], sheets: [{ ...s, components: [...s.components,instance.component], anchors: [...s.anchors,...instance.anchors] }] })
    expect(projectToV1(mixed,s.id)).toMatchObject({ kind: 'unsupported', reasons: [{ code: 'unsupported-component-model', entityIds: [instance.component.id] }] })
    expect(mixed.sheets[0]?.components).toHaveLength(2)
  })
  it('requires a recognized pinned model, not a resistor display kind alone', () => {
    const p = resistorProject(), bad = createEngineeringProject({ ...p, definitions: p.definitions.map(d => ({ ...d, modelBindings: [] })) })
    expect(projectToV1(bad,p.sheets[0]!.id).kind).toBe('unsupported')
  })
  it('rejects label connectivity escaping a sheet but permits an electrically independent sheet', () => {
    const p = draft(resistorProject()), other = draft(emptySheet()), anchor = createId()
    other.anchors.push({ id: anchor }); p.sheets.push(other)
    expect(projectToV1(createEngineeringProject(p),p.sheets[0]!.id).kind).toBe('ready')
    for (const s of p.sheets) s.labels.push({ id: createId(), anchorId: s.anchors[0]!.id, name: 'GND', scope: 'project' })
    expect(projectToV1(createEngineeringProject(p),p.sheets[0]!.id)).toMatchObject({ kind: 'unsupported', reasons: [{ code: 'cross-sheet-connectivity' }] })
  })
  it('projects explicit label joins as synthetic wires without joining reference markers', () => {
    const s = draft(emptySheet()), ids = Array.from({ length: 4 },()=>createId())
    s.anchors = ids.map(id=>({id}))
    s.labels = ids.slice(0,2).map(anchorId=>({ id: createId(), anchorId, name: 'GND', scope: 'sheet' }))
    s.references = ids.slice(2).map(anchorId=>({ id: createId(), anchorId, domain: 'analog' }))
    const p = createEngineeringProject({ ...createEmptyProject(), sheets: [s] }), result = projectToV1(p,s.id)
    if (result.kind !== 'ready') throw new Error('Expected ready')
    const { network, identities } = result.projection
    expect(identities.syntheticWireIds).toHaveLength(1)
    expect(analyzeTopology(network).nodes).toHaveLength(3)
    expect(identities.syntheticTerminalIds).toHaveLength(2)
    expect(p.sheets[0]?.connections).toHaveLength(0)
  })
  it('preserves protected observed centers through the existing V1 discovery policy', () => {
    const example = circuitExamples.find(e=>e.id==='series')!, p = importV1Network(example.network), s = p.sheets[0]!
    const ext = p.extensions['org.stray.v1'] as { readonly points: readonly { readonly v1Id: string; readonly projectId: string }[] }
    const center = ext.points.find(pair=>pair.v1Id==='N')!.projectId
    const observed = reviseProject(p,p.revision,{ sheets: [{ ...s, references: [{ id: createId(),anchorId: center,domain:'analog' }] }] })
    const result = projectToV1(observed,s.id)
    if (result.kind !== 'ready') throw new Error('Expected ready')
    const projected = result.projection
    expect(projected.identities.syntheticTerminalIds).toHaveLength(1)
    const discovery = discoverTransformations(projected.network,{ protectedPointIds: projected.protectedPointIds })
    expect(discovery).toMatchObject({ kind: 'candidates', candidates: [] })
    expect(observed.sheets[0]?.components).toHaveLength(2)
  })
  it('preserves analysis observations and rejects unknown observation contracts explicitly', () => {
    const p = resistorProject(), s = p.sheets[0]!, analysis = { id: createId(), analysisType:'resistance-equivalent', scope:{ kind:'circuit',sheetIds:[s.id] }, options:{ terminalIds:s.ports.map(port=>port.id), referenceAnchorId:s.anchors[0]!.id } }
    const observed = createEngineeringProject({...p,analyses:[analysis]})
    expect(projectToV1(observed,s.id).kind).toBe('ready')
    const unknown = createEngineeringProject({...p,analyses:[{...analysis,analysisType:'future-unknown'}]})
    expect(projectToV1(unknown,s.id)).toMatchObject({kind:'unsupported',reasons:[{code:'unsupported-analysis-observations'}]})
    const outside = { ...emptySheet(), anchors: [{ id: createId() }] }
    const escaped = createEngineeringProject({ ...p, sheets: [s,outside], analyses: [{ ...analysis, options: { referenceAnchorId: outside.anchors[0]!.id } }] })
    expect(projectToV1(escaped,s.id)).toMatchObject({kind:'invalid'})
  })
  it('uses current edited parameters and survives portable project export/reopen', async () => {
    const source = circuitExamples.find(e=>e.id==='series')!, imported = importV1Network(source.network), sheet=imported.sheets[0]!
    const modified = reviseProject(imported,imported.revision,{sheets:[{...sheet,components:sheet.components.map((c,i)=>i===0?{...c,parameters:{resistance:{kind:'quantity',quantity:{value:500,unit:'ohm'}}}}:c)}]})
    const text = await serializeProject(await createProjectDocument(modified,{name:'STRAY Electronics Lab',version:'0.1.0'})), result=await deserializeProject(text)
    if(result.kind!=='ready')throw new Error('Expected portable project')
    const projection=projectToV1(result.document.project,sheet.id)
    if(projection.kind!=='ready')throw new Error('Expected compatible project')
    expect(projection.projection.network.elements.find(e=>e.id==='R1'&&e.kind==='resistor')).toMatchObject({resistance:500})
    expect(verifyTerminalEquivalence(source.network,projection.projection.network).kind).toBe('different')
    expect(source.network.elements.find(e=>e.id==='R1')).toMatchObject({resistance:100})
  })
  it('reports invalid scope/boundary/project without partial output or mutation', () => {
    const p=resistorProject(), before=JSON.stringify(p)
    expect(projectToV1(p,createId()).kind).toBe('invalid')
    expect(projectToV1(p,p.sheets[0]!.id,[createId()]).kind).toBe('invalid')
    expect(projectToV1({...p,sheets:[{...p.sheets[0]!,anchors:[]}]},p.sheets[0]!.id).kind).toBe('invalid')
    expect(JSON.stringify(p)).toBe(before)
  })
})
