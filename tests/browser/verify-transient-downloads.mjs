// Independently validate the actual native downloads, not fixture screenshots or a second engine call.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
const prefix = process.argv[2]; assert(['transient-local', 'transient-live'].includes(prefix))
const text = name => fs.readFileSync(`output/playwright/${prefix}-${name}`, 'utf8')
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { deserializeProject, serializeProject } = await server.ssrLoadModule('/src/project-format/index.ts')
  const { readTransientRecord, loadTransientSeries } = await server.ssrLoadModule('/src/transient/index.ts')
  const { extractProjectText, readWorkspace, evaluateAttempt } = await server.ssrLoadModule('/src/competition/index.ts')
  const read = async name => { const r = await deserializeProject(text(name)); assert.equal(r.kind, 'ready', `${name}: ${r.kind}`); assert.equal(r.document.writer.version, '3.0.0'); assert.equal(r.document.formatVersion, 1); return r.document }
  function homogeneous(alpha, omega, y0, d0, t) {
    if (Math.abs(alpha - omega) < 1e-8) return { y: Math.exp(-alpha * t) * (y0 + (d0 + alpha * y0) * t), d: Math.exp(-alpha * t) * (d0 - alpha * (d0 + alpha * y0) * t) }
    if (alpha < omega) { const w = Math.sqrt(omega * omega - alpha * alpha), a = Math.cos(w * t), b = Math.sin(w * t), e = Math.exp(-alpha * t); return { y: e * (y0 * a + (d0 + alpha * y0) / w * b), d: e * (d0 * a - (alpha * d0 + omega * omega * y0) / w * b) } }
    const p = -alpha + Math.sqrt(alpha * alpha - omega * omega), q = -alpha - Math.sqrt(alpha * alpha - omega * omega), a = (d0 - q * y0) / (p - q), b = (p * y0 - d0) / (p - q)
    return { y: a * Math.exp(p * t) + b * Math.exp(q * t), d: p * a * Math.exp(p * t) + q * b * Math.exp(q * t) }
  }
  const names = ['rc-base', 'rc-two-runs', 'rc-complete', 'rc-natural', 'rc-pulse', 'rl-step', 'rl-complete', 'rl-natural', 'series-under', 'series-critical', 'series-over', 'series-natural', 'parallel-under', 'parallel-critical', 'parallel-over']
  const rows = [], documents = new Map(); let kclChecks = 0, scalarChecks = 0
  for (const name of names) {
    const doc = await read(`${name}.straylab.json`); documents.set(name, doc)
    const r = readTransientRecord(doc, doc.project.sheets[0].id), series = loadTransientSeries(doc, r), models = r.circuit.elements
    assert(r && r.provenance.engine.id === 'org.stray.engine.transient-mna'); assert.match(r.provenance.inputDigest, /^[a-f0-9]{64}$/)
    assert(r.checks.maxLocalErrorRatio <= 1 && r.checks.maxKclAmps < 1e-9 && Math.abs(r.checks.energyBalanceErrorJ) < 1e-9)
    const values = (entityId, quantity) => series.find(s => s.entityId === entityId && s.quantity === quantity).values
    for (const datasetId of r.datasetIds) { const d = doc.project.measurements.find(d => d.id === datasetId); assert.equal(d.source.kind, 'simulated'); assert.equal(d.source.inputDigest, r.provenance.inputDigest); assert.equal(d.source.analysisId, r.provenance.analysisId); assert.equal(d.source.projectRevision, r.provenance.inputRevision); assert.equal(d.axis.count, r.axis.count); assert(d.channels.length <= 4); assert.deepEqual(d.metadata.circuit, r.circuit) }
    let initialEnergy = 0
    for (const e of models) if (e.kind === 'capacitor' || e.kind === 'inductor') { const x = r.settings.initialConditions.find(s => s.componentId === e.id).value; initialEnergy += .5 * e.value * x * x; const actual = values(e.id, e.kind === 'capacitor' ? 'branch-voltage' : 'branch-current'); assert(Math.abs(actual[0] - x) < 1e-12); const energy = values(e.id, 'stored-energy'); for (let i = 0; i < actual.length; i++) { assert(Math.abs(energy[i] - .5 * e.value * actual[i] ** 2) < 1e-13); scalarChecks++ } }
    assert(Math.abs(initialEnergy - r.checks.initialEnergyJ) < 1e-13)
    for (let i = 0; i < r.axis.count; i++) for (const n of r.circuit.nodes) { let sum = 0, scale = 0; for (const e of models) { const current = values(e.id, 'branch-current')[i]; if (e.p === n.key) sum += current; if (e.n === n.key) sum -= current; scale += Math.abs(current) } assert(Math.abs(sum) < 1e-11 + 1e-8 * scale); kclChecks++ }
    for (const e of models) if (e.kind === 'resistor') { const u = values(e.id, 'branch-voltage'), current = values(e.id, 'branch-current'); for (let i = 0; i < u.length; i++) { assert(Math.abs(u[i] - e.value * current[i]) < 1e-9); scalarChecks++ } }
    const R = models.find(e => e.kind === 'resistor').value, cap = models.find(e => e.kind === 'capacitor'), ind = models.find(e => e.kind === 'inductor')
    const source = r.settings.sources[0], drive = source ? source.mode === 'constant' ? source.value : source.final : 0
    const initial = id => r.settings.initialConditions.find(s => s.componentId === id).value
    let maxVoltageError = 0, maxCurrentError = 0
    for (let i = 0; i < r.axis.count; i++) {
      const t = i * r.axis.intervalSeconds
      if (name.startsWith('rc-')) {
        const tau = R * cap.value; let expected
        if (name === 'rc-pulse') { const on = source.startSeconds, off = source.endSeconds; expected = t < on ? 0 : t < off ? drive * (1 - Math.exp(-(t - on) / tau)) : drive * (1 - Math.exp(-(off - on) / tau)) * Math.exp(-(t - off) / tau) }
        else expected = drive + (initial(cap.id) - drive) * Math.exp(-t / tau)
        maxVoltageError = Math.max(maxVoltageError, Math.abs(values(cap.id, 'branch-voltage')[i] - expected))
      } else if (name.startsWith('rl-')) {
        const expected = drive / R + (initial(ind.id) - drive / R) * Math.exp(-t * R / ind.value)
        maxCurrentError = Math.max(maxCurrentError, Math.abs(values(ind.id, 'branch-current')[i] - expected))
      } else {
        const parallel = name.startsWith('parallel'), alpha = parallel ? 1 / (2 * R * cap.value) : R / (2 * ind.value), omega = 1 / Math.sqrt(ind.value * cap.value), final = parallel ? 0 : drive
        const derivative = parallel ? -(initial(cap.id) / R + initial(ind.id)) / cap.value : initial(ind.id) / cap.value, h = homogeneous(alpha, omega, initial(cap.id) - final, derivative, t)
        const expected = final + h.y, current = parallel ? -cap.value * h.d - expected / R : cap.value * h.d
        maxVoltageError = Math.max(maxVoltageError, Math.abs(values(cap.id, 'branch-voltage')[i] - expected)); maxCurrentError = Math.max(maxCurrentError, Math.abs(values(ind.id, 'branch-current')[i] - current))
      }
    }
    assert(maxVoltageError < .02, `${name}: voltage error ${maxVoltageError}`); assert(maxCurrentError < .0001, `${name}: current error ${maxCurrentError}`)
    rows.push({ name, samples: r.axis.count, maxVoltageError, maxCurrentError, solves: r.checks.linearSolves }); scalarChecks += r.axis.count
  }
  assert(text('rc-two-runs.straylab.json') === text('rc-reopened.straylab.json'), 'RC exact native round trip')
  const two = documents.get('rc-two-runs'); assert.equal(two.project.results.length, 2)
  assert.equal(readTransientRecord(two, two.project.sheets[0].id).circuit.elements.find(e => e.reference === 'R1').value, 2000)
  const signal = await read('signal-project.straylab.json'), rc = documents.get('rc-base')
  for (const original of rc.project.measurements) assert.deepEqual(signal.project.measurements.find(d => d.id === original.id), original)
  for (const asset of rc.inlineAssets) assert.deepEqual(signal.inlineAssets.find(a => a.assetId === asset.assetId), asset)
  assert(signal.project.measurements.some(d => d.source.kind === 'derived' && d.metadata.simulated === true))
  assert(text('rc-simulated.csv') === text('signal-simulated.csv'), 'CSV exact waveform round trip')
  const csv = text('rc-simulated.csv').trim().split(/\r?\n/); assert.equal(csv.length, 502); assert.equal(csv[0], 'time_s,CH1_V,CH2_A')
  const baseRecord = readTransientRecord(rc, rc.project.sheets[0].id), baseSeries = loadTransientSeries(rc, baseRecord), voltage = baseSeries.find(s => s.name === 'U(C1)').values, current = baseSeries.find(s => s.name === 'I(R1)').values
  for (let i = 0; i < 501; i++) { const row = csv[i + 1].split(',').map(Number); assert.equal(row[0], i * .00001); assert.equal(row[1], voltage[i]); assert.equal(row[2], current[i]) }
  const competition = await read('competition-project.straylab.json'), state = readWorkspace(competition.project), evidence = state.evidence.find(e => e.acquisition.includes('transient-mna'))
  assert(evidence && evidence.datasetIds.length > 0); assert.equal(evaluateAttempt(state, state.attempts.at(-1).id).kind, 'pass')
  const raw = await read('competition-raw-base.straylab.json')
  assert(raw.project.measurements.some(d => d.source.kind === 'simulated' && d.source.engine.id === 'org.stray.signal.generator'))
  for (const asset of raw.inlineAssets) assert.deepEqual(competition.inlineAssets.find(a => a.assetId === asset.assetId), asset)
  const report = await deserializeProject(extractProjectText(text('competition-report.html'))); assert.equal(report.kind, 'ready'); assert(await serializeProject(report.document) === text('competition-project.straylab.json'), 'competition report exact embedded project')
  console.log(JSON.stringify({ status: 'passed', prefix, projects: rows.length, samplesAgainstIndependentAnalytic: rows.reduce((s, r) => s + r.samples, 0), kclChecks, scalarChecks, rows, originalRawBytesPreserved: true, exactProjectCsvReportRoundTrips: true, honestTransientCompetitionEvidence: true, writer: '3.0.0', schema: 1 }, null, 2))
} finally { await server.close() }
