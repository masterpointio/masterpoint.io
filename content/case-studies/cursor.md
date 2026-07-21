---
title: "How Cursor Rebuilt Its Terraform Workflow with Masterpoint: 5x Faster Plans, 2x More Deployments"
weight: 1
description: "5x Faster Plans, 2x More Deployments: At Masterpoint, we focused on Terraform and Infrastructure as Code (IaC) improvements so our client Cursor could focus on making their users extraordinarily productive."

layout: immersive

# Hero
eyebrow: "CASE STUDY SUCCESS STORY"
client: "Cursor"
client_logo: /img/case-studies/cursor/cursor-lockup-white.svg
client_logo_height: 40px
hero_title: "How Cursor Rebuilt Its Terraform Workflow with Masterpoint: <span class='text-gradient'>5x Faster Plans, 2x More Deployments</span>"
hero_aside_image: /img/case-studies/cursor/cursor-team-photo.webp
hero_aside_alt: "Cursor engineers having a team whiteboard discussion about AI agent architecture."
hero_photo_inset: true # photo sits in the right 75% (25% plain-pine inseam on the left), left-biased crop

# At-a-glance stat strip (appears under hero) — headline % / x increase on top,
# the actual before → after numbers underneath.
stat_bar:
  - value: "5x"
    label: "Faster plan time<br>10&nbsp;min &rarr; 2&nbsp;min"
  - value: "2.6x"
    label: "More infrastructure PRs shipped<br>194 &rarr; 500+ per week"
  - value: "91%"
    label: "Reduction in blast radius<br>54 &rarr; 5 average cloud resources modified per deployment"
  - value: "6x"
    label: "More Terraform workspaces, now self-service"

# Preview / OG
preview_image: /img/case-studies/cursor/cursor-masterpoint.png
og_img: /img/case-studies/cursor/cursor-masterpoint.png

# Homepage highlight card (see docs/case-studies.md → Homepage slider)
highlight:
  blurb: "Cursor's AWS infrastructure had outgrown the architecture and engineers had stopped trusting the system. Masterpoint audited, re-architected, and modernized the platform so the whole engineering org now ships infrastructure changes quickly and with confidence."
  image: /img/case-studies/cursor/cursor-team-photo.webp
  image_alt: "Cursor engineers having a team whiteboard discussion about AI agent architecture."
  logo: /img/logos/cursor.svg

sitemap:
  priority: 0
---

{{< csi-section accent="true" title="Executive Summary" variant="light" align="center" >}}
[Cursor is an applied research AI lab](https://cursor.com/), with products used by [over half of the Fortune 500](https://cursor.com/enterprise). Cursor's AWS cloud infrastructure had outgrown the monolithic Terraform architecture it was built on and engineers had stopped trusting the system. Masterpoint audited the infrastructure, decomposed the [terralith](https://masterpoint.io/blog/terralith-monolithic-terraform-architecture/), built an [Infrastructure as Code](https://aws.amazon.com/what-is/iac/) platform with a new scalable architecture, migrated to Spacelift & OpenTofu, and embedded AI agent guardrails so the new architecture sticks, along with a series of platform improvements detailed in the story below. Plans now run **5x faster** and engineers ship **2.6x more** infrastructure changes every week, all with a **91% reduction in blast radius**.

{{< csi-carousel >}}
image: /img/case-studies/cursor/cursor-terraform-5x-faster-masterpoint.png
alt: Deploy time before and after: average plan + apply took 10+ minutes before, 2 minutes now — 5x faster per Terraform run
---
image: /img/case-studies/cursor/cursor-2x-more-deploy-masterpoint.png
alt: 2.6x more PRs shipped: from 194 changes per week in October 2025 to 500+ in May 2026, a 157% jump in deployment frequency
---
image: /img/case-studies/cursor/cursor-terraform-blast-radius-masterpoint.png
alt: 91% reduction in blast radius: a median Terraform run once touched 54 resources, now it averages just 5
---
image: /img/case-studies/cursor/cursor-infrastructure-democratized-masterpoint.png
alt: Terraform root module workspaces grew from 21 in October 2025 to 141 in May 2026 — up 571% — as self-service workspaces replaced monolithic antipatterns
{{< /csi-carousel >}}
{{< /csi-section >}}

{{< csi-section id="the-challenge" eyebrow="The Problem" title="Infrastructure That <span class='csi-grad'>Couldn't Keep Up</span>" variant="pine" >}}
By late 2025, Cursor's [Infrastructure as Code (IaC)](https://aws.amazon.com/what-is/iac/) setup had become one of the biggest friction points in the engineering org. Cursor manages its [Amazon Web Services (AWS)](https://aws.amazon.com/) infrastructure entirely with [Terraform](https://www.terraform.io/), and that footprint had grown fast. Cursor is no longer just a code editor: the product now extends well beyond the IDE into cloud and background coding agents, automations, agentic workflows, and the training and serving of [Cursor's own frontier models, the Composer family](https://cursor.com/blog/topic/research). All of it runs on AWS at massive scale, serving engineering teams of every size, including [more than half of the Fortune 500](https://cursor.com/enterprise), among them Nvidia, Stripe, Salesforce, PayPal, and Wayfair. Keeping that infrastructure reliable and fast-moving is now core to the business. But like many fast-growing startups, the code behind it had been written quickly and then scaled by copy-paste rather than careful design.

Those early Terraform patterns were replicated at machine speed as engineers dogfooded Cursor. They were copied and instantiated hundreds of times without the architectural guardrails needed to keep the system manageable. The result was a classic [terralith](https://masterpoint.io/blog/terralith-monolithic-terraform-architecture/): critical infrastructure was managed as a single [monolithic production Terraform workspace](https://masterpoint.io/blog/terralith-monolithic-terraform-architecture/).

And because that workspace was so large, it was too slow.

{{< cs-pullquote name="Travis McPeak" title="Security Lead" company="Cursor" >}}
We had one giant workspace that took way too long to plan. It was killing us.
{{< /cs-pullquote >}}

But the problem wasn't just the lack of speed. It was a lack of engineering confidence in the Infrastructure as Code system. Issues included:

- The AWS console was used to [manually make changes](https://masterpoint.io/blog/terraform-opentofu-terminology-breakdown/#clickops) during incidents and these fixes were never rolled into Terraform, and so were later inadvertently reverted.
- Managing ECS deployments through Terraform caused constant [drift](https://spacelift.io/blog/drift-detection) in the production terralith, flooding PR diffs with hundreds of unrelated changes.

Over time, the team stopped trusting the system, let alone reading the diffs.

{{< cs-pullquote name="Travis McPeak" title="Security Lead" company="Cursor" >}}
We would have engineers click apply on prod workspaces that had 120 AWS ECS service changes. The ECS services would change all the time because of drift, so the team became desensitized to large Terraform plan changes.
{{< /cs-pullquote >}}

This confusion caused downtime, such as a network firewall change that caused a 10-minute outage that was lost in the noise of Terraform drift.

The existing platform, Terraform Cloud, introduced some friction too:

- Workspace management relied on manual ClickOps configuration for each new workspace.
- The SSO experience was inconsistent.
- TFC's resource-under-management (RUM) pricing model made it daunting to scale.
{{< /csi-section >}}

{{< csi-section id="the-work" eyebrow="The Engagement" title="What <span class='csi-grad'>Masterpoint</span> Did" variant="light" >}}
Masterpoint came in for a systematic overhaul, working across the architecture, platform, and developer workflows.

{{< csi-phase title="November 2025 - Audit and High Leverage Fixes" >}}
The engagement opened with [Masterpoint's audit](https://masterpoint.io/services/audit/) of Cursor's infrastructure:

- cloud environments
- Infrastructure as Code (IaC) & Terraform architecture
- CI/CD pipelines
- networking
- observability

Within a week, Masterpoint delivered an audit report, a best practices checklist, and a security scan. The findings included IAM duplication accounted for 70% of the production Terraform state and noisy plan diffs caused engineer review fatigue.

The audit phase targeted the highest-leverage fixes first: IAM resource deduplication, workspace trigger and path filter corrections so plans only ran when relevant code changed, and initial breaking up of the monolithic Terraform workspace to begin isolating Staging and Machine Learning infrastructure.

Just one week later, Masterpoint had resolved the IAM duplication, with significant results:

{{< csi-compare before_label="Before" after_label="After" >}}
label: Resource Count
before: 8,480
after: 4,593
delta: 45.8% reduction in duplication
---
label: Mean plan time
before: 488s (8.1 min)
after: 296s (4.9 min)
delta: 39.3% faster
---
label: P50 plan time (median)
before: 423s (7.1 min)
after: 272s (4.5 min)
delta: 35.7% faster
---
label: P95 plan time
before: 749s (12.5 min)
after: 414s (6.9 min)
delta: 44.7% faster
{{< /csi-compare >}}

This was accomplished without touching the workspace structure, and without any downtime. At the speed and scale Cursor operates, downtime simply isn't an option. Every improvement had to land safely while the platform kept growing underneath it: even as Masterpoint deduplicated and trimmed resources, Cursor was continuously adding new ones. There was still more the systems could improve on.
{{< /csi-phase >}}

{{< csi-phase title="December 2025 - Spacelift Migration Begins" >}}
With the first phase complete, Masterpoint turned to the platform.

As mentioned above, TFC's ClickOps workspace management, SSO troubles, and resource-under-management pricing were all inhibiting Cursor's velocity and growth.

Masterpoint recommended a move to [Spacelift](https://spacelift.io/) to address these issues.

The team kicked off the Spacelift migration in mid-December, starting with the groundwork:

- naming and tagging standards
- AWS multi-account IAM role architecture
- Okta SSO configuration

Rather than migrating everything at once, a low-risk pilot Spacelift stack (the equivalent of a TFC workspace) was used to validate the approach. The end-to-end fully automated pilot project was completed within days.

Masterpoint also began evaluating a full migration from the Terraform runtime to [OpenTofu](https://opentofu.org/).
{{< /csi-phase >}}

{{< csi-phase title="January to February 2026 - Bulk Migration & Decomposition of the Monolithic Terraform Workspace" >}}
With a plan covering a migration of dozens of TFC workspaces across four phases, the team worked systematically. By late January, the bulk of workspaces had been migrated to Spacelift stacks with no operational downtime for the Cursor engineering organization.

By February, the migration was done. All workspaces had been moved from TFC to Spacelift and the runtime was converted from Terraform to OpenTofu. Migrating to OpenTofu freed Cursor from licensing constraints and unlocked capabilities unavailable or paywalled in Terraform, such as state encryption, OpenTelemetry support, and provider iteration.

In parallel, Masterpoint also continued to decompose the Terraform monolith into more product and domain scoped root modules.
{{< /csi-phase >}}

{{< csi-phase title="February to May 2026 - AI Agent Guardrails And Additional Improvements" >}}
After the migration was completed, Masterpoint continued to improved system usability and speed by:

- restructuring individual Route53 DNS API requests into batch requests to avoid AWS rate limits (after AWS Support & TAM noted they could not be raised)
- continuing to break up large state files into narrower root modules, allowing for faster plans and decreased blast radius
- implementing child module versioning with [OCI registries](https://opentofu.org/docs/cli/oci_registries/module-package/) to enable staged rollouts and safer change control of critical TF resources
- resolving the ECS drift issue by using the ["Task Definition Template Pattern"](https://newsletter.masterpoint.io/p/deploying-your-apps-into-ecs)
- implementing OpenTofu's [OTel tracing](https://opentofu.org/docs/internals/tracing/) to find other performance bottlenecks and set up the Cursor team for longterm visibility into their IaC throughput

Because Cursor's engineering team uses Cursor to write Terraform, Masterpoint embedded architectural knowledge directly into the codebase as AI agent skills and rules.

This AI context encodes the decisions that AI models cannot anticipate on their own:

- when to create a new root module vs. extend an existing one
- how to scope blast radius in a root module
- how to break up a high blast radius monolithic root module
- data source patterns and optimizations
- security practices, such as cloud networking and Terraform/OpenTofu module SHA pinning
- debugging performance bottlenecks, through methods such as logging and OpenTelemetry traces
- …and more

Every IaC optimization Masterpoint delivered was paired with instructions to prevent anti-patterns from being reintroduced.

{{< cs-pullquote name="Ravi Rahman" title="Software Engineer" company="Cursor" >}}
The AI agent skills and rules help us build our IaC correctly while at the same time moving faster.
{{< /cs-pullquote >}}
{{< /csi-phase >}}
{{< /csi-section >}}

{{< csi-section id="the-results" eyebrow="The Results" title="The <span class='csi-grad'>Results</span>" variant="pine" >}}
### Numbers That <span class='csi-grad'>Matter</span>

{{< csi-compare before_label="Before" after_label="After" >}}
label: Plan time (production)
before: 10 min
after: 2 min
delta: 5x faster
---
label: Infrastructure PRs shipped per week
before: 194
after: 500+
delta: 2.6x more frequent, up +157%!
---
label: Median resources affected per Terraform run
before: 54
after: 5
delta: 91% reduction in blast radius
{{< /csi-compare >}}

### Plan time went from 10+ minutes to <span class='csi-grad'>2 minutes</span>

The production workspace plan time dropped from over 10+ minutes, with spikes to 15 minutes, during the November baseline to around 2 minutes by mid-2026.

![Deploy time before and after: average plan + apply took 10+ minutes before, 2 minutes now — 5x faster per Terraform run](/img/case-studies/cursor/cursor-terraform-5x-faster-masterpoint.png)

### Deployment frequency <span class='csi-grad'>increased</span>

Weekly merged PRs against infrastructure as code went from approximately 194 per week to over 500 a week, a **157% increase**. They've only accelerated since then.

![2.6x more PRs shipped: from 194 changes per week in October 2025 to 500+ in May 2026, a 157% jump in deployment frequency](/img/case-studies/cursor/cursor-2x-more-deploy-masterpoint.png)

### The productivity lift was <span class='csi-grad'>significant</span>

This gain wasn't from growing the engineering organization in headcount: a **controlled same-cohort analysis of 34 engineers** active both before and after the Masterpoint engagement found that PR throughput grew by **121%**.

{{< csi-compare before_label="Pre-engagement" after_label="End of Engagement" >}}
label: Cohort throughput
before: 63 PRs/wk
after: 140 PRs/wk
delta: +121%
---
label: Per-active-week cadence
before: 5.37 PRs/author/wk
after: 9.19 PRs/author/wk
delta: +71%
{{< /csi-compare >}}

### Infrastructure became <span class='csi-grad'>democratized</span>

Previously, workspace creation required manual ClickOps and admin access. Today, engineers create and manage their own stacks. The number of separately managed modules went from **21 to 100+**. Engineers are now creating their own product/domain-scoped infrastructure, with guardrails, instead of jumbling it in the primary monolithic workspace.

![Terraform root module workspaces grew from 21 in October 2025 to 141 in May 2026 — up 571% — as self-service workspaces replaced monolithic antipatterns](/img/case-studies/cursor/cursor-infrastructure-democratized-masterpoint.png)
{{< /csi-section >}}

{{< csi-section eyebrow="The Results" title="What Changed for the Team" variant="light" >}}
{{< cs-pullquote name="Ravi Rahman" title="Software Engineer" company="Cursor" >}}
The Terraform experience has gotten way better. For the first time since I've been here, we just merge and apply. If something's wrong, the system lets us know. It's fast and moves at the speed we need.
{{< /cs-pullquote >}}

### Engineers <span class='csi-grad'>know</span> what an IaC Terraform change will touch

Before the engagement, engineers couldn't predict what a change would actually touch in a workspace. A database might live in a workspace named for networking infrastructure, so even finding where something was managed required tribal knowledge. Dependencies between workspaces were just as opaque: touching one piece of infrastructure could ripple into systems that had nothing to do with the change or surface long-standing unrelated drift. Plans intended for one system would silently queue in unrelated workspaces, waiting for the next person to find them with no context on where they came from or whether they were safe to apply.

With smaller, focused stacks, plans are scoped to the change at hand. The median Terraform run now touches just 5 resources instead of 54 — **a 91% smaller blast radius** — so engineers know precisely what a plan will affect before they run it.

![91% reduction in blast radius: a median Terraform run once touched 54 resources, now it averages just 5](/img/case-studies/cursor/cursor-terraform-blast-radius-masterpoint.png)

### Architectural flexibility enables the <span class='csi-grad'>business and product delivery</span>

Before the engagement, the terralith made architectural changes expensive and risky. Touching one piece of infrastructure meant disrupting unconnected components.

Now, with narrow stacks each owning a focused piece of infrastructure, the Cursor engineering team moves faster: plan and apply deployments complete faster, reviews are lighter & quicker, and a change to one system carries no risk of breaking another.

New services, providers, and cloud targets can be added as their own stacks, which is a foundation that directly enables expansion into multi-cloud infrastructure as Cursor continues to scale.

### Cursor's agents are set up for <span class='csi-grad'>future success</span>

Since Cursor's engineers rely on Cursor to write their own Terraform, Masterpoint embedded the new architecture into AI agent rules and skills that sit directly within the codebase.

These rules capture the patterns and decisions that LLMs can't figure out on their own, setting the team up to **consistently ship high-quality infrastructure code**, now and as the system evolves.
{{< /csi-section >}}

{{< csi-testimonial name="Travis McPeak" title="Security Lead" company="Cursor" variant="pine" photo="/img/testimonials/travis-mcpeak.jpeg" image="/img/bg_our_word.jpg" >}}
Masterpoint didn't just fix our Infrastructure as Code. They gave our entire engineering org the **confidence to move fast**. We went from a system people were afraid to touch Terraform to where nearly every engineer is quickly and assuredly shipping infrastructure changes every week.
{{< /csi-testimonial >}}
