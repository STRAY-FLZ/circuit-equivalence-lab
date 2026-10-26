# Measurement, Waveform, and Signal Data Contracts

Status: V2.0-A proposed design (A07). No signal engine, FFT package, or hardware
connection is implemented. Use common IDs/units/assets from
[DOMAIN_MODEL.md](DOMAIN_MODEL.md) and the file rules in [PROJECT_FORMAT.md](PROJECT_FORMAT.md).

## Dataset and provenance contracts

```ts
import type { Id, JsonObject, Quantity, ResourceRef, Revision } from './DOMAIN_MODEL'

export interface NumericSeriesRef {
  readonly assetId: Id
  readonly encoding: 'float64-le'
  readonly count: number
  readonly unit: string
}
export type SamplingAxis =
  | { readonly kind: 'uniform-time'; readonly startSeconds: number; readonly intervalSeconds: number; readonly count: number }
  | { readonly kind: 'explicit-time'; readonly times: NumericSeriesRef }
  | { readonly kind: 'frequency'; readonly frequencies: NumericSeriesRef }
export type DatasetSource =
  | { readonly kind: 'simulated'; readonly engine: ResourceRef; readonly projectRevision: Revision; readonly analysisId: Id; readonly inputDigest: string }
  | { readonly kind: 'imported'; readonly fileName: string; readonly originalAssetId: Id; readonly importedAtUtc: string; readonly columnMap: JsonObject }
  | { readonly kind: 'hardware'; readonly instrument: string; readonly acquisitionId: string; readonly acquiredAtUtc: string; readonly configuration: JsonObject }
  | { readonly kind: 'derived'; readonly inputDatasetIds: readonly Id[]; readonly operation: ResourceRef; readonly options: JsonObject }
export interface Calibration {
  readonly gain: number
  readonly offset: Quantity
  readonly applied: boolean
  readonly sourceNote: string
}
export interface WaveformChannel {
  readonly id: Id
  readonly name: string
  readonly samples: NumericSeriesRef
  readonly probeAnchorId?: Id
  readonly calibration?: Calibration
}
export interface MeasurementDataset {
  readonly id: Id
  readonly title: string
  readonly kind: 'waveform' | 'spectrum'
  readonly source: DatasetSource
  readonly axis: SamplingAxis
  readonly channels: readonly WaveformChannel[]
  readonly metadata: JsonObject
}
export type ScalarMeasurement =
  | { readonly kind: 'available'; readonly name: string; readonly value: Quantity; readonly datasetId: Id; readonly channelId: Id; readonly method: ResourceRef; readonly options: JsonObject; readonly uncertainty?: Quantity }
  | { readonly kind: 'unavailable'; readonly name: string; readonly reason: string; readonly datasetId: Id; readonly channelId: Id }
```

DatasetSource describes how the current samples arose. A hardware acquisition or
import keeps its original source immutable; filtering, calibration application,
resampling, and FFT create a derived dataset referencing their inputs. The source
graph must be acyclic and remain resolvable in a portable export. Derived datasets
preserve access to original imported/hardware data through that graph. Simulated
data uses the exact engine/analysis/revision/digest; it is never labelled as measured.

Initial generators can use `simulated` with a signal-generation analysis configuration
and engine; a schematic is not required. A later true live stream may append blocks
at runtime, but persisted datasets are immutable finite captures, not an open stream.
UTC timestamps use explicit ISO 8601 `Z` form and never replace relative sample times.

## Project structure and sampled payloads (D06)

The project's `measurements` collection stores the descriptors above: identity,
provenance, axis descriptions, channel metadata, and asset references. NumericSeriesRef
identifies a sampled payload; it does not embed arrays in the editable circuit graph.
AssetEntry records byte length/media type/hash independently of the payload's
physical storage. This logical separation applies even when both are delivered in
one portable JSON file.

Small datasets may initially use inline assets with the existing float64-le
encoding. Large sampled payloads are not required to remain inline. External
containers/package formats and streaming persistence are deferred until concrete
requirements exist, without inventing a format now. Until supported, an oversized
capture must produce an explicit resource/export limitation rather than silent
truncation or an incomplete supposedly portable file. Preserve source data and
the ID/count/unit/checksum/provenance relationships in every supported transfer.

## Axis, channel, and sample invariants

- Uniform time: finite start, interval strictly positive, count a positive integer;
  sample `i` occurs at `startSeconds + i * intervalSeconds` for `0 <= i < count`.
  Sampling rate is derived as `1 / intervalSeconds`, not stored as an independent
  conflicting authority. Verify representable time/rate ranges before analysis.
- Explicit time: `s` units, finite strictly increasing values, positive count.
  Irregular sampling is representable but not automatically acceptable to FFT.
- Frequency: `Hz` units, finite nonnegative strictly increasing bins; waveform
  datasets use time axes and spectrum datasets use frequency axes. Multiple
  separate sweep captures remain separate datasets until explicitly aligned.
- All channels share the same axis/count. Different-rate channels belong in
  separate datasets or undergo an explicit resampling operation with provenance.
- A float64 series asset has exactly `8 * count` decoded bytes; values are finite.
  Waveform amplitude units are declared per channel. Complex spectra use two
  channels with declared real/imaginary roles in a versioned spectrum metadata
  contract; no ambiguous interleaving is assumed.
- Initial V2.1 imports reject missing/nonfinite samples with row/column diagnostics.
  Do not silently replace gaps by zero or smuggle NaN into JSON/binary payloads.
  A validity-mask/gapped-data extension requires its own later contract.
- `probeAnchorId`, if present, refers to a surviving project anchor. Measurement
  source revision remains historical when a circuit changes; it cannot be used as
  current simulation evidence without checking provenance.

Calibration records `corrected = gain * raw + offset`, with dimensionless finite
gain and offset in the sample unit. `applied` says whether stored samples already
include that correction. Applying it produces a derived dataset and cannot apply
it twice silently. Uncertainty needs method/source evidence; unavailable accuracy
is not zero uncertainty. Distinguish calibration, instrument resolution, and
statistical/numerical error in later measurement methods.

## Minimal waveform fixture and numerical semantics

Design fixture: a uniform time axis starts at 0 s with interval 0.001 s, count 4;
one channel has samples `[0, 1, 0, -1] V` in a verified float64-le asset. Its sampled
peak-to-peak is 2 V and total sampled RMS is `sqrt(2/4) V`. These are exact methods
over four samples, not a claim about the unseen continuous waveform's true extrema.

Available scalar measurements name their dataset/channel, selected interval,
method/version, options, and units. Initial definitions must distinguish:

- Mean, sampled minimum/maximum, and sampled peak-to-peak (`max - min`).
- Total RMS (`sqrt(mean(x²))`) and AC-only RMS (mean removed); labels identify which.
- Sinusoidal amplitude estimate versus sampled peak amplitude.
- Frequency from crossings/spectrum and phase from a specified reference channel;
  insufficient cycles, clipping, noise, or ambiguous peaks yield unavailable output.
- Integration over irregular timestamps versus uniform unweighted sample statistics.

Methods need range-safe accumulation and documented numerical diagnostics when
implemented; this design does not insert a new numerical library. Scalar values
cannot be fabricated when conditions fail. Phase units are rad internally, with
the reference channel, sign convention, and display conversion recorded.

## FFT and spectrum contract requirements for V2.1

A spectrum-producing operation records input dataset/channel/interval, sample
count/rate, detrending, window name/version, coherent gain, normalization,
one/two-sided representation, frequency-bin spacing, and amplitude or PSD units.
DC and Nyquist scaling differ from interior one-sided bins. Zero padding changes
displayed bin spacing, not the observation duration's resolving power. Keep these
facts in operation metadata/education; do not produce an unlabeled FFT magnitude.

THD and harmonics require explicit fundamental identification, bandwidth, bin or
interpolation method, window/leakage handling, and noise policy. V2.1 may scope these
out of its first release; do not call an unqualified spectral ratio true THD.
Nonuniform input must be rejected by a uniform FFT provider or resampled explicitly.

## CSV interoperability and multi-channel data

The initial import contract requires a header, explicit user-confirmed time/amplitude
columns and units, delimiter/decimal convention, and time basis. Proposed portable
export uses `time_s,CH1_V,CH2_V` with quoted fields as needed, decimal points, UTF-8,
and full-precision finite numbers. Unit/header choices are recorded in columnMap;
never guess milliseconds versus seconds from value magnitude.

Retain the original CSV as an asset, source filename, mapping, and import time.
CSV data export alone may lose calibration/provenance; the project file carries the
full record. Declare that loss explicitly. Align imported and simulated captures
through an explicit time shift/resampling record, not by visually matching curves.

Hardware transport belongs to a future acquisition adapter. DatasetSource can
describe a capture, but it grants no instrument access or OS permissions.

## Implementation acceptance examples

Round-trip the four-sample fixture and a two-channel capture; verify sample count,
units, hash, source kind, RMS definition, and preservation of raw data. Reject
timestamp reversal, mismatched channel lengths, nonfinite values, wrong byte count,
and unspecified units. Check irregular-time FFT rejection, synthetic/imported/live
source labels, derived-source cycles, and stale simulation/probe references.

## V3.0 simulated transient data — 2026-10-26

Uniform output uses full float64-le assets and stable dataset/channel IDs, in
Signal-compatible four-channel groups. The record retains the original resolved
circuit/parameters/pin directions, IC/source settings, revision/digest and actual
BE step/error/energy metadata. Selection preserves original assets through an
explicit derived lineage; Signal inspection does not silently run an unsuitable
FFT. Schema1 and file budgets remain. See [V3.0 implementation](../v3/TRANSIENT_IMPLEMENTATION.md).
