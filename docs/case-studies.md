<!-- trunk-ignore-all(markdownlint,prettier) -->

# Case Studies — working guide

This document captures the architecture, conventions, and workflow for building
case study pages on masterpoint.io. **Keep it current** — every time a new
decision is made about layout, shortcodes, visuals, or workflow, update this
file before ending the session. If something is removed from the codebase,
remove its mention from this file too (don't keep "we used to have X" notes —
the codebase is the source of truth, this file describes what IS).

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
| **Immersive** | `layouts/case-studies/immersive.html` | MarketSpark, Power Digital, Cursor (opt-in via `layout: immersive`) | `case-study-modern case-study-immersive` | `.case-study-immersive` |

Routing is via Hugo's `layout:` front matter param. A case study that does
**not** specify `layout:` uses `single.html` (the modern layout). MarketSpark,
Power Digital, and Cursor opt into immersive with `layout: immersive`.
List-page order is `weight:` ascending — Cursor 1, MarketSpark 2, Power
Digital 3.

The **modern**
layout was designed from scratch and is the default for new case studies. The
**immersive** layout keeps the modern hero + stat strip **nearly verbatim** (its
body carries both `case-study-modern` and `case-study-immersive` so the modern
`.cs-*` hero/stat CSS applies; the only divergence is an optional
`client_logo_height` hook on the lockup mark) and replaces only the body with a stack
of rotating light↔dark colour cards (`.csi-*`). Don't merge them; scope every
selector under its prefix.

**Stylesheet location:** the **modern** and **immersive** CSS — everything under
`.case-study-modern` / `.case-study-immersive` (the `.cs-*` and `.csi-*` rules, the
`$cs-*` vars and the `cs-brand-gradient` mixins) — lives in its own partial,
`assets/css/case-studies.scss`, which is `@import`ed at the **end** of
`custom.scss` so the cascade order is unchanged (compiled output is byte-identical).
The `#caseStudiesPage` list-page grid stays in `custom.scss`.

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
- **`hero_aside_image` is optional.** When present, the hero gets a full-bleed
  background photo with a horizontal scrim (heavy pine on the left where the
  title sits, fading to nearly clear on the right where the photo's subject
  shows through), and the title sits inside a frosted translucent box
  (`.cs-hero__inner--framed`). When absent, the hero is plain pine gradient +
  dot grid + soft mint/pink glow with no frosted frame.

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
  `:not()` chains** (`ul:not(.csi-list):not(.csi-compare__rows):not(.csi-scale)`)
  or they inherit gradient bullets — and must then reset `list-style`/margins
  themselves. `csi-scale` is the cautionary tale: it shipped with stray
  gradient squares floating over every row until it joined the chains.
- **CSS-drawn figures beat images for diagrams** (`csi-split figure="…"` →
  `figures/<name>.html`: inherits fonts, recolours per face, prints crisp) —
  but draw with REAL elements; print drops `::before/::after` `background-image`.
  Current inventory: `power-digital/terralith` (mono → stacks decomposition),
  `cursor/terralith` (monolith ONLY — problem-side; the page's real charts carry
  the after-state), `cursor/agent-rules` (editor window, a nod to the Cursor
  IDE; its seven rule lines are the case study's verbatim wording, so the prose
  beside it stays short).
- **Prose subheads:** `###`/`####` inside any `csi-section`/`csi-split` inner
  render as compact in-card subheads (1.26rem / 1.08rem ink, white on the dark
  faces) — for a closing card that carries two related reads without the weight
  of two sections (see Cursor's "Architectural flexibility" + "agents" card).
- **The TOC reads `.Fragments`, not `.TableOfContents`.** `.TableOfContents`
  is empty when read from inside a _shortcode_ (it isn't built until after the
  goldmark pass), which is the original reason the TOC moved to a layout-stage
  partial (`partials/case-study-toc.html`) — at the layout stage either API
  works, but we use `.Fragments` for the structured headings. Caveat:
  `.Fragments.Headings` nests the real headings under a synthetic Level-0 root
  node, so the partial descends one level (`(index … 0).Headings`) before
  listing them. Output each heading's `.Title` with `safeHTML` (it arrives
  HTML-encoded, e.g. `&amp;`).
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

## Immersive layout (MarketSpark, Power Digital, Cursor)

Opt in with `layout: immersive`. The body element carries **both**
`case-study-modern` and `case-study-immersive`:

- **Top (hero + stat strip): all but identical to modern.** `immersive.html`
  copies the `.cs-hero` and `.cs-stat-strip` markup from `single.html`, and the
  dual body class means the existing `.case-study-modern .cs-*` rules style them
  — so the top renders as the modern layout. The one intentional addition is the
  optional **`client_logo_height`** front-matter hook (sets `--cs-client-logo-h`
  on the client lockup mark, default 32px; styled in `case-studies.scss`) so a short
  client wordmark can be enlarged. Otherwise don't restyle the top here.
- **Body: a stack of contained, rounded CARDS** on the pine page backdrop, the
  faces **rotating light ↔ dark** like the marketing pages (services /
  who-we-are), each with a subtle gradient "photo" background (glow mesh + faint
  dot grid on dark cards). Not full-bleed slides and not one flat article card.
  All body CSS is scoped to `.csi-*` under `.case-study-immersive` (search
  `// IMMERSIVE CASE STUDY — BODY`) — never bare element selectors — so it can't
  touch the modern hero/stats.
- **No yellow.** Per the brand guidelines preference, the body deliberately omits
  the brand yellow (`#ECE295`); all accents are teal (`#2ad9c2` / `#55C1B4`) →
  pink (`#D191BF`) via the local `csi-grad-*` mixins (the global
  `cs-brand-gradient` is NOT used in the body because it leads with yellow). The
  modern hero title keeps its standard `text-gradient` (that's the kept top).

### Card shortcodes (`csi-*`)

Author the body as **only** `csi-*` blocks separated by blank lines; prose lives
_inside_ each block. Each emits a `<section class="csi-section …">` card.

| Shortcode         | Purpose                                                        | Key args                                                                              |
| ----------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `csi-section`     | A card (eyebrow + headline + block prose).                     | `eyebrow`, `title` (HTML ok), `variant`, `align`, `num`, `accent`, `id` (anchor target, e.g. for `sticky_nav`; also on `csi-split`) |
| `csi-split`       | Text + visual side-by-side; `flip="true"` alternates sides.    | `eyebrow`, `title`, `media`, `media_alt`, `media2`/`media2_alt` (second image stacked below the first), `figure` (CSS-drawn figure partial from `figures/<name>.html` instead of an image; subfolders work — `figure="power-digital/terralith"`), `flip`, `contain`, `caption`, `variant`, `ratio` (`50-50` default / `65-35` / `75-25`, text wider; ratios auto-reverse under `flip` since flip puts the media in the first grid track via `order`) |
| `csi-steps`       | Numbered process cards. Place INSIDE a `csi-section`.          | inner blocks split by `---`, each `title:` / `body:`                                  |
| `csi-impact`      | Outcome cards w/ gradient icon badges. INSIDE a `csi-section`. | inner blocks split by `---`, each `icon:` / `title:` / `body:`; `cols="2"` for a slimmed 2-up grid (pairs with `csi-compare`, capped to the same 980px) |
| `csi-compare`     | "Then / now" migration ledger: muted old world → bold gradient new world per metric. Owns a page's hard numbers — pair with a slimmed `csi-impact` so figures aren't stated twice. Mobile stacks each row with per-cell tags. INSIDE a `csi-section` (or a `csi-phase` — there it hugs the rail column and renders denser). | `before_label`, `after_label`; inner blocks split by `---`, each `label:` / `before:` / `after:` / optional `delta:` (gradient improvement pill under the after value, e.g. "39.3% faster"; the pill sets its own white `-webkit-text-fill-color` to opt back out of the after-cell's gradient text-clip) |
| `csi-phases` + `csi-phase` | Vertical engagement-journey rail: one continuous gradient rail down the left (a `::before`, so it intentionally drops out of print), a gradient dot + date chip + phase title per node, full block-markdown bodies (paragraphs, lists, links, nested `csi-compare` ledgers all work). Built for dated multi-month engagement stories where a `csi-steps` grid is too small to hold real narrative. Wrap the `csi-phase` blocks in one `csi-phases`; INSIDE a `csi-section` (typically pine). | `csi-phases` takes no args; each `csi-phase`: `date` (chip, e.g. "November 2025"), `title` |
| `csi-scale`       | Type-specimen "magnitude wall": each row leads with a huge gradient magnitude phrase ("hundreds", "thousands") followed by the rest of the sentence at prose size — for enumerating what a platform manages when the magnitudes ARE the story. The big run carries `.csi-grad`, so dark-face recolouring and the print solid-colour fallback come for free. INSIDE a `csi-section`. | inner blocks split by `---`, each `pre:` (optional lead-in, e.g. "in the") / `big:` / `rest:` |
| `csi-figure`      | Embed a CSS-drawn figure partial inline in a section's prose — the standalone sibling of `csi-split`'s `figure=` slot, for consolidated single-card sections where a side-by-side split would leave the figure floating beside a very tall text column. | `name` (partial under `figures/`, e.g. `cursor/terralith`), `max` (optional max-width, e.g. `760px`) |
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
  `csi-testimonial`. It's fine to have quotes in multiple places. On a PINE band
  use `variant="light"` (cream card) so the quote pops; on light bands the
  default dark card does the popping — Cursor alternates the two down the page.
  The light variant styles the two-line `name`/`title`/`company` attribution:
  `__name` flips to pine ink there (the base colour is white for the dark card,
  which is invisible on cream — bug found when Cursor combined light + `name=`
  for the first time).

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
- **Default (left) sections render as a centred ARTICLE COLUMN** — head +
  prose block centred at 880px with text left-aligned (`.csi-section--left`
  rule). Without it, the 760px prose column hugs the left edge of the wide
  band and the card looks lopsided. MarketSpark and Power Digital are
  unaffected (they pass `align="center"` on every section); Cursor's
  consolidated Problem / Work / What-Changed cards are the first `--left`
  users.
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

### Cursor page notes

- **One card per chapter** (per the content owner's "fewer sections" feedback
  and this doc's future-case-study direction): TLDR band → Key Value Delivered
  → The Problem → What Masterpoint Did → The Results → What Changed for the
  Team → testimonial → CTA, strictly alternating light ↔ pine. Sub-reads
  inside the big cards are `###` prose subheads; the AI-guardrails content
  lives inside the rail's February–May phase (where the Notion draft has it),
  not in its own section.
- **Charts sit inline in the prose flow** (`.csi-prose img`: block, rounded,
  shadowed, `break-inside: avoid` in print; a hairline border on pine faces so
  pine-on-pine exports keep an edge) rather than in `csi-split` media columns.
  CSS figures embed the same way via `csi-figure`.
- **All charts are branded exports from the Notion draft** (Cursor ×
  Masterpoint lockup baked in), sized to 1800px wide. Each Notion "duplicate
  pair" contributed ONE in-page image; the spare white-background deploy-time
  column chart became `preview_image`/`og_img` instead of appearing twice.
  Dark-background charts sit on pine bands (near-seamless), white-background
  charts on light bands.
- **Client logo is the official brand-kit horizontal lockup SVG**
  (`cursor-lockup-white.svg`, the kit's `_DARK` = off-white #edecec variant)
  at `client_logo_height: 30px`.
- **Hero background (`hero-bg-cube.png`) is a generated composite**, not a
  photo: the brand-kit 3D cube icon (greyscaled, dimmed, screen-blended) with
  the CURSOR wordmark etched across its lower face over a soft dark
  under-glow, on a pine gradient + teal/pink glows + dot grid (PIL-composited
  from the user's `~/Downloads/cursor-brand-assets/`). Composition sits
  centre-right so the full wordmark clears the frosted title card at 1440.
  Swap the file for a designer piece or an approved Cursor IDE still anytime.
- **Stat-strip values use `&nbsp;`** inside multi-word tokens
  (`~8&nbsp;min → ~2&nbsp;min`) so narrow columns wrap at the arrow, never
  mid-token.
- **Verbatim-text page.** The case-study copy is the Notion draft word-for-word
  (per the content owner's instruction); layout chrome (eyebrows, figure
  labels, stat labels) reuses exact phrases from that copy. Don't "fix" source
  typos here without checking with marketing first.

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

Case studies print (Ctrl/Cmd+P → Save as PDF) styled to match the screen.

- **The site stylesheet loads with `media="all"`** (`partials/head.html`), not
  `media="screen"`. With `media="screen"` the browser ignored the entire
  stylesheet when printing and dumped raw unstyled HTML — that was the original
  "no styles in print" bug.
- **A `@media print` block at the end of `case-studies.scss`** (scoped to
  `body.case-study-modern` / `body.case-study-immersive`) handles everything print
  needs that screen doesn't:
  1. **`print-color-adjust: exact`** on the whole subtree so browsers keep our
     backgrounds and gradients instead of dropping them to white for ink saving
     (these layouts are almost entirely backgrounds).
  2. **AOS reset — the critical one.** Every `csi-*` card carries `data-aos`,
     which starts it at `opacity: 0` until scrolled into view. Nothing scrolls
     when printing, so without an override the **entire animated body prints
     blank** (empty colour cards — this was the original "things get cut off"
     bug). The block forces `[data-aos] { opacity:1; transform:none;
     visibility:visible; transition:none }`. Don't remove this.
  3. **Gradient-clipped text fallback.** `-webkit-background-clip: text` +
     transparent fill does not render reliably in Chrome's PDF path: the run
     stops wrapping and gets sliced by the hero card's `overflow:hidden`, or the
     gradient paints as a solid rectangle. So `.text-gradient` / `.csi-grad` /
     `.csi-step__num` / `.csi-testimonial__mark` / `.cs-hero__lockup-x` fall
     back to a solid brand colour (`#2ad9c2`) in print — any NEW class using the
     grad mixins directly (not via `.csi-grad`) must join this list.
     The on-screen multi-stop gradient becomes a single teal in the PDF — an
     intentional, reliable trade.
  4. **Hero frosted card** drops `backdrop-filter` (unsupported in print) and
     `overflow: hidden` so the title can wrap freely instead of being clipped.
  5. **Hides site chrome** so the PDF is a standalone document: `#sitewideNote`,
     `header[aria-label="header"]`, `#schedule-assessment`,
     `footer[role=contentinfo]`, `#preloader`, and the cookie-consent banner
     (`#cc-main` / `.cc-window`, orestbida CookieConsent v3 — it's injected into
     `<body>` and otherwise overlays the page in the PDF).
  6. **Performance — prevents the PDF/print-preview lag and crash.** Print
     rasterizes at ~300+ DPI (~100x the pixels of screen), and several decorative
     effects that are cheap on screen explode at that scale: `backdrop-filter` /
     `filter: blur()` (blur kernel scales with DPI), the tiled 1px dot-grid
     overlays (`background-size:~28px` on full-bleed `inset:0` `::after`s —
     millions of dots), and their `mask-image` (extra offscreen buffer per
     section). `print-color-adjust:exact` (item 1) forces all of it to actually
     paint, so memory blows up and Chrome's renderer dies. The block zeroes
     `backdrop-filter` / `filter` / `mask-image` / `box-shadow` on `*` and drops
     `::before`/`::after` `background-image` for print. (Same effects are why
     on-screen scrolling can feel slow — they re-composite on the GPU per frame.)
  7. **Page-break control — prevents cards clipping across page boundaries.**
     `break-inside: avoid` on the **small, repeating** cards (`.cs-stat`,
     `.cs-pullquote`, `.csi-testimonial`, `.csi-impact__card`, `.csi-compare__row`,
     `.csi-fig-terralith__mono/__stack`, `.csi-timeline`, `.csi-question`,
     `.csi-phase__head`, `.csi-scale__row`, `.csi-fig-cmono__frame`,
     `.csi-fig-rules__window`) pushes a whole
     card to the next page rather than slicing its top/bottom edge. **Only apply
     it to small cards** — putting it on large one-off blocks (the About panel,
     article/screenshot cards) backfires: shoving a big block whole to the next
     page leaves a huge blank gap on the page it left, which looks worse than the
     occasional slice. Those large blocks fit on their own, so let them flow.
- To **keep** a chrome element in the PDF, drop it from that `display: none` list.
- **When you add a new case-study element / shortcode / CSS class, check this
  print checklist.** Most additions need NOTHING — the perf and colour-accuracy
  rules use universal selectors (`*`, `*::before`, `*::after`), so new elements
  inherit them automatically. Only touch the `@media print` block if the new
  thing falls into one of these three buckets:
  1. **Gradient-clipped text** (`-webkit-background-clip: text` + transparent
     fill)? → add its class to the solid-colour fallback list (item 3 above), or
     it prints sliced / as a stray coloured rectangle.
  2. **A small, self-contained card** that would look broken if sliced across a
     page break? → add it to the `break-inside: avoid` list (item 7). Do NOT add
     large/one-off blocks or full-bleed section bands (see the dense-flow note).
  3. **New site chrome injected into `<body>`** (banner, modal, widget) that
     shouldn't appear in the PDF? → add its selector to the `display: none` list
     (item 5).
  A genuinely new heavy effect (e.g. a new `filter`/`mask` that the universal
  resets don't already cover) is the only other reason to edit the block.
- **Verify print changes with a real PDF**, not screen DevTools — Chrome's print
  path diverges (AOS, backdrop-filter, background-clip:text all behave
  differently). Generate one headless and read it back:
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new
  --disable-gpu --no-pdf-header-footer --print-to-pdf=out.pdf
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
