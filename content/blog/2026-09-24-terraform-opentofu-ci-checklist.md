---
visible: true
draft: false
title: "Terraform and OpenTofu: A Continuous Integration Checklist for AI-Generated Infrastructure"
metaTitle: "Terraform and OpenTofu: A Continuous Integration Checklist for AI-Generated Infrastructure"
author: Matt Gowie
date: 2026-09-24
slug: terraform-opentofu-ci-checklist
description: "Run formatting and validation, linting, tests, security scans, and documentation checks locally and in CI for Terraform and OpenTofu."
image: /img/updates/terraform-opentofu-ci-checklist/terraform-opentofu-ci-checklist-hero.png
preview_image: /img/updates/terraform-opentofu-ci-checklist/terraform-opentofu-ci-checklist-preview.png
hide_hero: true
image_alt: "Terraform & OpenTofu CI Checklist. Masterpoint title graphic with five checkmarks."
og_img: /img/updates/terraform-opentofu-ci-checklist/terraform-opentofu-ci-checklist-og.png
callout: <p>👋 <b>If your team needs help establishing these standards across Terraform or OpenTofu repositories, <a href='https://masterpoint.io/contact/'>get in touch with Masterpoint</a>.</b> We can help you turn the above checklist into a pattern your team can reliably use and maintain.</p>
---

AI makes Terraform and OpenTofu code faster to produce. That doesn't remove the need to validate every change before it ships. It raises the stakes for consistent validation: more code can reach review in less time, and every change still has to meet the same standard.

If you're using AI for your infrastructure code, you should be using it to shorten the validation loop. It can help write tests, update documentation, diagnose clearly reported problems, and revise the code. At Masterpoint, we put five automated checks around that work: formatting and validation, linting, tests, security scanning, and documentation. Run them locally while you work and in continuous integration (CI) on every pull request. They catch routine failures so engineers can focus on the decisions that still need human judgment: whether the infrastructure design makes sense and behaves as intended.

Use the checklist below as a starting point for your own organization. It's the five-part baseline we follow at Masterpoint, and each section explains what the check catches, how to run it, and what passing still doesn't prove.

{{< downloadable-image src="/img/updates/terraform-opentofu-ci-checklist/terraform-opentofu-ci-checklist.png" pdf="/download/terraform-opentofu-ci-checklist.pdf" width="2000" height="2420" alt="Terraform and OpenTofu CI checklist: formatting and validation, linting, tests, security, and documentation. Run each locally before commit and automatically on pull requests. Required checks must block merge. Passing automation does not replace human review." >}}

## 1. Formatting and validation: check the configuration

Formatting is an easy one. Use `terraform fmt` or `tofu fmt` to apply the tool's canonical format, then have CI check the committed files. That keeps formatting differences out of code review so reviewers can focus on the infrastructure change.

`terraform validate` or `tofu validate` checks internal consistency, including references and argument types. A reference to an undeclared resource should be caught before a reviewer starts reasoning about the design.

[Terraform's validation command](https://developer.hashicorp.com/terraform/cli/commands/validate) requires an initialized working directory with the referenced modules and provider plugins installed. Account for that setup in CI. A repository with several root modules needs validation in the relevant module directories. Running one command from the repository root doesn't automatically validate everything underneath it.

Be aware that validation doesn't establish that a deployment will succeed with particular credentials, input values, or existing cloud resources.

## 2. Linting: make the team's rules explicit

A linter can enforce additional rules your team has chosen for its code. We recommend [TFLint](https://github.com/terraform-linters/tflint).

A good example of a TFLint rule that showcases why it's useful is the [`terraform_unused_declarations`](https://github.com/terraform-linters/tflint-ruleset-terraform/blob/main/docs/rules/terraform_unused_declarations.md)[ rule](https://github.com/terraform-linters/tflint-ruleset-terraform/blob/main/docs/rules/terraform_unused_declarations.md). This rule flags variables, data sources, locals, and provider aliases declared in code but never used. For an unused input variable, changing the value won't change the module's behavior. With TFLint pointing this out, you can connect the variable to the intended behavior or remove an option the code doesn't need. Review unused data sources separately: Terraform still refreshes them even when nothing references their results.

The rules should be chosen deliberately, with their configuration kept in the repository. Provider-specific checks also depend on the appropriate plugins. Installing TFLint alone doesn't mean every cloud-specific rule is running.

If the team regularly ignores a rule, resolve why: fix the code, adjust the rule, or document a justified exception. Otherwise, every engineer has to remember which warnings require action and which ones the team has decided to ignore.

## 3. Tests: check the behavior people depend on

Testing takes more work to get right. Start with reusable child modules, especially where you've written custom logic. Several callers may depend on that behavior, so write down the expectation in a test before someone changes it.

[Terraform](https://developer.hashicorp.com/terraform/language/tests) and [OpenTofu](https://opentofu.org/docs/cli/commands/test/) both provide native testing capabilities. You can describe inputs and expected behavior in HCL alongside the module. Cover a normal use case, invalid inputs the module should reject, and failure cases you've learned matter.

For a separate illustration of what a test can protect, consider a small AWS S3 child module for a bucket that should stay private. The monorepo template linked below uses a simpler Random module example. The S3 module accepts a bucket name and enables all four S3 Block Public Access settings. Three cases give us a useful baseline:

| Case                                                     | Expected result                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Valid bucket name                                        | The configuration can produce a plan with all four public-access controls enabled |
| Invalid bucket name                                      | The module rejects the input                                                      |
| A public-access control is disabled via a future request | The test fails on the planned configuration to ensure this is not done lightly    |

The test uses a mocked AWS provider so it can inspect the planned configuration without AWS credentials or cloud resources:

```terraform
mock_provider "aws" {}

run "private_bucket" {
  command = plan

  variables {
    bucket_name = "example-private-bucket"
  }

  assert {
    condition = (
      aws_s3_bucket_public_access_block.this.block_public_acls &&
      aws_s3_bucket_public_access_block.this.block_public_policy &&
      aws_s3_bucket_public_access_block.this.ignore_public_acls &&
      aws_s3_bucket_public_access_block.this.restrict_public_buckets
    )
    error_message = "The module must enable all four S3 Block Public Access settings."
  }
}

run "reject_invalid_name" {
  command = plan

  variables {
    bucket_name = "INVALID"
  }

  expect_failures = [var.bucket_name]
}
```

The first run protects a real infrastructure decision: a future refactor can't quietly turn off one of the module's public-access controls. The second run expects the module's bucket-name validation to reject uppercase input. If that validation disappears, the test fails because the expected rejection never occurs. An unrelated provider or configuration error doesn't satisfy `expect_failures`.

How the tests run matters. Provider mocking needs a CLI release that supports it. Terraform added `mock_provider` in 1.7. Native test runs default to an apply operation, but using the above `command = plan` avoids creating infrastructure for that run. This example still needs the AWS provider plugin so Terraform or OpenTofu can load its schema, but the mock avoids credentials and API calls. Other plan-only tests may still need provider configuration or API access. Use mocks where appropriate, and use live infrastructure tests when you need evidence about behavior that a plan or mock cannot establish. Those tests need their own credentials, isolation, and cleanup.

AI can help generate tests, but a human still needs to decide which behavior matters and verify that the tests cover it. In [our test-generation experiments](https://masterpoint.io/blog/ai-meets-tf-prompt-strategies-for-test-generation/), the team had to refactor generated tests that added code without meaningful coverage. A useful test fails when the behavior it protects is broken. If changing that behavior doesn't produce a failure, the test needs more work.

## 4. Security: surface misconfigurations and exposed secrets

Security checks are useful even when compliance isn't the reason for running them. If a database is meant to stay private, a rule exposing it to the public internet should be caught before merge. A useful baseline covers two different failure modes: infrastructure misconfigurations and exposed secrets. A network rule and a committed credential require different checks, even when one tool can run both.

[Trivy](https://trivy.dev/docs/latest/scanner/misconfiguration/) can scan infrastructure code for misconfigurations, while [TruffleHog](https://github.com/trufflesecurity/trufflehog) detects exposed secrets. [Checkov](https://www.checkov.io/) is another option for infrastructure scanning. Whichever tools you choose, verify which modes and rules actually run and surface the results on the pull request.

It's worth calling out that the scanners themselves are another dependency to maintain: Trivy was affected by a [supply-chain compromise in March 2026](https://www.aquasec.com/blog/trivy-supply-chain-attack-what-you-need-to-know/), so scanner versions need the same maintenance and review diligence as the rest of your tooling.

Once those scans are running in CI, the team needs to decide which findings block merge and how exceptions are reviewed. A passing scan means the configured rules found no violations. Human review still determines whether the proposed access and exposure are appropriate for the environment.

## 5. Documentation: keep the module interface readable

Documentation is part of a module's interface. When an input or output changes, the reference tables and working example need to change with it. Otherwise, engineers and AI assistants can both rely on instructions the module no longer supports.

[terraform-docs](https://terraform-docs.io/) is the go-to tooling for generating reference documentation from module code. Regenerate it locally when the interface changes via a pre-commit check, and have a CI check fail if the committed documentation differs from the expected output.

Generated tables still need an explanation around them: what the module is for, how to use it, and which assumptions or tradeoffs a consumer needs to understand. The generator can describe an input, but you need to explain why someone would choose it.

## Put the checklist into practice

If you're looking for a concrete starting point, [Masterpoint's infrastructure monorepo template](https://github.com/masterpointio/infra-monorepo-template) is the example we're using for this checklist. Compare its setup against the five checks above, then adapt it to your modules and team conventions.

We really like [Trunk for coordinating these checks](https://newsletter.masterpoint.io/p/trunk-our-choice-for-linting-tf-code). At Masterpoint, we use it to run supported checks through local pre-commit hooks and as a CI check on pull requests. Configure those checks there, and make sure the workflow also runs native tests in the intended module directories.

Here are links to locations where you can find each of the checks above:

1. Formatting and validation: Trunk uses [OpenTofu for formatting](https://github.com/masterpointio/infra-monorepo-template/blob/f9fac8d052c4e4d8f1f1019d114297e870429c46/.trunk/trunk.yaml#L24) in this template. The separate validation command described above still needs to be configured for the module directories you want to check.

2. Linting: [Trunk configures TFLint as a linter](https://github.com/masterpointio/infra-monorepo-template/blob/bdda660ec287ea865f8c19fafd3ac61edcc4f644/.trunk/trunk.yaml#L30).

3. Tests: See our [example tests](https://github.com/masterpointio/infra-monorepo-template/blob/f9fac8d052c4e4d8f1f1019d114297e870429c46/child-modules/random-pet/tests/random_pet.tftest.hcl) and [GitHub Actions test runner](https://github.com/masterpointio/infra-monorepo-template/blob/f9fac8d052c4e4d8f1f1019d114297e870429c46/.github/workflows/test.yaml).

4. Security: [Trunk configures Trivy and TruffleHog as linters](https://github.com/masterpointio/infra-monorepo-template/blob/bdda660ec287ea865f8c19fafd3ac61edcc4f644/.trunk/trunk.yaml#L31-L32).

5. Terraform Docs: We run [terraform-docs as a Trunk action for local pre-commit changes](https://github.com/masterpointio/infra-monorepo-template/blob/bdda660ec287ea865f8c19fafd3ac61edcc4f644/.trunk/trunk.yaml#L51-L53) and run a [separate documentation check in CI](https://github.com/masterpointio/infra-monorepo-template/blob/92c16e9b2e0968a0c184d6014b061e154ded7d78/.github/workflows/lint.yaml#L38) to confirm that the committed documentation is up to date before merge.

The way we do things is that we like to avoid a lot of problems via checks that are run before the commit is even made. The separate **pre-commit framework** is another way to organize checks, but we like Trunk because it doesn't require it. If you're already using that framework successfully, keep using it. If you're starting without a consistent setup, we recommend Trunk.

An engineer new to the repository might forget to run a local check, or they might not have Trunk set up locally. CI needs to catch that. We use our standard [`lint.yaml`](https://github.com/masterpointio/actions/blob/7dad35e85d864ca5dda0971dfd3c940cc67ed380/.github/workflows/lint.yaml#L9-L35)[ GitHub Actions workflow](https://github.com/masterpointio/actions/blob/7dad35e85d864ca5dda0971dfd3c940cc67ed380/.github/workflows/lint.yaml#L9-L35) for the Trunk checks, with separate jobs for native tests and documentation freshness. To enforce the full checklist, configure the relevant status checks as required through branch protection or rulesets. A failure in any required check then blocks the merge, subject to the bypass permissions your team has configured.

A deliberate failure is the final setup check. An unused input, a broken test expectation, or a variable description change without regenerated documentation should trigger a failure on the corresponding check and prevent you from merging. Make sure that you run into at least one failed check during your setup of the above before you start relying on a green result.

### Keep tool versions aligned

The CI tools and workflows running these checks need regular maintenance. For example, if an engineer starts using a feature from a newer OpenTofu release while CI still runs an older version, the code can work locally and fail on the pull request. Keeping those versions aligned helps engineers reproduce the same checks on their machines. Updates to the tools and workflows should go through review and testing so you can confirm the checks still behave as intended.

Tools like [mise](https://mise.jdx.dev/) and [Aqua](https://aquaproj.github.io/) let you define tool versions in the repository so developers and CI can use the same versions. Our infrastructure monorepo template uses Aqua for this: its [aqua.yaml file](https://github.com/masterpointio/infra-monorepo-template/blob/main/aqua.yaml) pins Terraform, OpenTofu, and terraform-docs, and the test and documentation workflows install those versions. That gives the team one place to update them and review the change.

## Use automated checks to focus human review

The reviewer still needs to decide whether a resource should exist, whether access is appropriate, and whether the plan matches the intended change. Use the above to give them reliable feedback from the routine checks so they can concentrate on those decisions.
