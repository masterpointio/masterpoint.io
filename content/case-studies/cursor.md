---
title: "75% Faster Plans, 2x Daily Applies: How Cursor Rebuilt Its Terraform Workflow with Masterpoint"
weight: 1
description: "At Masterpoint, we focused on Terraform and IaC improvements so our client Cursor could focus on making their users extraordinarily productive."

layout: immersive

# Hero
eyebrow: "CASE STUDY SUCCESS STORY"
client: "Cursor"
client_logo: /img/case-studies/cursor/cursor-lockup-white.svg
client_logo_height: 30px
hero_title: "<span class='text-gradient'>75% Faster Plans, 2x Daily Applies:</span> How Cursor Rebuilt Its Terraform Workflow with Masterpoint"
hero_aside_image: /img/case-studies/cursor/deploy-frequency-growth.png
hero_aside_alt: "Line chart of Cursor's weekly infrastructure PRs climbing from 194 in October 2025 to 500+ by May 2026"

# At-a-glance stat strip (appears under hero)
stat_bar:
  - value: "~8 min → ~2 min"
    label: "median plan time (production)"
  - value: "~194 → 500+"
    label: "deployment PRs / week (<strong class='csi-grad'>+157%</strong>)"
  - value: "54 → 5"
    label: "median resources affected (<strong class='csi-grad'>91% smaller blast radius</strong>)"
  - value: "100+"
    label: "narrow, independent root modules"

# Preview / OG
preview_image: /img/case-studies/cursor/plan-time-before-after.png
og_img: /img/case-studies/cursor/plan-time-before-after.png

sitemap:
  priority: 0

callout: >-
  <p><strong>If your team is hitting <span class='csi-grad'>Terraform
  ceilings</span> like:</strong></p>
  <ul>
  <li>infrastructure that's grown faster than the architecture supporting it</li>
  <li>slow plans and noisy diffs</li>
  <li>platform friction</li>
  </ul>
  <p>Masterpoint can help. We've done this work at scale, for engineering
  organizations that can't afford to slow down.
  <a href='/contact'>Get in touch &rarr;</a></p>
---

{{< csi-testimonial tldr="true" variant="pine" >}}
At Masterpoint, we focused on **Terraform and IaC improvements** so our client Cursor could focus on making their users **extraordinarily productive**.
{{< /csi-testimonial >}}

{{< csi-section eyebrow="At a Glance" title="Key Value <span class='csi-grad'>Delivered</span>" variant="light" align="center" >}}
{{< csi-impact cols="2" >}}
icon: fa-gauge-high
title: Dramatically faster plans
body: Plan time dropped significantly. Originally plan time had spikes of 10+ minutes; after our work, plan time was roughly 2 minutes.
---
icon: fa-rocket
title: Improved delivery speed
body: Engineers shipped 157% more PRs per week after the engagement, and have increased shipping cadence since.
---
icon: fa-rotate
title: More frequent, safer deploys
body: Weekly infrastructure PRs grew from 194 to 500+, and fewer plans were abandoned as the apply-to-plan ratio improved from 55% to 64%.
---
icon: fa-crosshairs
title: Safer, more contained changes
body: The median Terraform run now touches 5 resources instead of 54 — a 91% smaller blast radius, so engineers can reason about exactly what a change will affect before applying it.
{{< /csi-impact >}}
{{< /csi-section >}}

{{< csi-split id="the-challenge" eyebrow="The Challenge" title="The Problem: Infrastructure That <span class='csi-grad'>Couldn&rsquo;t Keep Up</span>" figure="cursor/terralith" flip="true" variant="pine" >}}
By late 2025, Cursor's Terraform setup had become one of the biggest friction points in the engineering org. The company behind the Cursor IDE experienced issues familiar to fast-growing startups: infrastructure code written quickly, then scaled by copy-pasta rather than through careful design.

Those early Terraform patterns were replicated at machine speed as engineers dogfooded Cursor. They were copied and instantiated hundreds of times without the architectural guardrails needed to keep the system manageable. The result was a classic [**terralith**](/blog/terralith-monolithic-terraform-architecture/): critical infrastructure was managed as a single monolithic production workspace with over 7,000 resources in one state file.

And because that workspace was so large, it was too slow.

{{< cs-pullquote name="Travis McPeak" title="Security Lead" company="Cursor" >}}
We had one giant workspace that <strong>took way too long to plan</strong>. It was killing us.
{{< /cs-pullquote >}}
{{< /csi-split >}}

{{< csi-section accent="true" title="It was a lack of <span class='csi-grad'>engineering confidence</span> in the IaC system" variant="light" >}}
But the problem wasn't just the lack of speed. Issues included:

- The AWS console was used to make changes during incidents and these fixes were never rolled into TF, and so were later inadvertently reverted.
- Managing ECS deployments through Terraform caused constant drift in the production terralith, flooding PR diffs with hundreds of unrelated changes.

Over time, the team stopped trusting the system, let alone reading the diffs.

{{< cs-pullquote name="Travis McPeak" title="Security Lead" company="Cursor" >}}
We would have engineers click apply on prod workspaces that had <strong>120 ECS service changes</strong>. The ECS services would change all the time because of drift, so the team became desensitized to large Terraform plan changes.
{{< /cs-pullquote >}}

This confusion caused downtime, such as a network firewall change that caused a 10 minute outage.

The existing platform, Terraform Cloud, introduced some friction too:

- Workspace management relied on manual [ClickOps](/blog/terraform-opentofu-terminology-breakdown/#clickops) configuration for each new workspace.
- The SSO experience was inconsistent.
- TFC's resource-under-management (RUM) pricing model made it daunting to scale.
{{< /csi-section >}}

{{< csi-section id="the-work" eyebrow="The Engagement" title="What <span class='csi-grad'>Masterpoint</span> Did" variant="pine" align="center" >}}
Masterpoint came in for a systematic overhaul, working across the architecture, the platform, and the developer workflow.

{{< csi-timeline marker="50" marker_label="February 2026 &middot; migration done" >}}
label: Terraform Cloud + Terraform
note: workspaces migrate off in phases
start: 0
end: 50
fade: out
---
label: Spacelift + OpenTofu
note: pilot stack first, then bulk migration
start: 22
end: 100
fade: in
{{< /csi-timeline >}}
{{< /csi-section >}}

{{< csi-section eyebrow="01 &middot; November 2025" title="Audit and <span class='csi-grad'>High Leverage Fixes</span>" variant="light" >}}
The engagement opened with an [audit](/services/audit/) of Cursor's infrastructure:

- cloud environments
- IaC setup
- CI/CD pipelines
- networking
- observability

Within a week, Masterpoint delivered an audit report, a best practices checklist, and a security scan. The findings included IAM duplication accounted for 70% of the production TF state and noisy plan diffs caused engineer fatigue.

The audit phase targeted the highest-leverage fixes first: IAM resource deduplication, workspace trigger and path filter corrections so plans only ran when relevant code changed, and initial provider alias splits to begin isolating staging and ML infrastructure from the main production workspace.

By November 25th, the IAM deduplication fixes had landed.

{{< csi-table head="Metric | Before | After | Change" accent="true" >}}
row: Resource Count | 8,480 | 4,593 | 45.8% reduction (3,887 resources removed)
{{< /csi-table >}}

The number of production resources dropped from 8,480 to 4,593, a 46% reduction. Mean plan time fell from 8.1 minutes to 4.9 minutes, a 39% improvement. The P95 plan time improved even more.

{{< csi-table head="Metric | Before (Nov 20–24) | After (Nov 25–Dec 8) | Improvement" accent="true" >}}
row: Mean | 488.8s (8.1 min) | 296.6s (4.9 min) | 39.3% faster
row: P50 (Median) | 423s (7.1 min) | 272s (4.5 min) | 35.7% faster
row: P95 | 749s (12.5 min) | 414s (6.9 min) | 44.7% faster
row: Sample Size | 38 runs | 184 runs | n/a
{{< /csi-table >}}

This was accomplished without touching the workspace structure, but the systems could still be improved.
{{< /csi-section >}}

{{< csi-split eyebrow="02 &middot; December 2025" title="<span class='csi-grad'>Spacelift</span> Migration Begins" media="/img/case-studies/spacelift.jpg" media_alt="Spacelift, the infrastructure orchestration platform Cursor's workspaces migrated to" variant="pine" >}}
With the first phase complete, Masterpoint turned to the platform.

As mentioned above, TFC's ClickOps workspace management, SSO troubles, and resource-under-management pricing were all inhibiting Cursor's velocity and growth.

Masterpoint recommended a move to [Spacelift](/services/spacelift/) to address these issues.

The team kicked off the Spacelift migration in mid-December, starting with the groundwork:

- naming and tagging standards
- AWS multi-account IAM role architecture
- Okta SSO configuration

Rather than migrating everything at once, a low-risk pilot Spacelift stack (the equivalent of a TFC workspace) was used to validate the approach. The end-to-end fully automated pilot project was completed within days.

Masterpoint also began evaluating a full migration from the Terraform runtime to [OpenTofu](https://opentofu.org/).
{{< /csi-split >}}

{{< csi-split eyebrow="03 &middot; January to February 2026" title="<span class='csi-grad'>Bulk Migration</span>" media="/img/case-studies/opentofu.jpg" media_alt="OpenTofu, the open-source Terraform fork Cursor's runtime was converted to" flip="true" variant="light" >}}
With a plan covering a migration of dozens of TFC workspaces across four phases, the team worked systematically. By late January, the bulk of workspaces had been migrated to Spacelift stacks with no operational downtime for the Cursor engineering organization.

By February, the migration was done. All workspaces had been moved from TFC to Spacelift and the runtime was converted from Terraform to OpenTofu. Migrating to OpenTofu freed Cursor from licensing constraints and unlocked capabilities unavailable or paywalled in Terraform, such as state encryption, OpenTelemetry support, and provider iteration.

As part of the final migration work, the production workspace was reduced by splitting out various provider-aliased resources into dedicated stacks, continuing the decomposition work that had started with IAM deduplication in November.
{{< /csi-split >}}

{{< csi-section eyebrow="04 &middot; February to May 2026" title="<span class='csi-grad'>AI Agent Guardrails</span> And Additional Improvements" variant="pine" >}}
After the migration was completed, Masterpoint continued to improved system usability and speed by:

- restructuring Route53 DNS API requests into optimized, dedicated TF modules to address AWS's strict 5 requests/second limit
- continuing to break up large state files into narrower root modules, allowing for faster plans (further reducing critical infrastructure plans from roughly 5 minutes to under 2 minutes) and decreased blast radius
- implementing child module versioning with OCI registries to enable staged rollouts and safer change control of critical TF resources
- resolving the ECS drift issue by using the ["Task Definition Template Pattern"](https://newsletter.masterpoint.io/p/deploying-your-apps-into-ecs)
- implementing OpenTofu's [OTel tracing](https://opentofu.org/docs/internals/tracing/) to set up the Cursor team for longterm visibility into their IaC throughput

Because Cursor's engineering team uses Cursor to write Terraform, Masterpoint embedded architectural knowledge directly into the codebase as AI agent skills and rules.

This AI context encodes the decisions that AI models cannot anticipate on their own:

{{< csi-list >}}
icon: fa-sitemap
title: when to create a new root module vs. extend an existing one
---
icon: fa-crosshairs
title: how to scope blast radius in a root module
---
icon: fa-cubes
title: how to break up a high blast radius monolithic root module
---
icon: fa-database
title: data source patterns and optimizations
---
icon: fa-box-open
title: how to use OCI-sourced child modules
---
icon: fa-shield-halved
title: security practices, such as TF module SHA pinning
---
icon: fa-magnifying-glass-chart
title: debugging performance bottlenecks, through methods such as logging and OpenTelemetry traces
{{< /csi-list >}}

{{< cs-pullquote name="Ravi Rahman" title="Software Engineer" company="Cursor" >}}
The AI agent skills and rules help us build our IaC correctly while <strong>at the same time moving faster</strong>.
{{< /cs-pullquote >}}

Every IaC optimization Masterpoint delivered was paired with instructions to prevent anti-patterns from being reintroduced.
{{< /csi-section >}}

{{< csi-section id="the-results" eyebrow="The Results" title="Numbers That <span class='csi-grad'>Matter</span>" variant="light" align="center" >}}
{{< csi-compare >}}
label: Median plan time (production)
before: ~8 min
after: ~2 min
---
label: Deployment PRs / week
before: ~194
after: 500+ (+157%)
---
label: Median resources affected
before: 54
after: 5 (91% reduction in blast radius)
{{< /csi-compare >}}

This gain wasn't from growing the engineering organization: a controlled same-cohort analysis of 34 engineers active both before and after the Masterpoint engagement found that PR throughput grew by 121%.

{{< csi-table head="Metric | Pre-engagement | End of Engagement | Change" accent="true" title="The productivity lift was significant" >}}
row: Cohort throughput | 63 PRs/wk | 140 PRs/wk | +121%
row: Per-active-week cadence | 5.37 PRs/author/wk | 9.19 PRs/author/wk | +71%
{{< /csi-table >}}
{{< /csi-section >}}

{{< csi-split eyebrow="The Results" title="Plan time went from <span class='csi-grad'>10+ minutes to 2 minutes</span>" media="/img/case-studies/cursor/plan-time-dial.png" media_alt="Dial gauge: a typical Terraform run dropped from 10+ minutes to a steady 2 minutes per run, 80% of the wait gone" variant="pine" contain="true" >}}
The production workspace plan time dropped from over 10+ minutes, with spikes to 15 minutes, during the November baseline to around 2 minutes by mid 2026.

This is an improvement of roughly 75% from where the engagement started, and more than 80% from the pre-engagement peak.
{{< /csi-split >}}

{{< csi-split eyebrow="The Results" title="Deployment frequency <span class='csi-grad'>increased</span>" media="/img/case-studies/cursor/deploy-frequency-stat.png" media_alt="Stat card: 2.6x more PRs shipped, from 194 to 500+ changes shipped every week, a 157% jump in deployment frequency" flip="true" variant="light" contain="true" >}}
Weekly merged PRs against infrastructure as code went from approximately 194 per week to over 500 a week, a 157% increase. They've only accelerated since then.
{{< /csi-split >}}

{{< csi-split eyebrow="The Results" title="Infrastructure became <span class='csi-grad'>democratized</span>" media="/img/case-studies/cursor/workspaces-democratized.png" media_alt="Bar chart of Terraform root module workspaces growing from 21 in October 2025 to 141 by May 2026, a 571% increase" variant="pine" contain="true" >}}
Looking beyond the controlled same-cohort set of engineers, 89% of all engineers who work with infrastructure now ship Terraform PRs each month.

Previously, workspace creation required manual ClickOps and admin access. Today, engineers create and manage their own stacks. The number of separately managed modules went from 26 to 100+. Engineers are now creating their own product/domain scoped infrastructure instead of jumbling it in the primary monolithic workspace.
{{< /csi-split >}}

{{< csi-section eyebrow="The Results" title="What Cursor&rsquo;s <span class='csi-grad'>Infrastructure as Code</span> Manages" variant="light" align="center" >}}
The Cursor infrastructure today includes:

{{< csi-list >}}
icon: fa-server
title: hundreds of ECS services with tens of thousands of live running tasks
---
icon: fa-microchip
title: thousands of EC2 instances
---
icon: fa-layer-group
title: dozens of Redis clusters
---
icon: fa-database
title: a few dozen databases
---
icon: fa-network-wired
title: in the triple digits of ALB and NLB load balancers
{{< /csi-list >}}

In all 40k+ Terraform resources are managed using the new platform. All of this exists in 100+ narrow, independent root modules, with [OpenTofu](https://opentofu.org/), on [Spacelift](https://spacelift.io/), using Okta SSO, stored in S3-backed state, and paired with AI agent rules to keep the architecture clean as the codebase grows.
{{< /csi-section >}}

{{< csi-split eyebrow="What Changed for the Team" title="Engineers know what an IaC Terraform change <span class='csi-grad'>will touch</span>" media="/img/case-studies/cursor/blast-radius.png" media_alt="Before and after dot graph: a median Terraform run once touched 54 resources, now it averages just 5, a 91% reduction in blast radius" flip="true" ratio="65-35" variant="pine" contain="true" >}}
Before the engagement, engineers couldn't predict what a change would actually touch in a workspace. A database might live in a workspace named for networking infrastructure, so even finding where something was managed required tribal knowledge. Dependencies between workspaces were just as opaque: touching one piece of infrastructure could ripple into systems that had nothing to do with the change — or surface long-standing drift that did. Plans intended for one system would silently queue in unrelated workspaces, waiting for the next person to find them with no context on where they came from or whether they were safe to apply.

With smaller, focused stacks, plans are scoped to the change at hand. The median Terraform run now touches just 5 resources instead of 54 — a 91% smaller blast radius — so engineers know precisely what a plan will affect before they run it.

{{< cs-pullquote name="Ravi Rahman" title="Software Engineer" company="Cursor" >}}
The Terraform experience has gotten way better. For the first time since I've been here, <strong>we just merge and apply</strong>. If something's wrong, the system lets us know. It's fast and moves at the speed we need.
{{< /cs-pullquote >}}
{{< /csi-split >}}

{{< csi-section eyebrow="What Changed for the Team" title="Architectural flexibility enables the <span class='csi-grad'>business and product delivery</span>" variant="light" >}}
Before the engagement, the terralith made architectural changes expensive and risky. Touching one piece of infrastructure meant disrupting unconnected components.

With narrow stacks owning a focused piece of infrastructure, the Cursor engineering team can more easily modify their architecture.

New services, providers, and cloud targets can be added as their own stacks, which is a foundation that directly enables expansion into multi-cloud infrastructure as Cursor continues to scale.
{{< /csi-section >}}

{{< csi-section eyebrow="What Changed for the Team" title="Cursor&rsquo;s agents are set up for <span class='csi-grad'>future success</span>" variant="pine" >}}
Since Cursor's engineers rely on Cursor to write their own Terraform, Masterpoint embedded the new architecture into AI agent rules and skills that sit directly within the codebase.

These rules capture the patterns and decisions that LLMs can't figure out on their own, setting the team up to consistently ship high-quality infrastructure code, now and as the system evolves.
{{< /csi-section >}}

{{< csi-testimonial name="Travis McPeak" title="Security Lead" company="Cursor" variant="pine" image="/img/bg_our_word.jpg" >}}
Masterpoint didn't just fix our IaC. <strong>They gave our entire engineering org the confidence to move fast.</strong> We went from a system people were afraid to touch Terraform to where nearly every engineer is quickly and assuredly shipping infrastructure changes every week.
{{< /csi-testimonial >}}
