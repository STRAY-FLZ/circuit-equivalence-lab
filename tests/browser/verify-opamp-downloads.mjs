import { readFileSync } from 'node:fs'
import { strict as assert } from 'node:assert'

// Independent scalar closed forms for three actual downloaded UI projects.
const prefix = process.argv[2]
if (!['opamp-local', 'opamp-live'].includes(prefix)) throw new Error('Select opamp-local or opamp-live')
const c = (re, im = 0) => ({ re, im })
const mul = (a, b) => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re)
const div = (a, b) => { const d = b.re ** 2 + b.im ** 2; return c((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d) }
const add = (a, b) => c(a.re + b.re, a.im + b.im)
let checks = 0, points = 0
function close(actual, expected, label) {
  assert.ok(Number.isFinite(actual.real) && Number.isFinite(actual.imaginary), `${label}: nonfinite`)
  const error = Math.hypot(actual.real - expected.re, actual.imaginary - expected.im)
  assert.ok(error <= 2e-8 * Math.max(1, Math.hypot(expected.re, expected.im)), `${label}: ${error}`); checks++
}
for (const suffix of ['follower', 'inverting-edited', 'active-lowpass']) {
  const doc = JSON.parse(readFileSync(`output/playwright/${prefix}-${suffix}.json`, 'utf8')), record = doc.project.extensions['org.stray.opamp-frequency'], result = record.result
  assert.equal(doc.formatVersion, 1); assert.equal(doc.writer.version, '3.3.0'); assert.match(record.provenance.inputDigest, /^[a-f0-9]{64}$/)
  assert.equal(result.points.length, 201); assert.equal(result.loop.length, 201); assert.equal(result.openLoop.length, 201)
  const model = result.prepared.model, gain = model.gain, pole = model.poleHz
  assert.equal(gain, 100000); assert.equal(pole, 10)
  const amp = doc.project.sheets[0].components.find(x => x.id === model.id)
  assert.equal(amp.parameters.openLoopGain.quantity.value, gain); assert.equal(amp.parameters.poleHz.quantity.value, pole)
  assert.ok(result.prepared.dc.checks.maxKclAmps < 1e-9); assert.ok(result.single.checks.maxKclAmps < 1e-9); checks += 8
  for (let i = 0; i < 201; i++) {
    const p = result.points[i], l = result.loop[i], o = result.openLoop[i], f = p.frequencyHz, x = f / pole
    assert.equal(p.kind, 'available'); assert.equal(l.kind, 'available'); assert.equal(o.kind, 'available')
    assert.equal(l.frequencyHz, f); assert.equal(o.frequencyHz, f)
    const a = div(c(gain), c(1, x)); let h, beta
    if (suffix === 'follower') { beta = c(1); h = div(c(gain), c(gain + 1, x)) }
    else if (suffix === 'inverting-edited') { beta = c(1 / 21); h = div(c(-20 * gain), c(gain + 21, 21 * x)) }
    else {
      const t = 2 * Math.PI * f * 100000 * 1e-9
      beta = div(c(1, t), c(11, t))
      h = div(c(-10 * gain), add(c(10, 10 * x), mul(c(gain + 1, x), c(1, t))))
    }
    close(p.transfer, h, `${suffix} H@${f}`); close(l.transfer, mul(a, beta), `${suffix} L@${f}`); close(o.transfer, a, `${suffix} A@${f}`); points++
  }
  if (suffix === 'active-lowpass') { assert.equal(result.crossoverHz, null); assert.equal(result.phaseMarginDegrees, null); checks += 2 }
}
console.log(JSON.stringify({ status: 'passed', prefix, projects: 3, points, checks }))
