---
# ----------------------------------------------------------------------------
# Rich (web-based) case study template.
# Run `hugo new case-studies/my-client.md` to scaffold a new one from this file.
# Every field below is OPTIONAL except title, description, and layout.
# Delete any fields/sections you don't need — the template hides empty sections.
# ----------------------------------------------------------------------------

title: "{{ replace .Name "-" " " | title }}"
layout: rich                           # REQUIRED — opts into the rich web template
draft: true
date: {{ .Date }}
description: "Short blurb shown in case-study listing cards and meta tags."
metaTitle: ""                          # optional — overrides browser title
metaDescription: ""                    # optional — overrides meta description

# ---------- Hero banner --------------------------------------------------------
banner_tagline: "Case Study"
banner_title: "How we helped <span class='text-gradient'>CLIENT achieve RESULT</span>"
banner_subtitle: "One-sentence subtitle expanding on the banner_title."
banner_image: ""                       # optional — /img/case-studies/foo-banner.jpg
client_logo: ""                        # optional — /img/case-studies/foo-logo.svg
download_button: ""                    # optional — /download/foo-case-study.pdf

# ---------- Listing card preview ----------------------------------------------
preview_image: "/img/case-studies/foo-preview.jpg"

# ---------- At-a-Glance sidebar -----------------------------------------------
client_name: "Client Inc."
client_industry: "SaaS / FinTech / Healthtech"
client_size: "150 employees"
client_region: "North America"
engagement_length: "4 months"
services_used:
  - "Platform Engineering"
  - "IaC Modernization"
  - "AWS Optimization"

# Tech stack chips — name is required, icon is a FontAwesome brand icon (fa-brands)
technologies:
  - name: "AWS"
    icon: "fa-aws"
  - name: "Terraform"
    icon: "fa-hashicorp"   # note: use a generic icon or leave empty — there is no official FA brand for Terraform
  - name: "OpenTofu"
    icon: ""
  - name: "Spacelift"
    icon: ""
  - name: "GitHub"
    icon: "fa-github"

# ---------- Top-line metric cards ---------------------------------------------
# 4 metric cards look best, but any count works. Use FontAwesome solid icons.
metrics:
  - value: "10x"
    label: "Faster infrastructure provisioning"
    icon: "fa-rocket"
  - value: "$240k"
    label: "Annual AWS cost savings"
    icon: "fa-sack-dollar"
  - value: "400+"
    label: "Resources standardized"
    icon: "fa-cubes"
  - value: "0"
    label: "Production incidents post-cutover"
    icon: "fa-shield-halved"

# ---------- TL;DR + summary ---------------------------------------------------
tldr: "Two-to-three sentence executive summary. Use <strong> for numbers or key claims to get the teal highlight."
summary: |
  Optional longer summary in markdown. Rendered right next to the client card.
  Supports multiple paragraphs.

# ---------- Before/After CSS chart --------------------------------------------
chart:
  eyebrow: "By the numbers"
  title: "Deploy time, before and after"
  subtitle: "A single Terraform apply used to block the platform team for most of the afternoon."
  data:
    - label: "Before"
      value: 45
      unit: "min"
      color: "grey"       # grey | pine | pink | vanilla | gradient
    - label: "After"
      value: 3
      unit: "min"
      color: "gradient"
  footnote: "Measured across 20 representative apply runs in Q3 2025."

# ---------- Engagement timeline -----------------------------------------------
timeline:
  - title: "Assessment & Planning"
    duration: "Weeks 1–2"
    description: "Audited existing IaC, identified blast-radius hot-spots, and drafted the target architecture."
  - title: "Foundation"
    duration: "Weeks 3–6"
    description: "Stood up the multi-account AWS landing zone and bootstrapped the Spacelift workflow."
  - title: "Migration"
    duration: "Weeks 7–14"
    description: "Decomposed the monolith, migrated state, and rolled out standardized modules per team."
  - title: "Handoff & Training"
    duration: "Weeks 15–16"
    description: "Live pairing sessions, runbooks, and a 30-day support window."

# ---------- Testimonial -------------------------------------------------------
testimonial:
  quote: "Masterpoint didn't just modernize our IaC — they left us with a platform our engineers actually want to use."
  author: "Jane Doe"
  role: "VP of Engineering, Client Inc."
  avatar: ""              # optional — /img/testimonials/jane.jpg

# ---------- Key takeaways -----------------------------------------------------
takeaways:
  - "Decomposing monolithic state is usually a one-time investment with compounding returns."
  - "Self-service platforms only work if they're paved, not enforced."
  - "Treat AI/ML infrastructure as first-class — not as an exception to your IaC standards."
---

## The Challenge

Describe the state of the client's infrastructure before engagement. Be specific about
pain: costs, outages, engineering hours lost, compliance risk, or velocity drag.

### A specific pain point

Use H3s to break up the challenge into distinct themes. Include screenshots or
architecture diagrams where they help.

![Diagram caption](/img/case-studies/foo-before.png)

## The Solution

Describe what you built and why. Link to public modules or blog posts where
relevant — it builds credibility.

1. **Step one.** What you did and the reasoning.
2. **Step two.** More context.
3. **Step three.** Link to further reading.

## The Results

Summarize outcomes in prose; the metric cards above already own the hero numbers.
Include a representative quote or anecdote from the team here if it didn't fit
the testimonial slot above.

> Optional pull-quote that renders with a gradient border. Great for customer voice
> snippets that are too specific for the main testimonial.
