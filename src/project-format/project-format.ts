import { assertJsonData, createEngineeringProject, freezeSnapshot, ProjectValidationError } from '../engineering'
import type { EngineeringProject, ProjectIssue } from '../engineering'
import type { ImportResult, InlineAsset, ProjectDocumentV1 } from './types'
import { decodeInlineAsset, formatError, sha256, validateSamplePayloads } from './assets'

export const PROJECT_FORMAT = 'org.stray.electronics.project'
export const PROJECT_FORMAT_VERSION = 1
export interface FormatLimits {
  readonly maxTextBytes: number
  readonly maxAssetBytes: number
  readonly maxTotalAssetBytes: number
}
/** Initial portable-fixture budget; independent of electrical/engine size limits. */
export const DEFAULT_FORMAT_LIMITS: FormatLimits = Object.freeze({ maxTextBytes: 32 * 1024 * 1024, maxAssetBytes: 8 * 1024 * 1024, maxTotalAssetBytes: 16 * 1024 * 1024 })

function object(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) formatError(path, 'object', 'Expected a JSON object.')
  return value as Record<string, unknown>
}
function keys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) formatError(`${path}.${key}`, 'unknown-field', 'Unknown format field.')
}
function invalid(path: string, code: string, message: string): ImportResult {
  return { kind: 'invalid', issues: [{ path, code, message }] }
}
function limitsWith(overrides: Partial<FormatLimits>): FormatLimits {
  const limits = { ...DEFAULT_FORMAT_LIMITS, ...overrides }
  for (const value of Object.values(limits)) if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Format limits must be nonnegative safe integers.')
  return limits
}

async function validateDocument(value: unknown, originalText: string, limits: FormatLimits): Promise<ImportResult> {
  try {
    const root = object(value, '$')
    if (root.format !== PROJECT_FORMAT) return { kind: 'unrecognized', reason: 'format', originalText }
    if (!Number.isSafeInteger(root.formatVersion)) return invalid('$.formatVersion', 'schema-version', 'Expected an integer schema version.')
    if ((root.formatVersion as number) > PROJECT_FORMAT_VERSION) return { kind: 'unrecognized', reason: 'newer-version', originalText }
    if (root.formatVersion !== PROJECT_FORMAT_VERSION) return invalid('$.formatVersion', 'unsupported-schema', 'Only schema version 1 exists; no historical migrations are registered.')
    assertJsonData(root)
    keys(root, ['format', 'formatVersion', 'writer', 'requiredExtensions', 'project', 'inlineAssets'], '$')
    const writer = object(root.writer, '$.writer')
    keys(writer, ['name', 'version'], '$.writer')
    if (typeof writer.name !== 'string' || !writer.name.trim() || typeof writer.version !== 'string' || !/^\d+\.\d+\.\d+(?:-[\da-zA-Z.-]+)?(?:\+[\da-zA-Z.-]+)?$/.test(writer.version)) formatError('$.writer', 'writer', 'Writer needs a name and its actual semantic application version.')
    if (!Array.isArray(root.requiredExtensions) || !root.requiredExtensions.every(v => typeof v === 'string' && /^[\w-]+(?:\.[\w-]+)+$/.test(v))) formatError('$.requiredExtensions', 'extension', 'Expected namespaced extension identifiers.')
    if (root.requiredExtensions.length) return { kind: 'unrecognized', reason: 'required-extension', originalText }
    const project = createEngineeringProject(root.project)
    if (!Array.isArray(root.inlineAssets)) formatError('$.inlineAssets', 'array', 'Expected inline asset entries.')
    const manifest = new Map(project.assets.map(a => [a.id, a])), decoded = new Map<string, Uint8Array>()
    const inlineAssets: InlineAsset[] = []
    let total = 0
    for (const [i, raw] of root.inlineAssets.entries()) {
      const entry = object(raw, `$.inlineAssets[${i}]`)
      keys(entry, ['assetId', 'encoding', 'data'], `$.inlineAssets[${i}]`)
      if (typeof entry.assetId !== 'string' || entry.encoding !== 'base64' || typeof entry.data !== 'string') formatError(`$.inlineAssets[${i}]`, 'asset-shape', 'Expected an asset ID and base64 data.')
      const declared = manifest.get(entry.assetId)
      if (!declared || decoded.has(entry.assetId)) formatError(`$.inlineAssets[${i}].assetId`, 'asset-reference', 'Missing manifest entry or duplicate asset payload.')
      if (declared.byteLength > limits.maxAssetBytes || entry.data.length > 4 * Math.ceil(limits.maxAssetBytes / 3)) formatError(`$.inlineAssets[${i}]`, 'resource-limit', 'Asset exceeds the supported inline budget; source data is unchanged.')
      const asset: InlineAsset = { assetId: entry.assetId, encoding: 'base64', data: entry.data }
      const bytes = decodeInlineAsset(asset)
      total += bytes.byteLength
      if (bytes.byteLength > limits.maxAssetBytes || total > limits.maxTotalAssetBytes) formatError('$.inlineAssets', 'resource-limit', 'Decoded asset budget exceeded.')
      if (bytes.byteLength !== declared.byteLength) formatError(`asset(${entry.assetId})`, 'byte-length', 'Asset byte length differs from the manifest.')
      if (await sha256(bytes) !== declared.sha256.toLowerCase()) formatError(`asset(${entry.assetId})`, 'checksum', 'Asset SHA-256 does not match.')
      decoded.set(entry.assetId, bytes); inlineAssets.push(asset)
    }
    if (decoded.size !== manifest.size) formatError('$.inlineAssets', 'missing-asset', 'Portable projects require every manifest payload; no unresolved external data is supported.')
    validateSamplePayloads(project.measurements, decoded)
    return { kind: 'ready', document: freezeSnapshot({ format: PROJECT_FORMAT, formatVersion: PROJECT_FORMAT_VERSION, writer: { name: writer.name, version: writer.version }, requiredExtensions: [], project, inlineAssets }) }
  } catch (error) {
    if (error instanceof ProjectValidationError) return { kind: 'invalid', issues: error.issues }
    throw error
  }
}

/** No active project is mutated. Newer/unknown semantics retain the original text. */
export async function deserializeProject(input: string | Uint8Array, overrides: Partial<FormatLimits> = {}): Promise<ImportResult> {
  const limits = limitsWith(overrides)
  let text: string
  if (typeof input === 'string') text = input
  else {
    if (input.byteLength > limits.maxTextBytes) return invalid('$', 'resource-limit', 'Project file exceeds the import budget.')
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(input) }
    catch { return invalid('$', 'utf8', 'Invalid UTF-8 project file.') }
  }
  if (new TextEncoder().encode(text).byteLength > limits.maxTextBytes) return invalid('$', 'resource-limit', 'Project file exceeds the import budget.')
  let value: unknown
  try { value = JSON.parse(text) as unknown }
  catch (error) { if (error instanceof SyntaxError) return invalid('$', 'json', 'Invalid JSON project file.'); throw error }
  return validateDocument(value, text, limits)
}

const sortedCollections = new Set(['definitions', 'symbols', 'sheets', 'analyses', 'results', 'measurements', 'boards', 'experiments', 'competitions', 'assets', 'components', 'anchors', 'connections', 'labels', 'references', 'ports', 'assignments', 'checks'])
const opaqueFields = new Set(['extensions', 'metadata', 'options', 'configuration', 'columnMap'])
function canonical(value: unknown, field = '', opaque = false): unknown {
  if (Array.isArray(value)) {
    const values: unknown[] = value.map((item: unknown) => canonical(item, '', opaque))
    if (!opaque && (sortedCollections.has(field) || field === 'inlineAssets')) values.sort((a, b) => {
      const key = field === 'inlineAssets' ? 'assetId' : 'id'
      const left = (a as Record<string, string>)[key]!, right = (b as Record<string, string>)[key]!
      return left < right ? -1 : left > right ? 1 : 0
    })
    return values
  }
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, v]) => [key, canonical(v, key, opaque || opaqueFields.has(key))]))
  return value
}

export async function serializeProject(document: ProjectDocumentV1, overrides: Partial<FormatLimits> = {}): Promise<string> {
  assertJsonData(document)
  const limits = limitsWith(overrides)
  const result = await validateDocument(document, '', limits)
  if (result.kind !== 'ready') {
    const issues: readonly ProjectIssue[] = result.kind === 'invalid' ? result.issues : [{ path: '$', code: result.reason, message: 'Cannot serialize unsupported project semantics.' }]
    throw new ProjectValidationError(issues)
  }
  const text = JSON.stringify(canonical(result.document), null, 2) + '\n'
  if (new TextEncoder().encode(text).byteLength > limits.maxTextBytes) formatError('$', 'resource-limit', 'Project file exceeds the export budget; source data is unchanged.')
  return text
}

export async function createProjectDocument(project: EngineeringProject, writer: ProjectDocumentV1['writer'], inlineAssets: readonly InlineAsset[] = []): Promise<ProjectDocumentV1> {
  const raw = { format: PROJECT_FORMAT, formatVersion: PROJECT_FORMAT_VERSION, writer, requiredExtensions: [], project, inlineAssets }
  assertJsonData(raw)
  const result = await validateDocument(raw, '', DEFAULT_FORMAT_LIMITS)
  if (result.kind !== 'ready') throw new ProjectValidationError(result.kind === 'invalid' ? result.issues : [{ path: '$', code: result.reason, message: 'Unsupported document.' }])
  return result.document
}
