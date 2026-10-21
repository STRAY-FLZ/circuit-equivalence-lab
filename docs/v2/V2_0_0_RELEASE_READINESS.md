# V2.0.0 Release Readiness — Local Assessment

Assessment date: **2026-10-21**. Core B+C+D integration is **Implementation Complete
and Verified**, not Released. This document prepares a separately authorized
publication milestone; it grants no push/merge/deployment permission.

## Acceptance state

| Module | Actual local state | Publication state |
| --- | --- | --- |
| V2.0-A | 10/10 architecture deliverables; owner review recorded, D05 unchanged | Internal specification |
| V2.0-B | 9/9 Verified: project/identity/graph/file/adapters | Not publicly released as V2 |
| V2.0-C | 10/10 Verified: editable SVG/project/history/file workflow | Not publicly released as V2 |
| V2.0-D | 10/10 Verified: actual engine discovery/verification/writeback/lessons | Not Released |

Final D checks: **438 tests / 27 files**, typecheck/lint/build passed. Installed
Chrome **155.0.8059.40** completed seven local workflow groups, including all four
transform categories, actual download/reopen, undo/redo, five-stage lessons, both
themes, responsive layout and V1 navigation. Zero browser errors/HTTP failures.
Detailed evidence and APIs: [integration acceptance](TRANSFORMATION_INTEGRATION_IMPLEMENTATION.md).

The existing eight examples and pre-existing symmetric-delta teaching input remain
available. The user-visible new workflow is an actual engineering editor with
ports/observations, transformation discovery and highlighting, independent
numerical evidence, atomic verified application and guided study on user circuits.
V1 equations, topology, solver and education engine source are unchanged.

The last repository-recorded public baseline remains M8 `a7096c7`, verified
2026-10-11. It was not reverified live during D. No new public version is claimed.

## File and compatibility policy

- Actual package remains **`0.1.0`**. Proposed first public V2 version: **`2.0.0`**.
  Do not infer or invent a historical `1.0.0` or other release tag.
- Engineering files remain `org.stray.electronics.project`, **formatVersion 1**,
  UTF-8 JSON. No schema migration, renamed base path or external package format.
- Existing B/C project data, stable UUIDs, definitions, graph and geometry remain
  supported. Optional `org.stray.transformations` provenance fits the existing
  opaque extension contract; B/C readers retain it even without D UI commands.
- Unsupported/newer formats and required extensions retain their existing explicit
  rejection behavior. Asset hashes, lengths and all inline payloads remain required.
  Current defaults: 32 MiB JSON, 8 MiB per asset, 16 MiB total decoded assets.
- Undo/redo and runtime preview/lesson state are not portable history. Temporary
  observation selections are session state; use actual ports for persistent future
  boundaries. A committed record retains the operation's original observations.
- Back up exported project files before release/rollback. A code rollback does not
  revert files the user has edited or downloaded. No automatic downgrade/repair
  or invented general V1 saved-file importer is promised.

## Known product limits to include in release notes

Whole eligible resistor sheets only; mixed C/L/sources and cross-sheet conductive
nets are unsupported for these V1 transformations. No new general simulator.
Only existing independent numerical evidence permits verified commits; rejected
or inconclusive computations remain previews. Persisted component/pin observations
need explicit rebind support before removal.

Editing remains single-selection with basic routes, no bend handles, autosave,
cloud sync, persistent undo, PCB/EDA integration or hierarchical-sheet management.
V1 comparison layout may be unavailable for large/ambiguous drawings while the
engineering editor and complete transform records remain usable. New replacement
positions are a basic layout below retained geometry, not a general router.
Local Chrome/viewport verification is not physical-phone/cross-browser certification.
Existing dev-mode pre-theme/cache-watcher observations are recorded in the C/D
handoffs; built-preview acceptance passed.

## Remaining publication tasks — separate authorization required

1. Obtain explicit authorization for V2.0.0 integration/push/publication, including
   target branch/repository and any release/tag operations. Confirm current remote
   `main`, accepted branch ancestry and actual known-good public deployment commit.
2. Integrate focused B/C/D commits into production history without force-push or
   history rewriting. Review conflicts against the accepted scope and rerun
   checks affected by integration changes.
3. Set the actual package/lockfile version to `2.0.0` together, add the application
   version display required by the release model, and create a human-readable
   changelog from the verified feature summary and limits above. Record schema-v1
   compatibility and numerical scope. Do not create fabricated old release entries.
4. Run the standard typecheck/lint/full-test/build checks for the **actual final
   release commit**, using the repository's supported Node/npm environment and
   exact lockfile. Smoke-test its built `/circuit-equivalence-lab/` path.
5. Review the existing [deployment procedure](../DEPLOYMENT.md). Preserve Pages,
   workflow permissions, public URL, `/circuit-equivalence-lab/` base, header,
   `stray-theme`, and return-home destination. No personal-website edit is needed
   for this milestone unless separately scoped and authorized.
6. Push the authorized history to the production branch and monitor the exact
   commit's GitHub Actions build **and** Pages deployment through success.
   A local build or successful push alone is not release completion.
7. Verify the actual live entry and resources, direct refresh, both themes,
   existing V1 previews/MathML/five-stage lesson and the full new editor sequence:
   draw → ports → discover → verify → apply → history → download → reopen.
   Check responsive layout and actual return-home navigation; record dated evidence.
8. Only after successful live acceptance, record released version/commit, update
   progress/status/log and publish an authorized `v2.0.0` tag/release pointing to
   that exact verified commit. Record any deviations and unresolved limits.

## History-preserving rollback procedure

Before publication, record the known-good deployment commit, release commit,
integration/merge commit if used, version/changelog changes and file backups.
If acceptance fails, stop the release claim and inspect the exact workflow/resource
or runtime failure; fix and verify when within authorized scope.

When rollback is authorized, **revert** the offending release/integration commit(s)
on `main`. For a merge, select the correct mainline parent when reverting; do not
blindly revert arbitrary ancestors. Preserve accepted development history and
project files. Never reset/force-push production or move a published tag to hide
an unsuccessful release.

Run the checks appropriate to that revert, push the revert, monitor Pages again,
and verify the previous supported live workflows and return-home link. Record the
revert/deployment commit and actual restored version in CURRENT_STATUS/DEV_LOG.
Review schema compatibility before reopening newer files on older application
code; restoring code is distinct from restoring user data.

**Readiness conclusion:** core implementation acceptance is complete. Remaining
work is release engineering and actual public acceptance, not further D feature
implementation. Publication is pending separate owner authorization.
