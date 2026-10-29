# V3.3.0 release and rollback — Released

Published 2026-10-29 22:11 (Asia/Shanghai), after numerical, integration, built-
browser, deployment and public acceptance. **Implementation Complete → Verified →
Released, O01–O10 10/10.** Baseline V3.2 application/tag `b2a851f`, main69c7f04.
Official V3.3 application and annotated tag target
`322b9ee2c15db3a781447bdf28cbb0015e61dde5`; production workflow
[40887805390](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/40887805390)
succeeded. [GitHub Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v3.3.0)
id427950413, published `2026-10-29T14:11:19Z`, is neither draft nor prerelease.
The subsequent documentation-only handoff retains the tagged application; its
final main SHA/workflow are recorded in the canonical Release.

Model, feedback boundaries and current focused numerical evidence are documented in
[implementation](OPAMP_FREQUENCY_IMPLEMENTATION.md). Application/writer 3.3.0;
schema remains 1. Prior project files remain readable, while older
readers may preserve but cannot calculate the new component and opaque extension.
Saved results retain original settings/revision/digest and must be explicitly
recomputed after reopening. No new dependency is required.

## Local candidate evidence

Typecheck/lint/build and 787 tests across 49 files passed. The final Atlas label
change was followed by its focused test, lint, rebuild, full test run and a fresh
actual-browser replay.
The built preview served `index-Ctvg7VL2.js`, `index-CUYa2Us9.css` and theme JS
with HTTP 200. Chrome exercised follower finite DC, actual Bode, A0 and fp edits,
inverting Rf changes, frequency-dependent feedback, unavailable RC phase margin,
unsupported feedback, save/reopen and stale/provenance behavior, responsive themes
and keyboard. Three UI downloads contain 603 frequency points and passed 1,835
independent scalar comparisons. Old DC/AC/transient/Signal/V1/analog/V3.2
amplifier and competition evidence workflows passed local browser checks.

Observed follower: DC transfer `0.99999`, numerical cutoff `998678.39 Hz`, phase
margin `90.000574°`; exact single-pole DC transfer `100000/100001`, cutoff
`1000010 Hz`. Inverting: DC transfer `−9.9989001`, numerical cutoff `90801.808 Hz`,
independent first-order cutoff `90919.09 Hz`. These cutoff values are sampled
interpolation estimates. RC feedback's cutoff was `1565.3203 Hz`; no phase margin
is asserted for that network.

## Public release evidence

O10 resumed without rerunning O01–O09. The exact three local commits were pushed
and main fast-forwarded; a failed API-object alternative did not update any ref.
Git TLS/DNS connection failures were resolved using a per-command connection to
a verified GitHub endpoint; no global TLS verification or repository history was
disabled. The production workflow's build and deploy both succeeded. Initial
browser caching showed the prior version; reloading the canonical no-query entry
then served V3.3.0 and the exact built JS/CSS resources with HTTP 200.

The actual public op-amp browser workflow passed finite DC, A0/fp and Rf edits,
open/closed/loop responses, unsupported feedback, RC margin unavailability,
saved identity/provenance and explicit reanalysis, desktop/narrow themes and
keyboard. Three real public downloads/603 points passed 1,835 independent scalar
checks. Public V3.2 CE gain remained 4.6175198 at 1 kHz; DC 5 mA, actual RC AC,
transient sample at 1 ms, Signal/FFT, V1/MathML/home, V3.1 ideal output −1 V and
competition evidence handoff passed. No app console or resource errors were
recorded in the completed new-module public acceptance. The annotated tag and
Release were created only after these public results.

## History-preserving rollback

For rollback, preserve history: use the existing deployment instructions to make
a new revert commit on main and monitor the resulting Pages workflow. The feature
range is `69c7f04..322b9ee`; review the selected range and resolve any later
documentation conflicts before committing the rollback. Do not move
an existing public tag or force-push. Restore V3.2 application behavior only after
verifying the actual revert range and impact on schema-1 projects; preserve user files.
