# Hiring section — working guide

The `/hiring/` section is where we publish job postings so we can send
candidates to masterpoint.io instead of a Notion page. This file is the spec
for how it works. **Keep it updated** when you change layouts, front matter,
the application embed, or the workflow.

## Goals

- One canonical, on-brand URL per role (`/hiring/<slug>/`) that we can link
  from LinkedIn, the newsletter, and job boards.
- Applications go through the shared **Notion hiring form**, embedded on the
  job post so candidates never leave the site and submissions land in the
  same Notion database the team already works from. An external `apply_link`
  is still supported per posting.
- Posts stay up after a role closes (`status: closed`) so the history is
  visible and old links keep working.
- Google for Jobs eligibility via `JobPosting` structured data.

## Architecture overview

```text
content/hiring/
├── _index.md                                   # /hiring/ banner copy + intro
└── YYYY-MM-DD-<slug>.md                        # one file per posting (blog-style date prefix)

layouts/hiring/
├── list.html                                   # /hiring/ — open roles, past openings, links
└── single.html                                 # job post page (hero, article card, apply)

layouts/partials/
├── hiring-entry.html                           # job card used on /hiring/
└── hiring-notion-form.html                     # #apply section with the embedded Notion form

assets/css/hiring.scss                          # all styling, @imported last in custom.scss
```

Other touch points:

- `config.yaml` → `menu.main`: top-level **Hiring** item (weight 50, after the
  Content dropdown). The footer menu renders it automatically.
- `layouts/partials/menu.html` + `footer-menu.html`: the **Hiring** nav item is
  highlighted on job post pages too (`eq $current.Section "hiring"`), same trick
  the blog uses.
- `layouts/partials/head.html`: `JobPosting` JSON-LD emitted for pages in the
  `hiring` section (`.IsPage` only, not the index).

## List page (`/hiring/`)

- Body `id="hiringPage"` (from `_index.md`). Same glow banner as the case
  studies index (`bg_our_team.jpg` under mint/pink radial glows and a dotted
  grid). The eyebrow (`banner_tagline`), title (`banner_title`) and lede
  (`banner_text`) are front matter on `_index.md`.
- **Open Roles**: every page in the section whose `status` is not `closed`,
  newest first, rendered by `hiring-entry.html` as a media-left card with
  status/location/type/salary chips, title, description, "View role & apply"
  CTA and posted date.
- **Empty state**: when nothing is open, a dashed card invites people to email
  `hello@masterpoint.io`.
- **Past Openings**: compact list of `status: closed` posts (title + month
  posted). Only renders when at least one closed post exists.
- **Get to know us**: three outline buttons to Who We Are, Now, and Blog.
- Deliberately **no** `schedule-assessment` sales CTA on hiring pages; the
  audience is candidates, not buyers. Footer still renders.

## Job post — front matter schema

```yaml
---
visible: true
draft: false
title: "Senior Platform Engineer (Fall 2026)" # page <h1>, card title, nav <title>
slug: senior-platform-engineer-fall-2026 # URL: /hiring/<slug>/
date: 2026-09-15 # "Posted" date + JobPosting.datePosted
# date_modified: 2026-xx-xx                      # optional, mirrors blog convention
description: "One or two sentences. Card blurb, hero lede, meta description."

# Role facts → hero pills, card chips, structured data
status: open # open | closed
role: Senior Platform Engineer # JobPosting.title (falls back to `title`)
employment_type: Full-time # → JobPosting.employmentType FULL_TIME
location: 100% Remote (US only)
salary: "$150K – $180K base" # display string
salary_min: 150000 # numbers feed JobPosting.baseSalary (omit to skip)
salary_max: 180000
salary_currency: USD
# valid_through: 2026-12-31     # optional JobPosting.validThrough (YYYY-MM-DD)

video: https://www.loom.com/share/<id> # optional; Loom share URL → embed

preview_image: /img/bg_our_team.jpg # card image on /hiring/
og_img: /img/og-img.png # social share image

# Application — pick one:
notion_form: https://masterpoint.notion.site/ebd/<id> # embed src (Notion's /ebd/ path)
notion_form_link: https://masterpoint.notion.site/<id> # plain link for the new-tab fallback
apply_link: "" # non-empty URL = link out instead of embedding
---
```

Body is plain Markdown. Use `##` for the main sections (What You'll Do, What
You Bring, Why Masterpoint?, About Masterpoint, and the closing "Want to work
with us? Good call!" section with the how-to-apply copy and screening
questions) and `###` for Must-Haves / Nice-to-Haves. The single layout styles
`h2` with a gradient bar and `h3` as small caps. The closing heading ends with
"!", so it needs `<!-- markdownlint-disable-next-line MD026 -->` above it.

## Job post page

1. **Hero** (`#banner`, glow banner): eyebrow "WE'RE HIRING" (or "ROLE CLOSED"),
   `h1` title, `description` as the lede, a pill row (location, type, salary,
   posted date), then **Apply for this role →** (anchors to `#apply`, or opens
   `apply_link` in a new tab) and **All open roles**.
2. **White article card** (`.job-article-card`): optional closed-role notice,
   optional Loom embed (`video`), then `.Content`.
3. **Apply** (`#apply`, dark). Hidden when `status: closed`. Otherwise, in
   order of precedence:
   - `apply_link` set → a single external "Submit your application" button.
   - `notion_form` set → `hiring-notion-form.html`: a plain **Application**
     header, the embedded Notion form in a dark card, and an "open it in a new
     tab" fallback link. All instructions (the "fill out the form below" intro
     and the screening questions) live in the body's closing section so nothing
     is shown twice.
   - neither → an email-us CTA (`hello@masterpoint.io`).

## Application form (embedded Notion form)

- The form is the **"Application" form view** on the Notion database
  **📋 Masterpoint Hiring Form** (the workspace's global hiring form).
  Submissions create rows there, so the existing review workflow (Status
  board, auto-screen, email templates) keeps working unchanged.
- **Use the form's public URL id, not the view id.** The public form is a
  Notion _form block_ (id `ac791bde07fe4766b461dca6fbc10e85`). The view id
  (`901106d0…`) and the database id return "This page couldn't be found" on
  notion.site. If the id is ever in doubt, open the public Notion hiring post,
  inspect the form, and read `data-block-id` off the `notion-form-block`
  element (the `notion-alias-block` wrapping it is just a link to it).
- **Embedding only works through Notion's `/ebd/` path**
  (`https://masterpoint.notion.site/ebd/<id>…`). Every other notion.site and
  notion.so URL is served with `X-Frame-Options: SAMEORIGIN` and renders blank
  inside an iframe on masterpoint.io. Current working URLs:
  - embed (`notion_form`): `https://masterpoint.notion.site/ebd/ac791bde07fe4766b461dca6fbc10e85`
  - public link (`notion_form_link`): `https://masterpoint.notion.site/ac791bde07fe4766b461dca6fbc10e85`

  Notion's own embed code (form → **Share form** → **Anyone on the web with
  link** → **Embed this page** → **Copy code**) produces the same `/ebd/` URL;
  drop any `?pvs=` query, Notion strips it anyway.

- The iframe has a fixed height (1780px desktop, 2400px mobile in
  `hiring.scss`) because Notion embeds do not auto-resize. If the form gains
  or loses questions, adjust the height so it shows without inner scrolling.
  The embed follows the visitor's colour scheme (dark for most), so the
  wrapper is a neutral dark card rather than white.
- `notion_form_link` should be the form's normal public link (the one from
  **Copy link** in the share menu). It powers the "Form not loading?" fallback
  under the embed and is the link to give people who can't use iframes.
- The Notion form has a **Position** select. When opening a role, add the new
  option in the Notion form (Share form → edit) so applicants can pick it. The
  form's free-text **Question Responses** field is where applicants answer the
  role-specific questions listed in the post body.
- Local `hugo serve` renders the real embed; you can submit a test
  application locally and it will appear in Notion, so use an obvious test
  name and archive it afterwards.

## Workflow: posting a new role

1. Copy the most recent post in `content/hiring/` to
   `content/hiring/YYYY-MM-DD-<slug>.md`, update front matter and body.
   Set `status: open`, `draft: false`.
2. In Notion, make sure the **Masterpoint Hiring Form** is shared to the web
   and has the new role in its **Position** options. Copy the embed `src`
   into `notion_form` and the share link into `notion_form_link`.
3. Pick a `preview_image` (16:10-ish) and, ideally, a role-specific `og_img`.
4. Record a Loom intro if you want the video block; paste the share URL.
5. `hugo serve` → check `/hiring/` and `/hiring/<slug>/` on desktop and mobile,
   including that the embedded form loads and fits its frame.
6. PR title: `feat(hiring): add <role> posting`. Merge → Netlify builds.
7. Share `https://masterpoint.io/hiring/<slug>/`.

## Workflow: closing a role

Set `status: closed` on the post. It moves to **Past Openings**, the hero
swaps to "ROLE CLOSED", the apply section disappears, and a notice at the top
of the article points at `/hiring/`. Do not delete the file; keep the URL.
Optionally remove the role from the Notion form's **Position** options.

## Decisions & gotchas

- **Nav position.** `Hiring` sits _after_ the Content dropdown on purpose.
  `.content-list header ul li:nth-child(4)` in `custom.scss` force-highlights
  the 4th menu item on blog/case-study/now list pages; inserting a top-level
  item before Content would shift that hack onto Hiring.
- **Hiring pages do not use the `content-list` body class** for the same
  reason. Active-nav state comes from `menu.html` instead.
- **We embed Notion's form rather than running our own** (an earlier draft
  used a Netlify form). One intake database, one review workflow, no Netlify
  Forms notifications to maintain. Trade-off: the embed is a fixed-height
  iframe and depends on Notion being up.
- **The 2023 hiring post lives in the blog** (`/blog/hiring-july-2023/`). It
  was left there; the new section starts with the Fall 2026 role.
- **`bg_our_team.jpg` is a placeholder preview/banner image.** Swap in a
  role-specific or team image when one is ready; the Notion post's cover
  (`twitter-header.png`) would work if exported to `static/img/hiring/`.
- **Garbled body text in `hugo serve` after editing front matter.** If the
  dev server shows the article starting mid-sentence and/or a run of `�`
  characters at the end (also inside the JobPosting JSON-LD), Hugo's live
  server has kept stale byte offsets for the body after the front matter
  changed length. Restart `hugo serve`. The production build is unaffected;
  verify with a one-shot build to a scratch directory.
- **Hugo locally.** `aqua install` fails for Hugo 0.162.1 on macOS (the
  registry expects a `.tar.gz` asset that the release ships as `.pkg`). The
  aqua cache still has extended 0.162.1 (installed with a newer registry) at
  `~/.local/share/aquaproj-aqua/pkgs/github_release/github.com/gohugoio/hugo/v0.162.1/…/Payload/hugo`;
  `.claude/launch.json` points at it.
