---
visible: true
draft: false
id: iac-five-years
title: "Will We Still Be Dealing With Infrastructure as Code in Five Years?"
metaTitle: "Will We Still Be Dealing With Infrastructure as Code in Five Years?"
author: James Edison
slug: infrastructure-as-code-in-five-years
date: 2026-09-30
description: "Infrastructure as code is likely to remain part of that work, with agents taking on more of the writing and operation."
image: /img/updates/infrastructure-as-code-in-five-years/infrastructure-as-code-in-five-years-og-1200x628.png
preview_image: /img/updates/infrastructure-as-code-in-five-years/infrastructure-as-code-in-five-years-card-800x800.png
og_img: /img/updates/infrastructure-as-code-in-five-years/infrastructure-as-code-in-five-years-og-1200x628.png
hide_hero: true
image_alt: "Masterpoint title graphic: Will We Still Be Dealing With Infrastructure as Code in Five Years?"
---

Making infrastructure changes repeatable takes work. Teams build shared modules, establish review processes, and document decisions so the next engineer can understand what’s running and change it safely.

AI agents are changing how some of that work gets done. They can already generate Terraform, and tools like Spacelift Intent can provision infrastructure without writing Terraform configuration first. For teams that have invested in infrastructure as code (IaC), that raises a practical question: how much of what they’ve built will they still need in five years?

IaC is likely to remain part of that work, with agents taking on more of the writing and operation. Even when an agent writes the configuration or provisions a resource, the team still needs to understand the system and decide how to change it.

## Generating code leaves plenty of work to do

The familiar IaC workflow is to write code, plan against the current infrastructure, review the proposed changes, and apply them. Generating the code faster helps with one part of that process. It doesn't tell you whether your module boundaries make sense or whether an engineer can reasonably review the resulting plan.

At Masterpoint, we've seen teams that are deeply comfortable with AI still struggle with those problems. During Masterpoint’s [engagement with Cursor](https://masterpoint.io/case-studies/cursor/), slow infrastructure plans were getting in the way of an engineering organization that already moved quickly with agents. Masterpoint broke up Cursor’s monolithic Terraform architecture and embedded architectural guidance in agent skills and rules.

These tools change what agents can do within an infrastructure workflow, and what the team still needs to maintain.

## Four approaches to changing infrastructure work

These four tools span a spectrum. Stategraph makes existing infrastructure easier for agents to query and operate. Infracodebase improves IaC generation with organizational context and guardrails. Swamp introduces a new IaC model designed for agents. Spacelift Intent lets agents provision infrastructure through provider operations before any Terraform configuration is written. Each tool handles a different part of the job. Which one is useful depends on what your team needs.

<picture>
  <source media="(max-width: 600px)" srcset="/img/updates/infrastructure-as-code-in-five-years/four-approaches-to-iac-mobile.svg">
  <img src="/img/updates/infrastructure-as-code-in-five-years/four-approaches-to-iac.svg" alt="Comparison of Stategraph, Infracodebase, Swamp, and Spacelift Intent showing the infrastructure work each changes and whether IaC stays, changes form, or comes later.">
</picture>

### Stategraph: make state easier for agents to query and operate

[Stategraph](https://github.com/stategraph/stategraph) targets a problem familiar to teams with large Terraform or OpenTofu states: unrelated changes can compete for the same state lock. Its database engine represents state as a [dependency graph in PostgreSQL](https://stategraph.com/how-stategraph-works), uses resource-level locking, and scopes planning to the affected subgraph. Terraform or OpenTofu still executes the infrastructure changes.

Its graph makes state queryable, while smaller planning scopes address the cost of operating on large states. Teams can keep their HashiCorp Configuration Language (HCL) code while evaluating a different state architecture underneath it. Stategraph supports agent workflows without generating code itself.

### Infracodebase: give generation organizational context

[Infracodebase](https://infracodebase.com/docs/getting-started/introduction) keeps IaC as the output and provides an agent environment around it. Its configuration includes organization-level [rulesets](https://infracodebase.com/docs/enterprises/rulesets) and [workflows](https://infracodebase.com/docs/enterprises/workflows), with additional settings for individual workspaces.

The guardrails around generation are central to this approach. A request to create a database doesn't contain everything your organization knows about how databases should be deployed. The agent needs the relevant naming conventions, security requirements, and established patterns. Giving it that context helps it work within your organization's practices, while checks on the generated changes still need to enforce those requirements.

### Swamp: build a new IaC model for agents

[Swamp](https://github.com/swamp-club/swamp) is a CLI for building operational workflows with agents. An agent writes a YAML definition specifying inputs such as a region or network range. A [model type](https://swamp-club.com/manual/explanation/models-types-and-methods) supplies the code that performs the operation. Those definitions and workflows live in a repository where people can inspect them.

A workflow can call a model’s named methods and [pass their recorded outputs into later steps](https://swamp-club.com/manual/reference/workflows). The team can inspect the operations and how they connect, including workflows that an agent creates.

### Spacelift Intent: provision first, then move into IaC

[Spacelift Intent](https://spacelift.io/platform/intent) lets an MCP client [request operations through Terraform providers](https://docs.spacelift.io/concepts/intelligence/intent) without first writing Terraform or OpenTofu files. In Spacelift's managed platform, those operations have access controls, policy governance, state management, and an audit trail. The resulting infrastructure can later be [exported to code and brought into an IaC workflow](https://docs.spacelift.io/concepts/intelligence/intent/intent-to-iac).

This approach is useful for prototypes and sandboxes. A team can explore an idea, then bring the infrastructure into an IaC workflow when it needs to maintain it. Exporting code is a useful step in that transition. The team still needs to decide how the configuration fits its modules, environments, and review process.

## Teams still need to reason about infrastructure together

IaC is likely to persist, even as its languages and tools change. Versioned infrastructure code gives a team a specific change to review and a definition it can reuse across environments. Those benefits remain when an agent writes the code. Other representations may eventually serve the same purpose, but teams already have an established way to preserve and review infrastructure decisions through IaC.

> **A hypothetical example**
>
> Let’s consider a production database. Knowing that it exists, and having a record of who created it, gives the next engineer part of the picture. They also need to understand its relationships, which settings are deliberate, and how to create the corresponding database in another environment. A reviewed module, its inputs, and the explanation accompanying a change can preserve that information for the team.

Code alone doesn't record every decision. Commit messages, pull requests, and documentation still have a job. Together, they give engineers a shared place to inspect what the system is supposed to do and why somebody changed it. That becomes especially useful when the person reviewing a change didn't write its first version.

## What changes for platform teams

Four changes are likely to shape platform engineering over the next few years:

1. More of the job will involve writing down how your organization builds infrastructure so agents can follow those practices. Our modules, examples, documentation, rules, and skills need to make clear how we expect infrastructure to be built. That gives an agent useful patterns to follow when it starts a change.

2. Proofs of concept and sandboxes will also get faster to create. Tools like Intent let teams provision infrastructure while exploring an idea, then bring it into IaC as they need repeatable environments and a workflow for maintaining it.

3. Existing IaC tools will likely respond to the ideas emerging around them. Stategraph's approach to state and Swamp's approach to agent-driven workflows show that there is room to change how these systems work. When evaluating those tools, platform teams should look at how much infrastructure a change requires them to plan, whether unrelated changes block one another, and how agents inspect state and execute operations.

4. Guardrails become increasingly important as agents do more of the work. Platform teams need to define which operations an agent can perform and enforce the organization's policies at the relevant stages of a change. Open Policy Agent (OPA) is one tool worth learning for that work.

In five years, teams will likely still use IaC, even as agents write more of it and new tools change how infrastructure gets provisioned. Well-structured modules, documented decisions, and enforceable policies are useful investments today: they help engineers review changes and give agents clearer instructions and limits.

If your team needs help preparing its IaC platform for agent workflows, [get in touch with Masterpoint](https://masterpoint.io/contact/).
