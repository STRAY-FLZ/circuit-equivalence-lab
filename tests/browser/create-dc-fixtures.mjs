// node tests/browser/create-dc-fixtures.mjs — synthetic files only, no browser/server listener.
import { createServer } from 'vite'
import fs from 'node:fs'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { dcFixture, load } = await server.ssrLoadModule('/tests/dc-fixtures.ts')
  const { createProjectDocument, serializeProject } = await server.ssrLoadModule('/src/project-format/index.ts')
  const { createEngineeringProject } = await server.ssrLoadModule('/src/engineering/index.ts')
  const fixtures = {}
  for (const kind of ['vcvs', 'vccs', 'ccvs', 'cccs']) fixtures[kind] = dcFixture(kind === 'vcvs' || kind === 'vccs'
    ? [{ ref: 'V1', kind: 'voltage-source', value: 2, nodes: ['c', 'g'] }, { ref: 'D1', kind, value: kind === 'vcvs' ? 3 : .003, nodes: ['o', 'g', 'c', 'g'] }, { ref: 'R1', kind: 'resistor', value: 1000, nodes: ['o', 'g'] }]
    : [{ ref: 'I1', kind: 'current-source', value: .002, nodes: ['g', 's'] }, { ref: 'V0', kind: 'voltage-source', value: 0, nodes: ['s', 'g'] }, { ref: 'D1', kind, value: kind === 'ccvs' ? 1000 : 3, nodes: ['o', 'g'], control: 'V0' }, { ref: 'R1', kind: 'resistor', value: 1000, nodes: ['o', 'g'] }])
  fixtures.floating = dcFixture([...load(), { ref: 'R2', kind: 'resistor', value: 100, nodes: ['float1', 'float2'] }])
  fixtures.contradiction = dcFixture([...load(), { ref: 'V2', kind: 'voltage-source', value: 9, nodes: ['a', 'g'] }])
  const source = dcFixture(load())
  fixtures.legacy = createEngineeringProject({ ...source, definitions: source.definitions.map(d => d.kind === 'voltage-source' ? { ...d, modelBindings: [] } : d) })
  fixtures['unknown-binding'] = createEngineeringProject({ ...source, definitions: source.definitions.map(d => d.kind === 'voltage-source' ? { ...d, modelBindings: [{ analysisFamily: 'digital', model: { id: 'org.other.digital-source', version: '1' }, portMap: { p: '1', n: '2' } }] } : d) })
  fs.mkdirSync('output/playwright', { recursive: true })
  for (const [name, project] of Object.entries(fixtures)) fs.writeFileSync(`output/playwright/dc-${name}.straylab.json`, await serializeProject(await createProjectDocument(project, { name: 'DC acceptance fixture', version: '2.3.0' })))
  console.log({ syntheticFixtures: Object.keys(fixtures) })
} finally { await server.close() }
