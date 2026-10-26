import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { displayIndices } from '../signal'
import type { AmplitudeSpectrum, LoadedWaveform } from '../signal'
import { formatNumber } from './format'

const left = 70, top = 26, bottom = 184
function useChartWidth() {
  const ref = useRef<SVGSVGElement>(null), [width, setWidth] = useState(960)
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(entries => { const value = entries[0]?.contentRect.width; if (value && value > 0) setWidth(Math.max(240, Math.round(value))) })
    observer.observe(ref.current); return () => observer.disconnect()
  }, [])
  return { ref, width }
}
function axisNumber(value: number): string { if (!Number.isFinite(value)) return '不可用'; const text = Number(value.toPrecision(4)).toString(); return text.length > 8 ? value.toExponential(2) : text }
function pointerFraction(event: PointerEvent<SVGSVGElement>): number {
  const svg = event.currentTarget, matrix = svg.getScreenCTM()
  if (!matrix) return 0
  const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY
  return Math.max(0, Math.min(1, (point.matrixTransform(matrix.inverse()).x - left) / (svg.viewBox.baseVal.width - 18 - left)))
}
function plotPath(values: Float64Array, first: number, last: number, scale: number, min: number, max: number, right: number): string {
  return displayIndices(values, first, last).map((i, n) => `${n ? 'L' : 'M'}${left + (i - first) / Math.max(1, last - first) * (right - left)} ${bottom - (values[i]! / scale - min) / (max - min) * (bottom - top)}`).join(' ')
}
export function Oscilloscope({ waveform, sampleIndex, onSampleIndex }: { readonly waveform: LoadedWaveform; readonly sampleIndex?: number; readonly onSampleIndex?: (index: number) => void }) {
  const [zoom, setZoom] = useState(1), [offset, setOffset] = useState(0), [cursor, setCursor] = useState(0), [hidden, setHidden] = useState<readonly string[]>([])
  const count = waveform.axis.count, span = Math.max(2, Math.ceil(count / zoom)), storedFirst = Math.min(offset, Math.max(0, count - span))
  const first = sampleIndex !== undefined && (sampleIndex < storedFirst || sampleIndex >= storedFirst + span) ? Math.max(0, Math.min(sampleIndex, count - span)) : storedFirst, last = Math.min(count - 1, first + span - 1)
  const activeCursor = Math.max(first, Math.min(last, sampleIndex ?? cursor)), time = (index: number) => waveform.axis.startSeconds + index * waveform.axis.intervalSeconds
  const changeCursor = (index: number) => { setCursor(index); onSampleIndex?.(index) }
  return <section className="signal-section" aria-label="虚拟示波器"><div className="signal-section-heading"><h2>02 / 虚拟示波器</h2><span>真实样本 · 同步时间轴</span></div>
    <div className="signal-inline-controls"><label>时间缩放<select aria-label="时间缩放" value={zoom} onChange={e => setZoom(Number(e.target.value))}>{[1, 2, 4, 8, 16, 32, 64].map(x => <option key={x} value={x}>{x}×</option>)}</select></label><label>水平位置<input aria-label="水平位置" type="range" min="0" max={Math.max(0, count - span)} step="1" value={first} disabled={count <= span} onChange={e => { const next = Number(e.target.value); setOffset(next); changeCursor(Math.max(next, Math.min(count - 1, next + span - 1, activeCursor))) }} /></label><label>采样光标<input aria-label="采样光标" type="range" min={first} max={last} step="1" value={activeCursor} onChange={e => changeCursor(Number(e.target.value))} /></label></div>
    <div className="signal-channel-controls">{waveform.channels.map(({ channel }, index) => <label key={channel.id}><input type="checkbox" checked={!hidden.includes(channel.id)} onChange={e => setHidden(e.target.checked ? hidden.filter(id => id !== channel.id) : [...hidden, channel.id])} />{index + 1} · {channel.name} / {channel.samples.unit}</label>)}</div>
    <p className="signal-note">各通道共用时间轴，纵轴各自自动缩放，请按刻度比较幅值。点击/滑动图形或用方向键检查样本；缩放不改变测量范围。</p>
    {waveform.channels.filter(c => !hidden.includes(c.channel.id)).map(({ channel, values }, channelIndex) => <WaveformChart key={channel.id} name={channel.name} unit={channel.samples.unit} values={values} channelIndex={channelIndex} first={first} last={last} activeCursor={activeCursor} time={time} onCursor={changeCursor} />)}
    <p className="signal-note">显示采用保留极值的分桶抽稀；原始 {count} 个样本完整保留，统计与 FFT 均使用全采样记录。</p>
  </section>
}
function WaveformChart({ name, unit, values, channelIndex, first, last, activeCursor, time, onCursor }: { readonly name: string; readonly unit: string; readonly values: Float64Array; readonly channelIndex: number; readonly first: number; readonly last: number; readonly activeCursor: number; readonly time: (index: number) => number; readonly onCursor: (index: number) => void }) {
  const { ref, width } = useChartWidth(), right = width - 18
  let scale = 0, min = Infinity, max = -Infinity
  for (let i = first; i <= last; i++) scale = Math.max(scale, Math.abs(values[i]!))
  scale ||= 1
  for (let i = first; i <= last; i++) { min = Math.min(min, values[i]! / scale); max = Math.max(max, values[i]! / scale) }
  if (min === max) { if (min > 0) min = 0; else if (max < 0) max = 0; else { min = -1; max = 1 } }
  const padding = (max - min) * 0.08; min = Math.max(-1, min - padding); max = Math.min(1, max + padding)
  const inspect = (event: PointerEvent<SVGSVGElement>) => onCursor(Math.round(first + pointerFraction(event) * (last - first)))
  return <figure className={`signal-chart channel-${channelIndex % 4}`}><figcaption>{name} · {unit}</figcaption><svg ref={ref} viewBox={`0 0 ${width} 225`} role="application" tabIndex={0} aria-label={`${name} 时域波形`} onPointerMove={inspect} onPointerDown={inspect} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); onCursor(Math.max(first, Math.min(last, activeCursor + (event.key === 'ArrowRight' ? 1 : -1)))) } }}>
    <text x="8" y="15">幅值 / {unit}</text>
    {[0, 1, 2, 3, 4].map(i => <g className="signal-grid" key={i}><line x1={left} x2={right} y1={top + i / 4 * (bottom - top)} y2={top + i / 4 * (bottom - top)} /><text x={left - 8} y={top + i / 4 * (bottom - top) + 4} textAnchor="end">{axisNumber((max - i / 4 * (max - min)) * scale)}</text><line x1={left + i / 4 * (right - left)} x2={left + i / 4 * (right - left)} y1={top} y2={bottom} />{(width >= 480 || i % 2 === 0) && <text x={left + i / 4 * (right - left)} y={bottom + 18} textAnchor={i === 4 ? 'end' : 'middle'}>{axisNumber(time(Math.round(first + i / 4 * (last - first))))}</text>}</g>)}
    <path data-testid="waveform-path" className="signal-trace" d={plotPath(values, first, last, scale, min, max, right)} /><line className="signal-cursor" x1={left + (activeCursor - first) / Math.max(1, last - first) * (right - left)} x2={left + (activeCursor - first) / Math.max(1, last - first) * (right - left)} y1={top} y2={bottom} /><text x={right} y="222" textAnchor="end">时间 / s</text>
  </svg><output aria-label={`${name} 光标读数`}>样本 {activeCursor} · t = {formatNumber(time(activeCursor))} s · {formatNumber(values[activeCursor]!)} {unit}</output></figure>
}
export function SpectrumChart({ spectrum, unit }: { readonly spectrum: AmplitudeSpectrum; readonly unit: string }) {
  const { ref, width } = useChartWidth(), right = width - 18
  let scale = 0
  for (const value of spectrum.amplitudes) scale = Math.max(scale, value)
  scale ||= 1
  return <figure className="signal-chart"><figcaption>单边峰值幅度谱 / {unit}（不是 RMS、功率或 PSD）</figcaption><svg ref={ref} viewBox={`0 0 ${width} 225`} role="img" aria-label="FFT 单边幅度谱">
    <text x="8" y="15">峰值幅度 / {unit}</text>{[0, 1, 2, 3, 4].map(i => <g className="signal-grid" key={i}><line x1={left} x2={right} y1={top + i / 4 * (bottom - top)} y2={top + i / 4 * (bottom - top)} /><text x={left - 8} y={top + i / 4 * (bottom - top) + 4} textAnchor="end">{axisNumber((1 - i / 4) * scale)}</text>{(width >= 480 || i % 2 === 0) && <text x={left + i / 4 * (right - left)} y={bottom + 18} textAnchor={i === 4 ? 'end' : 'middle'}>{axisNumber(i / 4 * spectrum.sampleRateHz / 2)}</text>}</g>)}
    <path data-testid="spectrum-path" className="signal-trace" d={plotPath(spectrum.amplitudes, 0, spectrum.amplitudes.length - 1, scale, 0, 1, right)} /><text x={right} y="222" textAnchor="end">频率 / Hz</text>
  </svg></figure>
}
