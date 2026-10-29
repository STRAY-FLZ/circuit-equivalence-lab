import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { strict as assert } from 'node:assert'

const prefix = process.argv[2]
if (!['capstone-local', 'capstone-live'].includes(prefix)) throw Error('Select capstone-local or capstone-live')
let checks = 0, scenarios = 0, frequencySamples = 0, timeSamples = 0, failed = 0, partial = 0, failedCaptures = 0
const close = (actual, expected, tolerance, label) => { assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`); checks++ }
function complex(actual, re, im, label) { close(actual.real, re, 2e-8 * Math.max(1, Math.hypot(re, im)), label + ' real'); close(actual.imaginary, im, 2e-8 * Math.max(1, Math.hypot(re, im)), label + ' imaginary') }
const metric = (s, label) => s.metrics.find(m => m.label === label)?.value
const component = (p, ref) => p.sheets[0].components.find(c => c.reference === ref)
const value = (p, ref, key) => component(p, ref).parameters[key].quantity.value
for (const suffix of ['rc', 'rlc', 'ce', 'cs-invalid', 'follower', 'opamp-rc', 'competition']) {
  const doc = JSON.parse(readFileSync(`output/playwright/${prefix}-${suffix}.json`, 'utf8'))
  assert.equal(doc.formatVersion, 1); assert.equal(doc.writer.version, '3.4.0')
  for (const entry of doc.project.assets) { const raw = doc.inlineAssets.find(a => a.assetId === entry.id), bytes = Buffer.from(raw.data, 'base64'); assert.equal(bytes.byteLength, entry.byteLength); assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256); checks += 2 }
  const record = doc.project.extensions['org.stray.capstone'], raw = doc.inlineAssets.find(a => a.assetId === record.assetId), study = JSON.parse(Buffer.from(raw.data, 'base64').toString('utf8')), ids = new Set(), revisions = new Set()
  assert.equal(study.source.id, doc.project.id)
  for (const s of study.scenarios) {
    scenarios++; assert.ok(!ids.has(s.id)); ids.add(s.id); assert.equal(s.project.id, study.source.id)
    assert.ok(!revisions.has(s.project.revision)); revisions.add(s.project.revision)
    const successes = s.captures.filter(c => c.result.outcome.kind === 'success').length
    if (s.status === 'partial') { partial++; assert.ok(successes > 0 && successes < s.captures.length); assert.equal(study.kind, 'rlc'); assert.ok(s.curves.every(c => c.xUnit === 's')); assert.ok(!s.metrics.some(m => m.label.includes('采样半功率') || m.label.includes('采样最大值'))) }
    else if (s.status !== 'success') { failed++; assert.equal(successes, 0); assert.equal(s.curves.length, 0); assert.ok(s.messages.length > 0) }
    else assert.equal(successes, s.captures.length)
    for (const capture of s.captures) {
      assert.equal(capture.input.project.revision, s.project.revision); assert.equal(capture.result.provenance.inputDigest, capture.input.inputDigest); assert.match(capture.input.inputDigest, /^[a-f0-9]{64}$/)
      const outcome = capture.result.outcome
      if (outcome.kind !== 'success') {
        failedCaptures++; assert.ok(outcome.diagnostics.length > 0); assert.equal(outcome.value, undefined)
        if (study.kind === 'cs') { assert.equal(outcome.kind, 'unsupported'); assert.ok(outcome.diagnostics.some(d => d.code === 'AMP_BIAS_REGION')); assert.equal(value(s.project, 'V2', 'voltage'), 0) }
        else { assert.equal(study.kind, 'rlc'); assert.equal(value(s.project, 'R1', 'resistance'), 400); assert.equal(capture.input.configuration.analysisType, 'ac.sweep'); assert.equal(outcome.kind, 'failure'); assert.ok(outcome.diagnostics.some(d => d.code === 'AC_RESIDUAL')); assert.ok(!s.curves.some(c => c.xUnit === 'Hz')) }
        continue
      }
      const result = outcome.value
      if (capture.input.configuration.analysisType === 'transient.linear') {
        const p = s.project, r = value(p, 'R1', 'resistance'), cap = result.circuit.elements.find(e => e.kind === 'capacitor'), c = cap.value, voltage = result.series.find(a => a.entityId === cap.id && a.quantity === 'branch-voltage'), drive = result.settings.sources[0].final
        for (let i = 0; i < voltage.values.length; i++) {
          const t = i * result.axis.intervalSeconds; let expected
          if (study.kind === 'rc') expected = drive * (1 - Math.exp(-t / (r * c)))
          else { const l = value(p, 'L1', 'inductance'), alpha = r / (2 * l), w0 = 1 / Math.sqrt(l * c); if (Math.abs(alpha - w0) < 1e-8) expected = drive * (1 - Math.exp(-alpha * t) * (1 + alpha * t)); else { const wd = Math.sqrt(w0 * w0 - alpha * alpha); expected = drive * (1 - Math.exp(-alpha * t) * (Math.cos(wd * t) + alpha / wd * Math.sin(wd * t))) } }
          close(voltage.values[i], expected, study.kind === 'rc' ? .015 : .12, `${suffix} transient@${t}`); timeSamples++
        }
        if (study.kind === 'rc') close(metric(s, 'τ 解析参考'), r * c, 1e-12, 'RC tau')
      }
      if (result.sweep) for (const p of result.sweep.points) {
        assert.equal(p.kind, 'available'); const r = value(s.project, 'R1', 'resistance'), c = value(s.project, 'C1', 'capacitance'), w = 2 * Math.PI * p.frequencyHz
        if (study.kind === 'rc') { const x = w * r * c; complex(p.transfer, 1 / (1 + x * x), -x / (1 + x * x), 'RC AC') }
        else { const l = value(s.project, 'L1', 'inductance'), x = w * l - 1 / (w * c), d = r * r + x * x; complex(p.transfer, r * r / d, -r * x / d, 'RLC resistor transfer') }
        frequencySamples++
      }
      if (result.bias) {
        const d = result.bias.device, transistor = s.project.sheets[0].components.find(c => c.id === d.componentId), params = transistor.parameters
        close(d.terminalAmps.reduce((a, b) => a + b, 0), 0, 1e-10, 'device terminal KCL')
        if (study.kind === 'ce') { const vt = 1.380649e-23 * params.temperature.quantity.value / 1.602176634e-19, gm = params.beta.quantity.value * params.saturationCurrent.quantity.value * Math.exp((d.terminalVolts[0] - d.terminalVolts[2]) / vt) / vt; close(d.gm, gm, 1e-8, 'NPN exact derivative'); assert.equal(d.region, 'active') }
        else { close(d.gm, params.transconductance.quantity.value * (d.terminalVolts[0] - d.terminalVolts[2] - params.threshold.quantity.value), 1e-10, 'MOS derivative'); assert.equal(d.region, 'saturation') }
        for (const p of result.points) if (p.kind === 'available') { assert.ok(p.maxKclAmps < 1e-9); frequencySamples++; checks++ }
      }
      if (result.prepared) {
        const a = result.prepared.model.gain, fp = result.prepared.model.poleHz
        for (const p of result.points) {
          assert.equal(p.kind, 'available'); const x = p.frequencyHz / fp
          if (study.kind === 'follower') { const d = (a + 1) ** 2 + x * x; complex(p.transfer, a * (a + 1) / d, -a * x / d, 'finite follower') }
          else { const ri = value(s.project, 'RI', 'resistance'), rf = value(s.project, 'RF', 'resistance'), c = value(s.project, 'CF', 'capacitance'), ratio = rf / ri, t = 2 * Math.PI * p.frequencyHz * rf * c, re = a + ratio + 1 - x * t, im = (ratio + 1) * x + (a + 1) * t, d = re * re + im * im; complex(p.transfer, -ratio * a * re / d, ratio * a * im / d, 'active lowpass') }
          frequencySamples++
        }
        if (study.kind === 'active-lowpass') assert.equal(result.phaseMarginDegrees, null)
      }
    }
  }
}
const html = readFileSync(`output/playwright/${prefix}-report.html`, 'utf8'), embedded = JSON.parse(/<script type="application\/json" id="stray-project">([\s\S]*?)<\/script>/.exec(html)[1])
assert.deepEqual(embedded, JSON.parse(readFileSync(`output/playwright/${prefix}-rc.json`, 'utf8'))); assert.ok(html.includes('<svg') && html.includes('用户填写的结论'))
assert.equal(failed, 1); assert.ok(partial <= 1); assert.equal(failedCaptures, failed + partial); assert.equal(timeSamples, 3105); assert.equal(frequencySamples, 2412 - partial * 201)
console.log(JSON.stringify({ status: 'passed', prefix, files: 8, scenarios, frequencySamples, timeSamples, failedScenarios: failed, partialScenarios: partial, failedCaptures, independentChecks: checks }))
