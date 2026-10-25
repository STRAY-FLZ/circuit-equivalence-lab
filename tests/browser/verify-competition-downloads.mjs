// Independent integrity/numerical review of actual native browser downloads.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
const prefix = process.argv[2]; assert(['competition-local', 'competition-live'].includes(prefix))
const file = name => fs.readFileSync(`output/playwright/${prefix}-${name}`, 'utf8')
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { deserializeProject, decodeInlineAsset, serializeProject } = await server.ssrLoadModule('/src/project-format/index.ts')
  const { readWorkspace, extractProjectText, evaluateAttempt } = await server.ssrLoadModule('/src/competition/index.ts')
  const { loadWaveform, filterRcSamples } = await server.ssrLoadModule('/src/signal/index.ts')
  const docs = []
  for (const kind of ['ac', 'signal']) {
    const a = await deserializeProject(file(`${kind}-project.straylab.json`)), b = await deserializeProject(file(`${kind}-reopened.straylab.json`)), report = await deserializeProject(extractProjectText(file(`${kind}-report.html`)))
    assert.equal(a.kind, 'ready'); assert.equal(b.kind, 'ready'); assert.equal(report.kind, 'ready')
    assert.equal(a.document.writer.version, '2.5.0'); assert.equal(a.document.formatVersion, 1)
    assert.equal(file(`${kind}-project.straylab.json`), file(`${kind}-reopened.straylab.json`))
    assert.equal(await serializeProject(report.document), file(`${kind}-project.straylab.json`))
    const state = readWorkspace(a.document.project); docs.push(a.document)
    assert(state.requirements.some(r => r.origin === 'published')); assert(state.requirements.some(r => r.origin === 'derived')); assert(state.requirements.some(r => r.origin === 'training'))
    assert(a.document.project.competitions[0].experimentIds.every(id => a.document.project.experiments.some(e => e.id === id)))
  }
  assert.notEqual(docs[0].project.id, docs[1].project.id)
  const ac = docs[0], acState = readWorkspace(ac.project); assert.equal(acState.attempts.length, 2); assert.equal(acState.alternatives.length, 2)
  const points = []
  for (const evidence of acState.evidence) {
    assert.equal(evidence.origin, 'simulation'); const asset = ac.inlineAssets.find(a => a.assetId === evidence.artifactAssetIds[0]), result = JSON.parse(new TextDecoder().decode(decodeInlineAsset(asset)))
    assert.equal(result.outcome.kind, 'success'); assert.equal(result.provenance.inputRevision, evidence.sourceRevision); assert.equal(result.provenance.inputDigest, evidence.inputDigest)
    const actual = result.outcome.value, r = actual.operatingPoint.branches.find(b => b.kind === 'resistor').value
    for (const p of actual.sweep.points) { assert.equal(p.kind, 'available'); const x = 2 * Math.PI * p.frequencyHz * r * 1e-6; assert(Math.hypot(p.transfer.real - 1 / (1 + x * x), p.transfer.imaginary + x / (1 + x * x)) < 1e-10); points.push(p) }
  }
  assert.equal(evaluateAttempt(acState, acState.attempts[0].id).kind, 'indeterminate'); assert.equal(evaluateAttempt(acState, acState.attempts[1].id).kind, 'fail')
  const signal = docs[1], s = readWorkspace(signal.project); assert.equal(s.attempts.length, 4)
  const waves = signal.project.measurements.filter(d => d.kind === 'waveform'); assert.equal(waves.length, 3)
  const generated = waves.find(d => d.source.kind === 'simulated'), imported = waves.find(d => d.source.kind === 'imported'), filtered = waves.find(d => d.source.kind === 'derived')
  const g = loadWaveform(signal, generated.id), input = loadWaveform(signal, imported.id), output = loadWaveform(signal, filtered.id)
  const rms = values => Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length)
  assert(Math.abs(rms(g.channels[0].values) - .1 / Math.sqrt(2)) < 1e-12); assert(Math.abs(rms(input.channels[0].values) - .1 / Math.sqrt(2)) < 1e-12)
  assert.deepEqual(output.channels[0].values, input.channels[0].values)
  assert.deepEqual(output.channels[1].values, filterRcSamples(input.channels[0].values, input.axis.intervalSeconds, filtered.source.options).values)
  const original = signal.inlineAssets.find(a => a.assetId === imported.source.originalAssetId); assert.equal(new TextDecoder().decode(decodeInlineAsset(original)), fs.readFileSync('output/playwright/competition-synthetic.csv', 'utf8'))
  const manual = s.evidence.find(e => e.origin === 'manual'); assert(manual); assert.equal(manual.analysisId, ''); assert.equal(manual.inputDigest, ''); assert.equal(manual.data[0].quantity.unit, 'mV'); assert.equal(manual.data[0].quantity.value, 11)
  assert(s.evidence.some(e => e.acquisition.includes('仪器获取方式未经本应用核实')))
  assert.equal(evaluateAttempt(s, s.attempts.at(-1).id).kind, 'fail'); assert.equal(evaluateAttempt(s, s.attempts.at(-2).id).kind, 'pass')
  console.log({ status: 'passed', prefix, independentProjects: 2, exactJsonAndReportRoundTrips: true, actualAcPointsComparedToAnalytic: points.length, actualWaveformDatasets: waves.length, generatedAndImportedRms: rms(g.channels[0].values), originalCsvAndSamplesPreserved: true, filterRecurrenceExact: true, manualMillivoltConversion: true, sourceProvenanceDistinct: true, version: '2.5.0', schema: 1 })
} finally { await server.close() }
