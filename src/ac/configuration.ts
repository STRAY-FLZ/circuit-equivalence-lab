import { assertJsonData } from '../engineering'
import type { JsonObject, JsonValue } from '../engineering'
import { AcError } from './types'
import type { AcSettings } from './types'
export function parseAcSettings(options: JsonObject): AcSettings {
  assertJsonData(options)
  const record = (v: JsonValue | undefined): v is JsonObject => v !== null && typeof v === 'object' && !Array.isArray(v)
  const array = (v: JsonValue | undefined): v is readonly JsonValue[] => Array.isArray(v)
  const positive = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0
  if (Object.keys(options).some(k => !['frequencyHz', 'referenceAnchorId', 'sources', 'sweep'].includes(k)) || !positive(options.frequencyHz) || !Number.isFinite(2 * Math.PI * (options.frequencyHz as number))) throw new AcError('AC_FREQUENCY', '交流频率必须严格大于 0 且可表示，单位 Hz；不以小频率代替直流。')
  if (options.referenceAnchorId !== undefined && typeof options.referenceAnchorId !== 'string') throw new AcError('AC_REFERENCE', '参考必须使用稳定连接点 ID。')
  if (!array(options.sources)) throw new AcError('AC_SOURCES', '必须显式配置每个独立源的 RMS 幅值和相位；不会使用直流值。')
  for (const source of options.sources) {
    if (!record(source) || Object.keys(source).some(k => !['componentId', 'magnitudeRms', 'phaseDegrees'].includes(k)) || typeof source.componentId !== 'string' || typeof source.magnitudeRms !== 'number' || !Number.isFinite(source.magnitudeRms) || source.magnitudeRms < 0 || typeof source.phaseDegrees !== 'number' || !Number.isFinite(source.phaseDegrees)) throw new AcError('AC_SOURCES', '源参数必须包含稳定 ID、有限非负 RMS 幅值及有限相位（度）。')
  }
  if (options.sweep !== undefined) {
    const s = options.sweep
    if (!record(s) || Object.keys(s).some(k => !['startHz', 'endHz', 'points', 'spacing', 'excitationSourceId', 'input', 'output', 'passband'].includes(k)) || !positive(s.startHz) || !positive(s.endHz) || (s.endHz as number) <= (s.startHz as number) || !['log', 'linear'].includes(s.spacing as string) || !['low', 'high', 'peak'].includes(s.passband as string) || typeof s.excitationSourceId !== 'string') throw new AcError('AC_SWEEP_OPTIONS', '扫描需明确激励、通带参考、正的起止频率（终点大于起点）及线性/对数间隔。')
    if (typeof s.points !== 'number' || !Number.isSafeInteger(s.points) || s.points < 3 || s.points > 401) throw new AcError('AC_SWEEP_LIMIT', '扫描点数须为 3–401 的整数；不会截断。', [], 'resource')
    for (const pair of [s.input, s.output]) if (!array(pair) || pair.length !== 2 || pair.some(id => typeof id !== 'string')) throw new AcError('AC_PROBES', '输入和输出电压都须指定正、负两个稳定连接点。')
  }
  return options as AcSettings
}
