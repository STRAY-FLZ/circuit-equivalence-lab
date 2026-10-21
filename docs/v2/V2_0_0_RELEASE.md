# V2.0.0 Production Release

Release task authorized **2026-10-21**. Public application status: **Released**,
deployment and real public workflow verified on 2026-10-21.
Application: <https://stray-flz.github.io/circuit-equivalence-lab/>.
Scope: publish verified A/B/C/D, then stop before V2.1.

## Verified baseline and integration

- Remote production baseline: `8fd6e9bae60e01e7b8b30c1622ffcb18653c8803`.
  Confirmed latest successful main workflow:
  [38141955598](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/38141955598).
- Accepted A/B `b7b53bc`, C implementation `290de9b` / handoff `296c191`,
  D implementation `0f3dd6a` / handoff `4030e08` are all ancestors of the release branch.
- `origin/main` is an ancestor of the accepted V2 head (0 behind / 6 ahead).
  Local `main` fast-forwarded without conflict; focused branch is
  `codex/release-v2.0.0`. No accepted commit was recreated or rewritten.
- GitHub push permission and Pages `workflow` source confirmed. Existing workflow,
  production URL and `/circuit-equivalence-lab/` base are preserved.
- Application/package/lockfile target is **2.0.0**; project format remains **1**.
  Only release metadata changes, with unchanged dependency records.

## Release verification and deployment evidence

Final candidate checks on 2026-10-21: `npm run typecheck`, `npm run lint`,
`npm run test` and `npm run build` passed; **438 tests in 27 files**, no dependency
upgrades. Production JS `index-BPCqKOt3.js`, CSS `index-SUU4IJOf.css`.

Local built preview on the production base path passed seven Chrome
**155.0.8059.40** workflow groups: real drawing/wiring/ports/derived nets,
four transformation categories, previews/verification/atomic apply/undo/redo,
five lesson stages, stable-ID save/reopen, rejected inconclusive/mixed sheets,
V1 examples and navigation, both themes at 1440px and 390px. No console or HTTP
resource errors. Export writer is 2.0.0 and formatVersion is 1; reopened export
is byte-identical (SHA-256 `a639a4354e514263f878aaaffad630f971c0f6454cc2e2db8ee464f56a88df87`).
Replay: `tests/browser/editor-transformations.js`; ignored local evidence:
`output/playwright/release-local-*`. Narrow viewports are emulated, not physical phones.

Production candidate **`64850067fc0cf9344efd5e31be31fe3f954079d1`** was pushed
to main using fast-forward history. [Workflow 39541122926](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39541122926)
completed with **success**, both build and deploy. The existing required CI
checks passed. No workflow, dependency or personal-website repository was changed.

Actual public Chrome acceptance passed all seven integration replay groups with
`errors: []`, `failed: []`, version 2.0.0. This includes creating a circuit, real
wiring/ports, derived nets, all four transformation types, preview/numerical
verification, transactional apply/undo/redo, save/reopen, five lesson stages,
boundary protection and unsupported/inconclusive behavior. Public JSON round-trip
SHA-256: `12f5ef2a018b755033200e16b1d19458fae4b34685eff0ce4e7417f6c7bdb2e0`.

`tests/browser/release-navigation.js` passed four **actual** website homepage →
tools entry → application → return-home journeys (1440/390px × light/dark), with
shared theme preserved and no browser/resource failures. V1 Δ→Y five-stage lesson
also passed: 19 visible native MathML expressions and all three terminal-pair
comparisons. Production resources all returned 200 under the preserved base:
`theme-init.js`, `favicon.svg`, JS/CSS fingerprints above. Public desktop/light
and narrow/dark screenshots were visually inspected. Local/public evidence is
retained in ignored `output/playwright/release-local-*` / `release-live-*` files.

### Final production identity and tag

The publication checkpoint is 7/9, before this final documentation commit is
deployed. It requires its own successful Pages workflow and a fresh live version/
asset check. **Only then** create `v2.0.0` on that final production commit, push
the tag and publish the release notes. Do not move an existing published tag.

The durable [v2.0.0 GitHub Release](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.0.0)
is the canonical final record of R01–R09 completion, exact production SHA,
final workflow URL/result and tag publication. [Tagged source](https://github.com/STRAY-FLZ/circuit-equivalence-lab/tree/v2.0.0)
identifies the final verified commit without a self-referential SHA in this file.
Track R01–R09 in [development progress](../DEVELOPMENT_PROGRESS.md).

## Compatibility and limits

See [CHANGELOG](../../CHANGELOG.md), [D acceptance](TRANSFORMATION_INTEGRATION_IMPLEMENTATION.md)
and [release-readiness assessment](V2_0_0_RELEASE_READINESS.md).
V1 numerical algorithms and owner-approved D05 are unchanged. Only eligible
resistor sheets support these transformations. Mixed circuits, advanced routing,
autosave/cloud, persistent history and new simulation engines remain outside scope.
Existing schema-v1 assets and metadata are retained; never treat application
version `2.0.0` as a project-schema or project-revision value.

## Authorized deployment and rollback

The task authorizes production integration/push, Pages deployment monitoring,
live verification and then tag/release finalization. Publish only after the
standard checks and local preview pass; verify the actual deployed commit before
claiming Released. A final documentation production commit also requires a
successful workflow and live verification before the final tag is created.

If rollback is needed, preserve exported project backups and use a new revert
commit to restore the known-good production baseline above. This release uses
fast-forward ancestry: review and revert the full `8fd6e9b..v2.0.0` release range
in reverse chronological order with `git revert --no-commit`, then commit the
combined rollback. Reverting only the final metadata/documentation commit would
leave the earlier V2 implementation active. If a future merge is involved, select
its correct mainline parent. Review the resulting tree before publishing.
Never reset/force-push main or move a published release tag. Run appropriate
checks on the revert, push it, monitor the existing Pages workflow, and verify
the restored live V1 behavior/navigation. Code rollback does not revert user files.
See [DEPLOYMENT.md](../DEPLOYMENT.md) for the established procedure.
