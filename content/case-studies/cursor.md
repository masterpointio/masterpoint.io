---
title: "75% Faster Plans, 2x Daily Applies: How Cursor Rebuilt Its Terraform Workflow with Masterpoint"
weight: 1
description: "At Masterpoint, we focused on Terraform and IaC improvements so our client Cursor could focus on making their users extraordinarily productive."

layout: immersive
id: cursor-case-study
hide_schedule_assessment: true

eyebrow: "CASE STUDY SUCCESS STORY"
client: "Cursor"
client_logo: /img/logos/cursor.svg
client_logo_height: 31px
hero_title: "<span class='text-gradient'>75% Faster Plans, 2x Daily Applies</span>: How Cursor Rebuilt Its Terraform Workflow with Masterpoint"

stat_bar:
  - value: "75%"
    label: "Plan time went from 10+ minutes to 2 minutes"
  - value: "157%"
    label: "Deployment frequency increased"
  - value: "91%"
    label: "Safer, more contained changes"
  - value: "40k+"
    label: "Terraform resources are managed using the new platform"

sticky_nav:
  - label: "The Problem"
    anchor: "the-challenge"
  - label: "The Engagement"
    anchor: "the-work"
  - label: "The Results"
    anchor: "the-results"
  - label: "What Changed for the Team"
    anchor: "what-changed"

preview_image: /img/case-studies/cursor/deployment-frequency.webp
og_img: /img/case-studies/cursor/deployment-frequency.webp

sitemap:
  priority: 0

callout: >-
  <p>If your team is hitting Terraform ceilings like:</p>
  <ul class='cursor-ceilings'>
  <li>infrastructure that's grown faster than the architecture supporting it</li>
  <li>slow plans and noisy diffs</li>
  <li>platform friction</li>
  </ul>
  <p>Masterpoint can help.</p>
  <p>We've done this work at scale, for engineering organizations that can't afford to slow down.</p>
  <p><a href='/contact/'>Get in touch &rarr;</a></p>
---

{{< csi-section id="key-value" title="<span class='cursor-sidebar-label'>Sidebar:</span> Key Value Delivered" variant="light" align="center" >}}
At Masterpoint, we focused on Terraform and IaC improvements so our client Cursor could focus on making their users extraordinarily productive.

{{< csi-impact cols="2" heading_level="3" >}}
icon: fa-gauge-high
title: Dramatically faster plans
body: Plan time dropped significantly. Originally plan time had spikes of 10+ minutes; after our work, plan time was roughly 2 minutes.
---
icon: fa-rocket
title: Improved delivery speed
body: Engineers shipped 157% more PRs per week after the engagement, and have increased shipping cadence since.
---
icon: fa-calendar-check
title: More frequent, safer deploys
body: Weekly infrastructure PRs grew from 194 to 500+, and fewer plans were abandoned as the apply-to-plan ratio improved from 55% to 64%.
---
icon: fa-bullseye
title: Safer, more contained changes
body: The median Terraform run now touches 5 resources instead of 54 — a 91% smaller blast radius, so engineers can reason about exactly what a change will affect before applying it.
{{< /csi-impact >}}
{{< /csi-section >}}

{{< csi-section id="the-challenge" title="The Problem: Infrastructure That Couldn't Keep Up" variant="pine" align="left" >}}
By late 2025, Cursor's Terraform setup had become one of the biggest friction points in the engineering org. The company behind the Cursor IDE experienced issues familiar to fast-growing startups: infrastructure code written quickly, then scaled by copy-pasta rather than through careful design.

Those early Terraform patterns were replicated at machine speed as engineers dogfooded Cursor. They were copied and instantiated hundreds of times without the architectural guardrails needed to keep the system manageable. The result was a classic terralith: critical infrastructure was managed as a single monolithic production workspace with over 7,000 resources in one state file.

And because that workspace was so large, it was too slow.

{{< cs-pullquote name="Travis McPeak" title="Security Lead" company="Cursor" >}}
We had one giant workspace that took way too long to plan. It was killing us.
{{< /cs-pullquote >}}

But the problem wasn't just the lack of speed. It was a lack of engineering confidence in the IaC system. Issues included:

- The AWS console was used to make changes during incidents and these fixes were never rolled into TF, and so were later inadvertently reverted.
- Managing ECS deployments through Terraform caused constant drift in the production terralith, flooding PR diffs with hundreds of unrelated changes.

Over time, the team stopped trusting the system, let alone reading the diffs.

{{< cs-pullquote name="Travis McPeak" >}}
We would have engineers click apply on prod workspaces that had 120 ECS service changes. The ECS services would change all the time because of drift, so the team became desensitized to large Terraform plan changes.
{{< /cs-pullquote >}}

This confusion caused downtime, such as a network firewall change that caused a 10 minute outage.

The existing platform, Terraform Cloud, introduced some friction too:

- Workspace management relied on manual ClickOps configuration for each new workspace.
- The SSO experience was inconsistent.
- TFC's resource-under-management (RUM) pricing model made it daunting to scale.
{{< /csi-section >}}

{{< csi-section id="the-work" title="The Engagement: What Masterpoint Did" variant="light" align="center" >}}
Masterpoint came in for a systematic overhaul, working across the architecture, the platform, and the developer workflow.

{{< cursor-phase title="November 2025 - Audit and High Leverage Fixes" >}}
The engagement opened with an audit of Cursor's infrastructure:

- cloud environments
- IaC setup
- CI/CD pipelines
- networking
- observability

Within a week, Masterpoint delivered an audit report, a best practices checklist, and a security scan. The findings included IAM duplication accounted for 70% of the production TF state and noisy plan diffs caused engineer fatigue.

The audit phase targeted the highest-leverage fixes first: IAM resource deduplication, workspace trigger and path filter corrections so plans only ran when relevant code changed, and initial provider alias splits to begin isolating staging and ML infrastructure from the main production workspace.

{{< cursor-table label="Resource Count" >}}
| Metric | Before | After | Change |
| --- | --- | --- | --- |
| Resource Count | 8,480 | 4,593 | 45.8% reduction (3,887 resources removed) |
{{< /cursor-table >}}

By November 25th, the IAM deduplication fixes had landed.

The number of production resources dropped from 8,480 to 4,593, a 46% reduction. Mean plan time fell from 8.1 minutes to 4.9 minutes, a 39% improvement. The P95 plan time improved even more.

{{< cursor-table label="Before (Nov 20–24), After (Nov 25–Dec 8), Improvement" >}}
| Metric | Before (Nov 20–24) | After (Nov 25–Dec 8) | Improvement |
| --- | --- | --- | --- |
| Mean | 488.8s (8.1 min) | 296.6s (4.9 min) | 39.3% faster |
| P50 (Median) | 423s (7.1 min) | 272s (4.5 min) | 35.7% faster |
| P95 | 749s (12.5 min) | 414s (6.9 min) | 44.7% faster |
| Sample Size | 38 runs | 184 runs | n/a |
{{< /cursor-table >}}

This was accomplished without touching the workspace structure, but the systems could still be improved.
{{< /cursor-phase >}}

{{< cursor-phase title="December 2025 - Spacelift Migration Begins" >}}
With the first phase complete, Masterpoint turned to the platform.

As mentioned above, TFC's ClickOps workspace management, SSO troubles, and resource-under-management pricing were all inhibiting Cursor's velocity and growth.

Masterpoint recommended a move to Spacelift to address these issues.

The team kicked off the Spacelift migration in mid-December, starting with the groundwork:

- naming and tagging standards
- AWS multi-account IAM role architecture
- Okta SSO configuration

Rather than migrating everything at once, a low-risk pilot Spacelift stack (the equivalent of a TFC workspace) was used to validate the approach. The end-to-end fully automated pilot project was completed within days.

Masterpoint also began evaluating a full migration from the Terraform runtime to OpenTofu.
{{< /cursor-phase >}}

{{< cursor-phase title="January to February 2026 - Bulk Migration" >}}
With a plan covering a migration of dozens of TFC workspaces across four phases, the team worked systematically. By late January, the bulk of workspaces had been migrated to Spacelift stacks with no operational downtime for the Cursor engineering organization.

By February, the migration was done. All workspaces had been moved from TFC to Spacelift and the runtime was converted from Terraform to OpenTofu. Migrating to OpenTofu freed Cursor from licensing constraints and unlocked capabilities unavailable or paywalled in Terraform, such as state encryption, OpenTelemetry support, and provider iteration.

As part of the final migration work, the production workspace was reduced by splitting out various provider-aliased resources into dedicated stacks, continuing the decomposition work that had started with IAM deduplication in November.
{{< /cursor-phase >}}

{{< cursor-phase title="February to May 2026 - AI Agent Guardrails And Additional Improvements" >}}
After the migration was completed, Masterpoint continued to improved system usability and speed by:

- restructuring Route53 DNS API requests into optimized, dedicated TF modules to address AWS’s strict 5 requests/second limit
- continuing to break up large state files into narrower root modules, allowing for faster plans (further reducing critical infrastructure plans from roughly 5 minutes to under 2 minutes) and decreased blast radius
- implementing child module versioning with OCI registries to enable staged rollouts and safer change control of critical TF resources
- resolving the ECS drift issue by using the [“Task Definition Template Pattern”](https://newsletter.masterpoint.io/p/deploying-your-apps-into-ecs)
- implementing OpenTofu's [OTel tracing](https://opentofu.org/docs/internals/tracing/) to set up the Cursor team for longterm visibility into their IaC throughput

{{< cs-pullquote name="Ravi Rahman" title="software engineer" company="Cursor" >}}
The AI agent skills and rules help us build our IaC correctly while at the same time moving faster.
{{< /cs-pullquote >}}

Because Cursor's engineering team uses Cursor to write Terraform, Masterpoint embedded architectural knowledge directly into the codebase as AI agent skills and rules.

This AI context encodes the decisions that AI models cannot anticipate on their own:

- when to create a new root module vs. extend an existing one
- how to scope blast radius in a root module
- how to break up a high blast radius monolithic root module
- data source patterns and optimizations
- how to use OCI-sourced child modules
- security practices, such as TF module SHA pinning
- debugging performance bottlenecks, through methods such as logging and OpenTelemetry traces

Every IaC optimization Masterpoint delivered was paired with instructions to prevent anti-patterns from being reintroduced.
{{< /cursor-phase >}}
{{< /csi-section >}}

{{< csi-section id="the-results" title="The Results" variant="pine" align="center" >}}
{{< cursor-proof title="What Cursor’s Infrastructure as Code Manages" >}}
The Cursor infrastructure today includes:

{{< csi-impact >}}
icon: fa-cubes
title: hundreds of ECS services with tens of thousands of live running tasks
---
icon: fa-server
title: thousands of EC2 instances
---
icon: fa-layer-group
title: dozens of Redis clusters
---
icon: fa-database
title: a few dozen databases
---
icon: fa-scale-balanced
title: in the triple digits of ALB and NLB load balancers
{{< /csi-impact >}}

In all 40k+ Terraform resources are managed using the new platform. All of this exists in 100+ narrow, independent root modules, with OpenTofu, on Spacelift, using Okta SSO, stored in S3-backed state, and paired with AI agent rules to keep the architecture clean as the codebase grows.
{{< /cursor-proof >}}

{{< cursor-proof title="Numbers That Matter" >}}
{{< cursor-table label="Numbers That Matter" >}}
|  | Before | After |
| --- | --- | --- |
| Median plan time (production) | ~8 min | ~2 min |
| Deployment PRs / week | ~194 | 500+ (+157%) |
| Median resources affected | 54 | 5 (91% reduction in blast radius) |
{{< /cursor-table >}}
{{< /cursor-proof >}}

{{< cursor-proof title="Plan time went from 10+ minutes to 2 minutes" media="/img/case-studies/cursor/plan-time.webp" media_alt="Terraform plan + apply. 2 min per run. 80% of the wait, gone. A typical run dropped from 10+ minutes to a steady 2 minutes. Cursor and Masterpoint." >}}
The production workspace plan time dropped from over 10+ minutes, with spikes to 15 minutes, during the November baseline to around 2 minutes by mid 2026.

This is an improvement of roughly 75% from where the engagement started, and more than 80% from the pre-engagement peak.
{{< /cursor-proof >}}

{{< cursor-proof title="Deployment frequency increased" media="/img/case-studies/cursor/deployment-frequency.webp" media_alt="Deployment frequency. 2.6 times more PRs shipped. From 194 to 500+ changes shipped every week — a 157% jump in deployment frequency over the months. October 2025: 194 changes per week. May 2026: 500+ changes per week. Cursor and Masterpoint." flip="true" >}}
Weekly merged PRs against infrastructure as code went from approximately 194 per week to over 500 a week, a 157% increase. They’ve only accelerated since then.
{{< /cursor-proof >}}

{{< cursor-proof title="The productivity lift was significant" >}}
This gain wasn't from growing the engineering organization: a controlled same-cohort analysis of 34 engineers active both before and after the Masterpoint engagement found that PR throughput grew by 121%.

{{< cursor-table label="The productivity lift was significant" >}}
| Metric | Pre-engagement | End of Engagement | Change |
| --- | --- | --- | --- |
| Cohort throughput | 63 PRs/wk | 140 PRs/wk | +121% |
| Per-active-week cadence | 5.37 PRs/author/wk | 9.19 PRs/author/wk | +71% |
{{< /cursor-table >}}
{{< /cursor-proof >}}

{{< cursor-proof title="Infrastructure became democratized" media="/img/case-studies/cursor/root-module-workspaces.webp" media_alt="Terraform root module workspaces. Infrastructure, democratized. Self-service workspaces allow engineering teams to ship independently with governance and guardrails built in, replacing previous monolithic Terraform antipatterns. 21 to 141, up 571%, October 2025 to May 2026. Monthly values: 21, 25, 29, 35, 62, 76, 106, 141. Cursor and Masterpoint." >}}
Looking beyond the controlled same-cohort set of engineers, 89% of all engineers who work with infrastructure now ship Terraform PRs each month.

Previously, workspace creation required manual ClickOps and admin access. Today, engineers create and manage their own stacks. The number of separately managed modules went from 26 to 100+. Engineers are now creating their own product/domain scoped infrastructure instead of jumbling it in the primary monolithic workspace.
{{< /cursor-proof >}}
{{< /csi-section >}}

{{< csi-section id="what-changed" title="What Changed for the Team" variant="light" align="center" >}}
{{< cursor-proof-grid >}}
{{< cursor-proof title="Engineers know what an IaC Terraform change will touch" media="/img/case-studies/cursor/blast-radius.webp" media_alt="Blast radius, median resources affected. 91% reduction in blast radius. A median Terraform run once touched 54 resources. Now it averages just 5, excluding no-op runs. A smaller, safer blast radius means tighter diffs, faster reviews, and less risk on every apply. Before: 54 resources. After: 5 resources. Cursor and Masterpoint." featured="true" >}}
Before the engagement, engineers couldn't predict what a change would actually touch in a workspace. A database might live in a workspace named for networking infrastructure, so even finding where something was managed required tribal knowledge. Dependencies between workspaces were just as opaque: touching one piece of infrastructure could ripple into systems that had nothing to do with the change — or surface long-standing drift that did. Plans intended for one system would silently queue in unrelated workspaces, waiting for the next person to find them with no context on where they came from or whether they were safe to apply.

{{< cs-pullquote name="Ravi Rahman" >}}
The Terraform experience has gotten way better. For the first time since I've been here, we just merge and apply. If something's wrong, the system lets us know. It's fast and moves at the speed we need.
{{< /cs-pullquote >}}

With smaller, focused stacks, plans are scoped to the change at hand. The median Terraform run now touches just 5 resources instead of 54 — a 91% smaller blast radius — so engineers know precisely what a plan will affect before they run it.
{{< /cursor-proof >}}

{{< cursor-proof title="Architectural flexibility enables the business and product delivery" >}}
Before the engagement, the terralith made architectural changes expensive and risky. Touching one piece of infrastructure meant disrupting unconnected components.

With narrow stacks owning a focused piece of infrastructure, the Cursor engineering team can more easily modify their architecture.

New services, providers, and cloud targets can be added as their own stacks, which is a foundation that directly enables expansion into multi-cloud infrastructure as Cursor continues to scale.
{{< /cursor-proof >}}

{{< cursor-proof title="Cursor's agents are set up for future success" >}}
Since Cursor's engineers rely on Cursor to write their own Terraform, Masterpoint embedded the new architecture into AI agent rules and skills that sit directly within the codebase.

These rules capture the patterns and decisions that LLMs can't figure out on their own, setting the team up to consistently ship high-quality infrastructure code, now and as the system evolves.
{{< /cursor-proof >}}
{{< /cursor-proof-grid >}}

{{< cursor-closing-quote name="Travis McPeak" >}}
Masterpoint didn't just fix our Infrastructure as Code. They gave our entire engineering org the confidence to move fast. We went from a system people were afraid to touch Terraform to where nearly every engineer is quickly and assuredly shipping infrastructure changes every week.
{{< /cursor-closing-quote >}}
{{< /csi-section >}}
