---
visible: true
draft: false
title: "Using AI Verification and Fix Loop for IaC (Terraform, OpenTofu, Pulumi)"
author: Yangci Ou
date: 2026-10-20
slug: ai-verification-fix-loop-iac
description: "Let AI agents read Terraform, OpenTofu, and Pulumi plans, compare them with what you asked for, and fix unexpected changes before asking for review."
tags:
  [
    "terraform",
    "opentofu",
    "pulumi",
    "infrastructure-as-code",
    "ai",
    "spacelift",
  ]
image: /img/updates/ai-verification-fix-loop-iac/ai-verification-fix-loop-iac.png
callout: <p>👋 <b>If you're ready to take your infrastructure to the next level, we're here to help. We love to work together with engineering teams to help them build well-documented, scalable, automated IaC that make their jobs easier. <a href='/contact/'>Get in touch!</a></p>
---

The cheapest part of [Infrastructure as Code (IaC)](https://aws.amazon.com/what-is/iac/) today, is the code generation. Agents from frontier AI models are opening pull requests on platforms like GitHub faster than reviewers can keep up. But with infrastructure, even a small change can replace a database or cut off an application's access to it, so each change needs to do only what we intended.

CI/CD already runs the plans and posts the results on pull requests. You read them, spot an unexpected replacement that would cause downtime or an error that blocks the plan, and send the output back to the agent. The agent fixes the code and pushes again. You wait for CI, read the new plans, and paste back the next problem.

A verification and fix loop lets the agent read those same results, compare them with what you asked for, and correct its own mistakes before requesting review. You define the intended outcome; the agent checks each revision against it. As Anthropic's [Claude Code documentation](https://code.claude.com/docs/en/best-practices#give-claude-a-way-to-verify-its-work) puts it, the agent “stops when the work looks done. Without a check it can run, ‘looks done’ is the only signal available, and you become the verification loop: <u>**every mistake waits for you to notice it**</u>.” Anthropic recommends giving the agent a pass-or-fail result so it can test its changes, inspect the feedback, and keep correcting the work until the check passes.

In application development, we expect a coding agent to run tests, read failures, and fix the code before asking for review. That expectation should carry over to infrastructure work.

![Without a check, you carry each failed plan back to the agent. With a fix loop, the agent runs the check itself and returns a PR for review.](/img/updates/ai-verification-fix-loop-iac/manual-vs-agent-verification-loop.svg)

## Importing a Hand-Built AWS Application Load Balancer Into Terraform

A common example is bringing [ClickOps](/blog/terraform-opentofu-terminology-breakdown/#clickops) infrastructure into Terraform. Say I want to manage a hand-built ALB and its related infrastructure with Terraform without changing how it runs. I use [import blocks](https://developer.hashicorp.com/terraform/language/import) and write resource code that matches the live infrastructure on AWS. The only agreed AWS changes are the additional `ManagedBy` tags. In this example, the first plan proposes replacing a target group because its name in the code differs from the live name, so the agent reads the plan and corrects the name. The next plan would change the ALB's `idle_timeout` because the code leaves it at the default value, so the agent sets it to the existing value. The final plan contains the seven expected imports and only the agreed tag changes, with nothing created or destroyed, so it's ready for review.

![An agent imports a live ALB over three Spacelift proposed runs: a target group replacement, then an idle_timeout change, then a plan with only the agreed ManagedBy tag changes.](/img/updates/ai-verification-fix-loop-iac/import-attempts.svg)

## Refactoring 14 Security Groups Into a Shared Terraform Module

I can also use a loop to refactor a Terraform module without changing live infrastructure. Here, we want to move 14 security groups from the root module into a shared child module. We use [`moved` blocks to refactor the modules](https://developer.hashicorp.com/terraform/language/modules/develop/refactoring), mapping the old state addresses to the new ones (e.g. `module.security_groups.aws_security_group.this["alb"]`). In this example, the first Terraform plan proposes recreating some groups because their destination addresses are wrong, so the agent reads the plan and corrects the mappings. The next plan would remove an existing tag, which we don't want, so the agent preserves it in the module. The final plan shows all 14 expected address moves and no live resource changes, ready for review.

![An agent refactors 14 security groups into a shared module over three Spacelift proposed runs: wrong moved addresses, then a dropped tag, then 14 moves with no resource changes.](/img/updates/ai-verification-fix-loop-iac/refactor-attempts.svg)

## What a Plan Can't Prove: Applying in a Sandbox Account

A plan can show the expected security group rule and still leave an application unable to reach its database. To verify that behavior, apply the change in a separate sandbox account and run a check from the application environment.

For an ECS task timing out against RDS, [VPC Reachability Analyzer](https://docs.aws.amazon.com/vpc/latest/reachability/how-reachability-analyzer-works.html) can identify blocking network configuration. Create a path between the relevant network interfaces for TCP port `5432`, start an analysis, and wait for its status to become `succeeded`. Then inspect `NetworkPathFound` and `Explanations`.

A `false` result with a blocking security group gives the agent a specific failure to investigate. It fixes the HCL, applies in the sandbox, and reruns the analysis within the permitted change scope.

## Define the Verification and Fix Loop in Repository Instructions and Agent Skills

Run the usual formatting, validation, linting, and security checks first. Our [CI checklist post](/blog/terraform-opentofu-ci-checklist/) covers the setup.

A completed plan can still propose changes outside the request. The agent should compare it with the definition of done, checking both what should change and what must stay the same, so use the planning workflow your organization permits and retrieve the actual plan. Where local planning is allowed, the agent can read Terraform or OpenTofu plans, or Pulumi previews, directly. Some organizations require plans to run through approved CI/CD systems such as GitHub Actions, or infrastructure automation platforms such as Spacelift, HCP Terraform (formerly Terraform Cloud), or Atlantis. In that case, the agent pushes a change, waits for the run, and fetches its output through an available MCP integration, API, or CLI. The [Spacelift MCP](https://docs.spacelift.io/concepts/intelligence/spacelift-mcp) provides one way to read proposed runs and their logs.

The agent can read the plan as text or use its [JSON representation](https://opentofu.org/docs/internals/json-format/). If it finds an error or an unexpected change, it uses that feedback to revise the code and check again. The original requirements stay fixed through those retries; the agent should not hide differences or weaken the check to get a passing result.

Put the shared rules in repository instructions such as `CLAUDE.md` or `AGENTS.md`, and the reusable loop in an agent skill. A verification and fix loop means making a change, running or waiting for a check, reading the result, and trying again until the result matches the requested change or the agent needs human input. It needs four things:

1. A measurable definition of done.
   - For a module refactor, that might be zero cloud resource changes and 14 expected address moves.
   - For a connectivity fix, it might be one new security group rule followed by a successful database query from the application, or a successful `curl` request from within the VPC.
   - For importing live infrastructure into Terraform or OpenTofu, expect the imports with no changes to the existing AWS resources, except any explicitly agreed updates, such as tags. The resources become managed through IaC without being recreated or reconfigured beyond those tags.
2. Outputs the agent can access and read. The agent fetches the plan output and logs for the current commit through one of the workflows above and compares them with the expected result to decide what needs fixing.
3. Permissions & guardrails that block production applies. The agent can read production plans, but any apply needed to validate behavior must run in a separate sandbox account. Its credentials must not allow it to apply changes in production.
4. A clear handoff. Require the agent to return the evidence when the checks pass or explain the blocker when it needs human input.
   - Stop after a number of attempts of the same result (e.g. 5 attempts and still the same bad output) to prevent the agent from burning tokens or working around the problem, such as adding `ignore_changes`, which tells Terraform to stop reconciling the listed attributes so an unexpected change disappears from the plan without being fixed.

![You define done, the agent edits the code, runs the check with scoped credentials, reads the result, and either opens a PR with evidence, retries, or reports a blocker that needs human input.](/img/updates/ai-verification-fix-loop-iac/fix-loop.svg)

For example, with minimal permissions the agent can only open PRs for the code, read runs through the Spacelift (or another infrastructure automation platform) MCP, read AWS, and apply only in sandbox accounts.

![The agent's four credentials: a read-only role for planning against AWS production, a Spacelift MCP token with mcp:read, a GitHub identity that can push and open PRs, and an apply role limited to the AWS sandbox account.](/img/updates/ai-verification-fix-loop-iac/agent-access.svg)

Here’s one way to write these instructions for a repository using Spacelift. Adapt the definition of done, how the agent reads results, and its permissions to your own repository and deployment workflow.

```markdown {copy=true collapse=true}
---
name: tf-verify-spacelift
description: Verify Terraform/OpenTofu changes in this repo through Spacelift.
---

Define the intended outcome, what must stay unchanged, and the checks that will
confirm success. If any of these are unclear, ask the user before proceeding.

After each push, use the Spacelift MCP to find the proposed run for the correct
stack and latest commit. Wait for the plan, read its output, and compare it with
the agreed result.

Fix the underlying cause of errors or unexpected differences without skipping
checks or hiding changes, then push again. Keep using the Spacelift MCP to check
each new run until the plan matches the agreed result. Keep the acceptance
criteria unchanged.

Stop and ask for help if the same error or unintended plan output remains after
five attempts, or if you are blocked by something that requires human input.
Explain the blocker, what you have tried, and link the relevant runs.

When the plan matches the agreed result, return the run URL, commit, a short
comparison of expected and actual changes, and anything the plan cannot prove.

Never trigger, confirm, or discard runs; never apply; never modify state
directly; never merge; never widen access; never add ignore_changes to make the
plan pass.
```

For GitHub Actions, replace the Spacelift instruction with reading the matching workflow run through `gh`, and prohibit edits to workflows or branch protection. Adapt the result-fetching instruction for HCP Terraform, Atlantis, or another platform.

This could go into the prompt for anything ad-hoc as well, as long as you give it the definition of done and how to verify against it, with properly scoped least-privilege permissions.

A [Stop hook](https://code.claude.com/docs/en/hooks#stop) can also require a verification script before completion, rather than instructions in a skill that could be skipped over.

## What the Agent Hands Back and the Human Still Reviews

The agent hands back a Pull Request with the code and explains the expected versus actual changes and includes any required behavior-test results. It also describes the unexpected changes it found and corrected, along with anything still unverified. If it is blocked, it returns the specific problem, what it tried, and the relevant runs.

The human still reviews the code and final plan, confirms that the acceptance criteria cover the intended change, and checks any gaps in runtime verification. A passing sandbox test covers the tested environment; the production deployment still needs its own reviewed plan and checks.

At Masterpoint, we expect the agents to review infrastructure plans to ensure they match what we intended and review them ourselves first before asking another engineer / teammate for review.
