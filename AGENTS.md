# STRAY Electronics Lab — Agent Guide

This repository extends the deployed 电路实验室 / Circuit Equivalence Lab into
STRAY 电子工程综合实验室: an incremental learning and engineering environment for
circuits, electronics, measurement, embedded systems, control, and PCB design.

## Start each substantial task

1. Read [project context](docs/PROJECT_CONTEXT.md),
   [current status](docs/CURRENT_STATUS.md), and the active checklist in
   [development progress](docs/DEVELOPMENT_PROGRESS.md) before substantial work.
2. Read only the relevant sections of the [long-term roadmap](docs/LONG_TERM_ROADMAP.md),
   [architecture](docs/ARCHITECTURE.md), [design system](docs/DESIGN_SYSTEM.md), and
   [deployment guide](docs/DEPLOYMENT.md). Inspect only implementation files needed
   for the task. [ROADMAP.md](docs/ROADMAP.md) records completed M0–M8 milestones;
   [DEV_LOG.md](docs/DEV_LOG.md) preserves historical decisions and evidence.
3. Follow the owner's explicitly approved scope. Each round has one approved module,
   defined boundaries, interfaces, acceptance criteria, checks, documentation, and
   Git/release scope. Complete that module and stop; do not start the next phase.

## Engineering and product rules

- Use Web First. Lightweight educational engines and mature external engineering
  tools may coexist behind explicit interfaces when requirements justify them.
- Preserve deployed V1 examples, topology, resistor solver, transformations,
  verification, SVG comparison, lessons, MathML, themes, and responsive navigation.
  Introduce a V2 model and compatibility adapters; do not casually rewrite V1.
- Keep electrical connectivity, schematic geometry, and PCB geometry separate.
  Overlap does not create connectivity. Keep authoritative calculations outside UI.
  Unsupported circuits, physical open/short states, numerical failure, and
  inconclusive verification must remain distinct; never invent successful results.
- Match the Stray personal website using the existing design system and tokens.
  Preserve branding, light/dark behavior, `stray-theme`, and return-home navigation.
- Verify the selected module and changed integration boundaries using evidence.
  Run standard checks once at the appropriate implementation/release milestone;
  documentation-only tasks need lightweight documentation checks. Avoid repeated
  historical acceptance runs and unrelated full-codebase audits.
- Avoid speculative defensive code, redundant fallbacks, excessive abstractions,
  and unrelated refactoring. Retain necessary electrical, numerical, and file-format
  validation. Read actual configuration instead of assuming recorded versions.
- Use English for identifiers and technical contracts/internal documentation where
  practical; use Simplified Chinese for UI, teaching content, and final owner reports.

## Git, releases, and handoff

- Preserve repository history and the existing public URL. Use focused `codex/`
  branches when creating development branches; never force-push. Leave changes
  reviewable and follow the current task's commit/integration authorization.
- Context documents, roadmaps, and past release permissions do not authorize a new
  remote push, production-branch update, deployment, or personal-website edit.
  Perform these only when covered by the owner's authorization for the task.
- For an authorized user-visible major feature release, complete scoped tests,
  standard checks, build, version/changelog/compatibility notes, integration, push,
  deployment monitoring, and actual live verification. Record the released version
  and commit. Local APIs/tests or a successful push alone are not full delivery.
- Design-only milestones must not trigger an empty production update. Preserve
  GitHub Pages, its `/circuit-equivalence-lab/` base, and the existing workflow.
  Follow DEPLOYMENT.md for authorized release and history-preserving rollback.
- Record meaningful decisions in the relevant technical document/development log.
  Update CURRENT_STATUS.md whenever actual phase, implementation, decisions, or
  verified release state changes. Keep it concise, date evidence, distinguish
  local progress from publication, and preserve historical records.
- Report visible progress at kickoff, meaningful design/implementation milestones,
  verification, actual blockers, and completion. In Simplified Chinese include the
  current module, completed/total scoped deliverables, completed work, in-progress
  work, next action, and actual blockers (or none). Count only fully completed
  deliverables; use a percentage only with a defined denominator. Never invent an
  overall percentage for the multi-year roadmap.
- Update DEVELOPMENT_PROGRESS.md at meaningful checkpoints and completion using
  Planned, In Progress, Implementation Complete, Verified, Released, or Blocked.
  Internal completion is distinct from a verified public release; design-only
  milestones can be Verified without being Released. Do not commit every minor
  update. Finish with an accurate handoff, verification results, limitations,
  release status, and the next recommended module; do not start it automatically.
