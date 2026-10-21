# V2.1.0 Production Release

Authorized development and public release **2026-10-21**. Implementation Complete
→ Verified → **Application Released**. Current documentation checkpoint is 9/10:
S01–S09 verified, S10 final deployment/tag/handoff being finalized. The
[canonical v2.1.0 release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.1.0)
records subsequent 10/10 completion, exact final production SHA and workflow,
after this documentation commit is deployed and publicly confirmed. It avoids
predicting this file's own commit/run or claiming an uncreated tag.

## Baseline and scope

- Actual accepted production baseline: **`bd79d6a27888a24ac24021cf97e076254edb6c68`**,
  `v2.0.2`, confirmed remote main/latest published release. The brief's 2.0.1
  starting state was historical; the newer movement correction is preserved.
- Focused branch `codex/v2.1-signal-lab`. Core checkpoint `927b36b`; workbench
  checkpoint `fa90724`. No baseline history recreation, dependency installation,
  personal-website edit, V2.2/V2.3, hardware acquisition or circuit simulator.
- Application/package/lock/export writer **2.1.0**; engineering file schema
  remains **1**, project revisions and pinned engine versions remain independent.
- Full feature scope, methods, limits and API evidence:
  [SIGNAL_IMPLEMENTATION.md](SIGNAL_IMPLEMENTATION.md), [CHANGELOG](../../CHANGELOG.md).

## Acceptance checkpoints

48 focused cases passed; final typecheck/lint/test/build passed: **504 tests /
31 files**, preserving the full 456-test baseline. Actual final versioned built
Chrome workbench workflow passed: specified 100Hz sine / 1V peak / fs1024 / N1024,
RMS≈0.7071068V, FFT 100Hz/1V, frequency update, 65536-point full analysis, exact
sample cursor/time navigation, explicit-unit multi-channel CSV, all actual file
downloads/reopens, malformed-import preservation, themes/responsive charts and
existing editor/V1 navigation. Raw imported bytes and restored IDs/assets/results
were independently checked. Public acceptance is recorded separately below.

Final 2.1.0 built preview passed with no browser/resource errors. Raw source CSV
and stable identities/results survived actual reopen. A real older 2.0.1 circuit
project retained all graph/geometry/definitions/symbols/prior metadata after
signal generation/export, now writer 2.1.0 / schema 1. Final assets:
JS `index-CllZGzPr.js`, CSS `index-C8UEpovD.css`.

## Verified public deployment — 2026-10-21

- Fast-forward main and push preserved all baseline/core/UI history. First public
  production commit **`dfc5d784784bc85d7ad0cf86d5c46f6fcd210f60`**;
  [workflow 39614955343](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39614955343)
  completed successfully, both build and deploy.
- Actual [public V2.1.0](https://stray-flz.github.io/circuit-equivalence-lab/)
  passed the complete signal replay in Chrome 155.0.8059.40: expected RMS/FFT,
  changed frequency, cursor/zoom, 65536 samples, ms/mV/mA → s/V/A two-channel CSV,
  Hann/DC removal, actual CSV/report/project downloads and actual project reopen,
  malformed import preservation, both themes at 1440/390px and editor/V1 navigation.
  No console/resource errors; deployed JS/CSS fingerprints match the local build.
- Independent public-file validation: original CSV byte-identical; every asset's
  SHA-256 and length valid; raw/derived data, stable IDs and analysis/result records
  equal after reopen; exact actual engine configuration/provenance retained.
  The replay export retained its 65536-point capture (11 datasets / 27 assets).
- Evidence: ignored `output/playwright/signal-live-verification.txt`,
  `signal-live-integrity.json`, actual downloaded files and screenshots.
  The final documentation deployment requires a targeted public generation/FFT,
  CSV/persistence/assets/navigation confirmation before tagging the final SHA;
  that final workflow/identity is recorded in the canonical release above.

No historical seven-group browser acceptance was repeated without a relevant
regression. Scope ends at V2.1.0; no V2.2/V2.3 implementation has begun.

## Compatibility and rollback

Old V2 schema-1 circuit projects remain compatible and fully retained when opened
in the signal workbench. Small captures use verified inline float64-le assets;
all original/derived descriptors and payloads must be included in portable files.
Original sampled data is not downsampled for calculation/export. CSV exchange
omits complete provenance; use full project JSON for that. Oversized files/captures
fail explicitly without replacing current data or writing partial projects.

No hardware/solver/THD/filter claims. Existing single-selection/basic routing,
resistor-only transformation scope and D05 are unchanged. Browser acceptance
covers Chrome and simulated narrow viewports, not physical-phone/cross-browser
certification. No autosave/cloud/session undo persistence.

Rollback preserves history and exported user files: review and revert the full
`v2.0.2..v2.1.0` range in reverse order with a new commit, run appropriate checks,
push, monitor existing Pages and verify restored public V2.0.2 behavior. Reverting
only final docs would leave signal implementation active. Never reset/force-push,
move a published tag or discard user project backups. Older code can retain
schema-1 measurements/assets but does not supply the new signal UI.
