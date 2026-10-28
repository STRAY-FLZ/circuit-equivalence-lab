# Production deployment

Current production **V3.2.0**, Released10/10 on 2026-10-29 (Asia/Shanghai);
application/tag b2a851f and [workflow40687925759](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/40687925759)
were verified, including actual public interactions and downloaded-data checks.
[Release, compatibility and history-preserving rollback](v3/V3_2_0_RELEASE.md);
[canonical Release and final documentation handoff](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v3.2.0).
The V3.1.0 entry below is historical evidence.

Current production **V3.1.0**, Released10/10 on2026-10-28; application/tag0bd1b11,
[workflow40627152400](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/40627152400)
succeeded; real public Chrome and downloaded-data acceptance passed.
[Identity/compatibility/rollback](v3/V3_1_0_RELEASE.md);
[canonical Release and final documentation handoff](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v3.1.0).
The following V3.0.0 entry remains historical evidence.

Current application release: **V3.0.0**, publicly verified2026-10-26.
Official application/tag `v3.0.0`: `a77a22112c9c2de6beeba5bf51ec7b9f1df3c624`,
[build/deploy40331268904](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/40331268904) success,
685 tests and actual public workflows/downloads verified. Tag/Release readback and
post-tag report/sample/signed-axis confirmations passed.
See [mathematics/data/acceptance/rollback](v3/V3_0_0_RELEASE.md) and
[canonical exact identity](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v3.0.0).
A subsequent documentation-only main handoff preserves the application resource
identities and immutable tag; its deployment SHA/workflow is recorded in Release.
Prior V2.5 evidence remains [here](v2/V2_5_0_RELEASE.md).
Previous V2.4 evidence remains in its [dated record](v2/V2_4_0_RELEASE.md).
V2.3 DC evidence remains in its [dated record](v2/V2_3_0_RELEASE.md).
Previous V2.2.0 was verified 2026-10-22. See the
[dated Atlas evidence and range rollback](v2/V2_2_0_RELEASE.md),
[current status](CURRENT_STATUS.md), and
[canonical final commit/workflow/tag record](https://github.com/STRAY-FLZ/circuit-equivalence-lab/releases/tag/v2.2.0).
The historical M8 evidence below remains unchanged.

## Repositories and URLs

- Application: https://github.com/STRAY-FLZ/circuit-equivalence-lab
- Application production entry: https://stray-flz.github.io/circuit-equivalence-lab/
- Personal website: https://github.com/STRAY-FLZ/stray-articles
- Personal website homepage: https://stray-flz.github.io/stray-articles/
- Tools page: https://stray-flz.github.io/stray-articles/tools/

Both repositories publish from `main`. The application uses GitHub Pages with
the **GitHub Actions** source (`build_type: workflow`). The personal website
keeps its existing branch source (`build_type: legacy`, `main`, `/`) and
GitHub's existing `pages build and deployment` workflow; `.nojekyll` remains
unchanged. Its unrelated video-check workflow is not a deployment workflow.

## Application workflow

`.github/workflows/pages.yml` runs on pushes to `main` and manual dispatches.
The build job uses Node.js 24, installs the exact lockfile with `npm ci`, runs
type checking, lint and all existing tests, builds with Vite, configures Pages,
and uploads only `dist/`. The dependent deployment job publishes the artifact
to the `github-pages` environment. Builds have `contents: read` and `pages: read`; only deployment
has `pages: write` and `id-token: write`. Pages releases are serialized without
cancelling a running release. No custom deployment secret is required.

Vite's `base` is `/circuit-equivalence-lab/`. The head script uses
`%BASE_URL%theme-init.js`; Vite rewrites application/public asset references
under the project path. There is no client router or extra deep-link fallback.
Refresh the documented entry URL to reload the application.

`dist/`, dependency directories, local browser output and `.artifacts/` are
ignored and must remain untracked. The original README commit and all M0–M7
development commits are preserved as ancestors of `main`.

## Future updates

1. Use Node.js 24 (at least 24.15.0) and npm 11. Run `npm ci` from the repository.
2. Run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`.
3. To inspect the built project path, run `npm run preview` and open
   `http://127.0.0.1:4173/circuit-equivalence-lab/` (use the actual reported port).
4. Commit source changes and push to `main` without a force push. Watch the
   [application Actions page](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions)
   until both build and deploy succeed for that commit.
5. Open the public URL and verify assets, an SVG preview, a five-stage lesson,
   MathML, both themes and direct refresh. Successful push alone is insufficient.
6. Changes to the website tool listing belong only in `stray-articles/tools/index.html`.
   Preserve existing entries and follow that repository's current Pages workflow.
   Verify the live tools page and the complete return-home journey after release.

The replay at `tests/browser/production-release.js` checks a loaded production
application using the existing Playwright CLI. It does not install a new test
framework or run in the Pages build. Run it against the actual public URL;
it also works with a local production preview. Browser evidence is saved under
ignored `output/playwright/`.

`tests/browser/website-integration.js` verifies the live navigation flow, the
five tool entries, both themes at desktop/mobile widths, same-origin tab
synchronization, and browser access to the four existing tools. Open either
live site in the existing Playwright CLI session before invoking the replay.
For example, from the repository root with the CLI installed:

```powershell
npx --package @playwright/cli playwright-cli open https://stray-flz.github.io/circuit-equivalence-lab/
npx --package @playwright/cli playwright-cli run-code --filename=tests/browser/production-release.js
npx --package @playwright/cli playwright-cli run-code --filename=tests/browser/website-integration.js
```

Use the locally available Chrome/Chromium configuration and create the ignored
`output/playwright/` directory first. Replays produce screenshots there.

## Navigation and themes

The website entry is titled `电路实验室` and points to the absolute application
URL. Both application brand/home links point to the absolute personal homepage.
The established M7 design tokens, thin separators and header control ordering
are retained.

Both project paths share the `https://stray-flz.github.io` origin and the
`stray-theme` local-storage key. A manual preference persists through navigation
and reload; the application receives storage changes from other tabs. Without
a stored preference, system theme applies. Storage restrictions are handled by
the existing theme implementation. Localhost does not share preferences with
the live website.

## Troubleshooting and rollback

- A missing deployment: inspect the run for the current commit, Pages source,
  and `github-pages` environment branch restrictions. The source must be Actions.
- Missing scripts or CSS: inspect failed requests and verify the Vite base,
  built HTML and entry trailing slash. Do not replace the base with `/`.
- A failed install/check: fix the reported dependency or source problem and
  rerun the workflow; do not bypass checks or regenerate the lockfile casually.
- Stale website content: confirm its deployment commit and wait for Pages/CDN
  propagation, then verify the actual public entry with a fresh browser load.
- Roll back by reverting the offending commit and pushing the revert to `main`.
  This creates a new deployment while preserving history; never reset or force-push.

GitHub's [custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
and [Pages API documentation](https://docs.github.com/en/rest/pages/pages)
describe deployment permissions and the `workflow` publishing source.

## Release evidence

The release was verified on 2026-10-11. The application release
[`a7096c7`](https://github.com/STRAY-FLZ/circuit-equivalence-lab/commit/a7096c7d4e66c21fdc96c9ecc1d1adbdec2607e8)
and its [build/deploy run](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/38141334784)
succeeded before the personal website entry was added. The focused website
commit [`e609a82`](https://github.com/STRAY-FLZ/stray-articles/commit/e609a8209cbb9e61ab61c11f8845b89a24b3c9c6)
and its [existing Pages run](https://github.com/STRAY-FLZ/stray-articles/actions/runs/38141574793)
also succeeded. The following documentation/evidence commit does not change
the built application. See the M8 entry in `DEV_LOG.md` for actual checks.

Browser coverage is Chrome/Chromium at 1440x1100 and an emulated 390x844 mobile
viewport in both themes; it is not a full cross-browser certification. No
unresolved deployment or integration defect was found in the verified scope.

## Authorized V2.3.0 DC release

2026-10-23: owner authorized publication after numerical and real browser
acceptance. Public corrected build 2.3.0 is verified on main 12275b3 / workflow 39817263066; final documentation deployment/tag records are being finalized at this checkpoint. [DC acceptance and exact release identity](v2/V2_3_0_RELEASE.md)
records the production run, public replay and final tag. Prior accepted baseline
is `41e342ac940a28319c1a7cef016f9889f75f6e70` / v2.2.0. Revert only the reviewed
V2.3 range, newest first, as described there; preserve history, Pages workflow
and project base. Do not force-push, move tags, or edit the personal website.
