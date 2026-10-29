import { useEffect, useRef, useState } from 'react'
import type { SweepResult } from '../ac'
import { fmt } from './format'
export function BodeChart({ sweep, ratio = 'Vout/Vin', heading = '实际频扫 / Bode' }: { readonly sweep: SweepResult; readonly ratio?: string; readonly heading?: string }) {
  const svg = useRef<SVGSVGElement>(null), [width, setWidth] = useState(800), [cursor, setCursor] = useState(0)
  useEffect(() => { if (!svg.current || typeof ResizeObserver === 'undefined') return; const observer = new ResizeObserver(entries => { const w = entries[0]?.contentRect.width; if (w) setWidth(Math.max(240, Math.round(w))) }); observer.observe(svg.current); return () => observer.disconnect() }, [])
  const { points, options, features } = sweep, current = points[Math.min(cursor, points.length - 1)]!, left = 52, right = width - 18
  const logStart = Math.log10(options.startHz), span = Math.log10(options.endHz) - logStart
  const x = (f: number) => left + (Math.log10(f) - logStart) / span * (right - left)
  const gains = points.flatMap(p => p.kind === 'available' && p.gainDb !== null ? [p.gainDb] : []), lo = Math.min(-3, ...gains) - 3, hi = Math.max(0, ...gains) + 3
  const y = (v: number, phase: boolean) => phase ? 246 + (180 - v) / 360 * 130 : 30 + (hi - v) / (hi - lo) * 140
  function path(phase: boolean): string {
    let connected = false, previous: number | null = null
    return points.map(p => { const v = p.kind === 'available' ? phase ? p.phaseDegrees : p.gainDb : null; if (v === null) { connected = false; previous = null; return '' } const command = connected && !(phase && previous !== null && Math.abs(v - previous) > 180) ? 'L' : 'M'; connected = true; previous = v; return `${command}${x(p.frequencyHz)},${y(v, phase)}` }).join(' ')
  }
  return <section className="ac-bode" aria-label="Bode 频率响应">
    <h3>{heading}</h3><p>横轴为对数频率；幅频 20 log₁₀|{ratio}|，相位采用 −180°…180° 主值。空点及相位跳变不连线。</p>
    <svg ref={svg} viewBox={`0 0 ${width} 410`} role="img" aria-label="实际 Bode 幅频与相频曲线" onPointerMove={e => { const box = e.currentTarget.getBoundingClientRect(), position = (e.clientX - box.left) / box.width * width; let best = 0; for (let i = 1; i < points.length; i++) if (Math.abs(x(points[i]!.frequencyHz) - position) < Math.abs(x(points[best]!.frequencyHz) - position)) best = i; setCursor(best) }}>
      <text x={left} y={17}>增益 / dB</text><text x={left} y={231}>相位 / °</text>
      {[0, .5, 1].map(t => <g key={t}><line className="ac-grid" x1={left} x2={right} y1={30 + 140 * t} y2={30 + 140 * t} /><text x={left - 6} y={34 + 140 * t} textAnchor="end">{Number((hi - (hi - lo) * t).toPrecision(3))}</text><line className="ac-grid" x1={left} x2={right} y1={246 + 130 * t} y2={246 + 130 * t} /><text x={left - 6} y={250 + 130 * t} textAnchor="end">{180 - 360 * t}</text></g>)}
      {[0, .5, 1].map(t => <g key={t}><line className="ac-grid" x1={left + t * (right - left)} x2={left + t * (right - left)} y1={30} y2={376} /><text x={left + t * (right - left)} y={398} textAnchor={t === 0 ? 'start' : t === 1 ? 'end' : 'middle'}>{fmt(10 ** (logStart + t * span))} Hz</text></g>)}
      <path className="ac-trace" d={path(false)} /><path className="ac-phase" d={path(true)} /><line className="ac-cursor" x1={x(current.frequencyHz)} x2={x(current.frequencyHz)} y1={30} y2={376} />
    </svg>
    <label>频点游标<input aria-label="频点游标" type="range" min={0} max={points.length - 1} value={Math.min(cursor, points.length - 1)} onChange={e => setCursor(Number(e.target.value))} /></label>
    <output aria-label="频点读数">{fmt(current.frequencyHz)} Hz · {current.kind === 'failed' ? `${current.diagnostic.code}：${current.diagnostic.message}` : `|H| = ${fmt(current.magnitude)} · ${current.gainDb === null ? '−∞ dB（零传输）' : `${fmt(current.gainDb)} dB`} · ${current.phaseDegrees === null ? '相位未定义' : `${fmt(current.phaseDegrees)}°`}`}</output>
    <p>采样最大值：{features.sampledPeak ? `${fmt(features.sampledPeak.frequencyHz)} Hz / ${fmt(features.sampledPeak.gainDb)} dB` : '不可用'}。半功率交点估计：{features.halfPowerCrossingsHz.map(f => `${fmt(f)} Hz`).join('、') || '未解析出'}。带宽估计：{features.estimatedBandwidthHz === null ? '不可用' : `${fmt(features.estimatedBandwidthHz)} Hz`}。</p>
    {sweep.analyticalReference && <p data-testid="ac-analytical">解析参考 {fmt(sweep.analyticalReference.frequencyHz)} Hz · {sweep.analyticalReference.description}</p>}
    {features.notes.map(note => <p className="muted" key={note}>{note}</p>)}
    <details><summary>全部频点与失败原因（{points.length} 点）</summary><div className="ac-scroll"><table><thead><tr><th>Hz</th><th>|H|</th><th>dB</th><th>° / 诊断</th></tr></thead><tbody>{points.map((p, i) => <tr key={i}><td>{fmt(p.frequencyHz)}</td>{p.kind === 'available' ? <><td>{fmt(p.magnitude)}</td><td>{p.gainDb === null ? '−∞' : fmt(p.gainDb)}</td><td>{p.phaseDegrees === null ? '未定义' : fmt(p.phaseDegrees)}</td></> : <td colSpan={3}>{p.diagnostic.code}：{p.diagnostic.message}</td>}</tr>)}</tbody></table></div></details>
  </section>
}
