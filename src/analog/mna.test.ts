import { describe, expect, it } from 'vitest'
import { assemble, layout, smallSignal, solveAnalog } from './mna'
import { mosPoint, shockley, thermalVoltage } from './devices'
import type { AnalogCircuit, AnalogElement } from './types'

const e = (id: string, kind: AnalogElement['kind'], nodes: string[], parameters: Record<string, number>): AnalogElement => ({ id, reference: id, kind, nodes, pinIds: nodes.map((_, i) => `${id}:${i}`), parameters })
const circuit = (elements: AnalogElement[]): AnalogCircuit => ({ referenceKey: '0', referenceAnchorId: 'g', nodes: [...new Set(elements.flatMap(e => e.nodes))].map(key => ({ key, anchorIds: [key === '0' ? 'g' : key] })), elements })
const v = (id: string, node: string, value: number) => e(id, 'voltage-source', [node, '0'], { voltage: value })
const r = (id: string, a: string, b: string, value: number) => e(id, 'resistor', [a, b], { resistance: value })
const diode = (a = 'd', b = '0') => e('D', 'diode', [a, b], { saturationCurrent: 1e-12, ideality: 1, temperature: 300, reverseLimit: 5 })
const npn = () => e('Q', 'npn', ['b', 'c', '0'], { saturationCurrent: 1e-15, temperature: 300, beta: 100, saturationVoltage: .2 })
const mos = () => e('M', 'nmos', ['g', 'd', '0'], { threshold: 1, transconductance: .001 })
const amp = (plus: string, minus: string) => e('U', 'ideal-opamp', [plus, minus, 'out'], { modelVersion: 1 })
const at = (s: ReturnType<typeof solveAnalog>, id: string) => s.devices.find(d => d.componentId === id)!

describe('independent analog device and original-unit MNA fixtures', () => {
  it('uses exact Kelvin constants and Shockley derivative, not a constant drop', () => {
    expect(thermalVoltage(300)).toBeCloseTo(.0258519997864, 12)
    const d = shockley(.6, 1e-12, 1, 300)
    expect(d.current).toBeCloseTo(.01201036955, 9)
    expect(d.gd).toBeCloseTo((shockley(.600001, 1e-12, 1, 300).current - shockley(.599999, 1e-12, 1, 300).current) / .000002, 7)
    expect(() => shockley(.1, 0, 1, 300)).toThrow()
    expect(() => shockley(100, 1e-12, 1, 300)).toThrow()
    expect(() => shockley(.5, 1e308, 1, 300)).toThrow(/有限/)
  })
  it('does not accept overflowed local rpi as a finite verified result', () => {
    const q = { ...npn(), parameters: { ...npn().parameters, saturationCurrent: 1e-320 } }
    expect(() => solveAnalog(circuit([v('V', 'c', 5), v('B', 'b', .1), q]))).toThrow(/有限/)
  })
  it('solves series diode loadline against independent bisection', () => {
    const c = circuit([v('V', 'in', 5), r('R', 'in', 'd', 1000), diode()]), s = solveAnalog(c)
    let lo = 0, hi = 1
    for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (1e-12 * Math.expm1(mid / .025851999786435535) > (5 - mid) / 1000) hi = mid; else lo = mid }
    expect(s.nodeVolts.d).toBeCloseTo((lo + hi) / 2, 8)
    expect(s.maxKclAmps).toBeLessThan(1e-11); expect(s.maxConstraintVolts).toBeLessThan(1e-9)
    expect(at(s, 'D').terminalAmps[0]).toBeCloseTo((5 - s.nodeVolts.d!) / 1000, 10)
  })
  it.each([false, true])('handles reverse bias and reversed diode orientation %s', reversed => {
    const s = solveAnalog(circuit([v('V', 'in', reversed ? 2 : -2), r('R', 'in', 'd', 1000), reversed ? diode('0', 'd') : diode()]))
    expect(at(s, 'D').region).toBe('reverse'); expect(at(s, 'D').terminalAmps[0]).toBeCloseTo(-1e-12, 15)
  })
  it('rejects reverse breakdown, floating and conflicting sources and failed iteration', () => {
    expect(() => solveAnalog(circuit([v('V', 'in', -6), r('R', 'in', 'd', 1000), diode()]))).toThrow(/反向/)
    expect(() => solveAnalog(circuit([r('R', 'a', 'b', 100)]))).toThrow()
    expect(() => solveAnalog(circuit([v('V', 'in', 1), v('V2', 'in', 2)]))).toThrow()
    expect(() => solveAnalog(circuit([v('V', 'in', 5), r('R', 'in', 'd', 1000), diode()]), undefined, 1)).toThrow(/迭代/)
  })
  it('matches every analytic Jacobian column to central differences', () => {
    const c = circuit([v('V', 'in', 5), r('R', 'in', 'd', 1000), diode(), v('B', 'b', .6), r('RC', 'in', 'c', 1000), npn(), v('G', 'g', 2), r('RD', 'in', 'md', 1000), { ...mos(), nodes: ['g', 'md', '0'] }])
    const l = layout(c), x = Array<number>(l.size).fill(0)
    for (const [node, value] of Object.entries({ in: 5, d: .5, b: .6, c: 3, g: 2, md: 3 })) x[l.node(node)] = value
    const a = assemble(c, x)
    for (let j = 0; j < x.length; j++) {
      const xp = [...x], xm = [...x]; xp[j]! += 1e-6; xm[j]! -= 1e-6
      const p = assemble(c, xp), m = assemble(c, xm)
      a.residual.forEach((_, i) => expect(a.jacobian[i]![j]).toBeCloseTo((p.residual[i]! - m.residual[i]!) / 2e-6, 7))
    }
  })
  it.each([[-1, 'cutoff'], [.6, 'active'], [2, 'saturation']] as const)('NPN checks region and terminal KCL at %s V', (bias, region) => {
    const s = solveAnalog(circuit([v('V', 'cc', 5), v('B', 'bias', bias), r('RB', 'bias', 'b', 10000), r('RC', 'cc', 'c', 1000), npn()])), q = at(s, 'Q')
    expect(q.region).toBe(region); expect(q.terminalAmps.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 13)
    if (region === 'active') expect(q.terminalAmps[1]).toBeCloseTo(100 * q.terminalAmps[0]!, 10)
    if (region === 'saturation') { expect(s.nodeVolts.c).toBeCloseTo(.2, 8); expect(q.terminalAmps[1]!).toBeLessThan(100 * q.terminalAmps[0]!) }
  })
  it('computes CE gain including source/base resistance and exact derivative', () => {
    const c = circuit([v('V', 'cc', 5), v('B', 'bias', .65), r('RB', 'bias', 'b', 10000), r('RC', 'cc', 'c', 1000), npn()]), s = solveAnalog(c), q = at(s, 'Q')
    const gain = smallSignal(s, 'B', 'c').gain
    expect(gain).toBeCloseTo(-q.gm! * 1000 * q.rpi! / (q.rpi! + 10000), 8)
    const perturbed = solveAnalog({ ...c, elements: c.elements.map(e => e.id === 'B' ? { ...e, parameters: { voltage: .650001 } } : e) })
    expect(gain).toBeCloseTo((perturbed.nodeVolts.c! - s.nodeVolts.c!) / 1e-6, 3)
    expect(() => smallSignal(s, 'B', 'c', 1)).toThrow(/扰动/)
  })
  it('MOS cutoff, triode, saturation and boundary continuity', () => {
    expect(mosPoint(.5, 1, 1, .001)).toMatchObject({ current: 0, region: 'cutoff' })
    expect(mosPoint(3, 1, 1, .001)).toMatchObject({ current: .0015, gm: .001, gds: .001, region: 'triode' })
    expect(mosPoint(3, 3, 1, .001)).toMatchObject({ current: .002, gm: .002, gds: 0, region: 'saturation' })
    expect(mosPoint(3, 2 - 1e-8, 1, .001).current).toBeCloseTo(mosPoint(3, 2, 1, .001).current, 12)
  })
  it('solves CS bias and gain; excludes reverse VDS and invalid regions', () => {
    const s = solveAnalog(circuit([v('V', 'cc', 10), v('G', 'g', 3), r('RD', 'cc', 'd', 1000), mos()]))
    expect(s.nodeVolts.d).toBeCloseTo(8, 9); expect(smallSignal(s, 'G', 'd').gain).toBeCloseTo(-2, 9)
    const triode = solveAnalog(circuit([v('V', 'cc', 1), v('G', 'g', 3), r('RD', 'cc', 'd', 1000), mos()]))
    expect(at(triode, 'M').region).toBe('triode'); expect(() => smallSignal(triode, 'G', 'd')).toThrow(/仅在/)
    expect(() => solveAnalog(circuit([v('V', 'd', -1), v('G', 'g', 3), mos()]))).toThrow(/反向/)
  })
  it('ideal inverting, noninverting and follower constraints', () => {
    const inv = solveAnalog(circuit([v('V', 'in', .1), r('RI', 'in', 'minus', 10000), r('RF', 'out', 'minus', 100000), amp('0', 'minus')]))
    expect(inv.nodeVolts.out).toBeCloseTo(-1, 9); expect(at(inv, 'U').terminalAmps.slice(0, 2)).toEqual([0, 0])
    const non = solveAnalog(circuit([v('V', 'in', .1), r('RG', 'minus', '0', 10000), r('RF', 'out', 'minus', 90000), amp('in', 'minus')]))
    expect(non.nodeVolts.out).toBeCloseTo(1, 9)
    expect(solveAnalog(circuit([v('V', 'in', .1), amp('in', 'out')])).nodeVolts.out).toBeCloseTo(.1, 9)
  })
  it('summing and matched differential independent fixtures', () => {
    const sum = solveAnalog(circuit([v('V1', 'a', .1), v('V2', 'b', .2), r('R1', 'a', 'm', 10000), r('R2', 'b', 'm', 20000), r('RF', 'out', 'm', 100000), amp('0', 'm')]))
    expect(sum.nodeVolts.out).toBeCloseTo(-2, 9)
    const diff = solveAnalog(circuit([v('V1', 'a', .1), v('V2', 'b', .3), r('R1', 'a', 'm', 10000), r('RF', 'out', 'm', 100000), r('R3', 'b', 'p', 10000), r('R4', 'p', '0', 100000), amp('p', 'm')]))
    expect(diff.nodeVolts.out).toBeCloseTo(2, 9)
  })
  it('rejects open loop, positive feedback, nonfinite and cancellation', () => {
    expect(() => solveAnalog(circuit([v('V', 'in', .1), amp('in', '0')]))).toThrow(/负反馈/)
    expect(() => solveAnalog(circuit([v('V', 'in', .1), amp('out', 'in')]))).toThrow(/负反馈/)
    expect(() => solveAnalog(circuit([v('V', 'in', Infinity)]))).toThrow()
    expect(() => solveAnalog(circuit([v('V', 'in', 1)]), AbortSignal.abort())).toThrow(/取消/)
  })
})
