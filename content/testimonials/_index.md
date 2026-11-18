---
title: Testimonials
banner_title: "Don't take <span class='text-gradient'>our word</span> for it"
banner_tagline: IN THEIR WORDS
banner_text: Engineering leaders, from fast-moving startups to Fortune 500 enterprises, on what it's like to work with Masterpoint.
description: What engineering leaders at companies like Cursor, Staples, and Stuzo say about working with Masterpoint on Terraform, OpenTofu, and Infrastructure as Code.
id: testimonialsPage
# No RSS feed: its items would have no links (see below) and no dates.
outputs:
  - HTML
# Each testimonial is a single quote, so it only renders as a card on this page
# and in the testimonials slider. Individual pages would be thin, near-empty
# pages; their old URLs redirect here (see netlify.toml). `list` stays at its
# default (always), so the slider's .Site.RegularPages query still finds them.
cascade:
  - target:
      kind: page
    build:
      render: never
---
