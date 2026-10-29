# V3.4.0 production acceptance — Released

2026-10-30; baseline main e96d831 / public v3.3.0 322b9ee. Owner authorized
production publication after Z01–Z09 and complete public acceptance. Branch
`codex/v3.4-integrated-capstones`, core checkpoint8444b31. Z01–Z10 10/10:
Implementation Complete → Verified → Released → V3 Series Closed.

## Immutable application identity

- Production branch: `main`; application and annotated `v3.4.0` target
  `abd02a855df8d50f4b5b70c5ed7781e384f652cb`.
- [Pages workflow40917917332](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/40917917332)
  completed successfully, including standard checks. Deployment7418975877 status
  success points to the canonical public URL.
- [Published Release428166303](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v3.4.0)
  was read back with draft=false/prerelease=false; published2026-10-29T17:10:55Z
  (2026-10-30 Asia/Shanghai). Annotated tag object482c26f peels to the application SHA.
- Actual public entry: https://stray-flz.github.io/circuit-equivalence-lab/;
  JavaScript `index-fQR-2AhT.js`, CSS `index-BRdha6JB.css`, theme-init/base preserved.
- Subsequent acceptance/documentation-only main handoff preserves those assets;
  its exact commit and workflow are recorded in the canonical Release.

Model/orchestration contract: [implementation](INTEGRATED_CAPSTONES.md).
Actual coverage: [inventory](V3_CAPABILITY_INVENTORY.md).
Closure boundaries/V4 prerequisites: [V3 handoff](V3_SERIES_CLOSURE.md).

Built and actual public Chrome replays passed coordinated RC/RLC, source editor return and
staleness, actual CE/CS operating regions, invalid bias, ideal/finite op-amp and RC
margin unavailability, JSON/HTML reopen, Signal waveform inspection, desktop and
390px light/dark themes, keyboard sample cursors, partial textbook map, and
competition source/archive return. Each exported eight files/13 scenarios/3105
time samples. Local: 2412 primary frequency samples/7369 independent checks.
Public: 2211 valid primary frequency samples/6967 independent checks. Both retain
one unsupported nMOS bias scenario. The public critical-RLC R=400Ω AC capture was
refused by the original AC_RESIDUAL check; its valid transient stays available and
the scenario is explicitly partial. The underdamped R=200Ω transient and AC passed
independent checks. No failed AC curve or metric is manufactured. The verifier now
checks valid captures in a partial scenario and explicitly checks the refusal;
it does not relax any numerical tolerance. Final candidate
passed 800 tests/51 files, typecheck, lint and build; rebuilt Chrome replay and
independent download checks passed. Browser status assertions use stable outcome
attributes after Chinese localization. Final assets: `index-fQR-2AhT.js` and
`index-BRdha6JB.css`. Public and built resource identities agree.

Essential built/public-browser compatibility also passed actual DC 5mA, RC AC output,
RC transient 6.31782904V at1ms, Signal/FFT, V1 transformation/MathML/home, V3.1
ideal output -1V and competition evidence, and V3.2 NPN bias/|H|=4.6175198 at1kHz.
Original V3.3 workbench also passed finite follower0.99999V/V, cutoff998678.39Hz
(analytical1000010Hz; interpolation error within0.5%) and margin90.000574°.
HTML report import preserves historical status. No application console or resource
errors in the scoped runs. Replays:
`tests/browser/capstone-workspace.js`, `analog-compatibility.js`,
`amplifier-existing.js`, `opamp-compatibility.js`, `capstone-compatibility.js`;
independent verifier:
`tests/browser/verify-capstone-downloads.mjs`. Ignored local evidence is retained
under `output/playwright/v34-{local,live}-*.json` and `capstone-{local,live}-*`.

Schema1, package/writer3.4.0, no new dependency. The source's definitions,
graph and model identity stay authoritative. JSON and float64 assets retain full
samples and checksums, standard records retain original configuration/revision/
digest, reports use the same `stray-project` portable-HTML envelope. Imported data
are historical until rerun. Older readers can preserve the opaque extension but
cannot run the new orchestration. Generic competition snapshot integration now
retains additional project experiment records; it does not invent official evidence.

Release gates completed in order: scoped numerical/built-browser checks, safe
fast-forward main integration, successful Pages workflow, actual public workflows
and downloaded-data checks, then annotated tag, published Release and readback.
The defined V3 product milestone is closed. Broader educational scope remains open;
do not start V4 or an automatic V3.5.

Rollback preserves history: the application range is e96d831..abd02a8 (8444b31,
abd02a8). Review and revert abd02a8 then8444b31 on main in a new commit; resolve
later documentation
conflicts accurately, and verify the resulting CI/deployment and public V3.3
behavior. Do not move public tags, reset owner history or force-push. Preserve all
user project files; V3.3 cannot execute capstone studies but their raw data remain
in portable assets. Model scope excludes universal SPICE, nonlinear transient,
multi-stage/complete transistor physics, digital/MCU/PCB and unbounded optimization.
