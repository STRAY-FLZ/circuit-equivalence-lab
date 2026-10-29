import type { ComponentDefinition, ComponentInstance, ParameterValue } from '../engineering'
import type { EditOperation } from '../editing'

const parameterNames: Readonly<Record<string, string>> = { resistance: '电阻', capacitance: '电容', inductance: '电感', voltage: '电压', current: '电流', gain: '增益', openLoopGain: '开环直流增益 A0', poleHz: '主极点频率', controlBranchId: '控制电流支路', saturationCurrent: '饱和电流 IS', ideality: '理想因子 n', temperature: '结温', reverseLimit: '反向有效电压上限', beta: '正向电流增益 β', saturationVoltage: '饱和压降 VCEsat', threshold: '阈值 Vth', transconductance: '平方律系数 k', modelVersion: '模型版本' }
const unitNames: Readonly<Record<string, string>> = { ohm: 'Ω', F: 'F', H: 'H', V: 'V', A: 'A' }
export function ComponentProperties({ component, definition, controllers = [], onEdit }: { readonly component: ComponentInstance; readonly definition: ComponentDefinition; readonly controllers?: readonly ComponentInstance[]; readonly onEdit: (op: EditOperation) => void }) {
  return <form onSubmit={event => {
    event.preventDefault()
    const data = new FormData(event.currentTarget), parameters: Record<string, ParameterValue> = {}
    const text = (key: string) => { const value = data.get(key); return typeof value === 'string' ? value : '' }
    definition.parameters.forEach((p, i) => {
      const old = component.parameters[p.key], key = `param:${i}`
      if (!old) return
      if (old.kind === 'quantity') parameters[p.key] = { kind: 'quantity', quantity: { value: Number(data.get(key)), unit: old.quantity.unit } }
      else if (old.kind === 'complex') parameters[p.key] = { kind: 'complex', unit: old.unit, value: { real: Number(data.get(`${key}:real`)), imaginary: Number(data.get(`${key}:imaginary`)) } }
      else if (old.kind === 'boolean') parameters[p.key] = { kind: 'boolean', value: data.has(key) }
      else parameters[p.key] = { kind: 'text', value: text(key) }
    })
    onEdit({ type: 'properties', id: component.id, reference: text('reference'), parameters })
  }}>
    <label>元件标识<input name="reference" aria-label="元件标识" defaultValue={component.reference} required /></label>
    {definition.parameters.map((p, i) => {
      const value = component.parameters[p.key], name = parameterNames[p.key] ?? p.key, key = `param:${i}`
      if (!value) return <p key={p.key}>可选参数 {name} 尚未设置。</p>
      if (value.kind === 'quantity') return <label key={p.key}>{name} / {unitNames[value.quantity.unit] ?? value.quantity.unit}<input aria-label={`${name}值`} name={key} type="number" step="any" required defaultValue={value.quantity.value} /></label>
      if (value.kind === 'complex') return <fieldset key={p.key}><legend>{name} / {value.unit}</legend><label>实部<input name={`${key}:real`} type="number" step="any" required defaultValue={value.value.real} /></label><label>虚部<input name={`${key}:imaginary`} type="number" step="any" required defaultValue={value.value.imaginary} /></label></fieldset>
      if (value.kind === 'boolean') return <label key={p.key}>{name}<input name={key} type="checkbox" defaultChecked={value.value} /></label>
      if (p.key === 'controlBranchId') return <label key={p.key}>{name}<select name={key} aria-label="控制电流支路" defaultValue={value.value}><option value="">请选择电压定义支路</option>{value.value && !controllers.some(c => c.id === value.value) && <option value={value.value}>引用已失效：{value.value}</option>}{controllers.map(c => <option key={c.id} value={c.id}>{c.reference} · I(1 → 2)</option>)}</select><small>可添加 0 V 电压源测量控制电流。引用采用稳定 ID，修改标识不影响控制关系。</small></label>
      return <label key={p.key}>{name}<input name={key} defaultValue={value.value} /></label>
    })}
    <button type="submit">应用属性</button>
    <p className="muted">标识可更改，内部身份保持不变。参数修改后请显式重新运行直流分析。</p>
    <details><summary>身份与定义</summary><p className="editor-id">{component.id}</p><p>{definition.resource.id} · {definition.resource.version}</p></details>
  </form>
}
