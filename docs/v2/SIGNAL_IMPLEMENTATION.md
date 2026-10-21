# V2.1.0 Signal Measurement & Analysis

Authorized 2026-10-21. Baseline actual public **V2.0.2 `bd79d6a`**; branch
`codex/v2.1-signal-lab`. No V2.2/V2.3, hardware transport or schematic solver.
Status: **S01–S09 Verified; application Released**, with S10 final records/tag
at the documentation checkpoint described below. Core checkpoint `927b36b`;
UI checkpoint `fa90724`; first public production `dfc5d78`, application 2.1.0.

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
Focused count at UI checkpoint: **47** (23 numerical/display, 18 data/provider/CSV,
6 workbench UI), now **48** with canonical input-digest regression.
Development typecheck/lint passed. UI tests exercise actual project export/reopen,
RMS/FFT updates, malformed import preservation and retained state across tabs.

## Workbench and browser checkpoint

`src/signal-ui`: independently mounted signal workspace, preserving existing
editor/V1 states. Configurable generator feeds the same waveform descriptor and
assets used by measurement/FFT. Generate/import updates all three views.
Charts have real responsive viewBox sizing (12px desktop / ~14px narrow axis text),
time zoom, horizontal sample navigation, keyboard/pointer sample cursor and
synchronous multi-channel views with independently labeled unit scales.
Min/max envelope bounds display work at 2048 points/channel; full captures remain
the calculation/export source. No decorative/synthetic display-only curves.

FFT uses the typed async engine; the exact execution configuration, source
revision/digest/analysis ID and engine provenance are retained in its result asset.
Project open reanalyzes verified samples using stored options without duplicating
stored raw/derived datasets. CSV export loses source history; complete project
export retains every descriptor, source/derived asset and inline checksum.
Reports are documented `org.stray.signal.measurements` JSON version 1, containing
full-capture axis/source, scalar method/units and last FFT parameters/peak.

Actual local built-preview Chrome **155.0.8059.40** passed the replay
`tests/browser/signal-workbench.js`: 100Hz / 1V peak / fs1024 / N1024 waveform,
RMS 0.7071068V, 100Hz/1V FFT; 200Hz updates both views; exact sample cursor and
zoom-only presentation; N65536 full analysis (227ms observed locally, not a latency
guarantee; final candidate observed 262ms); explicit ms/mV/mA import to s/V/A, two channels; Hann/DC removal;
CSV/report/project downloads and actual reopen; invalid CSV leaves active capture;
1440/390 × light/dark screenshots/axes inspected, no page overflow; existing
editor one-shot placement and V1 series preview remain available. No console/HTTP
failures. Evidence: ignored `output/playwright/signal-local-*`.

Independent file inspection confirmed raw CSV byte-identical, 65536 original
samples retained, and identical measurement/channel/asset/analysis/result IDs and
contents after actual project export/reopen. Earlier UI checkpoint reported 2.0.2;
the final versioned build now reports **2.1.0** and passed the complete same
workbench workflow without browser/resource errors.

Final standard checks: typecheck/lint/test/build passed, **504 tests / 31 files**
(456 accepted baseline + 48 new). The final rerun followed a concrete canonical
digest correction: recursively sort object keys, retain array order, SHA-256 the
canonical JSON, and attach the exact engine execution's configuration/provenance.
JS `index-CllZGzPr.js`, CSS `index-C8UEpovD.css`, 80 modules; no new dependencies.
Actual legacy 2.0.1 file open → generate signal → full project export preserved
the original project ID, sheets/geometry, definitions/symbols and prior extension
metadata exactly, with writer 2.1.0 and schema 1.

## Current limitations

CSV importer explicitly rejects irregular times; file format can represent them
but this provider does not resample. FFT needs a power-of-two full capture and
never crops or zero-pads; non-power-of-two data can still be viewed/measured.
No spectral RMS/power/PSD, certified frequency/THD, cross-capture alignment,
hardware acquisition, schematic simulation or filters. Time zoom and cursors do
not change measurement/FFT scope. Limits are explicit and original samples are
not silently discarded. Captures/derived analyses accumulate in the portable
project until existing asset/file limits; export failures report incompleteness
instead of emitting partial files. No autosave, cloud or external container.

## Public acceptance — 2026-10-21

First production `dfc5d784784bc85d7ad0cf86d5c46f6fcd210f60`, existing Pages
[workflow 39614955343](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39614955343)
build/deploy succeeded. The complete same browser replay passed against the real
public V2.1.0 application: numerical outputs, 65536-point capture (226ms observed,
not a performance guarantee), two-channel CSV, Hann/DC settings, actual downloads
and reopen, both themes/viewport sizes and preserved circuit navigation. No
console/resource failures. Public assets match the accepted final build above.

Independent Node SHA-256/byte-length checks passed for every asset in the actual
public export (11 datasets / 27 assets for this replay). Original CSV byte-identical;
measurement/asset/analysis/result identities and contents equal after reopen;
65536-point capture retained. Actual engine configurations, analysis IDs, input
digests and result provenance agree. Ignored evidence:
`output/playwright/signal-live-verification.txt`, `signal-live-integrity.json`
and corresponding downloads/screenshots. Legacy compatibility evidence is the
actual older-project test above; it is not a claim of physical instrument support.

Application status **Released**; S10 final records/tag/handoff are finalized only
after the documentation commit's deployment and targeted public confirmation.
Exact final SHA/workflow and 10/10 completion live in the
[canonical release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.1.0).
Relevant detailed record: [V2.1.0](V2_1_0_RELEASE.md).
