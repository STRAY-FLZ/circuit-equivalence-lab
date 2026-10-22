// Verify actual browser downloads: node tests/browser/verify-ac-downloads.mjs ac-local|ac-live
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
const prefix = process.argv[2]
assert(['ac-local', 'ac-live'].includes(prefix))
const file = name => fs.readFileSync(`output/playwright/${prefix}-${name}`, 'utf8')
const report = name => { const r = JSON.parse(file(`${name}-report.json`)); assert.equal(r.outcome.kind, 'success'); assert.match(r.provenance.inputDigest, /^[a-f0-9]{64}$/); return r.outcome.value }
const rc = report('rc-cutoff'), capacitor = rc.operatingPoint.branches.find(b => b.reference === 'C1')
assert(Math.abs(capacitor.voltage.magnitudeRms - Math.SQRT1_2) < 1e-10)
assert(Math.abs(capacitor.voltage.phaseDegrees + 45) < 1e-9)
const edited = report('rc-edited'); assert(Math.abs(edited.sweep.analyticalReference.frequencyHz - 79.5774715459) < 1e-9)
for (const name of ['rc-cutoff', 'rc-edited', 'rc-highpass', 'rl-lowpass', 'series-rlc', 'rlc-bandpass']) {
  const r = report(name), s = r.sweep
  assert(s.points.every(p => p.kind === 'available'))
  for (const p of s.points) {
    const w = 2 * Math.PI * p.frequencyHz
    let real = 0, imaginary = 0
    if (name.includes('rlc')) { const x = (w * .01 - 1 / (w * 1e-6)) / 100; real = 1 / (1 + x * x); imaginary = -x / (1 + x * x) }
    else if (name === 'rc-highpass') { const x = w * .001; real = x * x / (1 + x * x); imaginary = x / (1 + x * x) }
    else { const x = name === 'rl-lowpass' ? w * .01 / 1000 : w * (name === 'rc-edited' ? .002 : .001); real = 1 / (1 + x * x); imaginary = -x / (1 + x * x) }
    assert(Math.hypot(p.transfer.real - real, p.transfer.imaginary - imaginary) < 1e-10, `${name} ${p.frequencyHz}`)
  }
  if (name.includes('rlc')) { assert(Math.abs(s.features.sampledPeak.frequencyHz / 1591.549430919 - 1) < .01); assert(Math.abs(s.features.estimatedBandwidthHz / 1591.549430919 - 1) < .01) }
}
assert.equal(file('rc.straylab.json'), file('rc-reopened.straylab.json'))
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { deserializeProject } = await server.ssrLoadModule('/src/project-format/index.ts')
  const { loadWaveform, filterRcSamples, parseCsv } = await server.ssrLoadModule('/src/signal/index.ts')
  const saved = await deserializeProject(file('signal.straylab.json')), reopened = await deserializeProject(file('signal-reopened.straylab.json'))
  assert.equal(saved.kind, 'ready'); assert.equal(reopened.kind, 'ready')
  assert.equal(saved.document.writer.version, '2.4.0'); assert.equal(saved.document.formatVersion, 1)
  assert.deepEqual(saved.document.inlineAssets, reopened.document.inlineAssets)
  assert.deepEqual(saved.document.project.measurements, reopened.document.project.measurements)
  const derived = saved.document.project.measurements.find(d => d.source.kind === 'derived' && d.source.operation.id === 'org.stray.signal.rc-zoh')
  assert(derived); const waveform = loadWaveform(saved.document, derived.id), input = loadWaveform(saved.document, derived.source.inputDatasetIds[0])
  assert.deepEqual(waveform.channels[0].values, input.channels[0].values)
  const expected = filterRcSamples(input.channels[0].values, input.axis.intervalSeconds, derived.source.options)
  assert.deepEqual(waveform.channels[1].values, expected.values)
  const csv = parseCsv(file('rc-waveform.csv')); assert.equal(csv.rows.length, waveform.axis.count)
  csv.rows.forEach((row, i) => { assert.equal(Number(row.cells[1]), waveform.channels[0].values[i]); assert.equal(Number(row.cells[2]), waveform.channels[1].values[i]) })
  console.log({ prefix, status: 'passed', actualCircuitReports: 6, frequencyPointsAgainstAnalyticFormulas: 1206, rcMagnitude: capacitor.voltage.magnitudeRms, rcPhase: capacitor.voltage.phaseDegrees, rcProjectByteIdentical: true, sampledFilterRecurrenceAndCsvExact: true, originalAssetsPreserved: true, writer: '2.4.0', schema: 1 })
} finally { await server.close() }
