# Stray Tool Design System

## Reference and provenance

The authoritative reference is [Stray's personal website](https://stray-flz.github.io/stray-articles/), inspected on 2026-10-11. Read only these relevant source files from [STRAY-FLZ/stray-articles](https://github.com/STRAY-FLZ/stray-articles):

- [site.css](https://github.com/STRAY-FLZ/stray-articles/blob/main/site.css): palette, font stacks, shell, header, controls and breakpoints.
- [theme.js](https://github.com/STRAY-FLZ/stray-articles/blob/main/theme.js): shared preference, system default, storage events and restored-page behavior.
- [index.html](https://github.com/STRAY-FLZ/stray-articles/blob/main/index.html): branding, switch markup and favicon.
- [tools/index.html](https://github.com/STRAY-FLZ/stray-articles/blob/main/tools/index.html): tool typography, ruled sections and navigation rhythm.

The downloaded main-branch files and their live counterparts matched SHA-256 hashes. The CSS reference fingerprint is `471426A45BF40B66A1F2E1738D7CC70594B64DF5D440FFD10994E5C567AE4998`. Actual Chrome comparison confirmed the desktop 1240px shell, 92px header, mobile typography and dark palette. Reference downloads/screenshots remain ignored artifacts; no reference repository file was modified.

## Color tokens

`src/design-tokens.css` is the application palette and sizing source. `src/styles.css` imports it; use semantic names rather than repeating literal colors in components.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--paper` | `#f4f5f6` | `#1b1b1d` | Page/header background |
| `--surface` | `#ffffff` | `#1b1b1d` | Circuit panels and input surfaces |
| `--ink` | `#262c34` | `#e4e4e8` | Primary text |
| `--muted` | `#606a77` | `#afb0b8` | Supporting text |
| `--line` | `#d9dee4` | `#38383e` | Thin rules |
| `--blue` | `#284b79` | `#b9cbe2` | Links, actions, focus and current step |
| `--accent` | `#bb8b51` | `#c7a16c` | Restrained decorative gold rules |
| `--selection` | `#cfdef0` | `#414c5d` | Text selection |

The first seven palette values and text-selection colors match the reference. Button background/ink/hover tokens also follow it; gold is not used as small-text ink on light surfaces.

| Application extension | Light | Dark | Meaning |
| --- | --- | --- | --- |
| `--subtle` | `#e9edf2` | `#25262b` | Formula rows, selected candidates and preview feedback |
| `--symbol` | `var(--ink)` | `var(--ink)` | Circuit drawing and high-contrast detail text |
| `--selected` | `#975419` | `#e4ba8d` | Selected originals / removed nodes |
| `--replacement` | `#256a4c` | `#99cfb0` | Replacement branches / successful verification |
| `--danger` | `#973e3e` | `#e7a2a2` | Confirmed discrepancy |

Retain dashed selected symbols, thicker replacements, node rings and explicit verdict text. Color alone must not carry circuit or verification meaning. Selected-candidate and preview text keep the M6 contrast fix: measured 11.97:1 light and 11.91:1 dark on the new subtle backgrounds. Supporting text and semantic inks measured at least 5.49:1 on the light surface and 7.96:1 on the dark surface; this is a sampled check, not accessibility certification.

## Typography and spacing

- Use the reference `--sans` stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif`. Branding uses weight 800 and `-.07em` tracking, at 1.45rem desktop / 1.32rem mobile.
- Retain the reference `--serif` stack for future editorial passages. Dense controls, lesson prose and technical labels use sans-serif; do not apply article typography to engineering panels.
- MathML uses the separate `--math` stack, with Cambria Math / STIX Two Math fallbacks. Preserve native subscripts, units and unevaluated formula text.
- Use `--space-1` through `--space-7`: .25, .5, .75, 1, 1.5, 2 and 3rem. Section separation is deliberate; controls and tables stay compact.
- Tool titles use 2–3rem instead of the main site's large homepage/category headings. This preserves diagram space while retaining the reference weight and tracking.

## Header and navigation

`SiteHeader` uses a full-width sticky paper header and a centered shell. Its desktop minimum height is 92px. The Stray brand is followed by a short right-hand navigation: night-mode switch, 24px vertical divider, then `返回首页`. Both links use the absolute `https://stray-flz.github.io/stray-articles/` URL, so they resolve correctly from a separate project path.

The switch follows the reference 54x30px track / 24px thumb proportions, within a 56x44px button. It exposes `role="switch"`, `aria-label="夜间模式"` and `aria-checked`. Sun/moon SVGs are decorative. The sun path follows the source; a local vector crescent replaces its raster moon mask to avoid an external asset dependency. The favicon uses the reference S mark.

No hamburger menu is needed for two controls. Mobile keeps one compact header row, an 87px minimum height and the main site's smaller brand/navigation type. A dark-theme line replaces the reference's black header rule so the divider remains visible.

## Theme lifecycle

1. The classic `public/theme-init.js` runs in the HTML head before production CSS and the React entry. It reads `stray-theme`, falls back to the system preference, and sets root `data-theme` once. It has no listeners or persistence writes.
2. React's `ThemeToggle` owns subsequent behavior. It derives the displayed theme from a nullable manual preference and the current system preference; it does not store another competing displayed-theme value. Manual clicks persist the shared key.
3. Storage events synchronize valid preferences, removal and storage clearing without echo writes. System changes apply when no manual preference exists. Persisted `pageshow` refreshes a restored page's choice. Effects remove their listeners on unmount.
4. Restricted storage does not prevent initial selection or manual switching. The old `circuit-lab-theme` key is no longer used; the main website's key is authoritative.

The shared preference works only on a shared browser origin; localhost and github.io have separate storage. Cross-tab behavior was tested on the local app's origin, without publishing either site. The HTML script uses Vite's `%BASE_URL%` substitution; deployment path configuration remains M8 work.

## Responsive layout and reusable patterns

The shell is `min(100% - 2 * gutter, 1240px)`. Gutters are 2.5rem desktop, 1.5rem at 960px and 1.1rem at 700px, matching the reference shell widths.

- Above 960px: compact control rail, paired original/transformed panels and a horizontal step indicator.
- At 960px and below: stack comparison panels and step items; retain the control rail.
- At 700px and below: stack controls/workspace, retain the short header, and wrap candidate/legend entries in two columns.
- Reuse ruled sections, restrained blue actions, transparent secondary buttons, compact tables and a 3px control/panel radius. Avoid nested rounded cards, decorative shadows and gradients.
- Keep main buttons/header controls at least 44px high. Preserve 3px keyboard focus outlines and the existing SVG keyboard inspection strokes.
- Long formulas and diagrams scroll within their own containers. Existing minimum SVG widths, routes, label placement and electrical semantics remain unchanged.
- The switch thumb's brief motion is disabled under reduced-motion preferences; no lesson or drawing animation is introduced.

The 1440/820/390px layouts were checked in Chrome in both themes without page-level horizontal overflow. Native MathML, long-formula keyboard scrolling and lesson/preview navigation worked. Firefox/WebKit, real phones and screen readers were not verified during M7. The fixed single-operation lessons and existing drawing/solver limits are unchanged; M8 deployment is not part of this document's implementation.
