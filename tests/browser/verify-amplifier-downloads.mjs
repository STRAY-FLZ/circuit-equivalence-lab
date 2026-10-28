// Independent checks on actual browser downloads; no application solver imports.
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
const prefix = process.argv[2] || 'amp-local', files = ['ce-initial', 'ce-changed', 'mos-initial', 'mos-changed'];
let checks = 0, points = 0;
const near = (a, b, name, absolute = 1e-11, relative = 1e-8) => { checks++; assert.ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= absolute + relative * Math.abs(b), `${name}: ${a} vs ${b}`); };
const sub = (a, b) => ({ real: a.real - b.real, imaginary: a.imaginary - b.imaginary }), add = (a, b) => ({ real: a.real + b.real, imaginary: a.imaginary + b.imaginary }), mul = (a, b) => ({ real: a.real * b.real - a.imaginary * b.imaginary, imaginary: a.real * b.imaginary + a.imaginary * b.real }), scalar = (a, n) => ({ real: a.real * n, imaginary: a.imaginary * n }), magnitude = a => Math.hypot(a.real, a.imaginary);
const values = {};
for (const suffix of files) {
  const doc = JSON.parse(readFileSync(`output/playwright/${prefix}-${suffix}.json`, 'utf8')), record = doc.project.extensions['org.stray.amplifier-frequency'], result = record.result, { bias, single } = result, device = bias.device, element = bias.dc.circuit.elements.find(e => e.id === device.componentId);
  assert.equal(doc.formatVersion, 1); assert.equal(doc.writer.version, '3.2.0'); assert.equal(record.version, 1);
  assert.match(record.provenance.inputDigest, /^[a-f0-9]{64}$/); assert.equal(record.provenance.projectId, doc.project.id); assert.notEqual(record.provenance.inputRevision, doc.project.revision);
  assert.deepEqual(record.provenance.options, record.settings); assert.deepEqual(record.configuration.options, record.settings); assert.equal(record.configuration.id, record.provenance.analysisId);
  const sheet = doc.project.sheets.find(s => s.id === record.sheetId), instance = sheet.components.find(c => c.id === device.componentId);
  assert.ok(instance); for (const id of element.pinIds) assert.ok(instance.pins.some(p => p.id === id));
  assert.equal(result.points.length, record.settings.points); assert.ok(bias.dc.maxKclAmps <= 1e-11); assert.ok(bias.dc.maxConstraintVolts <= 1e-9);
  const [v0, v1, v2] = device.terminalVolts, [i0, i1, i2] = device.terminalAmps;
  near(i0 + i1 + i2, 0, 'DC terminal KCL', 1e-13);
  if (device.kind === 'npn') {
    assert.equal(device.region, 'active'); assert.ok(v1 - v2 >= element.parameters.saturationVoltage - 1e-8);
    const vt = 1.380649e-23 * element.parameters.temperature / 1.602176634e-19, exponent = (v0 - v2) / vt;
    near(i0, element.parameters.saturationCurrent * Math.expm1(exponent), 'BJT IB', 1e-13);
    near(i1, element.parameters.beta * i0, 'BJT IC', 1e-13); near(device.gm, element.parameters.beta * element.parameters.saturationCurrent * Math.exp(exponent) / vt, 'BJT gm', 1e-13);
    near(device.rpi, element.parameters.beta / device.gm, 'BJT rpi');
  } else {
    assert.equal(device.kind, 'nmos'); assert.equal(device.region, 'saturation');
    const u = v0 - v2 - element.parameters.threshold; assert.ok(u > 0 && v1 - v2 >= u - 1e-9);
    near(i1, .5 * element.parameters.transconductance * u * u, 'MOS ID', 1e-13); near(device.gm, element.parameters.transconductance * u, 'MOS gm', 1e-13); near(device.gds, 0, 'MOS gds', 0);
  }
  const currents = Object.fromEntries(bias.circuit.nodes.map(n => [n.key, { real: 0, imaginary: 0 }]));
  for (const branch of single.branches) { currents[branch.p] = add(currents[branch.p], branch.current.value); currents[branch.n] = sub(currents[branch.n], branch.current.value); }
  for (const value of Object.values(currents)) near(magnitude(value), 0, 'independent complex KCL', 1e-10, 0);
  for (let i = 0; i < single.equations.matrix.length; i++) {
    const sum = single.equations.matrix[i].reduce((v, entry, j) => add(v, mul(entry, single.equations.solution[j])), { real: 0, imaginary: 0 });
    near(magnitude(sub(sum, single.equations.rhs[i])), 0, 'complex MNA row', single.equations.rows[i].unit === 'A' ? 1e-10 : 1e-9, 0);
  }
  const source = single.branches.find(b => b.id === record.settings.excitationSourceId);
  near(source.voltage.magnitudeRms, record.settings.magnitudeRms, 'only selected AC source', 1e-14);
  for (const b of single.branches.filter(b => ['voltage-source', 'current-source'].includes(b.kind) && b.id !== source.id)) near(b.kind === 'voltage-source' ? b.voltage.magnitudeRms : b.current.magnitudeRms, 0, 'other source AC suppression', 1e-12, 0);
  for (const point of result.points) {
    points++; if (point.kind === 'failed') continue;
    assert.ok(point.maxKclAmps <= 1e-10); assert.ok(point.backwardError <= 1e-9);
    near(magnitude(point.transfer), point.magnitude, 'transfer magnitude', 1e-12);
    if (point.gainDb !== null) near(20 * Math.log10(point.magnitude), point.gainDb, 'gain dB', 1e-9);
    const [a, b, e] = point.terminalVolts, [ia, ib, ie] = point.terminalAmps, control = sub(a, e), sum = add(add(ia, ib), ie);
    near(magnitude(sum), 0, 'incremental device KCL', 1e-14, 0);
    const expectedBase = device.kind === 'npn' ? scalar(control, 1 / device.rpi) : { real: 0, imaginary: 0 }, expectedCollector = scalar(control, device.gm);
    near(magnitude(sub(ia, expectedBase)), 0, 'incremental input current', 1e-14, 0); near(magnitude(sub(ib, expectedCollector)), 0, 'incremental output current', 1e-14, 0);
    if (device.perturbationLimitVolts !== undefined) assert.ok(Math.SQRT2 * magnitude(control) <= device.perturbationLimitVolts * (1 + 1e-10));
    assert.ok(Number.isFinite(b.real) && Number.isFinite(b.imaginary));
  }
  const f = result.features;
  if (f.plateau) {
    const samples = result.points.filter(p => p.kind === 'available' && p.frequencyHz >= f.plateau.fromHz * (1 - 1e-12) && p.frequencyHz <= f.plateau.toHz * (1 + 1e-12));
    assert.equal(samples.length, f.plateau.samples); assert.ok(samples.length >= 5 && f.plateau.toHz / f.plateau.fromHz >= Math.sqrt(10));
    assert.ok(Math.max(...samples.map(p => p.gainDb)) - Math.min(...samples.map(p => p.gainDb)) <= .300000001);
    near(samples.reduce((s, p) => s + p.gainDb, 0) / samples.length, f.plateau.gainDb, 'measured plateau', 1e-9);
    const target = f.plateau.gainDb - 10 * Math.log10(2);
    for (const cutoff of [f.lowerHz, f.upperHz]) if (cutoff !== null) {
      const index = result.points.findIndex(p => p.frequencyHz >= cutoff); assert.ok(index > 0);
      const a = result.points[index - 1], b = result.points[index]; assert.equal(a.kind, 'available'); assert.equal(b.kind, 'available');
      const fraction = record.settings.spacing === 'log' ? Math.log(cutoff / a.frequencyHz) / Math.log(b.frequencyHz / a.frequencyHz) : (cutoff - a.frequencyHz) / (b.frequencyHz - a.frequencyHz);
      near(a.gainDb + fraction * (b.gainDb - a.gainDb), target, 'interpolated cutoff', 1e-8);
    }
    if (f.bandwidthHz !== null) near(f.bandwidthHz, f.upperHz - f.lowerHz, 'bandwidth');
  } else assert.equal(f.bandwidthHz, null);
  const voltage = id => single.nodes.find(n => n.anchorIds.includes(id)).value, vin = sub(voltage(record.settings.input[0]), voltage(record.settings.input[1])), vout = sub(voltage(record.settings.output[0]), voltage(record.settings.output[1]));
  values[suffix] = { projectId: doc.project.id, componentId: device.componentId, dcCurrent: i1, gain: magnitude(vout) / magnitude(vin), high: result.points[178].magnitude, digest: record.provenance.inputDigest };
}
assert.equal(values['ce-initial'].projectId, values['ce-changed'].projectId); assert.equal(values['ce-initial'].componentId, values['ce-changed'].componentId);
assert.notEqual(values['ce-initial'].digest, values['ce-changed'].digest); assert.ok(values['ce-changed'].gain < values['ce-initial'].gain);
assert.equal(values['mos-initial'].projectId, values['mos-changed'].projectId); assert.equal(values['mos-initial'].componentId, values['mos-changed'].componentId);
near(values['mos-initial'].dcCurrent, values['mos-changed'].dcCurrent, 'Cgd does not alter DC', 1e-14); assert.notEqual(values['mos-initial'].high, values['mos-changed'].high);
console.log(JSON.stringify({ status: 'passed', prefix, files: files.length, actualFrequencyPoints: points, independentChecks: checks, values }));
