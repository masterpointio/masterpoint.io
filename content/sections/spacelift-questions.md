---
title: Common Questions
weight: 8
section_categories:
  - spacelift
id: spacelift-questions

faqs:
  - title: "We just bought Spacelift — can you get us up and running?"
    content: "Yes, that's our bread and butter. A typical implementation covers stack architecture, OIDC authentication to your cloud accounts, SSO, policy setup, CI/CD integration, and team enablement — and most land in a matter of weeks, not months."

  - title: "Do you take on custom or complex Spacelift work?"
    content: "That's where we're strongest. Custom approval workflows, tiered auto-deploy models, integrations with your existing CI/CD (GitHub Actions, Bitbucket, Azure DevOps, Buildkite), policy-as-code libraries, and migrations that have no clean one-to-one mapping — the work beyond a standard setup is exactly what we do."

  - title: "What are some examples of custom engagements you've done?"
    content: "A few: enterprise Spacelift for a GxP-regulated pharma company with Jira-ticket-gated approvals, private workers inside their network, and compliance-grade audit retention. Breaking a monolithic Terraform workspace into 100+ focused stacks with tiered auto-deploy. Rolling out org-wide Spacelift across an AWS Organization wired to Azure DevOps. Self-service, PR-driven environment provisioning for per-customer infrastructure. If your situation feels unusual, it probably isn't to us."

  - title: "Do you work with self-hosted Spacelift?"
    content: "Yes — we work with fully self-hosted Spacelift installations as well as SaaS, including hybrid setups where self-hosted private workers run inside your network to meet security and compliance requirements."

  - title: "Can you make Spacelift self-service for our engineers?"
    content: "That's the end state of most of our engagements. Engineers open a pull request, a stack is created and planned automatically, policies decide what needs human review, and merges deploy. Our open-source [terraform-spacelift-automation](https://github.com/masterpointio/terraform-spacelift-automation) module was built for exactly this."

  - title: "Do you build AWS infrastructure too, or just Spacelift?"
    content: "Both. Much of our Spacelift work sits on top of AWS platforms we build or modernize — multi-account organizations, ECS and Fargate, serverless, networking, databases — all codified in Terraform or OpenTofu and orchestrated through Spacelift."

  - title: "Terraform or OpenTofu?"
    content: "Either — we run both at scale on Spacelift, along with frameworks like Terragrunt, Atmos, and Terraspace. If a runtime migration makes sense for you, we'll tell you — we've done plenty of them. If it doesn't, we won't push it."

  - title: "Which Spacelift plans do you work with?"
    content: "All of them — from Free and Starter through Enterprise. We'll also help you pick the right tier and pricing model for your footprint before you sign, so you're not overbuying."

  - title: "We haven't committed to Spacelift yet. Can you help us evaluate?"
    content: "Yes. We run IaC audits and build-vs-buy assessments, and we'll give you an honest read on whether Spacelift fits your team — including how it compares to staying on Terraform Cloud or building your own pipelines. Our guide on [migrating off Terraform Cloud](/blog/how-to-migrate-off-tfc/) is a good place to start."

  - title: "What happens when the engagement ends?"
    content: "You keep the platform, the documentation, and the skills. We enable your team throughout the engagement so you're self-sufficient from day one after handoff — and if you want us to stick around, we offer ongoing support retainers. Some of our longest-running client relationships started as a single Spacelift rollout."
---

### Common Questions {.sectionTitle .big .text-pine .text-center}

{{< accordion >}}
