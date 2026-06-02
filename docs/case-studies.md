# Case Studies — working guide

This document captures the architecture, conventions, and workflow for building
case study pages on masterpoint.io. **Keep it current** — every time a new
decision is made about layout, shortcodes, visuals, or workflow, update this
file before ending the session. If something is removed from the codebase,
remove its mention from this file too (don't keep "we used to have X" notes —
the codebase is the source of truth, this file describes what IS).

---

## Architecture overview

There are **two case-study layouts** in this codebase. They are kept isolated
so visual changes to one never affect the other.

| Layout     | Template                           | Used by                                                 | Body class          | Style prefix         |
| ---------- | ---------------------------------- | ------------------------------------------------------- | ------------------- | -------------------- |
| **Legacy** | `layouts/case-studies/legacy.html` | Power Digital (opt-in via `layout: legacy`)             | `case-study-single` | `.case-study-single` |
| **Modern** | `layouts/case-studies/single.html` | Default for any case study without a `layout:` override | `case-study-modern` | `.case-study-modern` |

Routing is via Hugo's `layout:` front matter param. A case study that does
**not** specify `layout:` uses `single.html` (the modern layout). Power Digital
opts into the legacy layout with `layout: legacy` in its front matter.

Why this split exists: Power Digital has heavily customized inline styling
(see `.case-study-single` block in `assets/css/custom.scss`). The modern
layout was designed from scratch and is what every new case study should use.
Don't merge them.

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
preview_image: /img/case-studies/CLIENT/preview.svg
og_img: /img/case-studies/CLIENT/preview.svg

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
`.case-study-modern` in `assets/css/custom.scss`.

| Shortcode                    | Purpose                                                     | Notes                                                                                                                                                                                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------- |
| `cs-about`                   | Dedicated "about the client" card at the top of the article | Args: `name`, `url`, `linkedin`, `industry`, `technologies`, `facts`, `eyebrow`. Eyebrow auto-generates as `About {name}`. Website pill + LinkedIn brand mark sit in the top-right of the card. `industry` + `technologies` (or `facts`) render as labeled rows / pill list below the prose. |
| `cs-figure`                  | Visual figure with dark pine frame + caption                | Use `wide="true"` for full-card-width visuals. `variant="plain"` removes the dark frame.                                                                                                                                                                                                     |
| `cs-stats`                   | Inline grid of stat cards                                   | Inner content is line-delimited `value                                                                                                                                                                                                                                                       | label | optional note`. |
| `cs-callout`                 | Highlighted aside paragraph                                 | Variants: `info` (mint), `warning` (yellow), `accent` (pink). Optional `title` + `icon` (FontAwesome class).                                                                                                                                                                                 |
| `cs-pullquote`               | Large quote card with gradient left border + attribution    | Args: `attribution`, `variant` (`dark` default = pine card with vanilla attribution, `light` = cream/mint editorial card with mint attribution). Reserve for actual quotes — not for emphatic bold lines.                                                                                    |
| `cs-beforeafter` + `cs-pane` | Two-pane before/after card                                  | `cs-pane variant="before                                                                                                                                                                                                                                                                     | after | neutral"`.      |
| `cs-wins`                    | Grid of "win" cards with gradient icon badges               | Used for the Outcomes & Business Impact section. Body lines render inline markdown — links, _italics_, **bold** all work.                                                                                                                                                                    |
| `cs-lockup`                  | Client × Masterpoint logo lockup                            | Standalone version; the hero already includes an in-place lockup via the layout.                                                                                                                                                                                                             |
| `cs-todo`                    | Yellow striped TODO badge                                   | Visible in draft so placeholder work isn't lost. Optional first positional arg sets the tag label.                                                                                                                                                                                           |

### Shortcode authoring notes

- **`cs-wins` body uses `RenderString` inline** — `{{ $body | $.Page.RenderString
(dict "display" "inline") }}`. Plain `safeHTML` was wrong: it showed literal
  `*italic*` and `[link](url)` syntax instead of rendering it.
- **`cs-stats` and `cs-wins` parse inner content as pipe-delimited /
  key-value lines.** Use `index $parts N` + `trim … " "` for field
  extraction — passing trim through a pipe with a backtick char did **not**
  work reliably (see git history).
- **New shortcode files in `layouts/shortcodes/` are not picked up by a
  running `hugo serve`.** Restart serve after creating a new shortcode
  template. Modifying an existing one hot-reloads fine.
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

## Visualizations

Two flavors:

1. **Custom on-brand SVG diagrams** under `static/img/case-studies/CLIENT/`.
   Pine + brand gradient (`#ede497 → #2ad9c2 → #d891ce`), Proxima Nova
   typography, soft drop shadow. Use for _concept_ visuals (architecture,
   before/after, workflow).
2. **Real photographic backgrounds** for the hero (downloaded from Unsplash).
   Always store under `static/img/case-studies/CLIENT/`. Avoid stock-image
   clichés (handshakes, generic computers) — prefer abstract or domain-themed
   imagery.

When the user asks for an image, ask whether they want SVG-illustrated or a
real photo before committing. The hero specifically takes a real photo for
mood; in-article figures are typically SVG.

### Downloading hero images

```bash
curl -sL "https://images.unsplash.com/photo-XXXX?w=1200&q=80" \
  -o static/img/case-studies/CLIENT/hero-bg.jpg
```

Unsplash URLs are stable; the `photo-XXXX` ID can be found by browsing
unsplash.com and copying any image link.

### Per-client folder discipline

Keep only files actually referenced in content. A typical per-client folder
shape:

```
static/img/case-studies/CLIENT/
├── CLIENT-logo.png   # client_logo
├── hero-bg.jpg       # hero_aside_image
└── preview.svg       # preview_image + og_img
```

Delete unused SVGs/images as work converges — the codebase is the source of
truth, not "what might come back later".

---

## Page-level styling decisions

- **Page backdrop** is pine (`$pine = #0e383a`), matching the blog. The
  article sits on a wide white card (`.cs-article-card`, max-width 1080px)
  with a soft shadow.
- **Hero** is darker pine with a gradient + dot grid + soft mint/pink glow,
  _plus_ the optional full-bleed background image with a dark scrim and
  frosted title frame.
- **Hero min-height** is ~720px desktop / 600px tablet / 500px mobile so the
  photo stays generous even when the frosted box content is lean.
- **Body content max-width** is wider than the blog (1080px article card vs
  the blog's ~795px entry) because case studies have more visual content.
- **Body text size** is 0.98rem (`.cs-article`, `p`, `ul/ol li`) — slightly
  smaller than the blog's default to keep the wider card readable.
- **Hero title font** scales 2.7rem → 2.45rem → 1.9rem (desktop / ≤991px /
  ≤575px). The stat-strip values scale alongside it (2.2rem → 1.8rem → 1.55rem)
  so the title stays comfortably larger than the stat values at **every**
  breakpoint — the values must never visually outweigh the title (the 2-up value
  is 1.8rem, not 2rem, so it doesn't feel oversized at the narrow ~600px end).
  Stat-cell padding also adapts: 1.7rem (4-up) → 2rem (2-up, more breathing
  room) → 1.1rem (1-up stack, tight so stacked stats don't sprawl).
- **Section H2** has a gradient accent bar above it (`::before`). This is the
  primary visual marker for major sections — no separate `cs-section`
  shortcode needed.
- **Pull quotes** (dark variant) are pine cards with a gradient left border
  and a soft mint serif quote mark; attribution is vanilla.

---

## Table of contents (automatic)

Every modern case study gets an inline **"In This Case Study Success Story"**
contents card automatically — no shortcode, no per-page wiring. It lists every
H2 section as a numbered card with a gradient left bar.

- **Auto-injected by the layout.** `layouts/case-studies/single.html` renders
  the card from `partials/case-study-toc.html` and splices it into `.Content`
  **before the first `<h2>`** via `replaceRE` (limit 1), so it lands right after
  the `cs-about` block (no shortcode emits `<h2>` — cs-wins/cs-pane use `<h4>`,
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
- **Styled under `#cs-toc`** in `custom.scss` — the id is what lets the card's
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
2. Navigate to the case study page. **Slug is derived from filename**, so
   a file at `content/case-studies/<client>.md` lives at
   `/case-studies/<client>/`. Don't add a `slug:` field unless you really
   need filename and URL to diverge.
3. After every meaningful CSS/layout change, reload and screenshot to verify.
4. **Save screenshots in `.screenshots/`** with descriptive filenames
   (`ms-NN-what.png`). They're git-ignored.
5. **Delete `.screenshots/*` at the end of the session.** Don't ship screenshot
   artifacts — they bloat the repo and aren't reproducible.

### Useful Chrome DevTools snippets

```js
// Inspect computed style on an element
() => {
  const el = document.querySelector("SELECTOR");
  const s = getComputedStyle(el);
  return {
    fontSize: s.fontSize,
    color: s.color,
    textTransform: s.textTransform,
  };
};
```

For specificity hunts: walk parents and check styles, or iterate
`document.styleSheets` and test `el.matches(rule.selectorText)`. When a rule
that "should" match doesn't, **read the compiled CSS** in
`http://127.0.0.1:1313/css/style.min.css` — SCSS `&` nesting can produce
unexpected selectors (see the double-`&` trap above).

### Verifying without breaking the user's Hugo serve

The user typically runs `hugo serve` themselves. For a one-shot build check,
use `hugo --destination /tmp/cs-v && rm -rf /tmp/cs-v` to confirm compilation
without restarting their server. **Never `kill` an existing hugo process**
without asking — that's their dev loop.

If a **new** shortcode template is added, the watcher won't pick it up. Tell
the user to restart `hugo serve` (Ctrl-C + rerun).

---

## Template preview page

`content/case-studies/template.md` (`draft: true`) is a living gallery showing
every `cs-*` shortcode with boilerplate content. To preview locally, restart
with `hugo serve -D`. Netlify's production build (`hugo --gc --minify`, no
`-D`) excludes it. Use this to show examples.

---

## Decision log

Record meaningful decisions about the **current** design, with a one-line
"why". If a decision is later reversed (feature removed), delete the entry
rather than leaving a "we used to do X" note. The codebase is the source of
truth; this log explains the reasoning behind what's still there.

### Architecture

- **Two-layout split (legacy vs modern).** Power Digital is heavily
  customized; we don't want to regress it while iterating on new case studies.
  Route via `layout:` front matter.
- **Page backdrop = pine, article = white card.** Matches the blog's visual
  language; frames long-form content nicely without competing with figures.
- **Body content max-width = 1080px** (wider than the blog's ~795px) — case
  studies have more visual content.
- **Body font 0.98rem.** With the wider card, 1.1rem felt oversized for
  long-form prose.

### Hero

- **Hero min-height ~720px desktop** with smaller breakpoints below. The
  photo needs room even when the frosted box is lean.
- **Mobile hero top padding must clear the stacked header.** Below 992px the
  global header stacks into two rows (logo+MENU, then socials + GET IN TOUCH,
  ~132–144px tall) and is `position: absolute` over the hero — this is true
  across the **whole** ≤991 range (verified two-row at 600px and 900px), not
  just phones. The hero's `padding-top` is what keeps the lockup from hiding
  behind it, so **both** the ≤991 and ≤575 breakpoints use a large top pad
  (`10rem`, ~58–62px clearance). Do **not** shrink it (earlier values of `8rem`
  at ≤991 and `7rem` at ≤575 left the header overlapping / cramping the lockup).
- **Horizontal scrim** (dark left → clear right) when a hero photo is
  present. Uniform overlays make the photo unreadable; this lets the photo's
  subject carry visual weight while keeping the title legible.
- **Client × Masterpoint lockup in the hero.** Client logo on a white pill
  (so brand colors stay correct), gradient `×`, then `/img/logo.svg` (white
  wordmark + gradient icon, perfect for the dark hero box). Standalone
  `cs-lockup` shortcode uses `/img/logo_footer.svg` (pine wordmark) for use
  on white backgrounds.

### Content patterns

- **End-of-article CTA defaults in the layout.** Every case study auto-gets
  a generic Masterpoint pitch + "Get in touch" button (the inline link is
  "Get in touch" too). Override via `callout:` front matter; hide with
  `callout: false`. CTA visual language matches the blog's `#callout` (white
  card, 3px mint border).
- **Automatic inline TOC.** Every modern case study auto-gets an
  "In This Case Study Success Story" contents card (layout injects
  `partials/case-study-toc.html` before the first `<h2>`), so authors don't
  wire it per page; opt out with `toc: false`. Inline (not a floating sidebar)
  because the layout is a centered single column; visible at every breakpoint.
  Started as an opt-in `cs-toc` shortcode, then moved to automatic injection at
  the user's request (and reversed the original "no TOC" decision).
- **`.cs-article a:not(.button)` is mandatory.** Without the `:not(.button)`,
  buttons inside the article get the highlight-mint text color, which
  matches the button background, making text invisible.
- **`cs-pullquote` for actual quotes only.** Two variants: `dark` (default,
  pine card) for emphasis; `light` (cream/mint editorial) when adjacent to
  the dark CTA card (e.g., a closing testimonial above the CTA would
  otherwise stack two dark cards).
- **`cs-wins` for the Outcomes section.** Grid of icon cards with bolded
  titles and short bodies — faster to scan than 6 prose paragraphs.
- **"What Masterpoint Built" stays as plain bullets**, not cards. The bullets
  contain detailed prose with hyperlinks that don't compress well into card
  format.

### Hugo wiring

- **Slug derived from filename.** Don't set `slug:` unless filename and URL
  need to diverge.
- **`CLAUDE.md` and `*.raw.md` excluded via `ignoreFiles`** in `config.yaml`.
  Otherwise Hugo turns every `.md` under `content/` into a publishable page.
- **Em dash budget under 10 per case study.** They lose punch when overused;
  prefer parens / commas / colons / periods for in-sentence pauses.

### `public/` orphans

`hugo serve` doesn't garbage-collect old build artifacts, so stale slugs
from earlier experiments (`market-spark`, `synthmind-ai`, etc.) can keep
getting served locally. Netlify production builds use `hugo --gc --minify`
and are clean by default — orphans are a local dev-loop problem only. Fix:
`rm -rf public/ && hugo serve` (or `hugo --gc` once).

---

## Files this layout touches

- `layouts/case-studies/single.html` — modern layout (hero, stat strip,
  article card, auto-injected TOC, default CTA wiring)
- `layouts/case-studies/legacy.html` — Power Digital's untouched layout
- `layouts/shortcodes/cs-*.html` — all case-study shortcodes
- `layouts/partials/case-study-toc.html` — "In This Case Study Success Story"
  contents card, auto-injected by `single.html` before the first `<h2>`
- `layouts/partials/scripts.html` — blog floating-toc JS (gated to blog only)
- `assets/css/custom.scss` — search for `// MODERN CASE STUDY LAYOUT` to find
  the scoped block under `.case-study-modern`
- `static/img/case-studies/CLIENT/` — per-client visuals
- `content/case-studies/_index.md` — section page (uses `case-studies/list.html`)
- `content/case-studies/<client>.md` — one per case study (filename = URL slug)
- `content/case-studies/template.md` — draft-only shortcode gallery
- `config.yaml` — `ignoreFiles` for `CLAUDE.md` + `*.raw.md`; `tableOfContents`
  start/end levels
