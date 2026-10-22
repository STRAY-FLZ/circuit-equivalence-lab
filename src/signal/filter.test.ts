import { describe, expect, it } from 'vitest'
import { appendRcFilter, filterRcSamples } from './filter'
import { appendGenerated, DEFAULT_GENERATOR, emptySignalDocument, exportCsv, loadWaveform } from './index'
import { deserializeProject, serializeProject } from '../project-format'
const options = { resistanceOhms: 1000, capacitanceFarads: 1e-6, initialOutput: 0, mode: 'lowpass' as const }
describe('sampled RC zero order hold', () => {
  it('matches the held step at left sample boundaries and highpass complement', () => {
    const input = Float64Array.from({ length: 32 }, () => 1), low = filterRcSamples(input, .0001, options), high = filterRcSamples(input, .0001, { ...options, mode: 'highpass' })
    for (let i = 0; i < input.length; i++) { expect(low.values[i]).toBeCloseTo(1 - Math.exp(-i / 10), 13); expect(low.values[i]! + high.values[i]!).toBeCloseTo(1, 14) }
    expect(filterRcSamples([0, 0, 0], .001, { ...options, initialOutput: 2 }).values[2]).toBeCloseTo(2 * Math.exp(-2), 14)
  })
  it.each([0, -1, Infinity, NaN])('rejects invalid resistance %s', resistanceOhms => expect(() => filterRcSamples([1, 2], .001, { ...options, resistanceOhms })).toThrow())
  it('preserves source assets and portable derived samples and provenance', async () => {
    const original = await appendGenerated(await emptySignalDocument({ name: 'test', version: '2.4.0' }), { ...DEFAULT_GENERATOR }), before = JSON.stringify(original.document), input = loadWaveform(original.document, original.datasetId)
    const derived = await appendRcFilter(original.document, original.datasetId, input.channels[0]!.channel.id, options)
    expect(JSON.stringify(original.document)).toBe(before)
    expect(derived.document.inlineAssets.slice(0, original.document.inlineAssets.length)).toEqual(original.document.inlineAssets)
    const saved = await serializeProject(derived.document), reopened = await deserializeProject(new TextEncoder().encode(saved))
    expect(reopened.kind).toBe('ready'); if (reopened.kind !== 'ready') throw new Error('reopen')
    const output = loadWaveform(reopened.document, derived.datasetId)
    expect(output.channels[0]!.values).toEqual(input.channels[0]!.values)
    expect(output.channels[1]!.values).toEqual(filterRcSamples(input.channels[0]!.values, input.axis.intervalSeconds, options).values)
    expect(output.dataset.source).toMatchObject({ kind: 'derived', inputDatasetIds: [original.datasetId], operation: { id: 'org.stray.signal.rc-zoh', version: '1' }, options: { inputRevision: original.document.project.revision, inputChannelId: input.channels[0]!.channel.id } })
    expect(exportCsv(output).trim().split('\n')).toHaveLength(output.axis.count + 1)
  })
})
