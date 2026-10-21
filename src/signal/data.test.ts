import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { createId } from '../engineering'
import { deserializeProject, serializeProject } from '../project-format'
import { appendGenerated, appendSpectrum, assetBytes, digestJson, emptySignalDocument, loadWaveform, measurementsFor } from './data'
import { DEFAULT_GENERATOR, SIGNAL_ENGINE } from './numerics'
import { csvSamples, decodeCsv, exportCsv, importCsv, parseCsv } from './csv'
import type { CsvMapping } from './csv'
import { signalFftEngine } from './engine'

beforeEach(() => vi.stubGlobal('crypto', webcrypto))
afterEach(() => vi.unstubAllGlobals())
const writer = { name: 'test fixture', version: '0.0.0' }
const mapping: CsvMapping = { timeColumn: 0, timeUnit: 'ms', channels: [{ column: 1, name: '电压', unit: 'mV' }, { column: 2, name: '电流', unit: 'mA' }] }
const csv = 'time,voltage,current\r\n0,0,10\r\n1,1000,20\r\n2,0,30\r\n3,-1000,40\r\n'

describe('CSV measurement contract', () => {
  it('handles UTF-8, BOM, quoted headers, CRLF and explicit units without magnitude inference', () => {
    const bytes = new TextEncoder().encode('\uFEFF"time","voltage, measured",current\r\n0,1,2\r\n1,3,4\r\n')
    const table = parseCsv(decodeCsv(bytes)), data = csvSamples(table, mapping)
    expect(table.headers[1]).toBe('voltage, measured'); expect(data.axis.intervalSeconds).toBe(0.001)
    expect([...data.channels[0]!.values]).toEqual([0.001, 0.003]); expect(data.channels[1]!.unit).toBe('A')
    expect(csvSamples(table, { ...mapping, timeUnit: 's' }).axis.intervalSeconds).toBe(1)
  })
  it.each([
    ['t,v\n0,1\n1,', 'csv-value'], ['t,v\n0,1\n1,Infinity', 'csv-value'],
    ['t,v\n0,1\n1,NaN', 'csv-value'], ['t,v\n0,1\n1,0x10', 'csv-value'],
    ['t,v\n0,1\n1,2,3', 'csv-length'], ['t,v\n0,1\n0,2', 'csv-time-order'],
    ['t,v\n0,1\n1,2\n3,3', 'csv-irregular'], ['t,v\n0,1\n,', 'csv-value'],
  ])('rejects invalid CSV with row/column diagnostics: %s', (text, code) => {
    try { csvSamples(parseCsv(text), { timeColumn: 0, timeUnit: 's', channels: [{ column: 1, name: 'CH1', unit: 'V' }] }); throw new Error('Expected rejection') }
    catch (e) { expect(e).toMatchObject({ code }); expect(e).toHaveProperty('row'); expect(e).toHaveProperty('column') }
  })
  it('rejects ambiguous headers, unclosed quotes, unsupported syntax and invalid UTF-8', () => {
    for (const text of ['t,t\n0,1\n1,2', 't;v\n0;1\n1;2', 't,v\n0,"1\n1,2', 't,v\n0,"1"x\n1,2']) expect(() => parseCsv(text)).toThrow()
    expect(() => decodeCsv(new Uint8Array([0xff]))).toThrow(/UTF-8/)
    expect(() => decodeCsv(new Uint8Array(8 * 1024 * 1024 + 1))).toThrow(/未截断/)
  })
  it('checks mapped columns instead of accepting duplicated time/amplitude sources', () => {
    expect(() => csvSamples(parseCsv(csv), { ...mapping, channels: [{ column: 0, name: 'bad', unit: 'V' }] })).toThrow(/明确选择/)
  })
  it('preserves original bytes, channel units/IDs, mapping and provenance through portable JSON', async () => {
    const bytes = new TextEncoder().encode(csv), imported = await importCsv(await emptySignalDocument(writer), bytes, '真实测量.csv', mapping)
    const w = loadWaveform(imported.document, imported.datasetId)
    expect(w.dataset.source.kind).toBe('imported'); expect(w.channels.map(c => c.channel.samples.unit)).toEqual(['V', 'A'])
    expect([...w.channels[0]!.values]).toEqual([0, 1, 0, -1]); expect(w.axis.intervalSeconds).toBe(0.001)
    if (w.dataset.source.kind !== 'imported') throw Error('Expected imported source')
    expect([...assetBytes(imported.document, w.dataset.source.originalAssetId)]).toEqual([...bytes])
    const serialized = await serializeProject(imported.document), reopened = await deserializeProject(serialized)
    expect(reopened.kind).toBe('ready'); if (reopened.kind !== 'ready') throw Error('Expected valid project')
    expect(loadWaveform(reopened.document, imported.datasetId).channels[0]!.channel.id).toBe(w.channels[0]!.channel.id)
    expect(await serializeProject(reopened.document)).toBe(serialized)
  })
  it('exports all original samples and round-trips CSV while full provenance stays in project JSON', async () => {
    const imported = await importCsv(await emptySignalDocument(writer), new TextEncoder().encode(csv), 'source.csv', mapping)
    const w = loadWaveform(imported.document, imported.datasetId), text = exportCsv(w)
    expect(text.split('\r\n')[0]).toBe('time_s,CH1_V,CH2_A')
    const back = csvSamples(parseCsv(text), { timeColumn: 0, timeUnit: 's', channels: [{ column: 1, name: 'CH1', unit: 'V' }, { column: 2, name: 'CH2', unit: 'A' }] })
    expect(back.axis).toEqual(w.axis); expect([...back.channels[1]!.values]).toEqual([...w.channels[1]!.values])
  })
})
describe('signal asset and analysis integration', () => {
  it('hashes canonical object keys while retaining meaningful array order', async () => {
    expect(await digestJson({ z: [1, 2], a: { y: 3, x: 4 } })).toBe(await digestJson({ a: { x: 4, y: 3 }, z: [1, 2] }))
    expect(await digestJson([1, 2])).not.toBe(await digestJson([2, 1]))
  })
  it('generates immutable waveform assets and records complete source configuration', async () => {
    const initial = await emptySignalDocument(writer), generated = await appendGenerated(initial, DEFAULT_GENERATOR), w = loadWaveform(generated.document, generated.datasetId)
    expect(initial.project.measurements).toHaveLength(0); expect(w.dataset.source.kind).toBe('simulated')
    expect(w.dataset.metadata.generator).toEqual(DEFAULT_GENERATOR)
    expect(generated.document.project.analyses[0]!.analysisType).toBe('signal.generate')
    const rms = measurementsFor(w, w.channels[0]!.channel.id).find(m => m.name === 'totalRms')!
    expect(rms.kind).toBe('available'); if (rms.kind === 'available') { expect(rms.value.value).toBeCloseTo(Math.SQRT1_2, 13); expect(rms.options.scope).toBe('full-capture') }
  })
  it('retains raw input, derived spectrum parameters, finite bins and result provenance on reopen', async () => {
    const g = await appendGenerated(await emptySignalDocument(writer), DEFAULT_GENERATOR), w = loadWaveform(g.document, g.datasetId), c = w.channels[0]!
    const configuration = { id: createId(), analysisType: 'signal.fft', preferredEngine: SIGNAL_ENGINE, scope: { kind: 'dataset' as const, datasetIds: [w.dataset.id] }, options: { channelId: c.channel.id, scope: 'full-capture', window: 'hann', removeMean: true } }
    const inputDigest = await digestJson({ ...g.document.project, revision: null, results: [], configuration })
    const executed = await signalFftEngine.run({ project: g.document.project, configuration, inputDigest }, { signal: new AbortController().signal, readAsset: id => Promise.resolve(assetBytes(g.document, id)), onProgress: () => {} })
    if (executed.outcome.kind !== 'success') throw Error('Expected FFT success')
    const result = await appendSpectrum(g.document, w, c.channel.id, executed.outcome.value.spectrum, { configuration, provenance: executed.provenance })
    expect(result.project.measurements).toHaveLength(2); const spectrum = result.project.measurements.find(d => d.kind === 'spectrum')!
    expect(spectrum.source).toMatchObject({ kind: 'derived', inputDatasetIds: [g.datasetId], options: { window: 'hann', removeMean: true } })
    expect(spectrum.metadata).toMatchObject({ normalization: 'one-sided-peak-amplitude', sampleCount: 1024, binSpacingHz: 1 })
    expect(spectrum.metadata.coherentGain).toBeCloseTo(0.5, 14)
    expect(result.project.results[0]!.outcome).toBe('success')
    expect(result.project.results[0]!.analysisId).toBe(configuration.id)
    const artifact = JSON.parse(new TextDecoder().decode(assetBytes(result, result.project.results[0]!.artifactAssetIds[0]!))) as { provenance: unknown }
    expect(artifact.provenance).toEqual(executed.provenance)
    const parsed = await deserializeProject(await serializeProject(result)); expect(parsed.kind).toBe('ready')
    if (parsed.kind === 'ready') expect([...parsed.document.project.measurements].sort((a, b) => a.id.localeCompare(b.id))).toEqual([...result.project.measurements].sort((a, b) => a.id.localeCompare(b.id)))
  })
  it('detects corrupted sample payloads through existing checksum validation', async () => {
    const g = await appendGenerated(await emptySignalDocument(writer), DEFAULT_GENERATOR)
    const raw = JSON.parse(await serializeProject(g.document)) as { inlineAssets: { data: string }[] }
    raw.inlineAssets[0]!.data = (raw.inlineAssets[0]!.data.startsWith('A') ? 'B' : 'A') + raw.inlineAssets[0]!.data.slice(1)
    const result = await deserializeProject(JSON.stringify(raw)); expect(result.kind).toBe('invalid')
  })
  it('rejects explicitly irregular imported project axes rather than passing them to FFT', async () => {
    const g = await appendGenerated(await emptySignalDocument(writer), DEFAULT_GENERATOR)
    const input = { project: g.document.project, inputDigest: await digestJson({ test: 1 }), configuration: { id: createId(), analysisType: 'signal.fft', scope: { kind: 'dataset' as const, datasetIds: [g.datasetId] }, options: { channelId: 'missing', window: 'rectangular', removeMean: false } } }
    expect(signalFftEngine.inspect(input).kind).toBe('unsupported')
    const malformed = { ...input, project: { ...input.project, measurements: input.project.measurements.map(d => ({ ...d, axis: { kind: 'explicit-time' as const, times: { ...d.channels[0]!.samples, unit: 's' } } })) } }
    expect(signalFftEngine.inspect(malformed).kind).toBe('unsupported')
  })
  it('executes the async provider against verified assets, reports progress and honors cancellation', async () => {
    const g = await appendGenerated(await emptySignalDocument(writer), DEFAULT_GENERATOR), w = loadWaveform(g.document, g.datasetId)
    const input = { project: g.document.project, configuration: { id: createId(), analysisType: 'signal.fft', preferredEngine: SIGNAL_ENGINE, scope: { kind: 'dataset' as const, datasetIds: [g.datasetId] }, options: { channelId: w.channels[0]!.channel.id, window: 'rectangular', removeMean: false } }, inputDigest: await digestJson({ test: 'fft' }) }
    const controller = new AbortController(), progress = vi.fn(), host = { signal: controller.signal, readAsset: (id: string) => Promise.resolve(assetBytes(g.document, id)), onProgress: progress }
    const result = await signalFftEngine.run(input, host)
    expect(result.outcome.kind).toBe('success'); if (result.outcome.kind === 'success') expect(result.outcome.value.spectrum.peak?.hertz).toBe(100)
    expect(progress).toHaveBeenLastCalledWith(1, 1)
    controller.abort(); expect((await signalFftEngine.run(input, host)).outcome.kind).toBe('cancelled')
    const bad = await signalFftEngine.run(input, { ...host, signal: new AbortController().signal, readAsset: () => Promise.resolve(new Uint8Array(1)) }); expect(bad.outcome.kind).toBe('failure')
  })
})
