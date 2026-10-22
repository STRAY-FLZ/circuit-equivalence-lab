import { assertJsonData } from '../engineering'
import type { JsonObject, JsonValue } from '../engineering'
/** Canonical project/configuration digest; existing DC provenance semantics are unchanged. */
export async function analysisDigest(value: unknown): Promise<string> {
  assertJsonData(value)
  const canonical = (v: JsonValue): JsonValue => Array.isArray(v) ? v.map((item: JsonValue) => canonical(item)) : v !== null && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical((v as JsonObject)[k]!)])) : v
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(canonical(value as JsonValue))))
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('')
}
