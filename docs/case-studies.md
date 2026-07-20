<!-- trunk-ignore-all(markdownlint,prettier) -->

# Case Studies — working guide

Architecture, conventions, and workflow for building case study pages on
masterpoint.io. **Keep it current and concise** — update it when a layout,
shortcode, visual, or workflow decision changes, and delete mentions of anything
removed from the codebase. Document only what isn't obvious from the code; the
code is the source of truth, this file describes what IS (no "we used to have X"
notes).

---

## Future Case Study

Because the existing case studies are already built, we are maintaining them as is. But for future ones, we want to make sure they are short and concise and to the point, intended for engineering leadership. It should consist primarily of the TLDR, About, The Challenge, What Masterpoint Did, The Results (emphasis), and CTA, where each section is a single card, no more. Idea/approach: https://masterpoint.slack.com/archives/C04ATBLEJAV/p1783456382247289

## Architecture overview

There are **two case-study layouts** in this codebase, kept isolated so visual
changes to one never affect the other. (A legacy third layout was deleted in
July 2026 once Power Digital, its last user, was rebuilt on immersive.)

| Layout        | Template                              | Used by                                                 | Body class                          | Style prefix            |
| ------------- | ------------------------------------- | ------------------------------------------------------- | ----------------------------------- | ----------------------- |
| **Modern**    | `layouts/case-studies/single.html`    | Default for any case study without a `layout:` override | `case-study-modern`                 | `.case-study-modern`    |
| **Immersive** | `layouts/case-studies/immersive.html` | MarketSpark, Power Digital (opt-in via `layout: immersive`) | `case-study-modern case-study-immersive` | `.case-study-immersive` |

Routing is via Hugo's `layout:` front matter. No `layout:` → `single.html`
(modern, the default for new case studies, designed from scratch). MarketSpark
and Power Digital opt in with `layout: immersive`. The **immersive** layout keeps
the modern hero + stat strip **nearly verbatim** (its body carries both classes
so the modern `.cs-*` CSS applies; the only divergence is an optional
`client_logo_height` hook) and replaces only the body with a stack of rotating
light↔dark colour cards (`.csi-*`). Don't merge them; scope every selector under
its prefix.

**Stylesheet:** all `.case-study-modern` / `.case-study-immersive` CSS (`.cs-*`
and `.csi-*` rules, `$cs-*` vars, `cs-brand-gradient` mixins) lives in
`assets/css/case-studies.scss`, `@import`ed at the **end** of `custom.scss` so
cascade order is unchanged. The `#caseStudiesPage` list-page grid stays in
`custom.scss`.

---

## List page (`/case-studies/`)

`layouts/case-studies/list.html` (body `#caseStudiesPage`): hero banner + stacked
full-width rows (`partials/case-study-entry.html`, each row one `<a>`). Chosen over a
card grid to stay scannable as the list grows. Card image = each study's
`preview_image` (`og_img` stays separate for social). Non-obvious bits:

- **Banner background is layered in CSS, not via `banner_image`** — cosmic photo
  (`/img/bg_our_word.jpg`) + dark scrim (last stop `$pine`, so it fades into the rows)
  + mint/pink glows + masked dot grid. Header is left **transparent** so the image runs
  behind it; keep the global `padding-top: 9.9rem` (smaller hides the title under the
  absolute header).
- **`banner_tagline` is gradient text with a dash on _both_ ends.**
- **Image column is 38%** (`flex: 0 0 38%`, `object-fit: cover`).
- **Title is never clamped** (must always show in full → a long title grows the row);
  description stays 2-line clamped.
- **Hover accent is a gradient bar on the _left_ edge** (not the top).
- **CTA gradient gotcha:** `.cs-card__cta` must be `align-self: flex-start`. As a flex
  item in the column body it otherwise stretches full-width and the `text-gradient`
  spreads across the whole column, leaving only the start color on the short word.
- **A portrait `preview_image` makes its row taller** — `object-fit: cover` in a
  %-width column with only `min-height` lets a tall poster (Power Digital) drive the
  height, so rows can be uneven. A fixed `height` on `.cs-card` would crop instead.
- **SCSS var-order:** `#caseStudiesPage` (in `custom.scss`) sits above the
  `@import "case-studies.scss"` line, where the `$cs-mint` / `csi-grad-*` defs now
  live, so use literal hex/gradients here (globals like `$pine` are fine).

---

## Homepage highlights slider

Featured case-study slider on the homepage (section
`content/sections/home-case-studies.md`, id `#case-study-highlights`, weight 5).
One dark pine card per study (logo pill, title, blurb, CTA, photo) on a sliding
track navigated by a client-logo tab strip.

- **Files:** `layouts/shortcodes/case-study-slider.html` (self-contained vanilla
  JS, no jQuery — NOT flexslider, which `plugins.js` would hijack) + the `.csh-*`
  block in `assets/css/custom.scss` (literal hex; `$cs-*` vars aren't defined
  there yet). Iterates case studies **ByWeight**, so `weight:` orders the slides.
- **Content: optional `highlight:` front-matter map** (see marketspark.md /
  power-digital.md), all fields optional with fallbacks:

  ```yaml
  highlight:
    title: "... <span class='text-gradient'>...</span>" # → hero_title → page title
    blurb: "..." # → description
    image: /img/case-studies/CLIENT/photo.jpg # → preview_image
    image_alt: "..."
    logo: /img/case-studies/CLIENT/CLIENT-logo-dark.png # tab strip only (white bg) → DARK variant; falls back to client_logo
  ```

  Two logo surfaces, two variants: the **card** (dark pine) uses the WHITE
  `client_logo` — same lockup as the hero / sticky nav, no pill — overridable
  with `highlight.card_logo`; the **tab strip** (white bg) uses the DARK
  `highlight.logo`. `highlight: false` excludes a study; any other non-map value
  includes it with pure fallbacks (template guards with `reflect.IsMap` so a
  scalar can't crash the build). No logo → client name renders as a text tab.
- **Autoplay** is driven by the active tab's progress-bar CSS animation (advances
  on `animationend`). Gated off by four independent CSS classes: `.csh--inview`
  (≥25% visible), `.csh--paused` (hover/focus), `.csh--stopped` (WCAG pause/play
  toggle), and `prefers-reduced-motion`. Pause/stop rules must match the run
  rule's 5-class specificity or they silently lose.
- **Single study** → tab strip, toggle, autoplay, and tabpanel ARIA all omitted.
- Section heading/intro and "See All Case Studies" button live in the section
  content file, not the shortcode.

---

## Modern layout — front matter schema

```yaml
---
title: "..." # plain title (browser tab + meta)
description: "..." # used for og + meta description

# Hero ───────────────────────────────────────────────────────────────
eyebrow: "CASE STUDY" # short label above the title
client: "ClientName" # used in default eyebrow if eyebrow omitted
client_logo: /img/case-studies/CLIENT/CLIENT-logo.png # white-pill mark in the hero lockup
client_logo_height: 48px # OPTIONAL (immersive only) — scales the hero client logo via --cs-client-logo-h (default 32px)
hero_title: "... <span class='text-gradient'>highlighted</span> ..."
hero_aside_image: /img/case-studies/CLIENT/hero-bg.jpg # OPTIONAL full-bleed hero photo
hero_aside_alt: "..." # alt text for the bg image

# At-a-glance stat strip ────────────────────────────────────────────
stat_bar: # 4-up cards under the hero
  - value: "1 → 11" # before → after stat
    label: "short headline metric label"
  - value: "0% → 100%" # percent coverage style
    label: "what the percent measures"
  - value: "100+ Items" # count style
    label: "labels may include <a href='...'>inline links</a>"
  - value: "hours, not weeks" # comparative phrase style
    label: "what got dramatically faster"

# Preview / OG ─────────────────────────────────────────────────────
preview_image: /img/case-studies/CLIENT/foo.png
og_img: /img/case-studies/CLIENT/foo.png

# End-of-article CTA (optional) ────────────────────────────────────
# If omitted, the layout renders a generic Masterpoint CTA automatically.
# Use `callout: false` to hide the CTA entirely on this page.
# callout: "<p>👋 …</p><a href='...' class='button'>Get in touch &rsaquo;</a>"

sitemap: { priority: 0 }
---
```

Notes:

- **No `slug:` field.** Hugo derives the URL from the filename. Prefer renaming
  the file (e.g. `marketspark.md` → `/case-studies/marketspark/`) over setting
  `slug:`, so the filename and URL stay in sync.
- **`hero_aside_image` is optional.** When present, the **default** is a
  full-bleed background photo (`.cs-hero__bg img`: `object-fit: cover;
  object-position: 70% center`) with a horizontal scrim (heavy pine left, fading
  to clear right) and the title in a frosted box (`.cs-hero__inner--framed`);
  MarketSpark and Power Digital use this. When absent, the hero is plain pine
  gradient + dot grid + soft mint/pink glow, no frosted frame.
- **`hero_photo_inset: true`** (opt-in — currently only Cursor) swaps the
  full-bleed default for an **inset-right** treatment: photo fills the right 70%
  (`width: 70%`), left ~30% stays plain pine, scrim dropped. Both shaping rules
  are scoped to the `.cs-hero--photo-inset` modifier (added by
  `single.html`/`immersive.html`):
  - **`object-position: 25% center`** biases the crop toward the photo's LEFT;
    tune per photo.
  - A composited `mask-image` (two gradients + `mask-composite: intersect` /
    `-webkit-mask-composite: source-in`) feathers the **left seam** into pine and
    softens the **bottom edge** into the stat strip. Top/right flush.

---

## Shortcodes

All shortcodes are in `layouts/shortcodes/cs-*.html` and styled under
`.case-study-modern` in `assets/css/case-studies.scss`.

| Shortcode                    | Purpose                                                     | Notes                                                                                                                                                                                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------- |
| `cs-about`                   | Dedicated "about the client" card at the top of the article | Args: `name`, `url`, `linkedin`, `industry`, `technologies`, `facts`, `eyebrow`, `logo` (optional client logo at the top of the card with a divider), `download` + `download_text` (optional PDF button at the bottom of the card; text defaults to "Download this case study as a PDF"). Eyebrow auto-generates as `About {name}`. Website pill + LinkedIn brand mark sit in the top-right of the card. `industry` + `technologies` (or `facts`) render as labeled rows / pill list below the prose. |
| `cs-pullquote`               | Large quote card with gradient left border + attribution    | Args: `attribution` (single-line fallback) OR `name`/`title`/`company` (two-line attribution: bold name over mint `title, company`), `photo` (headshot → avatar-left "portrait" layout), `variant` (`dark` default = pine card, `light` = cream/mint editorial card). With `photo`, gains class `cs-pullquote--portrait` (see Avatar-left portrait layout below). Reserve for actual quotes — not for emphatic bold lines.                                                                                    |
| `cs-wins`                    | Grid of "win" cards with gradient icon badges               | Used for the Outcomes & Business Impact section. Body lines render inline markdown — links, _italics_, **bold** all work.                                                                                                                                                                    |

### Shortcode authoring notes

- **`cs-wins` body uses `RenderString` inline** — `{{ $body | $.Page.RenderString
(dict "display" "inline") }}`. Plain `safeHTML` was wrong: it showed literal
  `*italic*` and `[link](url)` syntax instead of rendering it.
- **`cs-wins` parses inner content as key-value lines.** Use `index $parts N`
  + `trim … " "` for field extraction — passing trim through a pipe with a
  backtick char did **not** work reliably (see git history).
- **New shortcode files in `layouts/shortcodes/` are not picked up by a
  running `hugo serve`.** Restart serve after creating a new shortcode
  template. Modifying an existing one hot-reloads fine.
- **`<ul>`-based shortcodes inside `.csi-prose` must join the prose list-rule
  `:not()` chains** (`ul:not(.csi-list):not(…)`) or they inherit gradient
  bullets — and must then reset `list-style`/margins themselves.
- **CSS-drawn figures beat images for diagrams** (`csi-split figure="…"` →
  `figures/<name>.html`: inherits fonts, recolours per face, prints crisp) —
  but draw with REAL elements; print drops `::before/::after` `background-image`.
- **The TOC reads `.Fragments`, not `.TableOfContents`.** `.TableOfContents`
  is empty when read from inside a _shortcode_ (it isn't built until after the
  goldmark pass), which is the original reason the TOC moved to a layout-stage
  partial (`partials/case-study-toc.html`) — at the layout stage either API
  works, but we use `.Fragments` for the structured headings. Caveat:
  `.Fragments.Headings` nests the real headings under a synthetic Level-0 root
  node, so the partial descends one level (`(index … 0).Headings`) before
  listing them. Output each heading's `.Title` with `safeHTML` (it arrives
  HTML-encoded, e.g. `&amp;`).
- **CSS `min()`/`max()` with mixed units fails to compile.** Hugo's LibSass
  evaluates them itself and rejects `min(74%, 880px)` ("Incompatible units");
  interpolation doesn't help. Express the cap differently (a `max-width`
  clamping a `%` flex-basis) or hide it inside `calc()`.
- **`%` padding and `%` flex-basis resolve against DIFFERENT boxes.** Padding
  `%` uses the containing-block width; a flex child's basis `%` uses the flex
  container's CONTENT box (after padding). `csi-carousel` centres slides with
  side `padding: 13%` + slide `flex-basis: 100%` (⇒ 74%-wide slides) — mixing
  the two bases put the first snap point ~118px off centre.
- **SCSS `&__foo` inside nested rules has a trap.** When you write
  `&__toggle:checked ~ &__content` inside `.case-study-modern .parent { … }`,
  the second `&` expands to the **full** ancestor chain, producing selectors
  like `.parent__toggle:checked ~ .case-study-modern .parent__content` which
  never match. For sibling-combinator (`~`/`+`) rules, **write the selectors
  as literal class names** placed outside the nested block (still inside
  `.case-study-modern` if needed).

---

## End-of-article CTA

The layout renders a CTA card at the end of every case study, matching the
blog's `#callout` treatment (white card, 3px mint border, mint button).

Behavior controlled by the `callout:` front-matter field:

| Front matter                                         | Result                                                                                                                                                                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **field absent** (default)                           | Generic Masterpoint CTA renders automatically — "Curious if Masterpoint could help your team too?" + "Get in touch" button (and inline "Get in touch" link) → `https://calendly.com/matt-at-masterpoint/project-chat`. |
| `callout: "<p>...</p><a ... class='button'>...</a>"` | Custom HTML CTA replaces the default for that page.                                                                                                                                                                    |
| `callout: false`                                     | CTA is suppressed entirely on that page.                                                                                                                                                                               |

The default CTA copy lives inline in `layouts/case-studies/single.html`. If you
extract it to a partial later (e.g. `partials/case-study-cta.html`), make sure
the override behavior still works (the `isset` check distinguishes "absent"
from "explicitly false").

**`.cs-article a:not(.button)`** — the broad article-link rule excludes
`.button` from its color override. Without that exclusion, button text becomes
mint on mint and disappears. Always keep `:not(.button)` on `.cs-article a`.

---

## Immersive layout (MarketSpark, Power Digital)

Opt in with `layout: immersive`. Body carries **both** `case-study-modern` and
`case-study-immersive`:

- **Top (hero + stat strip):** `immersive.html` copies the `.cs-hero` /
  `.cs-stat-strip` markup from `single.html`; the dual body class styles it via
  the existing `.case-study-modern .cs-*` rules. Don't restyle the top here — the
  one intentional addition is the optional **`client_logo_height`** hook (sets
  `--cs-client-logo-h`, default 32px) to enlarge a short client wordmark.
- **Body: a stack of contained, rounded CARDS** on the pine backdrop, faces
  **rotating light ↔ dark** like the marketing pages, each with a subtle gradient
  "photo" background (glow mesh + faint dot grid on dark). Not full-bleed slides,
  not one flat article card. All body CSS is scoped to `.csi-*` under
  `.case-study-immersive` (search `// IMMERSIVE CASE STUDY — BODY`), never bare
  element selectors, so it can't touch the modern hero/stats.
- **No yellow.** Per brand preference the body omits brand yellow (`#ECE295`); all
  accents are teal (`#2ad9c2` / `#55C1B4`) → pink (`#D191BF`) via the local
  `csi-grad-*` mixins (the global `cs-brand-gradient` leads with yellow, so it's
  unused in the body). The modern hero title keeps its standard `text-gradient`.

### Card shortcodes (`csi-*`)

Author the body as **only** `csi-*` blocks separated by blank lines; prose lives
_inside_ each block. Each emits a `<section class="csi-section …">` card.

| Shortcode         | Purpose                                                        | Key args                                                                              |
| ----------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `csi-section`     | A card (eyebrow + headline + block prose).                     | `eyebrow`, `title` (HTML ok), `variant`, `align`, `num`, `accent`, `id` (anchor target, e.g. for `sticky_nav`; also on `csi-split`) |
| `csi-split`       | Text + visual side-by-side; `flip="true"` alternates sides.    | `eyebrow`, `title`, `media`, `media_alt`, `media2`/`media2_alt` (second image stacked below the first), `figure` (CSS-drawn figure partial from `figures/<name>.html` instead of an image; subfolders work — `figure="power-digital/terralith"`), `flip`, `contain`, `caption`, `variant`, `ratio` (`50-50` default / `65-35` / `75-25`, text wider; ratios auto-reverse under `flip` since flip puts the media in the first grid track via `order`) |
| `csi-steps`       | Numbered process cards. Place INSIDE a `csi-section`.          | inner blocks split by `---`, each `title:` / `body:`                                  |
| `csi-impact`      | Outcome cards w/ gradient icon badges. INSIDE a `csi-section`. | inner blocks split by `---`, each `icon:` / `title:` / `body:`; `cols="2"` for a slimmed 2-up grid (pairs with `csi-compare`, capped to the same 980px) |
| `csi-compare`     | "Then / now" migration ledger: muted old world → bold gradient new world per metric. Owns a page's hard numbers — pair with a slimmed `csi-impact` so figures aren't stated twice. Mobile stacks each row with per-cell tags. INSIDE a `csi-section` (also nests inside a `csi-phase`). | `before_label`, `after_label`; inner blocks split by `---`, each `label:` / `before:` / `after:` / optional `delta:` (renders as a solid-gradient pill **inline** after the new-world value — the "Change" figure) |
| `csi-phase`       | A dated chapter in an engagement timeline: a wide **card** hanging off a single gradient rail (`.csi-phase__card` + `.csi-phase__rail`/`__marker`). Each phase is an `<article>`; place phases one after another INSIDE a `csi-section` — no wrapper element needed. Full block markdown + nested `csi-compare` ledgers work in the body. Used by the Cursor "What Masterpoint Did" timeline. | `title` (HTML ok, typically `"Month YYYY - Headline"`) |
| `csi-carousel`    | Scroll-snap slideshow of result charts (used by Cursor "Executive Summary"). Slides carry NO card chrome — the chart exports are self-contained white cards, so the image itself gets the `.csi-prose img` radius + shadow. Active slide snaps to the CENTRE; neighbours peek in, with edge fades + arrows + gradient dots as scroll cues. Clicking a slide opens the chart full size in a native `<dialog>` lightbox (Esc / backdrop click / × all close it). CSS scroll-snap does the scrolling; the behavior JS lives in `immersive.html` gated on `.HasShortcode "csi-carousel"` — NOT in the shortcode, because the parent csi-section markdown-renders its Inner and goldmark chops long inline scripts into indented code blocks. Arrows hide ≤700px; there a "Swipe for more →" hint (`__hint`) shows under the dots and fades once `data-swiped` is set by the JS — the mobile peek is deliberately ~25-35px wide (11% gutters, 0.7rem gap; the gap all but ate a 7% gutter) and the mobile edge fade stays narrower than the peek so it doesn't white the neighbour out. Designed for the LIGHT face. INSIDE a `csi-section`. | inner blocks split by `---`, each `image:` / `alt:` and optional `stat:` / `title:` / `body:` (caption renders only if one is present; 16:9 fits best — `aspect-ratio` crops others) |
| `csi-timeline`    | Horizontal parallel-track cutover bars (old system winding down while the new ramps up): percent-positioned bars with `fade: out` / `fade: in` and an optional dashed cutover marker. Typically right after `csi-steps`. INSIDE a `csi-section`. | `marker` (percent 0–100), `marker_label`; inner blocks split by `---`, each `label:` / `note:` / `start:` / `end:` / `fade:` |
| `csi-questions`   | Takeaways row of compact numbered question cards (gradient numeral inline with the question), plus an optional `outro:` "verdict" panel (leading `**bold**` renders as a block gradient lead line) and optional `cta:` paragraph divided inside the same panel. Sections containing one auto-compact like `csi-list` ones. 3-up, stacks ≤860px. INSIDE a `csi-section`. | inner blocks split by `---`, each `question:` / `body:`; standalone blocks may carry `outro:` or `cta:` (inline markdown works) |
| `csi-list`        | Compact 2-col icon rows (icon chip + bold title — inline body). Space-saving sibling of `csi-impact` for secondary enumerations (e.g. "under the hood" extras) so they don't mimic the outcome grid. INSIDE a `csi-section`. | same inner format as `csi-impact` (`icon:` / `title:` / `body:`); keep bodies to one short sentence |
| `csi-testimonial` | Editorial quote band; `image=` makes it a featured cosmic band.| `name`, `title`, `company`, `photo`, `variant`, `image`, `tldr` (`"true"` → unattributed page-top summary: no quote mark, slim band, left-aligned text bare on the band with a vertical gradient bar; `**bold**` renders in the bright gradient). With `photo`, uses the avatar-left "portrait" layout (`csi-testimonial--portrait`, see below). |

Two **modern** shortcodes are also reused inside the immersive body (they render
because the body also carries `case-study-modern`, so `.case-study-modern .cs-*`
styles them):

- **`cs-about`** — the client/about card (first light band, nested inside a
  `csi-split`). Gained an optional **`logo`** arg that renders the client logo at
  the top of the card with a divider. Its `csi-split` uses `ratio="65-35"` so the
  card is wider than its image (`telecommunications.jpg`).
- **`cs-pullquote`** — used inline mid-article (between the impact grid and the
  closing sections) as a standout pull quote, distinct from the closing
  `csi-testimonial`. It's fine to have quotes in multiple places.

#### Avatar-left "portrait" layout (`cs-pullquote` + `csi-testimonial`)

When a `photo` is passed, both shortcodes switch to a shared avatar-left layout
(`--portrait` modifier class). It's a CSS **grid**, not flex, so the same DOM
reflows responsively:

- **Desktop** — grid areas `"avatar content" / "avatar attribution"`: the
  circular headshot sits in the left column, vertically centered, spanning the
  quote (top-right) and the attribution (bottom-right). The attribution is a
  **sibling of `__content`** (not nested) precisely so grid can re-place it.
- **Mobile** (`≤640px` pullquote / `≤700px` testimonial) — grid areas reflow to
  `"content content" / "avatar attribution"`: the quote spans full width on top,
  then the author row (avatar + name/title) below.
- **Avatar** — circular, with a **brand gradient ring** (`@include
  csi-grad-solid` on the wrapper `padding`, which is the ring thickness: `4px`
  desktop → `1px` on small screens so it doesn't overwhelm the smaller avatar).
- **Quote glyph** — the `__mark` hangs in the gap just left of the first line on
  desktop (decorative, absolute, doesn't shift the quote text); on mobile it
  drops to a plain block lead-in above the quote.
- The pullquote card radius is trimmed to `8px` in portrait mode (the
  `csi-testimonial` featured band stays full-bleed / square by design).

#### Non-portrait `cs-pullquote` on mobile (`≤640px`)

The plain (no-photo) pull quote has its own `@media (max-width: 640px)` rule on
the base `.cs-pullquote` (so it applies in **every** section face, not just the
compact `:has(.csi-list)` band). Without it, the desktop card is too big for a
phone: the `4rem` left gutter for the absolute quote glyph wastes width, the
`1.45rem` body overflows, and the `__by` attribution squeezes name + `title,
company` side by side (the role wraps awkwardly). On mobile it: drops the `__mark`
into the text flow (`position: static`, small negative bottom margin so the body
sits right under it — top padding is trimmed to `1.2rem` to match), shrinks the
body to `1.2rem`, and **stacks** the attribution (`__by` → `flex-direction:
column`, name over role). Scoped `:not(.cs-pullquote--portrait)` so the portrait
grid layout above is untouched.

#### `csi-phase` timeline on mobile (`≤575px`)

Desktop is a 2-column grid (`rail | card`); on a phone that rail column + gap
cramped the copy. Mobile drops to a **single flow column** (`display: block`) and
absolutely positions the rail in the left gutter (`.csi-phase__rail { position:
absolute; left: -0.9rem }`) so the marker + line sit just left of the full-width
card. The shared section gutter (`.csi-section .csi-container`) also trims to
`0 1rem` at `≤575px` (was `1.4rem`).

#### `csi-compare` delta pill on mobile (`≤700px`)

The `__delta` pill shares the narrow flex `__after` cell with the new-world value,
so a long label wrapped into a ragged blob under the `999px` radius. On mobile it
gets its own full-width line (`flex: 0 0 100%`), **centered** text, and a `10px`
radius so multi-line labels read as a tidy chip; short labels stay one line.

**`variant` = the card's face colour** (drives the light↔dark rotation): `light`
(white) and `pine` (dark) are the two real faces. `cream`/`mint` alias to light;
`pine-deep`/`gradient` alias to dark (kept so older content still renders). Steps,
impact cards, and the testimonial auto-recolour on the dark faces. Alternate
`light`/`pine` down the page for the rotation.

Notable args:

- **`align="center"`** (csi-section) — centres the eyebrow + headline + intro
  prose. Grids (`csi-steps`/`csi-impact`/`csi-list`) inside stay full-width with
  their card text left-aligned (the `--center` rule constrains only `> p`, not
  the grids).
- **`accent="true"`** (csi-section) — renders just the gradient line accent
  instead of an eyebrow (omit `eyebrow=`). Used on "Built so the team could own it".
- **Compact band is automatic with `csi-list`** — a `csi-section` containing a
  `csi-list` renders denser by default via `.csi-section:has(.csi-list)` (no
  arg): tighter padding, smaller headline, denser prose and `cs-pullquote`.
  Same content, less vertical real estate. Seen on "While We Were Under the
  Hood".
- **`ratio="65-35"`** (csi-split) — text column wider than the visual (default is
  `50-50`). Used by the About section so the card is bigger than the photo.
- **`image="…"`** (csi-testimonial) — full-bleed background image (e.g.
  `/img/bg_our_word.jpg`, the homepage "our word" cosmic image); the quote sits
  left over a dark scrim, colour bleeds in from the right. Used by the closing
  testimonial. Without `image=`, it's a plain centred quote band.

Authoring rules:

- **Headline / inline emphasis:** `<strong>…</strong>` for bold,
  `<span class='csi-grad'>…</span>` for the brand-gradient run (darkened on light
  cards, bright clip on dark — never yellow). `csi-grad` is also sprinkled on a
  handful of body phrases (one per section) for pop.
- **Section heads are `<div class="csi-section__head">`, NOT `<header>`** — a
  `<header>` collides with the scoped site-header rule and paints a pine box.
- `csi-section`/`csi-split`/`csi-testimonial` render inner as `display "block"`;
  `csi-steps`/`csi-impact`/`csi-list` bodies as `display "inline"`.
- **External links open in a new tab** via
  `layouts/case-studies/_markup/render-link.html` — a case-studies-scoped link
  render hook that adds `target="_blank" rel="noopener noreferrer"` to any
  `http(s)` link. Applies to body prose and shortcode-rendered prose. The hook
  template must **not** end in a trailing newline (it's trimmed with a closing
  `{{- /* … */ -}}`): because the hook replaces links inline, a trailing newline
  renders as a literal space after every link (e.g. `OpenTofu ,`).
- **Caption links are hand-written, not hook-processed.** A `caption=` containing
  an `<a>` is injected via `safeHTML` and bypasses the render hook, so add
  `target="_blank" rel="noopener noreferrer"` to the anchor by hand if it should
  open in a new tab.
- **`hugo serve` CSS hot-reload is flaky** — if a change doesn't show, hard-refresh
  (Cmd+Shift+R).

### Scroll animations (AOS)

The immersive body reveals on scroll using **AOS** (Animate On Scroll) — the same
library the marketing pages use, so motion is consistent site-wide rather than a
bespoke per-page system. AOS is bundled in `assets/js/plugins.js` and initialized
globally (`AOS.init({ easing: 'ease-out-cubic', duration: 1500, mirror: false,
once: true })`), with styles in `assets/css/aos.scss` (imported by `style.scss`).

- **Declarative `data-aos` attributes live in the `csi-*` shortcode templates**,
  not in content. All use `fade-up`: `csi-section` (head, then prose at
  `data-aos-delay="100"`), `csi-split` (text, then media at `delay="120"`),
  `csi-testimonial`, `cs-pullquote`, and the closing `.csi-cta`.
- **The hero and stat strip are intentionally NOT animated** — they're above the
  fold and read as the kept-verbatim modern top.
- **Duration is overridden to `600ms`** per element via `data-aos-duration="600"`
  (the global default 1500ms felt too slow band-by-band; 900ms still lagged when
  scrolling fast). The per-element attribute out-specifies the global
  `body[data-aos-duration="1500"]` rule that `AOS.init` sets, so only the case
  study speeds up — the rest of the site keeps 1500ms.
- **Trigger point uses the AOS default offset (120px)** — no per-element
  `data-aos-offset` override. The reveal fires once an element is ~120px *into*
  the viewport. To fire reveals earlier (e.g. so fast scrolls don't outrun the
  fade), add `data-aos-offset="0"` — or a negative value to start the fade before
  the element enters view — to the relevant `csi-*` shortcode.
- **No per-card stagger on grids.** `csi-impact`/`cs-wins` cards carry no
  `data-aos` of their own; they reveal with their parent `csi-prose` block, which
  avoids nested-AOS double-animation.
- Adding `data-aos` to a new shortcode needs no JS wiring — the global
  `AOS.init` already scans `[data-aos]` (and watches for new nodes).

### Page ending

`immersive.html` closes the body with the **`.csi-cta`** band — the "Curious if
Masterpoint could help your team too?" callout, now with an **inline underlined
"Get in touch" link (no button)** — then the shared **`schedule-assessment.html`**
partial ("Get a standardized, predictable, and efficient infrastructure
management process" + Schedule button), then `footer`. Same closing as the modern
case studies and the marketing pages.

### Sticky section nav

Every immersive case study gets a fixed client × Masterpoint bar that slides
in once the hero scrolls out of view (IntersectionObserver), with
scrollspy-highlighted anchor links. Default links are The Challenge / The Work
/ The Results → the conventional `the-challenge`/`the-work`/`the-results`
`id`s on `csi-section`/`csi-split`; override the pairs (or suppress with
`sticky_nav: []`) via `sticky_nav:` front matter. Hidden in print; anchored
sections get `scroll-margin-top` so they land clear of the bar. Keep the
active-link underline INSIDE the link box — the links row is
`overflow-x: auto` and any overhang conjures a stub scrollbar.

## Page-level styling decisions

- **Backdrop is pine** (`$pine = #0e383a`, matching the blog); the article sits on
  a wide white card (`.cs-article-card`, max-width **1080px** — wider than the
  blog's ~795px because case studies carry more visual content).
- **Body text is 0.98rem** (smaller than the blog) so the wider card stays readable.
- **Hero min-height ~720px** (smaller at tablet/mobile) so the photo has room even
  when the frosted title box is lean.
- **Hero title must stay larger than the stat-strip values at every breakpoint** —
  both scale down together, and the 2-up stat value is deliberately held below the
  title so the numbers never visually outweigh it.

---

## Print / PDF

Case studies print (Ctrl/Cmd+P → Save as PDF) styled to match the screen. Two
foundations plus a `@media print` block do the work:

- **Site stylesheet loads with `media="all"`** (`partials/head.html`), not
  `media="screen"` — with `screen` the browser ignores the stylesheet when
  printing and dumps raw unstyled HTML.
- **The `@media print` block** at the end of `case-studies.scss` (scoped to
  `body.case-study-modern` / `body.case-study-immersive`) handles the rest:
  1. **`print-color-adjust: exact`** on the subtree so browsers keep our
     backgrounds/gradients instead of dropping them to white (these layouts are
     almost entirely backgrounds).
  2. **AOS reset (critical, don't remove).** Every `csi-*` card starts at
     `opacity: 0` via `data-aos` until scrolled into view; nothing scrolls when
     printing, so the whole body would print blank. Forces `[data-aos] {
     opacity:1; transform:none; visibility:visible; transition:none }`.
  3. **Gradient-clipped text fallback.** `-webkit-background-clip: text` +
     transparent fill is unreliable in Chrome's PDF path (run stops wrapping and
     is sliced by `overflow:hidden`, or paints as a solid rectangle), so
     `.text-gradient` / `.csi-grad` / `.csi-step__num` / `.csi-testimonial__mark`
     / `.cs-hero__lockup-x` fall back to solid `#2ad9c2`. Intentional trade.
  4. **Hero frosted card** drops `backdrop-filter` (print-unsupported) and
     `overflow: hidden` so the title wraps freely.
  5. **Hides site chrome** for a standalone PDF: `#sitewideNote`,
     `header[aria-label="header"]`, `#schedule-assessment`,
     `footer[role=contentinfo]`, `#preloader`, cookie banner (`#cc-main` /
     `.cc-window`, injected into `<body>`).
  6. **Performance (prevents print lag/crash).** Print rasterizes at ~300+ DPI,
     where `backdrop-filter` / `filter: blur()`, the tiled 1px dot-grid `::after`
     overlays, and their `mask-image` explode — `print-color-adjust:exact` forces
     them all to paint and Chrome's renderer dies. The block zeroes
     `backdrop-filter` / `filter` / `mask-image` / `box-shadow` on `*` and drops
     `::before`/`::after` `background-image`. (Same effects make on-screen scroll
     feel slow.)
  7. **Page-break control.** `break-inside: avoid` on **small, repeating** cards
     only (`.cs-stat`, `.cs-pullquote`, `.csi-testimonial`, `.csi-impact__card`,
     `.csi-compare__row`, `.csi-fig-terralith__mono/__stack`, `.csi-timeline`,
     `.csi-question`, `.csi-carousel__slide`) so a card isn't sliced across a page
     boundary. NOT on large one-off blocks (About panel, article/screenshot
     cards) — shoving a big block whole leaves a worse blank gap; let those flow.

**Adding a new element?** Most need nothing — the perf/colour rules use universal
selectors (`*`, `::before`, `::after`). Only edit the block if the new thing is:
gradient-clipped text (→ item 3 list), a small self-contained card (→ item 7
list, never large/full-bleed blocks), new `<body>` chrome to hide (→ item 5
list), or a scroll container (`overflow-x: auto` can't scroll on paper — lay
items out in flow like `csi-carousel`: scroller `display: block`, slides stacked,
arrows/dots hidden). To **keep** chrome in the PDF, drop it from the item-5 list.

**Verify with a real headless PDF**, not screen DevTools (Chrome's print path
diverges): `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
--headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf=out.pdf
http://localhost:1313/case-studies/marketspark/`

---

## Table of contents (automatic)

Every modern case study gets an inline **"In This Case Study Success Story"**
contents card automatically — no shortcode, no per-page wiring. It lists every
H2 section as a numbered card with a gradient left bar. **Modern layout only** —
`immersive.html` does not inject the TOC (its body is `csi-*` cards, not H2
sections), so the immersive MarketSpark page has no contents card.

- **Auto-injected by the layout.** `layouts/case-studies/single.html` renders
  the card from `partials/case-study-toc.html` and splices it into `.Content`
  **before the first `<h2>`** via `replaceRE` (limit 1), so it lands right after
  the `cs-about` block (no shortcode emits `<h2>` — cs-wins uses `<h4>`,
  cs-about a `<div>` — so the first `<h2>` is always the first real section).
  The partial output is `$`-escaped (`replace … "$" "$$"`) before it becomes the
  replaceRE replacement, so a `$` in a heading title isn't read as a group ref.
- **Opt out per page** with `toc: false` in front matter. Default is on.
- **Title is hardcoded** to "In This Case Study Success Story" in the partial.
- **Inline card, not a floating sidebar.** The modern layout is a centered
  single-column article card, so the TOC lives in the flow (visible at every
  breakpoint) rather than floating like the blog's `.floating-toc`. The
  floating-toc JS in `scripts.html` stays gated to the blog only
  (`{{ if eq .Section "blog" }}`), so it never loads on case studies.
- **Built from `.Fragments`**, listing the top-level (H2) sections. See the
  authoring note for why `.TableOfContents` can't be read from a shortcode (the
  reason this is a layout-stage partial, not a shortcode).
- **Styled under `#cs-toc`** in `case-studies.scss` — the id is what lets the card's
  link/list rules out-specify the broad `.cs-article` descendant rules without
  `!important` (and avoids the `&__` + id SCSS trap).
- **Anchor links** rely on the heading render hook (`render-heading.html`),
  which already gives every case-study H2 an `id`. Smooth scrolling comes from
  the global `scroll-behavior: smooth`; the header isn't fixed, so no
  `scroll-margin-top` offset is needed.

---

## Em dash discipline

Keep em dashes under 10 per case study. They lose punch when overused. When
trimming:

- **Parens** for parenthetical asides (`Every resource (VPCs, ECS, Lambda) is defined in code`)
- **Commas** for in-sentence pauses (`Long-lived IAM credentials, a security liability we see in nearly every audit, are gone`)
- **Colons** for elaborations (`Every resource type is now declared in OpenTofu: networking, data, compute, …`)
- **Periods** for joined complete thoughts

Reserve em dashes for rhetorical punch lines and attribution lines.

---

## Iteration workflow

Use the **Chrome DevTools MCP** to visually verify changes during a session.
Required because Hugo's CLI build does not catch visual regressions.

### Step-by-step

1. Start (or confirm) `hugo serve` is running at http://127.0.0.1:1313/.
2. Navigate to the page (`/case-studies/<client>/` — slug = filename).
3. After every meaningful CSS/layout change, reload and screenshot to verify.
4. **Save screenshots in `.screenshots/`** with descriptive filenames
   (`ms-NN-what.png`). They're git-ignored.
5. **Delete `.screenshots/*` at the end of the session.** Don't ship screenshot
   artifacts — they bloat the repo and aren't reproducible.

### Hunting CSS specificity issues

When a rule that "should" match doesn't, **read the compiled CSS** at
`http://127.0.0.1:1313/css/style.min.css` — SCSS `&` nesting can produce
unexpected selectors (see the double-`&` trap above).

### Verifying without breaking the user's Hugo serve

The user typically runs `hugo serve` themselves. For a one-shot build check,
use `hugo --destination /tmp/cs-v && rm -rf /tmp/cs-v` to confirm compilation
without restarting their server. **Never `kill` an existing hugo process**
without asking — that's their dev loop.

---

## Decisions & gotchas

Only what isn't already obvious from the sections above or the code.

- **Mobile hero top padding must clear the stacked header.** Below 992px the
  global header stacks into two rows and is `position: absolute` over the hero —
  across the **whole** ≤991 range, not just phones. Both the ≤991 and ≤575
  breakpoints use a large top pad (`10rem`); don't shrink it or the lockup hides
  under the nav.
- **Hero lockup uses a white pill behind the client logo** so the client's
  brand colors stay correct, then a gradient `×`, then `/img/logo.svg` (white
  wordmark for the dark hero).
- **"What Masterpoint Built" stays as plain bullets, not `cs-wins` cards** — the
  prose + inline links don't compress into card format.
- **`cs-pullquote` light variant exists for the closing quote** so it doesn't
  stack two dark cards against the dark CTA below it.
- **`CLAUDE.md` / `*.raw.md` are excluded via `ignoreFiles`** in `config.yaml`,
  else Hugo publishes every `.md` under `content/`.
