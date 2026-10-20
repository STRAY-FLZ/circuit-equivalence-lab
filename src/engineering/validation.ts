import type { EngineeringProject, ParameterValue, Position } from './types'

export interface ProjectIssue { readonly path: string; readonly code: string; readonly message: string }
export class ProjectValidationError extends TypeError {
  readonly issues: readonly ProjectIssue[]
  constructor(issues: readonly ProjectIssue[]) {
    super(issues.map(issue => `${issue.path}: ${issue.message}`).join('\n'))
    this.name = 'ProjectValidationError'
    this.issues = Object.freeze(issues.map(issue => Object.freeze({ ...issue })))
  }
}
function fail(path: string, code: string, message: string): never {
  throw new ProjectValidationError([{ path, code, message }])
}
type Rule = (value: unknown, path: string) => void
const text: Rule = (v, p) => { if (typeof v !== 'string') fail(p, 'type', 'Expected text.') }
const name: Rule = (v, p) => {
  text(v, p)
  if (typeof v === 'string' && (!v.trim() || v !== v.trim())) fail(p, 'name', 'Expected nonempty text without surrounding whitespace.')
}
const displayName: Rule = (v, p) => {
  text(v, p)
  if (typeof v === 'string' && !v.trim()) fail(p, 'name', 'Display label must not be empty.')
}
const number: Rule = (v, p) => { if (typeof v !== 'number' || !Number.isFinite(v)) fail(p, 'finite-number', 'Expected a finite number.') }
const boolean: Rule = (v, p) => { if (typeof v !== 'boolean') fail(p, 'type', 'Expected boolean.') }
const integer: Rule = (v, p) => {
  number(v, p)
  if (!Number.isSafeInteger(v) || (v as number) < 0) fail(p, 'integer', 'Expected a nonnegative safe integer.')
}
const positiveInteger: Rule = (v, p) => { integer(v, p); if (v === 0) fail(p, 'positive', 'Expected a positive count.') }
const positive: Rule = (v, p) => { number(v, p); if ((v as number) <= 0) fail(p, 'positive', 'Expected a positive value.') }
const uuid: Rule = (v, p) => {
  if (typeof v !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(v)) fail(p, 'uuid', 'Expected a UUID entity identifier.')
}
const digest: Rule = (v, p) => { if (typeof v !== 'string' || !/^[\da-f]{64}$/i.test(v)) fail(p, 'digest', 'Expected a SHA-256 hex digest.') }
const utc: Rule = (v, p) => {
  if (typeof v !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(v) || !Number.isFinite(Date.parse(v))) fail(p, 'timestamp', 'Expected an ISO 8601 UTC timestamp ending in Z.')
}
export const CANONICAL_UNITS: readonly string[] = Object.freeze(['1', 'ohm', 'V', 'A', 's', 'Hz', 'F', 'H', 'rad', 'W', 'J', 'S', 'C', 'm', 'K', 'V/Hz', 'A/Hz', 'V^2/Hz', 'A^2/Hz'])
const unit: Rule = (v, p) => { if (typeof v !== 'string' || !CANONICAL_UNITS.includes(v)) fail(p, 'unit', 'Unsupported canonical unit.') }
const mediaType: Rule = (v, p) => { if (typeof v !== 'string' || !/^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(v)) fail(p, 'media-type', 'Expected an explicit media type/subtype without parameters.') }
const choice = (...values: readonly unknown[]): Rule => (v, p) => { if (!values.includes(v)) fail(p, 'enum', `Expected one of ${values.join(', ')}.`) }
const optional = (rule: Rule): Rule => (v, p) => { if (v !== undefined) rule(v, p) }
const list = (rule: Rule, nonempty = false): Rule => (v, p) => {
  if (!Array.isArray(v)) fail(p, 'type', 'Expected an array.')
  if (nonempty && v.length === 0) fail(p, 'empty', 'Expected at least one entry.')
  for (let i = 0; i < v.length; i++) rule(v[i], `${p}[${i}]`)
}
function record(v: unknown, p: string): Record<string, unknown> {
  if (v === null || typeof v !== 'object' || Array.isArray(v) || (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null)) fail(p, 'type', 'Expected a plain JSON object.')
  return v as Record<string, unknown>
}
const object = (fields: Readonly<Record<string, Rule>>): Rule => (v, p) => {
  const obj = record(v, p)
  for (const key of Object.keys(obj)) if (!Object.hasOwn(fields, key)) fail(`${p}.${key}`, 'unknown-field', 'Unknown structural field; optional metadata belongs in extensions.')
  for (const [key, rule] of Object.entries(fields)) rule(obj[key], `${p}.${key}`)
}
const dictionary = (rule: Rule): Rule => (v, p) => { for (const [key, value] of Object.entries(record(v, p))) rule(value, `${p}.${key}`) }

/** JSON-only boundary, including cycles, sparse arrays, and nonfinite metadata. */
export function assertJsonData(value: unknown, path = '$', depth = 0, ancestors = new Set<object>()): void {
  if (depth > 128) fail(path, 'depth-limit', 'JSON nesting exceeds 128 levels.')
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number') { number(value, path); return }
  if (typeof value !== 'object') fail(path, 'json-value', 'Expected JSON data; undefined and executable/runtime values are not allowed.')
  if (ancestors.has(value)) fail(path, 'cycle', 'JSON data cannot contain cycles.')
  ancestors.add(value)
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) assertJsonData(value[i], `${path}[${i}]`, depth + 1, ancestors)
  } else {
    for (const [key, child] of Object.entries(record(value, path))) assertJsonData(child, `${path}.${key}`, depth + 1, ancestors)
  }
  ancestors.delete(value)
}
const jsonObject: Rule = (v, p) => { record(v, p); assertJsonData(v, p) }
const resource = object({ id: name, version: name })
const quantity = object({ value: number, unit })
const position = object({ x: number, y: number })
const parameter: Rule = (v, p) => {
  const kind = record(v, p).kind
  switch (kind) {
    case 'quantity': object({ kind: choice(kind), quantity })(v, p); break
    case 'complex': object({ kind: choice(kind), value: object({ real: number, imaginary: number }), unit })(v, p); break
    case 'boolean': object({ kind: choice(kind), value: boolean })(v, p); break
    case 'text': object({ kind: choice(kind), value: text })(v, p); break
    default: fail(`${p}.kind`, 'enum', 'Unsupported parameter kind.')
  }
}
const definition = object({
  id: uuid, resource, kind: name,
  pins: list(object({ key: name, name: text, electricalRole: choice('passive', 'input', 'output', 'bidirectional', 'power', 'unspecified') })),
  parameters: list(object({ key: name, kind: choice('quantity', 'complex', 'boolean', 'text'), unit: optional(unit), required: boolean })),
  defaultSymbolId: optional(uuid),
  modelBindings: list(object({ analysisFamily: choice('electrical', 'digital'), model: resource, portMap: dictionary(name) })),
})
const pair: Rule = (v, p) => { list(uuid)(v, p); if ((v as unknown[]).length !== 2) fail(p, 'arity', 'A connection requires exactly two anchors.') }
const sheet = object({
  id: uuid, title: text,
  components: list(object({ id: uuid, reference: name, definitionId: uuid, pins: list(object({ id: uuid, definitionPinKey: name, anchorId: uuid })), parameters: dictionary(parameter) })),
  anchors: list(object({ id: uuid })), connections: list(object({ id: uuid, endpoints: pair })),
  labels: list(object({ id: uuid, anchorId: uuid, name, scope: choice('sheet', 'project') })),
  references: list(object({ id: uuid, anchorId: uuid, domain: name })),
  ports: list(object({ id: uuid, label: displayName, anchorId: uuid })),
  geometry: object({
    placements: list(object({ componentId: uuid, symbolId: uuid, origin: position, rotationDegrees: choice(0, 90, 180, 270), mirrored: boolean })),
    anchorPositions: dictionary(position), connectionRoutes: dictionary(list(position, true)),
  }),
})
const scope: Rule = (v, p) => {
  const kind = record(v, p).kind
  if (kind === 'circuit') object({ kind: choice(kind), sheetIds: list(uuid) })(v, p)
  else if (kind === 'dataset') object({ kind: choice(kind), datasetIds: list(uuid) })(v, p)
  else if (kind === 'board') object({ kind: choice(kind), boardId: uuid })(v, p)
  else fail(`${p}.kind`, 'enum', 'Unsupported analysis scope.')
}
const series = object({ assetId: uuid, encoding: choice('float64-le'), count: positiveInteger, unit })
const axis: Rule = (v, p) => {
  const kind = record(v, p).kind
  if (kind === 'uniform-time') object({ kind: choice(kind), startSeconds: number, intervalSeconds: positive, count: positiveInteger })(v, p)
  else if (kind === 'explicit-time') object({ kind: choice(kind), times: series })(v, p)
  else if (kind === 'frequency') object({ kind: choice(kind), frequencies: series })(v, p)
  else fail(`${p}.kind`, 'enum', 'Unsupported sampling axis.')
}
const source: Rule = (v, p) => {
  const kind = record(v, p).kind
  if (kind === 'simulated') object({ kind: choice(kind), engine: resource, projectRevision: name, analysisId: uuid, inputDigest: digest })(v, p)
  else if (kind === 'imported') object({ kind: choice(kind), fileName: text, originalAssetId: uuid, importedAtUtc: utc, columnMap: jsonObject })(v, p)
  else if (kind === 'hardware') object({ kind: choice(kind), instrument: name, acquisitionId: name, acquiredAtUtc: utc, configuration: jsonObject })(v, p)
  else if (kind === 'derived') object({ kind: choice(kind), inputDatasetIds: list(uuid, true), operation: resource, options: jsonObject })(v, p)
  else fail(`${p}.kind`, 'enum', 'Unsupported data provenance.')
}
const projectShape = object({
  id: uuid, revision: name, title: text, definitions: list(definition), sheets: list(sheet),
  symbols: list(object({ id: uuid, resource, pinPositions: dictionary(position), bodyAssetId: optional(uuid) })),
  analyses: list(object({ id: uuid, analysisType: name, preferredEngine: optional(resource), scope, options: jsonObject })),
  results: list(object({ id: uuid, analysisId: uuid, engine: resource, inputRevision: name, inputDigest: digest, outcome: choice('success', 'physical-state', 'unsupported', 'failure', 'inconclusive', 'cancelled'), artifactAssetIds: list(uuid) })),
  measurements: list(object({ id: uuid, title: text, kind: choice('waveform', 'spectrum'), source, axis,
    channels: list(object({ id: uuid, name: text, samples: series, probeAnchorId: optional(uuid), calibration: optional(object({ gain: number, offset: quantity, applied: boolean, sourceNote: text })) }), true), metadata: jsonObject })),
  boards: list(object({ id: uuid, title: text, sourceRevision: name, sourceDigest: digest, boardAssetId: optional(uuid),
    assignments: list(object({ id: uuid, componentId: uuid, footprint: resource, footprintAssetId: uuid, pinPadMappings: list(object({ instancePinId: uuid, padKeys: list(name, true) })) })),
    checks: list(object({ id: uuid, kind: choice('erc', 'drc', 'schematic-consistency', 'manufacturing'), status: choice('pass', 'fail', 'not-run'), rules: resource, sourceRevision: name, boardDigest: digest, reportAssetId: optional(uuid) })),
  })),
  experiments: list(object({ id: uuid, title: text, analysisIds: list(uuid), datasetIds: list(uuid), notes: text })),
  competitions: list(object({ id: uuid, title: text, sourceUrls: list(name), experimentIds: list(uuid) })),
  assets: list(object({ id: uuid, mediaType, byteLength: integer, sha256: digest })), extensions: jsonObject,
})

function unique(values: readonly string[], path: string): void {
  if (new Set(values).size !== values.length) fail(path, 'duplicate', 'Duplicate identity or key.')
}
function samePosition(a: Position, b: Position): boolean { return a.x === b.x && a.y === b.y }

function validateRelations(project: EngineeringProject): void {
  const entities = new Map<string, { kind: string; owner: string }>()
  const add = (id: string, kind: string, owner = '') => {
    if (entities.has(id)) fail(`$.id(${id})`, 'duplicate-id', 'Entity IDs must be unique across the project.')
    entities.set(id, { kind, owner })
  }
  const ref = (id: string, kind: string, path: string, owner?: string) => {
    const found = entities.get(id)
    if (found?.kind !== kind || (owner !== undefined && found.owner !== owner)) fail(path, 'reference', `Expected an existing ${kind}${owner ? ` owned by ${owner}` : ''}: ${id}`)
  }
  add(project.id, 'project')
  for (const def of project.definitions) add(def.id, 'definition')
  for (const symbol of project.symbols) add(symbol.id, 'symbol')
  for (const s of project.sheets) {
    add(s.id, 'sheet')
    for (const a of s.anchors) add(a.id, 'anchor', s.id)
    for (const c of s.connections) add(c.id, 'connection', s.id)
    for (const c of s.components) { add(c.id, 'component', s.id); for (const pin of c.pins) add(pin.id, 'pin', c.id) }
    for (const label of s.labels) add(label.id, 'label', s.id)
    for (const marker of s.references) add(marker.id, 'marker', s.id)
    for (const port of s.ports) add(port.id, 'port', s.id)
  }
  for (const a of project.analyses) add(a.id, 'analysis')
  for (const r of project.results) add(r.id, 'result')
  for (const d of project.measurements) { add(d.id, 'dataset'); for (const c of d.channels) add(c.id, 'channel', d.id) }
  for (const b of project.boards) { add(b.id, 'board'); for (const a of b.assignments) add(a.id, 'assignment', b.id); for (const c of b.checks) add(c.id, 'check', b.id) }
  for (const e of project.experiments) add(e.id, 'experiment')
  for (const c of project.competitions) add(c.id, 'competition')
  for (const a of project.assets) add(a.id, 'asset')
  const asset = (id: string, p: string) => ref(id, 'asset', p)
  for (const symbol of project.symbols) if (symbol.bodyAssetId) asset(symbol.bodyAssetId, `symbol(${symbol.id}).bodyAssetId`)
  for (const def of project.definitions) {
    unique(def.pins.map(p => p.key), `definition(${def.id}).pins`)
    unique(def.parameters.map(p => p.key), `definition(${def.id}).parameters`)
    if (def.defaultSymbolId) ref(def.defaultSymbolId, 'symbol', `definition(${def.id}).defaultSymbolId`)
    for (const binding of def.modelBindings) for (const key of Object.values(binding.portMap)) {
      if (!def.pins.some(p => p.key === key)) fail(`definition(${def.id}).portMap`, 'pin-key', `Unknown definition pin key: ${key}`)
    }
  }
  const definitions = new Map(project.definitions.map(d => [d.id, d]))
  const assignedAnchors = new Set<string>()
  for (const s of project.sheets) {
    const anchorRef = (id: string, p: string) => ref(id, 'anchor', p, s.id)
    for (const c of s.connections) c.endpoints.forEach(id => anchorRef(id, `connection(${c.id}).endpoints`))
    for (const item of [...s.labels, ...s.references, ...s.ports]) anchorRef(item.anchorId, `entity(${item.id}).anchorId`)
    for (const c of s.components) {
      ref(c.definitionId, 'definition', `component(${c.id}).definitionId`)
      const def = definitions.get(c.definitionId)!
      unique(c.pins.map(p => p.definitionPinKey), `component(${c.id}).pins`)
      if (c.pins.length !== def.pins.length) fail(`component(${c.id}).pins`, 'pin-count', 'Each definition pin requires exactly one instance pin.')
      for (const pin of c.pins) {
        if (!def.pins.some(p => p.key === pin.definitionPinKey)) fail(`pin(${pin.id})`, 'pin-key', 'Unknown definition pin key.')
        anchorRef(pin.anchorId, `pin(${pin.id}).anchorId`)
        if (assignedAnchors.has(pin.anchorId)) fail(`pin(${pin.id}).anchorId`, 'shared-pin-anchor', 'Distinct instance pins need distinct anchors; connect them with explicit edges.')
        assignedAnchors.add(pin.anchorId)
      }
      for (const key of Object.keys(c.parameters)) if (!def.parameters.some(p => p.key === key)) fail(`component(${c.id}).parameters.${key}`, 'parameter', 'Parameter is not declared by the pinned definition.')
      for (const param of def.parameters) {
        const value: ParameterValue | undefined = Object.hasOwn(c.parameters, param.key) ? c.parameters[param.key] : undefined
        if (!value) { if (param.required) fail(`component(${c.id}).parameters.${param.key}`, 'required', 'Required component parameter is missing.'); continue }
        if (value.kind !== param.kind) fail(`component(${c.id}).parameters.${param.key}`, 'parameter-kind', 'Parameter kind differs from the definition.')
        const actualUnit = value.kind === 'quantity' ? value.quantity.unit : value.kind === 'complex' ? value.unit : undefined
        if (param.unit !== undefined && actualUnit !== param.unit) fail(`component(${c.id}).parameters.${param.key}`, 'unit', 'Parameter unit differs from the definition.')
      }
      if (def.kind === 'resistor') {
        const r = c.parameters.resistance
        if (r?.kind !== 'quantity' || r.quantity.unit !== 'ohm' || r.quantity.value <= 0) fail(`component(${c.id}).parameters.resistance`, 'resistance', 'Resistors require finite positive resistance in ohm; use a connection for an ideal short.')
      }
    }
    unique(s.geometry.placements.map(p => p.componentId), `sheet(${s.id}).placements`)
    for (const placement of s.geometry.placements) {
      ref(placement.componentId, 'component', 'placement.componentId', s.id)
      ref(placement.symbolId, 'symbol', 'placement.symbolId')
      const component = s.components.find(c => c.id === placement.componentId)!
      const symbol = project.symbols.find(sym => sym.id === placement.symbolId)!
      for (const pin of component.pins) {
        const local = Object.hasOwn(symbol.pinPositions, pin.definitionPinKey) ? symbol.pinPositions[pin.definitionPinKey] : undefined
        if (!local) fail('placement.symbolId', 'symbol-pin', `Symbol is missing pin key ${pin.definitionPinKey}.`)
        const x = placement.mirrored ? -local.x : local.x, y = local.y
        const rotated = placement.rotationDegrees === 0 ? { x, y } : placement.rotationDegrees === 90 ? { x: -y, y: x } : placement.rotationDegrees === 180 ? { x: -x, y: -y } : { x: y, y: -x }
        const expected = { x: placement.origin.x + rotated.x, y: placement.origin.y + rotated.y }
        const stored = s.geometry.anchorPositions[pin.anchorId]
        if (stored && !samePosition(stored, expected)) fail(`anchor(${pin.anchorId}).position`, 'pin-position', 'Anchor position disagrees with transformed symbol pin.')
      }
    }
    for (const id of Object.keys(s.geometry.anchorPositions)) anchorRef(id, 'geometry.anchorPositions')
    for (const [id, route] of Object.entries(s.geometry.connectionRoutes)) {
      ref(id, 'connection', 'geometry.connectionRoutes', s.id)
      const edge = s.connections.find(c => c.id === id)!
      if (route.length < 2) fail('geometry.connectionRoutes', 'route', 'A route requires at least two positions.')
      edge.endpoints.forEach((anchor, i) => {
        const at = s.geometry.anchorPositions[anchor], end = route[i === 0 ? 0 : route.length - 1]
        if (at && end && !samePosition(at, end)) fail(`connection(${id}).route`, 'route-endpoint', 'Route endpoint disagrees with anchor geometry.')
      })
    }
  }
  for (const a of project.analyses) {
    if (a.scope.kind === 'circuit') { unique(a.scope.sheetIds, `analysis(${a.id}).sheetIds`); a.scope.sheetIds.forEach(id => ref(id, 'sheet', `analysis(${a.id}).scope`)) }
    else if (a.scope.kind === 'dataset') { unique(a.scope.datasetIds, `analysis(${a.id}).datasetIds`); a.scope.datasetIds.forEach(id => ref(id, 'dataset', `analysis(${a.id}).scope`)) }
    else ref(a.scope.boardId, 'board', `analysis(${a.id}).scope`)
  }
  for (const r of project.results) { ref(r.analysisId, 'analysis', `result(${r.id}).analysisId`); r.artifactAssetIds.forEach(id => asset(id, `result(${r.id}).assets`)) }
  for (const e of project.experiments) { e.analysisIds.forEach(id => ref(id, 'analysis', `experiment(${e.id})`)); e.datasetIds.forEach(id => ref(id, 'dataset', `experiment(${e.id})`)) }
  for (const c of project.competitions) c.experimentIds.forEach(id => ref(id, 'experiment', `competition(${c.id})`))
  for (const b of project.boards) {
    if (b.boardAssetId) asset(b.boardAssetId, `board(${b.id})`)
    unique(b.assignments.map(a => a.componentId), `board(${b.id}).assignments`)
    for (const a of b.assignments) {
      ref(a.componentId, 'component', `assignment(${a.id})`); asset(a.footprintAssetId, `assignment(${a.id})`)
      const component = project.sheets.flatMap(s => s.components).find(c => c.id === a.componentId)!
      unique(a.pinPadMappings.map(m => m.instancePinId), `assignment(${a.id}).pinPadMappings`)
      if (a.pinPadMappings.length !== component.pins.length) fail(`assignment(${a.id})`, 'pin-pad-map', 'Account for every component pin.')
      const pads = new Set<string>()
      for (const m of a.pinPadMappings) {
        ref(m.instancePinId, 'pin', `assignment(${a.id}).pinPadMappings`, a.componentId)
        unique(m.padKeys, `assignment(${a.id}).padKeys`)
        for (const pad of m.padKeys) { if (pads.has(pad)) fail(`assignment(${a.id})`, 'pin-pad-map', 'Shared pads across distinct pins require a future explicit package rule.'); pads.add(pad) }
      }
    }
    for (const c of b.checks) if (c.reportAssetId) asset(c.reportAssetId, `boardCheck(${c.id})`)
  }
  for (const d of project.measurements) {
    if ((d.kind === 'spectrum') !== (d.axis.kind === 'frequency')) fail(`dataset(${d.id}).axis`, 'axis-kind', 'Waveforms require time; spectra require frequency.')
    const count = d.axis.kind === 'uniform-time' ? d.axis.count : d.axis.kind === 'explicit-time' ? d.axis.times.count : d.axis.frequencies.count
    if (d.axis.kind === 'uniform-time') {
      const start = d.axis.startSeconds, interval = d.axis.intervalSeconds, end = start + (count - 1) * interval
      if (!Number.isFinite(1 / interval) || !Number.isFinite(end) || (count > 1 && (!(start + interval > start) || !(end > start + (count - 2) * interval)))) fail(`dataset(${d.id}).axis`, 'time-range', 'Sampling times/rate must remain finite and distinguishable at both ends of the interval.')
    } else {
      const values = d.axis.kind === 'explicit-time' ? d.axis.times : d.axis.frequencies
      asset(values.assetId, `dataset(${d.id}).axis`)
      if (values.unit !== (d.axis.kind === 'explicit-time' ? 's' : 'Hz')) fail(`dataset(${d.id}).axis`, 'unit', 'Invalid axis unit.')
    }
    for (const c of d.channels) {
      asset(c.samples.assetId, `channel(${c.id}).samples`)
      if (c.samples.count !== count) fail(`channel(${c.id})`, 'sample-count', 'Channel count differs from the shared axis.')
      if (c.probeAnchorId) ref(c.probeAnchorId, 'anchor', `channel(${c.id}).probeAnchorId`)
      if (c.calibration && c.calibration.offset.unit !== c.samples.unit) fail(`channel(${c.id}).calibration`, 'unit', 'Calibration offset must use the channel unit.')
    }
    if (d.source.kind === 'simulated') ref(d.source.analysisId, 'analysis', `dataset(${d.id}).source`)
    if (d.source.kind === 'imported') asset(d.source.originalAssetId, `dataset(${d.id}).source`)
    if (d.source.kind === 'derived') d.source.inputDatasetIds.forEach(id => ref(id, 'dataset', `dataset(${d.id}).source`))
  }
  const datasets = new Map(project.measurements.map(d => [d.id, d]))
  const done = new Set<string>(), visiting = new Set<string>()
  for (const dataset of project.measurements) {
    const stack: [string, boolean][] = [[dataset.id, false]]
    while (stack.length) {
      const [id, exiting] = stack.pop()!
      if (exiting) { visiting.delete(id); done.add(id); continue }
      if (done.has(id)) continue
      if (visiting.has(id)) fail(`dataset(${id}).source`, 'provenance-cycle', 'Derived datasets must form an acyclic source graph.')
      visiting.add(id); stack.push([id, true])
      const d = datasets.get(id)!
      if (d.source.kind === 'derived') for (const inputId of d.source.inputDatasetIds) stack.push([inputId, false])
    }
  }
  for (const key of Object.keys(project.extensions)) if (!/^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(key)) fail(`$.extensions.${key}`, 'namespace', 'Extension keys require a namespaced identifier.')
}

/** Returns the first actionable issue, without mutating/freezing the input. */
export function validateEngineeringProject(input: unknown): readonly ProjectIssue[] {
  try {
    assertJsonData(input)
    projectShape(input, '$')
    validateRelations(input as EngineeringProject)
    return Object.freeze([])
  } catch (error) {
    if (error instanceof ProjectValidationError) return error.issues
    throw error
  }
}
