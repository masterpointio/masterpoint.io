# Hiring section — working guide

The `/hiring/` section is where we publish job postings so we can send
candidates to masterpoint.io instead of a Notion page. This file is the spec
for how it works. **Keep it updated** when you change layouts, front matter,
the application form, or the workflow.

## Goals

- One canonical, on-brand URL per role (`/hiring/<slug>/`) that we can link
  from LinkedIn, the newsletter, and job boards.
- Candidates apply on our site (Netlify Forms) rather than bouncing to Notion
  or a Google Form. An external `apply_link` is still supported per posting.
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
└── hiring-application-form.html                # Netlify "job-application" form

assets/css/hiring.scss                          # all styling, @imported last in custom.scss
content/thank-you/application.md                # post-submit page (/thank-you/application/)
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

apply_link: "" # "" = on-site Netlify form; URL = link out instead
application_questions: # listed above the form + referenced in the body
  - "Question one?"
  - "Question two?"
---
```

Body is plain Markdown. Use `##` for the main sections (What You'll Do, What
You Bring, Why Masterpoint?, About Masterpoint, the closing "Want to work with
us?") and `###` for Must-Haves / Nice-to-Haves. The single layout styles `h2`
with a gradient bar and `h3` as small caps.

## Job post page

1. **Hero** (`#banner`, glow banner): eyebrow "WE'RE HIRING" (or "ROLE CLOSED"),
   `h1` title, `description` as the lede, a pill row (location, type, salary,
   posted date), then **Apply for this role →** (anchors to `#apply`, or opens
   `apply_link` in a new tab) and **All open roles**.
2. **White article card** (`.job-article-card`): optional closed-role notice,
   optional Loom embed (`video`), then `.Content`.
3. **Apply** (`#apply`, dark): title, intro, the `application_questions` box,
   and the Netlify form. Hidden when `status: closed`. When `apply_link` is set
   the form is replaced by a single external button.

## Application form (Netlify Forms)

- Form name: **`job-application`**. `data-netlify="true"`,
  `data-netlify-honeypot="bot-field"`, `enctype="multipart/form-data"` for the
  PDF resume upload (Netlify caps uploads at 8 MB). Redirects to
  `/thank-you/application/` on success.
- Hidden fields: `form-name`, `subject` (Netlify email subject), `role` (post
  title), `role_url` (permalink) so submissions from different postings are
  distinguishable in one form.
- Visible fields: full name*, email*, location*, LinkedIn, other links,
  resume (PDF)_, question responses_, anything else, US work authorization
  checkbox*.
- Fields use the contact form's `.col.labelToggle` + `.formField` markup so the
  existing floating-label JS and `form` SCSS apply. The file input and the
  checkbox use `.job-file` / `.job-consent` instead (static labels, native
  controls) because the global form styles hide checkboxes and float labels.
- **After the first deploy**, open Netlify → Forms → `job-application` and set
  up an email notification (and optionally a Slack/Zapier hook). Netlify only
  registers a form once it has parsed the deployed HTML, so the form does not
  exist in the UI until the branch deploys.
- Local `hugo serve` does not process submissions; test the redirect and
  validation states only. A deploy preview is a real Netlify form endpoint.

## Workflow: posting a new role

1. Copy the most recent post in `content/hiring/` to
   `content/hiring/YYYY-MM-DD-<slug>.md`, update front matter and body.
   Set `status: open`, `draft: false`.
2. Pick a `preview_image` (16:10-ish) and, ideally, a role-specific `og_img`.
3. Record a Loom intro if you want the video block; paste the share URL.
4. `hugo serve` → check `/hiring/` and `/hiring/<slug>/` on desktop and mobile.
5. PR title: `feat(hiring): add <role> posting`. Merge → Netlify builds.
6. In Netlify Forms, confirm `job-application` exists and notifications are on.
7. Share `https://masterpoint.io/hiring/<slug>/`.

## Workflow: closing a role

Set `status: closed` on the post. It moves to **Past Openings**, the hero
swaps to "ROLE CLOSED", the apply section disappears, and a notice at the top
of the article points at `/hiring/`. Do not delete the file; keep the URL.

## Decisions & gotchas

- **Nav position.** `Hiring` sits _after_ the Content dropdown on purpose.
  `.content-list header ul li:nth-child(4)` in `custom.scss` force-highlights
  the 4th menu item on blog/case-study/now list pages; inserting a top-level
  item before Content would shift that hack onto Hiring.
- **Hiring pages do not use the `content-list` body class** for the same
  reason. Active-nav state comes from `menu.html` instead.
- **The 2023 hiring post lives in the blog** (`/blog/hiring-july-2023/`). It
  was left there; the new section starts with the Fall 2026 role.
- **`bg_our_team.jpg` is a placeholder preview/banner image.** Swap in a
  role-specific or team image when one is ready; the Notion post's cover
  (`twitter-header.png`) would work if exported to `static/img/hiring/`.
- **Hugo locally.** `aqua install` fails for Hugo 0.162.1 on macOS (the
  registry expects a `.tar.gz` asset that the release ships as `.pkg`). The
  aqua cache still has extended 0.146.4 at
  `~/.local/share/aquaproj-aqua/pkgs/github_release/github.com/gohugoio/hugo/v0.146.4/…/hugo`,
  which builds this site fine. `.claude/launch.json` points at it.
