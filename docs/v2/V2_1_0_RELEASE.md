# V2.1.0 Production Release

Authorized development and public release **2026-10-21**. Current checkpoint:
S01–S09 **Verified**, S10 release **In Progress**. Not yet Released.
Public application remains V2.0.2.

## Baseline and scope

- Actual accepted production baseline: **`bd79d6a27888a24ac24021cf97e076254edb6c68`**,
  `v2.0.2`, confirmed remote main/latest published release. The brief's 2.0.1
  starting state was historical; the newer movement correction is preserved.
- Focused branch `codex/v2.1-signal-lab`. Core checkpoint `927b36b`; workbench
  checkpoint `fa90724`. No baseline history recreation, dependency installation,
  personal-website edit, V2.2/V2.3, hardware acquisition or circuit simulator.
- Application/package/lock/export writer target **2.1.0**; engineering file schema
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
were independently checked. These are internal results, not public release claims.

Final 2.1.0 built preview passed with no browser/resource errors. Raw source CSV
and stable identities/results survived actual reopen. A real older 2.0.1 circuit
project retained all graph/geometry/definitions/symbols/prior metadata after
signal generation/export, now writer 2.1.0 / schema 1. Final assets:
JS `index-CllZGzPr.js`, CSS `index-C8UEpovD.css`.

Main push, Pages workflow, actual public workflow, final verified production
commit/tag and GitHub Release remain required; dated results follow success. Do not repeat
historical seven-group browser acceptance without a relevant regression.

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
