// Independent electrical checks of ACTUAL downloaded files; no application solver imports.
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
const prefix = process.argv[2] || 'analog-local';
let checks = 0, points = 0;
const near = (a, b, label, absolute = 2e-10) => { checks++; assert.ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= absolute + 2e-8 * Math.abs(b), `${label}: ${a} vs ${b}`); };
for (const suffix of ['diode', 'analog-diode-halfwave', 'analog-diode-limiter', 'npn-saturation', 'opamp-inverting']) {
  const path = `output/playwright/${prefix}-${suffix}.json`, doc = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(doc.formatVersion, 1); assert.equal(doc.writer.version, '3.1.0');
  const record = doc.project.extensions['org.stray.analog']; assert.equal(record.version, 1); assert.match(record.provenance.inputDigest, /^[a-f0-9]{64}$/);
  assert.equal(record.provenance.projectId, doc.project.id); assert.notEqual(record.provenance.inputRevision, doc.project.revision);
  const circuit = record.result.circuit, sheet = doc.project.sheets.find(s => s.id === record.sheetId);
  for (const e of circuit.elements) { const original = sheet.components.find(c => c.id === e.id); assert.ok(original); for (const id of e.pinIds) assert.ok(original.pins.some(p => p.id === id)); }
  const inspect = (devices, override) => {
    points++; const kcl = Object.fromEntries(circuit.nodes.map(n => [n.key, 0]));
    for (const e of circuit.elements) {
      const d = devices.find(d => d.componentId === e.id), p = e.parameters, [a, b, c] = d.terminalVolts, [ia, ib, ic] = d.terminalAmps;
      d.terminalAmps.forEach((i, index) => { assert.ok(Number.isFinite(i)); kcl[e.nodes[index]] += i; });
      if (e.kind !== 'ideal-opamp') near(d.terminalAmps.reduce((a, b) => a + b, 0), 0, `${e.reference} terminal KCL`, 1e-13);
      if (e.kind === 'resistor') near(ia, (a - b) / p.resistance, 'Ohm');
      if (e.kind === 'voltage-source') near(a - b, e.id === record.settings.sourceId && override !== undefined ? override : p.voltage, 'V constraint');
      if (e.kind === 'diode') { const vt = 1.380649e-23 * p.temperature / 1.602176634e-19; near(ia, p.saturationCurrent * Math.expm1((a - b) / (p.ideality * vt)), 'Shockley', 1e-12); assert.ok(a - b >= -p.reverseLimit - 1e-9); }
      if (e.kind === 'npn') {
        near(ia, Math.max(0, p.saturationCurrent * Math.expm1((a - c) / (1.380649e-23 * p.temperature / 1.602176634e-19))), 'NPN IB', 1e-12); near(ic, -ia - ib, 'NPN IE');
        if (d.region === 'active') { near(ib, p.beta * ia, 'active IC'); assert.ok(b - c >= p.saturationVoltage - 1e-8); }
        if (d.region === 'saturation') { near(b - c, p.saturationVoltage, 'saturated VCE'); assert.ok(ib >= -1e-11 && ib <= p.beta * ia + 1e-11); }
      }
      if (e.kind === 'nmos') { const u = a - c - p.threshold, vds = b - c; assert.ok(vds >= -1e-9); near(ib, u <= 0 ? 0 : vds < u ? p.transconductance * (u * vds - .5 * vds * vds) : .5 * p.transconductance * u * u, 'MOS ID'); }
      if (e.kind === 'ideal-opamp') { near(a, b, 'virtual equality AFTER feedback validation'); near(ia, 0, 'I+'); near(ib, 0, 'I-'); assert.ok(record.result.feedbackFactor > 0); }
    }
    for (const [node, residual] of Object.entries(kcl)) if (node !== circuit.referenceKey) near(residual, 0, 'network KCL', 1e-11);
  };
  inspect(record.result.devices);
  for (const point of record.sweep) { inspect(point.devices, point.inputVolts); assert.ok(point.maxKclAmps < 1e-11); }
  if (suffix === 'opamp-inverting') near(record.result.devices.find(d => d.kind === 'ideal-opamp').terminalVolts[2], -1, 'independent inverting fixture');
}
console.log(JSON.stringify({ status: 'passed', prefix, files: 5, actualOperatingPoints: points, independentChecks: checks }));
