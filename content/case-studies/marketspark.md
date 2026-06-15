---
# TODO: NEED TO ASK MARKETSPARK FOR PROPER LOGO (dark & light variants)
draft: true # NOT READY FOR RELEASE
title: "Modernizing MarketSpark's AWS Cloud into a 100% Infrastructure as Code, Automated & Multi-Account Platform"
weight: 2
description: "Masterpoint rebuilt MarketSpark's AWS environment from a single manually operated account into an 11-account AWS Organization, 100% codified & automated in Infrastructure as Code, with 100+ ECS and Lambda services across all environments."

# Hero
eyebrow: "CASE STUDY SUCCESS STORY"
client: "MarketSpark"
client_logo: /img/case-studies/marketspark/marketspark-logo.png
hero_title: "Modernizing MarketSpark's AWS Cloud into a <span class='text-gradient'>100% Infrastructure as Code, Automated &amp; Multi-Account Platform</span>"
hero_aside_image: /img/case-studies/marketspark/hero-bg.jpg
hero_aside_alt: "MarketSpark: connectivity in the field"

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

{{< cs-about
  name="MarketSpark"
  url="https://www.marketspark.com/"
  linkedin="https://www.linkedin.com/company/marketspark-inc/"
  industry="Telecommunications · Managed Wireless / 5G Connectivity"
>}}
MarketSpark is the leading provider of analog replacement solutions for enterprises on a global scale, with a cloud-enabled platform helping companies move into the world of tomorrow with managed wireless solutions that are 5G ready. From solution design, to installation, to 24/7 maintenance and monitoring, MarketSpark handles it all. MarketSpark serves more than 500 of America's largest enterprises, and partners with telecommunication leaders such as T-Mobile.
{{< /cs-about >}}

## The Starting Point

MarketSpark had outgrown the AWS environment they started on, especially as the company's customer base grew, product surface widened, and they began to get compliance framework requests. All environments (including development, staging, production, and others) all lived inside a single monolithic AWS account, and every change was a manual operation ([ClickOps](https://spacelift.io/blog/what-is-clickops)) in the AWS Console.

The MarketSpark team felt this. They had already begun planning improvements, and they partnered with Masterpoint for the deep platform expertise to execute.

---

## What Masterpoint Built

Our engagement started with a [deep-dive Infrastructure as Code (IaC) and Amazon Web Services (AWS) audit](https://masterpoint.io/services/audit/). We sat down with stakeholders and engineers, mapped the existing architecture, identified risks, produced recommendations, and delivered a modernization roadmap. From there, we rebuilt the environment from the ground up:

- **Multi-Account AWS Organization.** The original single (1) monolithic AWS account became eleven (11) under the [AWS Organization](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html) for a proper separation of concerns. Each environment has its own VPC & networking and a hard IAM boundary.
    - Long-lived IAM credentials, a security liability we see in nearly every cloud infrastructure audit, are replaced, with AWS IAM Identity Center (SSO) federated to Microsoft Entra ID. OIDC trust with CI/CD systems such as GitHub Actions, Spacelift, etc. [Service Control Policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html) are put in place as guardrails at the Organization level.
- **100% of cloud resources as [Infrastructure as Code](https://aws.amazon.com/what-is/iac/), through [OpenTofu](https://opentofu.org/)** (the open-source-licensed successor to Terraform). Every VPC, Aurora database, ECS service, Lambda, API Gateway, SQS queue, S3 bucket, CloudFront, WAF, and many more are all defined in Git.
- **100% of IaC automated with [Spacelift](https://spacelift.io/).** Nothing ships by hand. Every change runs through Spacelift's orchestration: CI plans for GitHub Pull Requests, deployment applies, customized with [policy-as-code (OPA)](https://www.openpolicyagent.org/). And because provisioning is self-service with guardrails, MarketSpark's cloud infrastructure growth isn't bottlenecked, their IaC platform scales alongside the business.
- **100+ ECS and Lambda services codified & consistent** across Development, Staging, and Production environments. The ECS fleet was migrated from EC2 to [serverless Fargate](https://aws.amazon.com/fargate/) during the same rebuild.
- [**Tailscale**](https://tailscale.com/) VPN subnet router architecture for secure, zero trust, identity-aware seamless access to private infrastructure. Replaced legacy VPN that required manual key management and cumbersome configuration.
- **With centralized [Datadog](https://datadog.com) observability**, we brought in APM, tracing, logs, and monitors, all defined in IaC and baked in.

**With the infrastructure already under the knife, Masterpoint engineers folded in several wins and improvements discovered during the audit alongside the core work:**

- [Principle of Least Privilege (PoLP)](https://en.wikipedia.org/wiki/Principle_of_least_privilege) applied everywhere. With every IAM and security resource being rebuilt in IaC, Masterpoint engineers treated it as the perfect opportunity to codify PoLP across all surfaces.
- Aurora PostgreSQL upgraded two major versions in flight, ahead of AWS EOL deprecation.
- The IoT VPN connectivity path was re-architected from scattered application-layer logic into a clean network-layer concern via custom NAT EC2 instance routed through the network.
- A uniform FinOps tagging strategy enabled per-environment and per-service cost allocation.
- All application and services connect to databases through RDS Proxy, and both databases and ElastiCache (Valkey/Redis) connections are enforced over TLS.

---

## The Outcomes & Business Impact

{{< cs-wins >}}
icon: fa-gauge-high
title: Faster product velocity, lower operational risk
body: Provisioning and updating application infrastructure takes minutes instead of days through democratized GitOps and automation with Spacelift, versus manually operating by hand in the AWS Console. Centralized observability means MarketSpark catches incidents in minutes instead of hearing about them from customers.
---
icon: fa-shield-halved
title: Hardened blast-radius containment
body: A misconfiguration in Staging/QA can no longer reach Production. Each environment runs in its own AWS account with its own IAM scope and isolated VPC networking.
---
icon: fa-life-ring
title: Full-region disaster recovery
body: Disaster recovery is accomplishable in hours with automated deploys instead of days or weeks of manual rebuilding. Infrastructure as Code enables seamless multi-region infrastructure for MarketSpark's growing business.
---
icon: fa-coins
title: Less overhead, less costs
body: The migration towards AWS Fargate's serverless compute engine enables MarketSpark to run their applications without needing to manage underlying servers. Fargate also reduced compute spend on the same workloads with proper per service right sizing (additionally, [Fargate Spot is used where tolerated, delivering up to a 70% AWS discount](https://aws.amazon.com/fargate/pricing/)).
---
icon: fa-book-open
title: Cloud infrastructure that documents itself
body: The Infrastructure as Code is now the source of truth. Onboarding a new engineer, archaeology questions, or auditing a config no longer depends on tribal knowledge, stale Confluence pages, or screenshots. Documentation no longer drifts from reality because the documentation *is* the reality.
---
icon: fa-award
title: Enterprise-grade trust and compliance posture
body: MarketSpark's AWS environment is aligned with industry security and compliance frameworks (SOC 2, ISO 27001, etc.) that enterprise customers expect. IaC itself is a strong control that compliance auditors look for, and MarketSpark now has a credible, auditable infrastructure story, something that was not easily possible with the previous manually-managed environment.
{{< /cs-wins >}}

Knowledge transfers and sharing wasn't a final phase, it ran in parallel with the work. Masterpoint conducted training sessions, recorded walkthroughs, created architecture diagrams, and documented operations extensively. As a result, MarketSpark's engineering team wasn't just inheriting the new platform — they were already shipping changes against it and self-deploying infrastructure by handoff.

{{< cs-pullquote attribution="— Name, Title" >}}
Placeholder testimonial — Will replace with real <strong>MarketSpark voice from the retro</strong>.
{{< /cs-pullquote >}}
