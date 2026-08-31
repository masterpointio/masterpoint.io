---
visible: true
draft: false
title: "From Click-Ops to IaC: A Safer Workflow with AI"
author: Veronika Gnilitska
slug: dont-let-ai-break-your-infra
tags: ["terraform", "opentofu", "infrastructure-as-code", "ai", "mcp"]
date: 2026-08-31
description: "Turn click-ops AWS resources into Terraform/OpenTofu with AI and MCPs, using human review gates, independent verification, and a merge checklist."
image: /img/updates/dont-let-ai-break-your-infra/clickops-to-iac-main.png
preview_image: /img/updates/dont-let-ai-break-your-infra/preview.png # portrait thumbnail for the /blog/ listing
callout: "<p>👋 <b>Sitting on click-ops infrastructure you want to codify?</b> <a href='/contact'>Get in touch</a>, we're the experts at safely migrating manual infrastructure into IaC and we'd love to chat!"
---

<h2>Table of Contents</h2>

- [The problem with click-ops, in one migration](#the-problem-with-click-ops-in-one-migration)
- [Why AI and MCPs help, and where they get dangerous](#why-ai-and-mcps-help-and-where-they-get-dangerous)
- [A safer workflow for turning manual infrastructure into IaC](#a-safer-workflow-for-turning-manual-infrastructure-into-iac)
- [Matching agent autonomy to operation risk](#matching-agent-autonomy-to-operation-risk)
- [Practical guardrails for MCP-assisted IaC work](#practical-guardrails-for-mcp-assisted-iac-work)
  - [Enforce it in the pipeline, not just the prompt](#enforce-it-in-the-pipeline-not-just-the-prompt)
  - [Split the work across subagents](#split-the-work-across-subagents)
- [Reusable Agent Skill](#reusable-agent-skill)
- [Checklist before merging AI-generated IaC](#checklist-before-merging-ai-generated-iac)
- [Codify click-ops without handing AI the keys](#codify-click-ops-without-handing-ai-the-keys)

We've seen the same pattern across client environments: AWS resources created in the console years ago, SSH keys nobody can trace, and security-group allow-lists that still contain former employees' IP addresses. The resources keep working, so nobody touches them. Meanwhile, the gap between what runs and what is documented widens every quarter.

This guide shows how to close that gap without handing production to an agent. AI handles extraction and scaffolding; humans review the evidence and control every consequential action. The examples focus on Terraform and OpenTofu (collectively referred to as "TF") on AWS.

## The problem with click-ops, in one migration

On a recent client engagement, the task looked mechanical: migrate about 20 AWS Glue jobs from one AWS account to another and codify them in TF along the way. Each job had a configuration that existed only in the console. Worker counts, script locations, VPC settings, connections.

One of our engineers pointed an AI agent (our choice at Masterpoint is Claude Code), connected to AWS through the [aws-iac-mcp-server MCP server,](https://github.com/awslabs/mcp/tree/main/src/aws-iac-mcp-server) at the source account to pull down each job's configuration and generate the TF for it. It worked, until it didn't. Around the fifth or sixth job, the agent started inventing details, deciding the Python script filename should match the Glue job name because that is the "standard" pattern. The legacy jobs did not follow it. The generated code looked plausible and was quietly wrong.

The fix was not a better model, but a better process. The agent wrote a script that extracted every job's configuration into structured markdown, and only after that data was reviewed did it transform the inventory into TF. And after the migration, the agent wrote a verification script that compared every job's configuration key by key across both accounts and flagged the diffs. That script caught the remaining discrepancies and made the result trustworthy.

That is the whole thesis of this post in miniature. LLMs are inconsistent at repeating a boring process 20 times. They are excellent at writing the tooling that makes the process deterministic.

## Why AI and MCPs help, and where they get dangerous

MCP servers give an agent structured access to your real environment. The [Terraform MCP](https://github.com/hashicorp/terraform-mcp-server) [and OpenTofu MCP](https://github.com/opentofu/opentofu-mcp-server) servers give it live provider and module documentation instead of stale training data. [AWS MCP servers](https://github.com/awslabs/mcp/tree/main#available-mcp-servers-quick-installation), like the AWS-managed MCP server with full API support and up-to-date documentation, let it inspect what actually exists in your account. Early on, we covered the mechanics of these in [Using MCPs to Run Terraform](https://masterpoint.io/blog/using-mcps-to-run-terraform/).

For click-ops codification specifically, that combination is genuinely strong. The agent can enumerate resources you forgot existed, cross-reference them against your state files, and draft the HCL to manage them. In our experience, discovery that used to mean days of console screenshots and spreadsheet archaeology collapses into an afternoon of review.

Purpose-built importers like [Terraformer](https://github.com/GoogleCloudPlatform/terraformer) and [aws2tf](https://github.com/aws-samples/aws2tf) are fast and deterministic, but they emit flat code that captures every provider default and none of your conventions, so teams often rewrite the output anyway. The AI workflow below is slower and needs guardrails. In exchange, you get code shaped to your module patterns, with a review gate at every step.

The danger shows up when the agent stops reading and starts writing. Across our survey responses and client work, the failure modes cluster into four groups.

**State operations.** An engineer on our team let an agent run TF state migrations in full-agent mode without requiring it to present a plan first. It lost the state. Recovery meant re-importing every resource, complete with the quoting and escaping headaches that `import` commands bring when resource IDs contain quotes or live inside lists.

**Networking and security changes.** In a sandbox account, another engineer watched an agent "solve" a network connectivity issue by opening a security group to the public internet. Technically, the connection now worked. This is the scariest failure mode because the agent optimizes for the symptom you gave it, and broad ingress is always a valid-looking fix.

**Hallucinated interfaces.** Agents invent module inputs that do not exist. Ask for custom DB parameters in an RDS child module that does not expose them, and the agent will happily write `db_parameters = {...}` as if by magic. Feeding it the module README and source helps less than you would expect.

**The non-standard 10%.** When 90% of your codebase follows a naming convention, the agent will steamroll the 10% that does not. Legacy infrastructure is, almost by definition, that 10%, and precisely the code you are trying to import.

None of these four is "the AI wrote bad syntax." The output _looked_ right, but it was wrong. Newer models and live module schemas make every one of them rarer, but they still occur. An agent under pressure still reaches for the plausible pattern that doesn't fit or the shortcut that incorrectly mutates state. So we build guardrails for the direction of failure instead.

## A safer workflow for turning manual infrastructure into IaC

The workflow we recommend has five steps. The agent participates in all of them, but it has write access only in the middle, only to your repository, never to your cloud account or your state.

![A safer click-ops-to-IaC workflow: the agent has read-only cloud access and repo write access, while humans hold all cloud write access across discovery, review, scaffolding, import, and verification](/img/updates/dont-let-ai-break-your-infra/clickops-to-iac-light.png)

1. **Discover with metadata-only access.** In production, especially where the account may contain sensitive data, connect the MCP through a dedicated SSO profile that can inspect resource metadata and configuration but cannot read workload data. Generic read-only access may still allow object/item/secret reads, so reserve it for lower-risk environments. Give it a seed resource (say, a single ECS service ARN) and have it walk the dependency graph to enumerate everything related — task roles, security groups, target groups, autoscaling policies, CloudWatch alarms, ACM certificates — then extract each resource's full configuration, secrets redacted, into _structured YAML files_ rather than HCL, since that is diffable and reviewable. This dependency expansion from a single entrypoint is where the workflow saves the most time versus hunting down [click-ops resources](https://masterpoint.io/blog/terraform-opentofu-terminology-breakdown/) by hand.
2. **Review the extraction.** Spot-check the extracted data against the console. A YAML inventory is much easier to review than generated TF.
3. **Scaffold TF from the verified data.** Now let the agent generate modules and root configuration from the extracted files. Provide your org's conventions and file layout as context. Our post on [the standard TF files](https://masterpoint.io/blog/standard-tf-files/) is a useful baseline to hand it.
4. **Plan the import + human runs it.** Have the agent draft [`import` blocks](https://opentofu.org/docs/language/import/) (available in both OpenTofu and [Terraform 1.5+](https://developer.hashicorp.com/terraform/language/import)) rather than imperative `state` commands. Import blocks surface in the plan. A human runs `tofu plan` and reads it.
5. **Verify with a script.** Generate a verification script that compares live configuration against the new code, key by key. Run it before and after cutover. A clean plan tells you TF is internally consistent. The verification script tells you the code matches reality.

Expect the first plans after import to be noisy. Providers apply defaults and normalize values, so diffs appear on attributes nobody ever set. This [plan noise](https://github.com/hashicorp/terraform-provider-aws/issues/23288) is ordinary provider behavior that predates AI workflows. Set attributes to match provider defaults, and use [`ignore_changes`](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle#ignore_changes) sparingly. Do not ask the agent to make the noise go away. It may happily change real configuration to silence a fake diff, so review every edit that gets the plan to zero.

One more expectation to set. This workflow is tuned for tens to low hundreds of resources, and beyond that, you should batch by the type of service, resource types, and plan around API rate limits during discovery.

The goal is a zero-change plan confirmed by an independent script. Then wire the repo into [Spacelift](https://docs.spacelift.io/concepts/policy/) or [GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions) so every change goes through a plan and a review instead of the console. Restrict human console write access at the same time, or the closet starts refilling with more skeletons the day you finish.

## Matching agent autonomy to operation risk

Not every operation deserves the same leash length. This table is how we scope it, distilled from our engineering survey.

| Operation type                              | Recommended agent autonomy                                      |
| ------------------------------------------- | --------------------------------------------------------------- |
| Read-only discovery and config extraction   | _High._ Let it run with read-only credentials                   |
| Writing verification and comparison scripts | _High._ The script itself is reviewable before it runs          |
| Generating TF from verified, extracted data | _Medium._ Human review required before merge                    |
| Module usage and refactoring                | _Medium._ Verify every input against the real module schema     |
| Import planning                             | _Low._ Agent drafts import blocks, human runs the plan          |
| `apply`, `destroy`, `state rm`, `state mv`  | _None_ without review. Agent must print exact commands and wait |
| Security and network changes                | _None_ without review. Diff every rule and reject broad CIDRs   |

The bottom rows are where failures are irreversible or silent. A lost state file has no undo. A security group opened to `0.0.0.0/0` works perfectly and complains to nobody, and we have seen both agents and deadline-pressured humans reach for it when exact CIDRs are unknown. Encode the rule so neither can.

## Practical guardrails for MCP-assisted IaC work

- Default MCPs and cloud credentials to read-only, granting write access per task and revoking it after. With the [AWS MCP server](https://github.com/awslabs/mcp/tree/main/src/aws-iac-mcp-server) this is two environment settings, with IAM staying the primary control:

  ```json
  {
    "READ_OPERATIONS_ONLY": "true",
    "REQUIRE_MUTATION_CONSENT": "true"
  }
  ```

- Prefer MCPs that show the underlying CLI or API call, and read those commands before approving them. Allow-list commands only after they earn it.
- Require the agent to print any mutating command, in full, before running it. Put this in your rules file rather than trusting yourself to remember. It is the difference between the lost-state story above and a non-event.
- Security-review any MCP server or generated tooling before first use. Not foolproof, but it filters obvious problems.
- Put verification scripts in the definition of done. Generated code without an independent check is a draft, not a deliverable.
- Encode narrow platform constraints in rules files up front. Where the acceptable space is narrow, such as CI/CD workflows or module interfaces, an open-ended prompt invites the agent to fill the gap with its own inventions. We learned this with GitHub Actions, where a rule that said "follow security best practices" got us mutable action tags. A rewrite spelling out the exact format (pin to a full commit SHA, never `@main` or `@latest`) removed the poor security practice.
- Keep static checks in the loop. `fmt`, `validate`, [tflint](https://github.com/terraform-linters/tflint), and [Trivy](https://github.com/aquasecurity/trivy) catch a class of problems before any human spends attention.

### Enforce it in the pipeline, not just the prompt

Rules files are advisory. An agent can ignore them, and a rushed human can bypass them. The guardrails that matter most belong in the deployment platform, where they are mandatory. E.g., in Spacelift, that is a [plan policy](https://docs.spacelift.io/concepts/policy/). This one rejects any plan that opens a security group to the world:

```rego
package spacelift

deny[msg] {
  rc := input.terraform.resource_changes[_]
  rc.type == "aws_vpc_security_group_ingress_rule"
  rc.change.after.cidr_ipv4 == "0.0.0.0/0"
  msg := sprintf("%s allows ingress from the entire internet", [rc.address])
}

deny[msg] {
  rc := input.terraform.resource_changes[_]
  rc.type == "aws_security_group_rule"
  rc.change.after.type == "ingress"
  rc.change.after.cidr_blocks[_] == "0.0.0.0/0"
  msg := sprintf("%s allows ingress from the entire internet", [rc.address])
}
```

A [conftest](https://www.conftest.dev/) step in GitHub Actions running the same Rego against plan JSON works too. Either way, the agent-opened-the-firewall failure mode dies in the pipeline, no matter who authored the change.

### Split the work across subagents

Claude Code and other modern harnesses support subagents, scoped sessions with their own context window, tools, and permissions. Three uses map onto this workflow.

Fan repetitive work out, one subagent per service. The Glue job failure surfaced around job five, and long sessions are where models drift from reading toward pattern-matching. A fresh subagent per service with identical instructions keeps every job consistent, because nothing depends on the model remembering job one while writing job twenty.

Start by separating permissions by role. The discovery agent only needs access to the read-only MCP, while the scaffolding agent can write to the repository but should not have cloud credentials. Neither should be able to run `apply` or interact with state. Once those boundaries are enforced in configuration, the autonomy model no longer depends on everyone remembering the rules.

It also helps to separate generation from verification. Before the code reaches a human reviewer, a clean-context subagent can compare the generated TF against the inventory and the actual module schemas. Because it starts from a fresh context, the verifier provides an independent second pass before human review.

These controls do add friction, so they should match the risk involved. They make sense for production state, IAM, and network changes, where a mistake can have a wide blast radius. For a disposable sandbox or a short-lived spike, the same level of process would probably be unnecessary.

## Reusable Agent Skill

We suggest packaging the workflow as a reusable skill so the agent follows the same inventory-first process and safety checks every time.

Keep your organization's repository and module conventions in companion rules or skills (depending on your AI framework), rather than in the migration skill itself. If you don't have any, our guides on [Terraform root module structure](https://masterpoint.io/blog/standard-tf-files/) and [root module sizing](https://newsletter.masterpoint.io/p/how-big-should-a-terraform-root-module-be) are a good starting point.

````markdown {copy=true collapse=true}
---
name: codify-clickops-iac
description: Safely codify existing manually-managed AWS infrastructure into Terraform/OpenTofu. Use when importing click-ops resources, migrating existing AWS resources into IaC, or generating TF from live infrastructure.
---

# Codify Click-Ops Infrastructure

Move existing AWS infrastructure into Terraform/OpenTofu without changing it.

The target is a **zero-unexplained-change plan backed by independent verification**. Treat live infrastructure as data to extract, not a pattern to infer.

## Assumptions

This skill assumes:

- AWS resources are accessible through read-only AWS MCP tools or equivalent APIs.
- A Terraform/OpenTofu MCP server is available for provider, module, and Registry documentation.
- The target Terraform/OpenTofu repository is available.
- The agent can read module source code.
- A human performs all cloud mutations, state operations, and applies.

This skill assumes the following companion skills or rules are available:

- **Repository structure** — defines the root module layout, required files, naming conventions, provider configuration, backend configuration, version constraints, tagging conventions, and project organization.
- **Module development** — defines how reusable modules are structured, documented, versioned, and consumed.

This skill focuses only on migrating existing infrastructure into Terraform/OpenTofu. It relies on the companion skills to determine _how the repository and modules should be organized_.

## Safety boundary

Cloud access is read-only.

Never run:

- `terraform apply` / `tofu apply`
- `terraform import` / `tofu import`
- `terraform state *` / `tofu state *`
- `destroy`
- Any AWS mutation

A human owns all cloud and state mutations.

Never broaden IAM or network access to make a resource work.

## 1. Inventory

Start from the seed identifiers you are given (for example, a single ECS service ARN) and expand outward to the full set of related resources before inventorying anything. Do not assume the scope is limited to the resources explicitly named.

From each seed, follow its references and associations to discover the resources it depends on or that depend on it, for example:

- An ECS service pulls in its task definitions, IAM task/execution roles, security groups, target groups and load balancer listeners, autoscaling targets and policies, CloudWatch log groups and alarms, ACM certificates, and service discovery entries.
- Resolve each discovered resource's own references recursively until the graph stops expanding, then de-duplicate.

Record how each resource was reached (which seed and which reference) so the scope is auditable, and confirm the expanded set with the human before continuing. Missing a related resource here is the most common way an import leaves infrastructure half-managed.

Then inspect every resource in the expanded scope and write its configuration to `./inventory/`, one YAML file per resource.

Capture all configuration needed to reproduce the resource, including:

- IDs
- Names
- ARNs
- Tags
- IAM configuration
- Networking
- Service-specific settings
- References to secrets

Record values exactly as returned by AWS.

Rules:

- Do not normalize legacy names or paths.
- Do not infer missing values.
- Represent unavailable values as `null`.
- Never write secret values; record only references such as Secrets Manager ARNs.

Do **not** generate Terraform yet.

Before continuing, compare the inventory against live AWS and resolve any missing or unexplained values.

## 2. Scaffold

Generate Terraform/OpenTofu using the verified inventory as the source of truth.

Follow the repository's existing structure and conventions.

Before using an existing module:

- Read its actual interface from source (`variables.tf`).
- Only use inputs it exposes.
- If the required capability is missing, report it instead of inventing an input.

Preserve the existing infrastructure exactly unless explicitly instructed otherwise, including:

- Resource names
- Filenames
- Paths
- IDs
- IAM permissions
- Network rules
- Encryption
- Logging
- Public/private exposure

Prefer the smallest implementation that accurately represents the infrastructure.

Run non-mutating validation:

```bash
tofu fmt -check
tofu validate
tflint
trivy config .
```

Fix problems in the code — never by changing live infrastructure.

## 3. Prepare imports

Create declarative `import` blocks using the real resource IDs from the inventory.

Write all `import` blocks to a dedicated `imports.tf` file, one block per resource, so imports live in a single reviewable place and are easy to remove after the import is complete. Do not scatter them across resource files.

Check every import address and ID carefully, especially IDs containing quotes, commas, indexes, or other escaping.

Expect the first `plan` to fail. Each provider has its own required import ID format (for example, the AWS provider expects specific composite ID shapes per resource type), so the initial IDs are often wrong. This is normal: feed the exact error back in, correct the ID format in `imports.tf`, and re-plan until the IDs resolve. Iterating on these errors is part of the process, not a sign the workflow failed.

Do **not** execute Terraform. The human will review the plan and perform the normal `plan`/`apply` workflow.

Provide the exact commands for the human to run.

## 4. Review the plan

The Terraform/OpenTofu plan answers one question:

> **Will importing these resources introduce unintended infrastructure changes?**

The expected result is:

- No destroy
- No replacement
- No unexplained functional changes

Expected metadata drift (for example, agreed tag updates or provider normalization) may be acceptable. Explain every remaining diff before modifying the code.

Do **not** make the plan green by changing real infrastructure.

Continue only when every remaining change is understood and intentional.

## 5. Verify independently

The verification script answers a different question:

> **Does the generated Terraform/OpenTofu actually describe the live infrastructure?**

Write a read-only verification script that compares live AWS configuration against the inventory and generated Terraform, attribute by attribute.

Do not reuse assumptions made while generating the Terraform.

Report mismatches like:

```text
<resource>  <attribute>  MISMATCH
  expected: <value>
  live:     <value>
```

Exit with a non-zero status when mismatches exist.

## Completion checklist

Before declaring success, confirm:

- Every module input exists in the real module interface.
- Names, paths, filenames, and IDs match the inventory.
- Security posture is no weaker than the original.
- Imports use declarative `import` blocks.
- The human-reviewed plan contains no unexplained changes.
- Inventory and Terraform contain no secret values.
- The verification script passes.
- Static validation passes.

Generated IaC is not complete until both the plan and independent verification succeed.
````

## Checklist before merging AI-generated IaC

Run this on every PR where an agent wrote the code. It is a short review, and every item on it traces back to a failure we have hit.

- Every module input exists in the module's actual `variables.tf`, checked against source, not the agent's word
- Resource names, filenames, and paths match the extracted inventory, not a "standard" pattern
- Security posture is no looser than what the inventory documents: no broadened network rules or IAM policies, no wildcard principals or actions, no publicly exposed endpoints or storage, no weakened encryption or logging settings
- Imports use declarative import blocks, reviewed in the diff, not `state` commands run from a terminal
- `plan` output reviewed by a human, with zero unexplained changes or destroys
- Inventory files and generated TF contain no secret values, only references to where secrets live, since [secrets land in state in plain text](https://docs.aws.amazon.com/prescriptive-guidance/latest/secure-sensitive-data-secrets-manager-terraform/terraform-state-file.html)
- Verification script exists, ran against live infrastructure, and passed
- `fmt`, `validate`, tflint, and a security scanner ran clean
- The agent's session used read-only cloud credentials, and any write action was executed by a human
- Someone who did not prompt the agent reviewed the PR

## Codify click-ops without handing AI the keys

Click-ops infrastructure is not a moral failing. It is what happens when teams move fast, and every company has some. The real mistake is asking an AI agent with admin credentials and a vague prompt to codify it. The result is polished-looking code that reflects the agent's assumptions rather than your infrastructure.

The pattern that works is older than AI: treat untrusted input with narrow interfaces and independent verification. AI accelerates extraction, scaffolding, and validation, but it doesn't change the fundamentals.

Start with one resource group, read-only credentials, and the Agent Skill above. And if you want a second set of eyes on the result or you want to do this at scale, our [IaC audits](https://masterpoint.io/services/) exist for exactly this. 👋
