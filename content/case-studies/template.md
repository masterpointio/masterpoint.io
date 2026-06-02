---
title: "Template Preview · Every Shortcode / Component in One Page"
draft: true   # excluded from production; run `hugo serve -D` locally to preview
description: "Living template / shortcode / component gallery for the case-study layout. Use this page to preview each cs-* shortcode and copy-paste boilerplate when starting a new case study."

# Hero
eyebrow: "TEMPLATE PREVIEW"
client: "Template"
client_logo: /img/case-studies/marketspark/marketspark-logo.png   # any image works
hero_title: "A <span class='text-gradient'>case-study template</span> with every shortcode wired up."
# hero_aside_image: /img/case-studies/marketspark/hero-bg.jpg  # uncomment for hero photo

# At-a-glance stat strip
stat_bar:
  - value: "Stat 1"
    label: "headline metric label, kept tight"
  - value: "0 → 100%"
    label: "before / after style"
  - value: "100+ Things"
    label: "labels may include <a href='https://example.com' target='_blank' rel='noopener'>inline links</a>"
  - value: "hours, not weeks"
    label: "stay readable on every breakpoint"

# Optional preview / OG
preview_image: /img/case-studies/marketspark/preview.svg
og_img: /img/case-studies/marketspark/preview.svg

sitemap:
  priority: 0
---

## How to use this page

This page is `draft: true` so it's excluded from production. To preview locally, restart `hugo serve` with the `-D` flag:

```bash
hugo serve -D
```

Then open `http://localhost:1313/case-studies/template/`. Use it as a copy-paste reference when starting a new case study.

---

### Markdown table — native GFM table

Need to do a table here.

---

{{< cs-about
  name="Template Client"
  url="https://example.com/"
  linkedin="https://www.linkedin.com/company/example/"
>}}
This is the `cs-about` shortcode. A short, one-paragraph description of the client goes here. The eyebrow auto-generates as **About {name}** unless you pass `eyebrow="..."` explicitly. The website pill and LinkedIn brand mark appear in the top-right of the card if `url` and `linkedin` are set.
{{< /cs-about >}}

## A Section H2 (auto-listed in the contents card)

Plain prose paragraphs render with the article's body font and rhythm. **Bold** is pine, *italic* is plain italic, [links are highlight-mint](https://example.com), and `inline code` gets a soft mint background.

> Block quotes get a gradient left border and a soft pine background. Use them for asides where a `cs-callout` would be too heavy.

---

### `cs-callout` — three variants

{{< cs-callout title="cs-callout · info variant" icon="fa-circle-info" variant="info" >}}
The **info** variant uses the mint accent. Good for definitions, sidebars, and "good to know" boxes. Markdown renders inside: [links](https://example.com), `inline code`, **bold**, *italic*.
{{< /cs-callout >}}

{{< cs-callout title="cs-callout · accent variant" icon="fa-circle-question" variant="accent" >}}
The **accent** variant uses the pink brand color. Great for "why" boxes — moments where you're explaining the reasoning behind a decision.
{{< /cs-callout >}}

{{< cs-callout title="cs-callout · warning variant" icon="fa-triangle-exclamation" variant="warning" >}}
The **warning** variant. Use sparingly — for genuine cautions or callouts about risk.
{{< /cs-callout >}}

---

### `cs-figure` — image with caption (wide and plain variants)

{{< cs-figure src="/img/case-studies/marketspark/preview.svg" alt="Wide cs-figure example" caption="Wide cs-figure with the dark pine frame and rounded corners. Pass wide=&quot;true&quot; to span the full article-card width." wide="true" >}}

{{< cs-figure src="/img/case-studies/marketspark/preview.svg" alt="Plain cs-figure example" caption="Plain variant has no dark frame or padding — pass variant=&quot;plain&quot;. Use when the image already has its own framing." variant="plain" >}}

---

### `cs-pullquote` — large dark pine quote

{{< cs-pullquote attribution="— Demo Attribution" >}}
The `cs-pullquote` shortcode renders a dark pine quote card with a gradient left border. **Bold text inside picks up the brand gradient.** Reserve for high-impact moments: a real quote, or a one-line insight you want to lift out of the surrounding prose.
{{< /cs-pullquote >}}

---

### `cs-stats` — inline stat-card grid

{{< cs-stats >}}
1 → 11 | demo accounts | optional note line
0 → 100% | coverage | another note
50+ | services | here too
hours, not weeks | recovery | last one
{{< /cs-stats >}}

---

### `cs-todo` — visible TODO marker

{{< cs-todo >}}A standard `cs-todo` marker. Yellow striped background, hard to miss. Use it for draft placeholders so you don't ship a half-finished case study by accident.{{< /cs-todo >}}

{{< cs-todo "custom label" >}}Pass a positional first argument to change the tag label.{{< /cs-todo >}}

---

### `cs-beforeafter` + `cs-pane` — two-pane comparison

{{< cs-beforeafter >}}
{{< cs-pane variant="before" title="Before" >}}
- Bullet inside the **before** pane (pink-tinted)
- Markdown works here
- Another point
{{< /cs-pane >}}
{{< cs-pane variant="after" title="After" >}}
- Bullet inside the **after** pane (mint-tinted)
- Markdown also works
- Another point
{{< /cs-pane >}}
{{< /cs-beforeafter >}}

---

### `cs-wins` — card grid with gradient icon badges

{{< cs-wins >}}
icon: fa-shield-halved
title: A win-card title
body: One or two sentences. Inline markdown like *italics* and [links](https://example.com) renders correctly.
---
icon: fa-database
title: Another win
body: Cards auto-fit in a responsive grid. They lift slightly on hover.
---
icon: fa-tags
title: A third win
body: The icon is a Font Awesome class (e.g. `fa-shield-halved`). The gradient badge wraps it automatically.
{{< /cs-wins >}}

---

### `cs-lockup` — client × Masterpoint logo lockup

{{< cs-lockup
  client_logo="/img/case-studies/marketspark/marketspark-logo.png"
  client_name="Template Client"
  caption="cs-lockup pairs a client logo with the Masterpoint mark via a gradient × — works well as an intro figure for an engagement."
>}}
