import type { ComponentDefinition, ComponentInstance, ParameterValue } from '../engineering'
import type { EditOperation } from '../editing'

const parameterNames: Readonly<Record<string, string>> = { resistance: '电阻', capacitance: '电容', inductance: '电感', voltage: '电压', current: '电流' }
const unitNames: Readonly<Record<string, string>> = { ohm: 'Ω', F: 'F', H: 'H', V: 'V', A: 'A' }
export function ComponentProperties({ component, definition, onEdit }: { readonly component: ComponentInstance; readonly definition: ComponentDefinition; readonly onEdit: (op: EditOperation) => void }) {
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
      return <label key={p.key}>{name}<input name={key} defaultValue={value.value} /></label>
    })}
    <button type="submit">应用属性</button>
    <p className="muted">标识可更改，内部身份保持不变。当前仅编辑，不运行仿真。</p>
    <details><summary>身份与定义</summary><p className="editor-id">{component.id}</p><p>{definition.resource.id} · {definition.resource.version}</p></details>
  </form>
}
