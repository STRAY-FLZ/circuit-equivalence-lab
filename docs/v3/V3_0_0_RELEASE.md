# V3.0.0 transient laboratory release

Authorized 2026-10-26: implement and publish after mathematical, data, browser and
production acceptance; stop before V3.1/V4. Baseline local/origin/main/v2.5.0:
`99e2ba7512341af3ffe0ba4697a4bdcd3a670cca`, workflow `40177702787` success.
Branch `codex/v3.0-transient-lab`, core checkpoint `58e96d7`.

**Implementation Complete → Verified → Released / T01–T10: 10/10.**
Official application/tag **`a77a22112c9c2de6beeba5bf51ec7b9f1df3c624`**,
[workflow40331268904](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/40331268904) success;
[published v3.0.0 Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v3.0.0) verified2026-10-26.
This post-release documentation handoff preserves that immutable application tag.
Final local typecheck/lint/full **685 tests / 43 files**/build passed.
One old Atlas assertion was updated to the new supported transient text, with
its scoped five cases and the final complete suite passing. No dependency change.
See [mathematics, APIs, models and compatibility](TRANSIENT_IMPLEMENTATION.md).

## Local numerical, persistence and real browser acceptance

38 new tests cover RC/RL zero-input/zero-state/complete responses, nonzero C/L
conditions, polarity, delayed/off-grid pulses and a real current-source RC load;
series/parallel RLC damping and energy, nonzero simultaneous C/L states, small/large
time constants, coarse-output accuracy/refinement, KCL, invalid/unsupported/singular
constraints, cancellation/work budget, exact assets, raw inputs and record identity.
Three actual React integration cases cover synchronized sample/pan/keyboard behavior,
editing/undo invalidation, saved-data reopen, unsaved drafts and Signal inspection.
Existing competition async guard was extended for same-turn source notifications
while still protecting a newer real edit arriving during an awaited handoff.

Actual built Chrome 155 completed **11 grouped journeys**, with zero app console
or resource errors. RC/RL all responses, bounded pulse, series/parallel RLC under/
critical/over/natural behavior, waveform/energy/cursors/zoom/pan, 1440/390 light/dark,
native file reopening, Signal and competition integration, DC/AC/V1/MathML/home.
Screenshots inspected. These viewport checks are not physical-device or full
cross-browser certification. Final same-turn report/integrity replay also passed.

Independent validator read **15 actual native simulation projects / 9615 samples**,
using separately written exponential/root/oscillatory analytical fixtures, not the
transient solver or its teaching-reference function. It separately performed
**29646 KCL checks / 34452 scalar checks**, including real Ohm/energy relationships.
Observed maximum error across these representative defaults: **0.0103473028 V**
and **0.000038812281 A**; fixture acceptance bounds were 0.02V / 0.0001A. These
are fixture results, not a promise for every supported parameter set.

Representative t=1ms RC: numerical **6.31782904V**, independent **6.321205588V**;
RL: numerical **0.0631782904A**, independent **0.06321205588A**. Both use explicit
0→10V, zero initial storage and τ=1ms. R doubling gives τ=2ms and actual RC
**3.9330266V** at 1ms. Series underdamped overshoot sample at18.1ms: **11.6229436V**,
independent **11.6302882V**. Numerical/analytic values and their errors are separate.

Native downloads also passed byte-identical editor JSON reopen, selected CSV
export between tools, preserved original waveform/independent generated raw assets,
full HTML embedded-project round trip and browser report reimport. Recomputed
records get new UUIDs; old R/C/L values and pin/node direction snapshots remain.
Final local assets at this checkpoint: `index-J1OsolEm.js` / `index-CjMhsG_I.css`.

Scripts: `tests/browser/transient-workspace.js`, `transient-handoff.js`,
`verify-transient-downloads.mjs transient-local|transient-live`. Generated downloads,
screenshots and temporary local reports remain ignored. No new dependencies;
unchanged V1/D05/DC/AC numerical source paths verified against baseline.

## Public candidate acceptance — 2026-10-26

Candidate **501f3e1cd686928c6a2d2e4fdd4fddcc5d8bf441**,
[workflow 40329459842](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/40329459842),
passed build/deploy including 685 tests. Public Chrome loaded 3.0.0 and completed
all 11 real workflows with zero app console/resource errors; the actual public
download validator passed the same 15 projects/9615 samples, KCL/energy, original
raw assets, exact project/CSV/report checks. Screenshots inspected in both themes.

Final image inspection identified narrow tick-label clipping for tiny currents.
The one-line shared chart formatter now uses compact scientific notation when
needed; exact sample data/statistics remain unchanged. Four actual V/A/J SVG
text bounds pass at390px. Nine focused scope/Signal UI cases, scoped lint and
typecheck/build passed. Corrected resources: `index-COa4Wnpk.js` / `index-CjMhsG_I.css`.
Corrected production **`a77a22112c9c2de6beeba5bf51ec7b9f1df3c624`** / workflow40331268904
passed all standard checks and actual public11-journey replay including all four
SVG text bounds. The15-file/9615-sample native validator passed again. After tagging,
actual public report reimport, current RC sample recovery and four narrow signed
V/A/J axes passed; zero errors. Final application assets are those corrected names.
The earlier J1OsolEm resource identity above is the dated first-build checkpoint.

## Final identity and documentation handoff

The application `v3.0.0` tag and published Release point to the verified production
commit above; tag creation was followed by fresh public report/axis confirmation.
All T01–T10 are complete. Later main documentation-only handoff preserves application
resources and the immutable tag. Its exact commit/workflow and final deployment
confirmation are added to the canonical Release after deployment, avoiding a
self-referential SHA in this document.

Public entry remains https://stray-flz.github.io/circuit-equivalence-lab/.
No personal-website changes, no V3.1/V4 work, no blocker.

## Compatibility and limits

Application/writer 3.0.0; project schema1 unchanged. Earlier file readers retain
datasets/assets and opaque transient options/record links but cannot operate this
provider. New J/mJ/uJ competition targets require V3; older competition UIs may reject
those extension contents rather than reinterpret them. Preserve complete JSON/HTML
backups and avoid editing private extension fields with an incompatible tool.

Initial support is linear ideal R/C/L and independent V/I sources. No controlled
source transient, nonlinear devices, arbitrary switching/impulses, transformers,
general SPICE, hardware, PCB or symbolic ODE claim. Explicit constraints must have
a unique finite initial/right-event solution; some redundant/high-index ideal
configurations are rejected. First-order BE has numerical dissipation and local
error control, with no global precision guarantee. Coarse uniform output can miss
narrow events even when internal integration aligned them; users must refine it.

Bounds: 48 unknowns, 64 elements, 2–8193 uniform samples, 500000 output scalars,
60000 linear solves/80000000 estimated work; existing 32MiB JSON/8MiB asset/16MiB
total limits. Budget, singularity, precision or cancellation never commits partial
results. Existing classic theme-init and approximately606kB/196kB gzip bundle-size
advisories are recorded; no unrelated dependency/performance rewrite.

## History-preserving rollback

Keep user files first. Inspect the actual release range and revert only reviewed
V3 commits on a focused branch with
`git revert --no-commit 99e2ba7512341af3ffe0ba4697a4bdcd3a670cca..v3.0.0`.
Before tagging, use the actual deployed SHA in place of the nonexistent tag.
Review/resolve, commit, run standard checks, integrate/push without force, monitor
Actions and verify live. Never reset main, move tags or silently rewrite release
history. Review newer dependent commits before applying the range. Reverting the
application does not delete downloaded project data; do not mislabel historical
simulated datasets as new DC/AC computations.
