import { useState } from 'react'
import { curveSvg } from '../capstone/report'
import type { StudyCurve } from '../capstone'
export function StudyChart({ curve, legend }: { readonly curve: StudyCurve; readonly legend: string }) {
  const [cursor, setCursor] = useState(0), index = Math.min(cursor, curve.x.length - 1)
  return <figure className="capstone-chart"><figcaption>{legend} · {curve.label}（横轴 {curve.xUnit}；纵轴 {curve.yUnit}）</figcaption><div dangerouslySetInnerHTML={{ __html: curveSvg(curve) }} /><label>样本游标<input aria-label={`${legend} 样本游标`} type="range" min={0} max={Math.max(0, curve.x.length - 1)} value={index} onChange={e => setCursor(Number(e.target.value))} /></label><output>{curve.x[index]} {curve.xUnit} · {curve.y[index] === null ? '不可用/断点' : curve.y[index]} {curve.yUnit}</output></figure>
}
