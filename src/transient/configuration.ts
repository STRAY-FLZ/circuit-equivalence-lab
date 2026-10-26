import type { EngineeringProject, JsonObject } from '../engineering'
import { TransientError, TRANSIENT_EXTENSION } from './types'
import type { TransientSettings, Excitation, InitialCondition } from './types'

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
export function parseTransientSettings(value: unknown): TransientSettings {
  const fail = (): never => { throw new TransientError('TRAN_OPTIONS', '暂态配置无效：请检查版本、方法、有限时间/步长、容差、全部激励与带单位初始条件。') }
  if (!object(value) || value.version !== 1 || value.method !== 'backward-euler-adaptive' || Object.keys(value).some(k => !['version', 'method', 'durationSeconds', 'intervalSeconds', 'relativeTolerance', 'referenceAnchorId', 'sources', 'initialConditions'].includes(k))) return fail()
  const { durationSeconds: duration, intervalSeconds: dt, relativeTolerance: tol, sources, initialConditions: initials } = value
  if (!finite(duration) || !finite(dt) || duration <= 0 || dt <= 0 || !Number.isFinite(duration / dt) || !finite(tol) || tol < 1e-8 || tol > 1e-3 || (value.referenceAnchorId !== undefined && typeof value.referenceAnchorId !== 'string')) return fail()
  const intervals = Math.round(duration / dt)
  if (intervals < 1 || intervals > 8192) throw new TransientError('TRAN_SAMPLE_LIMIT', '均匀输出需包含 2–8193 个样本；请调整时长或输出间隔。', [], 'resource')
  if (Math.abs(duration / dt - intervals) > 1e-9 * intervals) throw new TransientError('TRAN_GRID', '时长必须是输出采样间隔的整数倍；未静默改写时间轴。')
  if (!Array.isArray(sources) || !Array.isArray(initials) || sources.length > 64 || initials.length > 64) return fail()
  for (const s of sources as unknown[]) {
    if (!object(s) || typeof s.componentId !== 'string' || !['V', 'A'].includes(String(s.unit))) return fail()
    const keys = s.mode === 'constant' ? ['value'] : s.mode === 'step' ? ['initial', 'final', 'atSeconds'] : s.mode === 'pulse' ? ['initial', 'final', 'startSeconds', 'endSeconds'] : null
    if (!keys || Object.keys(s).some(k => !['componentId', 'unit', 'mode', ...keys].includes(k)) || keys.some(k => !finite(s[k]))) return fail()
    if (s.mode === 'step' && ((s.atSeconds as number) < 0 || (s.atSeconds as number) > duration)) return fail()
    if (s.mode === 'pulse' && ((s.startSeconds as number) < 0 || (s.endSeconds as number) <= (s.startSeconds as number) || (s.endSeconds as number) > duration)) return fail()
  }
  for (const c of initials as unknown[]) if (!object(c) || typeof c.componentId !== 'string' || !finite(c.value) || !['V', 'A'].includes(String(c.unit)) || Object.keys(c).some(k => !['componentId', 'value', 'unit'].includes(k))) return fail()
  if (new Set(sources.map((s: Excitation) => s.componentId)).size !== sources.length || new Set(initials.map((s: InitialCondition) => s.componentId)).size !== initials.length) return fail()
  return value as unknown as TransientSettings
}
export function settingsJson(settings: TransientSettings): JsonObject { return JSON.parse(JSON.stringify(settings)) as JsonObject }
export function storedTransientSettings(project: EngineeringProject, sheetId: string): TransientSettings | null {
  const container = project.extensions[TRANSIENT_EXTENSION]
  if (!object(container) || container[sheetId] === undefined) return null
  return parseTransientSettings(container[sheetId])
}
export function sourceValue(source: Excitation, time: number): number {
  return source.mode === 'constant' ? source.value : source.mode === 'step' ? time < source.atSeconds ? source.initial : source.final : time >= source.startSeconds && time < source.endSeconds ? source.final : source.initial
}
export function eventTimes(settings: TransientSettings): number[] {
  return [...new Set(settings.sources.flatMap(s => s.mode === 'step' ? [s.atSeconds] : s.mode === 'pulse' ? [s.startSeconds, s.endSeconds] : []).filter(t => t > 0 && t <= settings.durationSeconds))].sort((a, b) => a - b)
}
