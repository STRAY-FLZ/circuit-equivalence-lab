# V3.3.0 release and rollback — candidate, not published

Owner authorized V3.3.0 publication only after numerical, integration, built-browser,
production deployment and actual public acceptance. Current public release remains
V3.2.0 application/tag `b2a851f7f623761e32e27cb82559bfd58e6a19c6`, main baseline
`69c7f044729b80287334e26810b9ec092da108de`. No V3.3 tag or Release exists yet.

Model, feedback boundaries and current focused numerical evidence are documented in
[implementation](OPAMP_FREQUENCY_IMPLEMENTATION.md). Local package/writer 3.3.0
is a candidate; schema remains 1. Prior project files remain readable, while older
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

Before publishing: complete all focused and standard checks; test the built UI in
real Chrome including file roundtrip and older modules; safely integrate/push main;
monitor build/deploy; repeat actual public interaction; record the exact application
SHA and workflow before making an annotated `v3.3.0` tag and Release. A push or
passing local checks alone is not release acceptance.

For rollback, preserve history: use the existing deployment instructions to make
a new revert commit on main and monitor the resulting Pages workflow. Do not move
an existing public tag or force-push. Restore V3.2 application behavior only after
verifying the actual revert range and impact on schema-1 projects; preserve user files.
