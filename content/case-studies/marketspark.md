---
# TODO: NEED TO ASK MARKETSPARK FOR PROPER LOGO (dark & light variants)
draft: false # NOT READY FOR RELEASE
title: "Modernizing MarketSpark's AWS Cloud into a 100% Infrastructure as Code, Automated & Multi-Account Platform"
weight: 2
description: "Masterpoint rebuilt MarketSpark's AWS environment from a single manually operated account into an 11-account AWS Organization, 100% codified & automated in Infrastructure as Code, with 100+ ECS and Lambda services across all environments."

# Full-bleed, colour-split slide body (modern hero + stat strip kept verbatim).
layout: immersive

# Hero
eyebrow: "CASE STUDY SUCCESS STORY"
client: "MarketSpark"
client_logo: /img/case-studies/marketspark/marketspark-logo.png
client_logo_height: 48px
hero_title: "Modernizing MarketSpark's AWS Cloud into a <span class='text-gradient'>100% Infrastructure as Code, Automated &amp; Multi-Account Platform</span>"
hero_aside_image: /img/case-studies/marketspark/hero-bg.jpg
hero_aside_alt: "MarketSpark: Connectivity in the Field"

# At-a-glance stat strip (appears under hero)
stat_bar:
  - value: "1 → 11"
    label: "monolithic AWS account to AWS Organization"
  - value: "0% → 100%"
    label: "Infrastructure as Code"
  - value: "100+ Services"
    label: "AWS ECS & Lambda codified with <a href='https://en.wikipedia.org/wiki/Principle_of_least_privilege' target='_blank' rel='noopener'>PoLP</a> across all environments"
  - value: "hours, not weeks"
    label: "full-region disaster recovery"

# Optional preview / OG
preview_image: /img/case-studies/marketspark/preview.svg
og_img: /img/case-studies/marketspark/preview.svg

sitemap:
  priority: 0
---

{{< csi-split media="/img/case-studies/marketspark/telecommunications.jpg" media_alt="Telecommunications and managed wireless connectivity" variant="light" ratio="65-35" >}}
{{< cs-about
  name="MarketSpark"
  logo="/img/case-studies/marketspark/marketspark-logo.png"
  url="https://www.marketspark.com/"
  linkedin="https://www.linkedin.com/company/marketspark-inc/"
  industry="Telecommunications · Managed Wireless / 5G Connectivity"
>}}
MarketSpark is the leading provider of analog replacement solutions for enterprises on a global scale, with a cloud-enabled platform helping companies move into the world of tomorrow with managed wireless solutions that are 5G ready. From solution design, to installation, to 24/7 maintenance and monitoring, MarketSpark handles it all. MarketSpark serves more than 500 of America’s largest enterprises, and partners with telecommunication leaders such as Verizon and T-Mobile.
{{< /cs-about >}}
{{< /csi-split >}}

{{< csi-split eyebrow="The Challenge" title="The Starting Point" media="/img/case-studies/marketspark/marketspark-aws.jpg" media_alt="MarketSpark and Masterpoint on AWS" variant="pine" flip="true" >}}
MarketSpark had outgrown the AWS environment they started on, especially as the company's customer base grew, product surface widened, and they began to get compliance framework requests. All environments (including development, staging, production, and others) lived inside a single monolithic AWS account, and every change was a manual operation ([ClickOps](https://masterpoint.io/blog/terraform-opentofu-terminology-breakdown/#clickops)) in the AWS Console.

The MarketSpark team felt this. They had already begun planning improvements, and they partnered with Masterpoint for the deep platform expertise to execute.
{{< /csi-split >}}

{{< csi-section eyebrow="What Masterpoint Built" title="From a single account to a <span class='csi-grad'>platform built to scale</span>" variant="light" align="center" >}}
Our engagement started with a [deep-dive Infrastructure as Code (IaC) and Amazon Web Services (AWS) audit](https://masterpoint.io/services/audit/). We sat down with stakeholders and engineers, mapped the existing architecture, identified risks, produced recommendations, and delivered a modernization roadmap.

From there, we rebuilt the environment from the ground up.
{{< /csi-section >}}

{{< csi-split eyebrow="01 · AWS Structure" title="Multi-Account <span class='csi-grad'>AWS Organization</span>" media="/img/case-studies/marketspark/aws-organization-docs.png" media_alt="One monolithic account becomes eleven accounts under an AWS Organization, each with its own VPC and IAM boundary" caption="<a href='https://docs.aws.amazon.com/prescriptive-guidance/latest/security-reference-architecture/architecture.html' target='_blank' rel='noopener noreferrer'>AWS Security Reference Architecture</a> Diagram Example" contain="true" variant="pine" >}}
The original single (1) monolithic AWS account became eleven (11) under the [AWS Organization](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html) for a mature multi-account architecture and proper separation of concerns. Each environment has its own VPC & networking and a hard IAM boundary.

- **Long-lived IAM credentials are gone.** A security liability we see in nearly every cloud audit, replaced by AWS IAM Identity Center (SSO) federated to Microsoft Entra ID. CI/CD & automation systems like GitHub Actions and Spacelift authenticate over short-lived OIDC trust.
- **[Service Control Policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)** are put in place as guardrails at the Organization level, enforcing security boundaries and blocking high-risk actions (e.g. disabling logging) by default.
{{< /csi-split >}}

{{< csi-split eyebrow="02 · Infrastructure as Code" title="<strong>100%</strong> of the cloud in <a href='https://aws.amazon.com/what-is/iac/' target='_blank' rel='noopener noreferrer' class='csi-grad' style='text-decoration: underline; text-decoration-color: #16a597; text-decoration-thickness: 2px; text-underline-offset: 4px;'>Infrastructure as Code</a>" media="/img/case-studies/opentofu.jpg" media_alt="Every AWS resource type declared in OpenTofu and stored in Git" caption="<a href='https://opentofu.org/' target='_blank' rel='noopener noreferrer'>OpenTofu</a> is a reliable, enterprise-grade <a href='https://aws.amazon.com/what-is/iac/' target='_blank' rel='noopener noreferrer'>infrastructure as code (IaC)</a> tool under the Linux Foundation." variant="light" flip="true" >}}
Every cloud resource is now declared in [OpenTofu](https://opentofu.org/), the open-source licensed successor to Terraform: VPCs, Aurora databases, ECS services, Lambdas, API Gateways, SQS queues, S3 buckets, CloudFront, WAF, and far more. If it runs in MarketSpark's cloud infrastructure, it lives in Git.

That turns infrastructure into software: **reusable**, **consistent**, **version-controlled**, and **self-documenting**.

- **100+ ECS and Lambda services** are codified and consistent across Development, Staging, and Production.
- **Serverless Fargate.** The ECS fleet migrated from EC2 to [AWS Fargate](https://aws.amazon.com/fargate/)'s serverless compute engine that lets engineers focus on the applications without managing servers.
- **[Principle of Least Privilege (PoLP)](https://en.wikipedia.org/wiki/Principle_of_least_privilege) applied everywhere.** With every IAM and security resource being rebuilt in IaC, Masterpoint engineers treated it as the perfect opportunity to codify PoLP across all surfaces.
{{< /csi-split >}}

{{< csi-split eyebrow="03 · Infrastructure Automation" title="100% of IaC <span class='csi-grad'>automated</span>" media="/img/case-studies/spacelift.jpg" media_alt="Spacelift: provision, configure, govern" variant="pine" >}}
Nothing ships by hand. Every change is automated through [Spacelift](https://spacelift.io/)'s orchestration: CI plans for GitHub Pull Requests, deployment applies on merge, and evaluated with custom [policy-as-code (OPA)](https://www.openpolicyagent.org/).

Because provisioning is fully self-service and automated with guardrails (enforced with [Spacelift Policies through OPA Rego](https://docs.spacelift.io/concepts/policy)), MarketSpark's long-term cloud infrastructure growth is never bottlenecked. The platform scales alongside the business as it grows.
{{< /csi-split >}}

{{< csi-section eyebrow="While We Were Under the Hood" title="A modernization rebuild is the <span class='csi-grad'>perfect time</span> to address technical debt" variant="light" align="center" >}}
With the infrastructure already under the knife, Masterpoint engineers folded in several improvements uncovered during the audit, alongside the core rebuild:

{{< csi-list >}}
icon: fa-shield-halved
title: Tailscale Zero-Trust Access
body: Identity-aware [Tailscale](https://tailscale.com/) subnet router architecture replaced a legacy VPN with manual key management.
---
icon: fa-chart-line
title: Centralized Datadog Observability
body: APM, tracing, logs, and monitors defined in IaC and baked into services, so visibility ships with every service.
---
icon: fa-database
title: Databases Upgraded in Flight
body: Aurora PostgreSQL jumped two major versions ahead of AWS end-of-life deprecation.
---
icon: fa-network-wired
title: Rearchitected IoT Connectivity
body: The IoT VPN path moved from scattered application-layer logic to clean network-layer routing with network address translation (NAT).
---
icon: fa-tags
title: Standardized Naming & Tagging (FinOps)
body: A uniform strategy unlocked [FinOps](https://www.ibm.com/think/topics/finops)-ready per-environment, per-service cost allocation.
---
icon: fa-lock
title: TLS Everywhere
body: Databases sit behind RDS Proxy, with database and ElastiCache (Valkey/Redis) connections enforced over TLS.
{{< /csi-list >}}

{{< cs-pullquote name="Adam Pallin" title="Director of Software Engineering" company="MarketSpark" photo="/img/case-studies/marketspark/adam-pallin.jpeg" >}}
<strong>Masterpoint built us our own platform</strong>. And it doesn't feel like boilerplate dropped over everything. They worked within the systems we already had, solved the hard problems like our networking setup, and left us with clean infrastructure code we can actually build on.
{{< /cs-pullquote >}}
{{< /csi-section >}}

{{< csi-section eyebrow="The Outcomes" title="Business Impact" variant="pine" align="center" >}}
{{< csi-impact >}}
icon: fa-gauge-high
title: Faster Product Velocity, Lower Operational Risk
body: Provisioning and updating application infrastructure takes minutes instead of days through democratized IaC and automation with Spacelift, versus manual operations in the AWS Console. Centralized observability means MarketSpark catches incidents in minutes instead of hearing about them from customers.
---
icon: fa-shield-halved
title: Hardened Security & Blast-Radius Containment
body: A misconfiguration, runaway process, or compromised credential in a lower environment (e.g. Staging/QA) can no longer reach customer-facing Production workloads. Each environment runs in its own AWS account with its own IAM scope and isolated VPC networking.
---
icon: fa-life-ring
title: Full-Region Disaster Recovery in Hours
body: Disaster recovery is accomplishable in hours with automated deploys instead of days or weeks of manual rebuilding. Infrastructure as Code enables seamless multi-region infrastructure for MarketSpark's growing business.
---
icon: fa-coins
title: Less Overhead, Lower Spend
body: The migration towards AWS Fargate's serverless compute engine enables MarketSpark to run their applications without needing to manage underlying servers. Fargate also reduced compute spend on the same workloads with proper per service right sizing (additionally, [Fargate Spot is utilized where tolerated, delivering up to a 70% AWS discount](https://aws.amazon.com/fargate/pricing/)).
---
icon: fa-book-open
title: Auditable, Self-Documenting Infrastructure
body: IaC is now the single source of truth, deploying infrastructure consistently across environments, and every change is version-controlled and peer-reviewed with a full audit trail. Onboarding a new engineer, archaeology questions, or auditing a config no longer depends on tribal knowledge, stale Confluence pages, or screenshots.
---
icon: fa-award
title: Enterprise-Grade Trust and Compliance Posture
body: MarketSpark's AWS environment is aligned with industry security and compliance frameworks (SOC 2, ISO 27001, etc.) that enterprise customers expect. IaC itself is a strong control that compliance auditors look for, and MarketSpark now has a credible, auditable infrastructure story, something that was not easily possible with the previous manually-managed environment.
{{< /csi-impact >}}
{{< /csi-section >}}

{{< csi-section accent="true" title="Built so the team could <span class='csi-grad'>own it</span>" variant="light" align="center" >}}
Knowledge transfer wasn't a final phase, it ran in parallel with the work. We held training sessions, recorded walkthroughs, drew architecture diagrams, and documented operations extensively. By handoff, MarketSpark's engineers weren't inheriting a black box. They were already shipping changes and self-deploying infrastructure against the new platform.
{{< /csi-section >}}

{{< csi-testimonial name="Charlie Wilson" title="Chief Technology Officer (CTO)" company="MarketSpark" variant="pine" photo="/img/case-studies/marketspark/charlie-wilson.jpeg" image="/img/bg_our_word.jpg" >}}
We chose Masterpoint over the giant consulting firms because <strong>a boutique firm meant a real partnership and actual flexibility to work the problem alongside us</strong>. We've worked with enough of both to know it's always better to work with people making local decisions that affect the outcome than to get an ivory-tower, boilerplate approach. <strong>We're 100% happy with the decision to bring in Masterpoint.</strong>
{{< /csi-testimonial >}}
