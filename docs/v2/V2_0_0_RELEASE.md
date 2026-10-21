# V2.0.0 Production Release

Release task authorized **2026-10-21**. Status: **In Progress**, not yet Released.
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

Actual production deployment and live acceptance are pending.
No tag or public success is claimed by this checkpoint.
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
