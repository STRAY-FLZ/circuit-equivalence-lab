# Circuit Atlas — V2.2.0

Authorized 2026-10-22. Baseline: public v2.1.0, main/tag
`1b61a74297f19ab0bd0734e5e435a04b86655857`; clean local/remote identity and
published Release verified. Owner explicitly approved Atlas V2.2.0 and shifted
DC → V2.3, filters/frequency response → V2.4, competition → V2.5. V3–V6 unchanged.
No authorization to begin those later modules or edit the personal website.

## Contracts and boundaries

- `src/atlas`: immutable, typed category/family/template catalog and declarative
  recipes. Stable English catalog keys never depend on translated labels. Real
  project/definition/symbol/instance/pin/anchor/edge/port UUIDs are allocated on
  each `instantiateTemplate(id)`. No shared user-editable fixture is cached.
- Recipes declare logical nodes, component-to-node edges, parameters, placement,
  rotation and observed ports. Coordinates never infer connectivity. Constructors
  reuse the current editing palette/operations and engineering validation.
  No new device, switch, initial-state, source waveform or solver model.
- `SchematicPreview` reuses the editor view projection and `SymbolBody` renderer.
  It is a read-only preview of actual engineering data. Opening creates another
  independent project in the existing editor, not a parallel editor or solver.
- App composes Atlas and editor through `SchematicEditorHandle.openTemplate`.
  Busy editors reject replacement. Existing dirty-revision confirmation is reused;
  cancel preserves graph, assets, history and project identity. Preview/selection
  does not touch editor state. Accepted opens reset transient history/tool state
  and are marked unexported. Export the old project first when preservation is needed.
- Existing signal/editor/V1 workspaces remain mounted after first visit. Atlas
  navigation and selection persist across tabs. Opening an editor template does
  not replace signal captures. Existing V1 algorithms and D05 remain unchanged.

## Coverage and honest capabilities

| Category | Families | Editable templates |
| --- | ---: | ---: |
| 电源与电阻网络 | 8 | 14 |
| 受控源与运算放大器电路 | 9 | 0 |
| RC / RL 一阶动态电路 | 7 | 5 |
| RLC 二阶动态与振荡电路 | 7 | 2 |
| 正弦交流与功率电路 | 6 | 0 |
| 滤波、谐振与选频电路 | 8 | 3 |
| 耦合电感与变压器电路 | 7 | 0 |
| 三相电路 | 8 | 0 |
| 非正弦周期与谐波电路 | 6 | 0 |
| 二端口与复杂网络 | 8 | 2 |
| 非线性电路 | 7 | 0 |
| 传输线与分布参数电路 | 8 | 0 |
| Total | 89 | 26 |

Twenty families have templates; 69 explicitly planned. All 26 provide schematic,
editing and portable export/reopen. Nine resistor-only templates offer the
existing candidate-dependent resistor transformations, independent numerical
terminal verification and five-stage lessons. Numerical action eligibility is
still discovered by the existing engine. Seventeen source/storage templates
provide structure only. No general DC/AC/transient analysis or filter response.
T/Π resistor transformations do not implement Z/Y/H/ABCD parameter extraction.

Methods and chapter numbers are secondary searchable metadata, never a second
copy of the circuit or a claim of available computation. Chapter-topic mapping
was checked against the publisher's [sixth-edition directory](https://xuanshu.hep.com.cn/front/book/findBookDetails?bookId=60f7238badb85dae6a2f4523)
on 2026-10-22. The recipes are original illustrative networks, not copied textbook
figures/exercises and not complete coverage of its eighteen chapters.

## Navigation and motion

Three levels: category → family → template, using native disclosure buttons,
`aria-expanded` / `aria-controls`, independent expansion state, selected buttons
and an actual schematic/details panel. Closed category/family content is inert
and hidden from accessibility traversal immediately, while the visual collapse
completes. CSS grid rows animate between 0fr/1fr (220ms expand / 180ms collapse),
opacity fades and chevrons rotate. Reduced-motion disables these transitions.
No animation dependency. Search temporarily exposes matching paths without
rewriting saved expansion state. Narrow screens have a bounded collapsible library
and locally scrollable schematic preview; the editor remains the editing surface.

## Checkpoints

2026-10-22: A01/A02/A05 verified. Thirty focused catalog cases validate every
template's nets, no unintended shorts, every parameter/rotation, stable port
mapping, independent IDs, no shared mutation, schema-1 canonical file round trips,
and real numerical/lesson applicability. Unit/UI and browser acceptance continue;
no claim of public V2.2.0 yet. Package still 2.1.0 at this checkpoint.

Final local candidate: **A01–A07 Verified, 7/8**. Package/lock/writer 2.2.0,
schema 1. Typecheck/lint/test/build passed: **539 tests / 33 files**, 35 new
(30 catalog + 5 UI). JS `index-Bd8uTY76.js`, CSS `index-DmkpcxYZ.css`, 88 modules;
no new dependency. Resume reused these exact-code results, without a repeated
full test/build. Only browser script result retention changed afterward; scoped
lint on that script passed. CLI may return early at native confirm dialogs, so
the replay persists its final result in the browser and retrieves it separately.

Real built Chrome **155.0.8059.85** passed `tests/browser/circuit-atlas.js`:
four category/family opening/closing traces had 38–51 intermediate frames,
actual 0↔546px / 0↔52px height, opacity/rotation and downstream reflow. Native
Enter/Space/Tab, inert/ARIA and reduced-motion verified. All 26 templates opened
into the existing editor. Native unsaved cancel retained the previous UUID;
confirmed opens allocated independent projects. Real R1 100→1234 modification,
download, replacement, file reopen and re-export retained IDs/connectivity/geometry
and were independently byte-identical (writer 2.2.0 / schema 1). Reopening the
catalog's original produced R1=100 with a fresh UUID. Signal RMS survived all
navigation and V1 preview remained available. Four 1440/390px × light/dark layouts
passed with no page overflow, ~13px desktop/~11.2px narrow preview values and
inspected screenshots. No console or HTTP/resource errors. This is Chrome on
emulated narrow viewports, not physical-phone/cross-browser certification.

Evidence is ignored under `output/playwright/atlas-local-*`. Public acceptance,
final SHA/workflow/tag and handoff are in [V2.2.0 release record](V2_2_0_RELEASE.md).

### Actual public acceptance — 2026-10-22

First production **`01e02b4df8af85ddd4d3de47b24d2974918b9f0b`**,
[workflow 39639505538](https://github.com/STRAY-FLZ/circuit-equivalence-lab/actions/runs/39639505538)
completed successfully: build and deploy. Full same Chrome replay passed at the
actual public URL: 12/89/26, all editor opens, animation intermediate frames,
keyboard/reduced motion, native replacement protection, actual parameter/files,
shared-instance independence, retained signal/V1 and all four size/theme groups.
No console/resource errors. Public original/re-exported project files independently
byte-identical, writer 2.2.0/schema1/R1=1234. Public screenshots inspected.
Evidence: `output/playwright/atlas-live-verification.json`,
`atlas-live-integrity.json` and actual downloads/screenshots (all ignored).

Application **Released**; final docs deployment, targeted public confirmation,
tag and A08 / **8/8** handoff follow in the canonical Release. This document
preserves the truthful pre-tag checkpoint without predicting its own SHA.

## Compatibility, release and rollback

Schema stays 1; no migrations, external assets or dependencies. Optional
`org.stray.atlas` project metadata records template ID/catalog revision. Existing
files with measurements/assets continue through the existing file boundary.
Catalog updates never rewrite user files; edits do not update catalog recipes.
No autosave/cloud, new solver, hardware or complete textbook experiment coverage.

Only accepted V2.2.0 may integrate/push to main, use existing Pages/base, receive
actual public browser acceptance and then an annotated tag/Release. Record exact
final SHA and workflow there. Roll back with reviewed reverse-order reverts of
the full `v2.1.0..v2.2.0` range, appropriate checks/deployment/live confirmation,
preserving history and exported user files; never force-push/move a public tag.

## V2.3.0 capability extension

The original 12/89/26 inventory is preserved. A distinct `capabilities.dc`
flag exposes `使用直流分析` for the sixteen R/V/I-only recipes; it does not
change the nine `numerical`/`experiment` flags for the V1 resistor path.
Ten storage-element templates still explicitly reject DC calculation. The
protected editor handoff can open DC mode with a visible COM/B reference;
analysis waits for explicit run. [DC methods and coverage](DC_ANALYSIS_IMPLEMENTATION.md).
