---
visible: true
draft: false
title: "AI Meets Terraform: Prompt Strategies for Test Generation"
author: Weston Platter
slug: ai-meets-tf-prompt-strategies-for-test-generation
date: 2025-08-14T00:00:00.000Z
description: We share our experience developing an LLM prompt for Cursor and Claude Code to write meaningful Terraform tests. We describe various experiments, highlight strategies for crafting "durable prompts", and share the <a href="https://github.com/masterpointio/shared-prompts/blob/main/rules/tf-testing-child-module.mdc">prompt’s final version</a> in Masterpoint's <a href="https://github.com/masterpointio/shared-prompts">shared-prompts</a> GitHub repo.
image: /img/updates/ai-meets-tf-prompt-strategies-for-test-generation/yang-weston-woodworking-robotic-arm.png
---

> TLDR: We crafted an [LLM prompt](https://github.com/masterpointio/shared-prompts/blob/main/rules/tf-testing-child-module.mdc) to generate Terraform tests, and shared it in our [shared-prompts](https://github.com/masterpointio/shared-prompts) GitHub repo. If you're looking for the list of things that worked for us, jump to the [Takeaways for Durable Prompts](#takeaways-for-durable-prompts) section. If you want to learn how we got there, read on.

## Table of Contents

- [Why AI for IaC?](#why-ai-for-iac)
- [Our AI Toolkit for IaC](#our-ai-toolkit-for-iac)
  - [AI-Enhanced IDE](#ai-enhanced-ide)
  - [Terminal-Based AI Coding](#terminal-based-ai-coding)
  - [We’re still experimenting with MCPs for Code Gen](#were-still-experimenting-with-mcps-for-code-gen)
- [Our exploration in Writing Terraform Tests with AI](#our-exploration-in-writing-terraform-tests-with-ai)
  - [v0 – Cursor Auto Model](#v0--cursor-auto-model)
  - [v1 – Claude Code using Sonnet-4](#v1--claude-code-using-sonnet-4)
  - [v2 – Cursor Sonnet-4 Refined Prompt](#v2--cursor-sonnet-4-refined-prompt)
  - [v3 – Applying the Refined Prompt to Other Codebases](#v3--applying-the-refined-prompt-to-other-codebases)
- [Takeaways for Durable Prompts](#takeaways-for-durable-prompts)
- [Prompt for Generating Terraform Tests in Child-Modules](#prompt-for-generating-terraform-tests-in-child-modules)
- [Credits](#credits)

<br>

## Why AI for IaC?

We previously [wrote about Model Context Protocol (MCP)](https://masterpoint.io/blog/using-mcps-to-run-terraform/), exploring how you can use AI to run Terraform `plan` and `apply` operations. Since then, we've been experimenting with the [GitHub](https://github.com/github/github-mcp-server), [Context7](https://github.com/upstash/context7), and [AWS](https://github.com/awslabs/mcp) MCPs, Cursor, Claude Code, and a few Software Engineering (SWE) Agents. We’re in the process of integrating AI into our team’s workflows as an Infrastructure as Code (IaC) consulting company. One place that it’s proven especially valuable is using curated LLM prompts to write tests for Terraform child modules.

Threads across [GitHub](https://github.com/dotnet/runtime/pull/115762) and [Reddit](https://www.reddit.com/r/Terraform/comments/1l7my1x/where_is_ai_still_completely_useless_for/) have shown how AI-generated code can be subpar 😂

As a team, we’ve embraced a paradoxical approach: stay grounded in solid software engineering principles and curiously step into the "Ironman suits" that generative LLMs have to offer (Karpathy's [Software 3.0 talk](https://youtu.be/LCEmiRjPEtQ?si=gSQ-viGAArtHt8G-&t=1642) at YC). As a result, we've developed new best practices and refined LLM prompts or Cursor Rules that help us as a team complete chunks of work more efficiently.

In this post, we’ll share some of the AI code gen strategies that have worked as we write Terraform tests for child modules. These "durable prompts" provide DevOps and Platform Engineering teams with concrete "Infrastructure as Code AI" actions they can try on any Terraform codebase.

## Our AI Toolkit for IaC

We've experimented with a handful of AI tools to evolve our development workflow. While our specific tool set might differ from yours, the AI code generation strategies we'll share should apply broadly to teams, regardless of their tech stack.

### AI-Enhanced IDE

[**Cursor**](https://cursor.sh/) - We primarily use Cursor, an IDE with embedded AI features like smart suggestions, completions, and in-editor agent workflows ([Agent Mode](https://docs.cursor.com/agent/modes#agent)). One of its standout features is [Cursor Rules](https://docs.cursor.com/context/rules). Users can create prompts or rules and reference these rules when asking Cursor to autonomously complete tasks. For example, a company creates and distributes a Cursor rule containing their AWS naming and tagging strategy. Developers can then ask Cursor to review their git diff and ensure modified Terraform resources comply with the naming and tagging conventions.

Similar alternatives: GitHub Copilot in VS Code, JetBrains AI Assistant, or WindSurf

### Terminal-Based AI Coding

[**Claude Code**](https://www.anthropic.com/claude) \- A command-line AI coding assistant that allows us to describe complex coding tasks in natural language directly from the terminal. This tool excels at understanding broader project context and generating complete solutions without the constraints of an IDE interface.

Similar alternatives: [Aider](https://github.com/Aider-AI/aider), [OpenCode](https://github.com/opencode-ai/opencode), (this list changes almost weekly)

### We’re still experimenting with MCPs for Code Gen

Notably missing from our workflow is the use of Model Context Providers (MCPs). While tools like [Context7](https://context7.com/) offer broader code context, we found that well-crafted prompts yielded better results than relying on MCPs to inject external docs or metadata.

## Our exploration in Writing Terraform Tests with AI

Before we dive into the nuts and bolts, let’s set some context. When Yang (one of the Masterpoint team members) created [`terraform-aws-identity-center-users`](https://github.com/masterpointio/terraform-aws-identity-center-users), a new Terraform child module, we [open-sourced](https://masterpoint.io/blog/why-open-source-iac-wins/) it and decided to add tests because that is how we can enforce quality and consistency long term.

Given the module had a limited feature scope, only used one provider (AWS), and Yang had recently worked with the code, we saw this as an opportunity to create an AI-assisted workflow for writing Terraform tests.

We started by defining Acceptance Criteria for the work, regardless of whether it was done by a human or an AI. We wanted to:

- **Add basic tests** – Set up basic TF testing that works for both [Terraform](https://developer.hashicorp.com/terraform/language/tests) and [OpenTofu](https://opentofu.org/docs/cli/commands/test/) to ensure current and future changes are validated before going into production.
- **Test variable inputs** – confirm required `variable` fields are enforced and invalid values are caught early.
- **Add basic happy paths** – cover the expected usage scenarios defined in `main.tf`.
- **Probe edge cases** – write tests that intentionally stretch the limits of what we expect the module to handle or target known failure modes and regressions.

### v0 – Cursor Auto Model

So with the Acceptance Criteria in hand, we opened up Cursor in the child module repo, and directed the Cursor’s Agent Mode to write tests for the module.

> Write Terraform tests ([https://developer.hashicorp.com/terraform/language/tests](https://developer.hashicorp.com/terraform/language/tests)) for this Terraform module.

{{< lightboximg "/img/updates/ai-meets-tf-prompt-strategies-for-test-generation/v0-prompt-cursor.png" "v0 – Cursor Auto Model prompt" >}}

Since our prompt didn’t specify how we wanted the tests structured, or what the tests should focus on, the AI responded with a scattered mess of half-baked code. Yang had to go back and forth revising small parts to get a simple test working.

Here’s where things fell apart:

- **Wrong test file layout**: It dropped the test files into the root of the repo instead of a `/tests` directory. To be fair, we hadn’t told it our preference, but this showed the model lacked sensible defaults.
- **Broken test scaffolding**: After adding a `tests/` folder, the model created a new `main.tf` and tried to expose `locals` through outputs—patterns that go against standard Terraform testing practices.
- **Fallback behavior**: Realizing the model didn’t seem to understand testing strategies, Yang passed it a URL for the Terraform test docs. Even then, it ignored the guidelines and continued using its own interpretation.

**Takeaway:** This combo of Cursor \+ a generic v0 prompt didn’t produce valuable code. While it eventually got something running, it needed significant human cleanup and couldn’t be trusted to scaffold usable tests on its own.

### v1 – Claude Code using Sonnet-4

After running into the limitations of Cursor’s default model, we decided to switch tools and try Claude Code, a terminal-based AI coding assistant that runs Sonnet-4 under the hood.

We wondered if Cursor was better suited at making small edits, but not generating large, structured outputs from scratch. Claude Code, in contrast, had previously shown strength at understanding broader code context and generating full files from prompts.

We passed it the same prompt,

> Write Terraform tests ([https://developer.hashicorp.com/terraform/language/tests](https://developer.hashicorp.com/terraform/language/tests)) for this Terraform module.

Out of the box, Claude Code did significantly better:

- It generated clearly named test files: `complex.tftest.hcl`, `edge_cases.tftest.hcl`, and `locals.tftest.hcl`.
- Test files were placed in the correct `/tests` directory.
- The test logic reflected an understanding of Terraform’s test lifecycle and how locals/variables should be handled.

It wasn’t perfect. We still had to prompt the model to reorganize some sections of the code and refactor test input, but the overall quality aligned with our expectations.

To capture this feedback for future use, Yang applied a common vibe-coding strategy. He asked Claude to reflect on his feedback and create an improved prompt to generate Terraform tests. We wanted to operate from a more developed structural base as we iterated on a reproducible AI-driven workflow.

**Takeaway:** Model quality matters. Claude’s Sonnet-4 significantly outperformed the model Cursor selected using “Auto Model” for structured code generation. While it still needed human review, the code layout and basic tests aligned with our goals.

### v2 – Cursor Sonnet-4 Refined Prompt

At this point, we had learned that the underlying AI model matters, and using a descriptive prompt really helped. We also carried forward the LLM prompt Claude Code generated for us in the last step. We now wanted to see if Cursor could get to the same spot as Claude Code if we passed in the refined prompt from the last step.

We jumped back into Cursor and gave it the more thoughtful, specific LLM prompt and configured Cursor to use the same Sonnet-4 LLM model. The prompt spelled out key structural decisions that we had previously assumed the AI would “figure out”:

- Where to place the tests
- How to mock Terraform providers
- How to structure test inputs and share data across files
- How to test `locals` without exposing them via outputs

The results matched Claude Code’s quality, but now with added convenience. Working within Cursor gave us the ability to quickly review, tweak, and regenerate code in context, which sped up iteration time.

**Takeaway:** Intelligent model \+ refined prompt \+ repo context \= solid AI pairing. Claude (Sonnet-4) performed well again, and Cursor made it easier to integrate the output into our workflow.

### v3 – Applying the Refined Prompt to Other Codebases

By this point, Yang and I had learned how to direct an LLM with a structured prompt to generate tests that mirrored what we'd write ourselves. In my view, this was the moment we crossed from "vibe coding" into actual software engineering through prompting. It wasn’t zero-shot prompt magic tricks and rolling of the dice anymore. We had a well-thought-out prompt generating decent Terraform tests in at least one repo.

Zooming out for a second … LLMs are random functions that transform input into output. In this case, we’re transforming a prompt and the code into Terraform/OpenTofu tests. We can fine-tune the prompts we pass into LLMs to yield higher quality outputs, but using an LLM means using a semi-random process (how random also depends on the LLM’s temperature parameter). Given this non-deterministic behavior, you have the opportunity to re-run operations multiple times and get different results. We see this as a huge value-add if you want to ask an LLM to write three Terraform tests three different times, compare the nine different tests, and then select the top two or three for your use case.

Our next step was to test out the refined prompt on other child modules. I continued using Cursor (and Sonnet-4) in Agent Mode to generate tests for two other modules, [`terraform-datadog-users`](https://github.com/masterpointio/terraform-datadog-users) and [`terraform-secrets-helper`](https://github.com/masterpointio/terraform-secrets-helper/),

{{< lightboximg "/img/updates/ai-meets-tf-prompt-strategies-for-test-generation/v4-prompt.png" "v4 – Cursor Auto Model prompt" >}}

<br/>

The results were promising. The LLM correctly created a `tests` folder, placed new test files in there, wrote 2–3 starter tests, and attempted to reduce code repetition through shared variables.

- Terraform Datadog Users – [PR \#12](https://github.com/masterpointio/terraform-datadog-users/pull/12)
- Terraform Secrets Helper – [PR \#17](https://github.com/masterpointio/terraform-secrets-helper/pull/17)

Even though the code was helpful, Yang and I still needed to be actively involved.

While reviewing the tests for the Terraform Secrets Helper module, Yang and I noticed the LLM didn’t fully understand the module’s scope and purpose, as it generated 160 lines of superficial tests. Thankfully, we refactored the tests to create meaningful test coverage for the next engineer to make changes.

If, however, we had blindly merged the sloppy and confusing code, the module would have still worked in production, but the codebase would be less readable and harder to maintain. This is an example of how human review and refactoring still play a crucial role when adding AI to development workflows. The final version of your code needs to be clear, concise, and easily readable in order for a team of engineers to use it in production and maintain it long term.

## Takeaways for Durable Prompts

To summarize where Yang and I started from and where we ended up, we began with a naive and simple prompt, and iterated on the prompt until we felt comfortable with the overall quality of the AI-generated test code. We observed that clear and specific prompt instructions, combined with a state-of-the-art LLM model, made a significant difference. We then tried using the prompt within a few other child-module repos to establish Terraform test coverage.

The final version of the prompt (cursor rule) is up on GitHub in our open-source LLM prompts repo. Please try it out and share feedback from your experience!  
[https://github.com/masterpointio/shared-prompts/blob/main/rules/tf-testing-child-module.mdc](https://github.com/masterpointio/shared-prompts/blob/main/rules/tf-testing-child-module.mdc)

Lastly, we wanted to highlight the aspects of what we think go into a durable prompt that can be used across a variety of Terraform codebases. We’re hoping you can leverage these strategies within your own prompts.

1. **Describe the codebase layout upfront**.  
   Describe how the Terraform child module is organized and where you want the LLM to place new files. This gives the LLM a working model of your repo's structure.

2. **Direct the LLM to make small incremental changes**.  
   We found it valuable to have the LLM make small chunks of changes, have us review and verify the test behavior, and then commit them. We added this to the prompt so the LLM would expect this workflow.

3. **Ask for clarifying questions**.  
   We found it helpful to direct the LLM to ask clarifying questions (either within the chat session or within the prompt). This helps limit the amount of misguided guesswork the LLM does on your behalf. Adding a quick _“do you have any questions for me about this task?”_ goes a long way.

4. **Be explicit about what to test and how to test**.  
   For us, we prompted the LLM to divide test coverage into (happy path, edge case, and complex) categories. We additionally split up happy path tests into specific files matching the tests’s focus, like `main.tf.hcl`, `locals.tf.hcl`, `variables.tf.hcl`, etc. Your team or org might have different preferences, which is great. Find out what works for your needs.

5. **Mock ALL providers**.  
   In this specific prompt, we directed the LLM to mock ALL providers. We didn’t want to introduce the possibility of using AI to write and run live integration tests. To make this work, we provided specific mock examples for AWS and Tailscale (we’ll probably add more as needed).

6. **Prompt for refactoring and brevity**.  
   LLMs tend to produce verbose boilerplate code. Have the LLM refactor tests to reduce duplication while keeping the same test coverage. In our experiments, this forced the model to condense test logic into more concise and maintainable tests.

7. **Expect non-deterministic behavior from LLMs.**  
   We got different outputs when we re-ran the same operation – same LLM with the same prompt and working from the same codebase. LLMs are non-deterministic functions. We see this as a feature 🙃 (not a bug), and will often select the best ideas generated from re-running operations multiple times.

## Prompt for Generating Terraform Tests in Child-Modules

The full and final version of the prompt is located in Masterpoint's [shared-prompts](https://github.com/masterpointio/shared-prompts) repo,
[https://github.com/masterpointio/shared-prompts/blob/main/rules/tf-testing-child-module.mdc](https://github.com/masterpointio/shared-prompts/blob/main/rules/tf-testing-child-module.mdc).

## Credits

We wanted to thank a few folks who thoughtfully and generously provided feedback on the article's draft versions. Thanks for helping us see grammatical mishaps, transition gaps, and asking questions along the way.

Chris Hood  
Peter Farrell
