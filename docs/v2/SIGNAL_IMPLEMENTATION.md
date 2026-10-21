# V2.1.0 Signal Measurement & Analysis

Authorized 2026-10-21. Baseline actual public **V2.0.2 `bd79d6a`**; branch
`codex/v2.1-signal-lab`. No V2.2/V2.3, hardware transport or schematic solver.
Status: numerical/data core checkpoint; UI and release pending.

## Data and numerical boundary

`src/signal` uses existing `MeasurementDataset`, stable dataset/channel UUIDs,
`NumericSeriesRef` and checksum-verified float64-le inline assets. Runtime decoded
arrays are projections of those descriptors, never another schematic graph.
Synthetic data references a generator analysis/configuration/digest; imported
data retains original CSV bytes, filename, UTC timestamp and explicit column/unit
mapping; FFT is a separate derived dataset retaining input and analysis settings.
No project schema change. `src/analysis` async provider contract is used for FFT,
with capability checks, asset integrity, progress, cancellation and distinct failure.

Workload limit: 65,536 samples/channel, at most four compatible channels. Existing
format budgets remain 32MiB JSON / 8MiB asset / 16MiB decoded total. Oversized
captures/export fail explicitly without truncation or replacing the current data.

- `generateSamples`: sine/square/triangle/pulse/uniform seeded noise; sample
  `i` is at `startSeconds + i * intervalSeconds`, fs = 1/interval. Amplitude is
  peak about DC offset except pulse (0..amplitude + offset). Square/pulse duty is
  explicit. The 32-bit LCG seed, options and sampled output are reproducible.
  Non-sinusoidal generation is sampled, not bandlimited; harmonics may alias.
- `sampleStatistics`, `measurementsFor`: full-capture sampled extrema, peak-to-peak,
  arithmetic mean, total RMS and mean-removed AC RMS. Scaled accumulation avoids
  square overflow; unrepresentable results fail. Zoom is presentation only.
- `estimateFrequency`: interpolated rising mean crossings with hysteresis; needs
  at least three complete stable periods, >=8 samples/period, max period deviation
  <=2%. Unavailable for insufficient, constant, unstable/noisy or undersampled
  cycles. This is a basic method, not instrument accuracy certification.
- `amplitudeSpectrum`: iterative radix-2 forward DFT, exp(-jωt), N = power of two,
  no cropping/padding. Rectangular or periodic Hann `0.5-0.5*cos(2πi/N)`; optional
  mean removal. One-sided peak-amplitude magnitudes divide by sum(window), double
  only interior bins, preserve DC/Nyquist. Units stay the source amplitude unit;
  not RMS/power/PSD. Bin k is k*fs/N, capture duration N/fs. No claim that zero
  padding improves physical resolution.

Definitions checked against primary references:
[NumPy DFT conventions](https://numpy.org/doc/stable/reference/routines.fft.html)
and [SciPy Hann periodic/symmetric distinction](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.windows.hann.html).
No NumPy/SciPy/chart dependency is installed; independent analytical/direct-DFT
tests verify the small TypeScript implementation.

## CSV and persistence

UTF-8, comma delimiter, decimal dot and quoted fields; explicit header/column
selection, seconds/ms/us and V/mV/A/mA/dimensionless confirmation. Values convert
to canonical s/V/A/1; never infer units from magnitude. Strictly increasing uniform
times within interval*1e-6 plus floating-point tolerance are canonicalized to the
uniform interval; original timestamps/bytes remain in the preserved source asset.
Unsupported irregular inputs report row/column errors, without FFT or resampling.
Missing/nonfinite values, malformed quoting/row lengths and oversized inputs fail.
Waveform CSV exports every original sample at full JS precision; it omits complete
provenance/calibration, which portable project JSON retains with raw/derived assets.

Checkpoint evidence: focused numerical/data tests, including analytical 100Hz
1V-peak/1024Hz/1024-sample sine, DC/Nyquist, Hann gain, independent direct DFT,
seeded noise, error cases, source integrity and real schema-1 JSON/CSV round trips.
Final counts and browser/release evidence will be updated at verified milestones.
