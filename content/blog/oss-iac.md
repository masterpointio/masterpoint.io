---
visible: true
draft: false
title: "Your Infra Isn't Special: Why Open Source Infrastructure as Code (IaC) Wins"
author: Matt Gowie
slug: why-open-source-iac-wins
date: 2025-06-22
description: "If your platform team is still writing every Terraform and OpenTofu resource by hand, you're falling behind. This post explains how open source Infrastructure as Code (IaC) enables modern platform engineering at scale — reducing effort, increasing security, and speeding up delivery."
image: /img/updates/oss-iac/oss-iac.png
callout: <p>👋 <b>If you're ready to bring OSS best practices into your IaC codebase and workflows, we can help you get there—faster, safer, and with less overhead.</b> <a href='/contact'>Get in touch!</a></p>
---

<h2>Table of Contents</h2>

- [Intro](#intro)
- [The Why](#the-why)
  - [Best Practices](#best-practices)
  - [Security Hardened](#security-hardened)
  - [Less Maintenance](#less-maintenance)
  - [Decrease Day-0 and Day-2 Complexity](#decrease-day-0-and-day-2-complexity)
- [Objections to open source IaC](#objections-to-open-source-iac)
  - [“There are too many inputs to so-and-so module – it feels like a leaky abstraction”](#there-are-too-many-inputs-to-so-and-so-module--it-feels-like-a-leaky-abstraction)
  - [“Using external modules sounds like dependency hell"](#using-external-modules-sounds-like-dependency-hell)
  - [“We can't use open source in my organization because of XYZ reason”](#we-cant-use-open-source-in-my-organization-because-of-xyz-reason)
  - ["Open source may have malicious code in it – what if we get hacked?"](#open-source-may-have-malicious-code-in-it--what-if-we-get-hacked)
  - [“But I can generate all this IaC with AI… why wouldn't I do that?”](#but-i-can-generate-all-this-iac-with-ai-why-wouldnt-i-do-that)
- [How to evaluate good OSS IaC](#how-to-evaluate-good-oss-iac)
  - [Check the README](#check-the-readme)
  - [Check the feature support](#check-the-feature-support)
  - [What version of TF does it support](#what-version-of-tf-does-it-support)
  - [Evaluate the scope of the module](#evaluate-the-scope-of-the-module)
  - [Check the number of required `variable` inputs](#check-the-number-of-required-variable-inputs)
  - [Ensure the module has tests and follows good practices](#ensure-the-module-has-tests-and-follows-good-practices)
  - [Investigate if there is a community behind the module](#investigate-if-there-is-a-community-behind-the-module)
- [Conclusion](#conclusion)

## Intro

At Masterpoint, we're **big** on open source software (OSS). Outside of the few vendors that make our lives and the lives of our clients much easier ([Spacelift](https://spacelift.io/), [DataDog](https://www.datadoghq.com/), and [Tailscale](https://tailscale.com/) are three that immediately come to mind), we push ourselves and our clients to use OSS whenever possible.

One big area where this is critically important is Infrastructure as Code (IaC). For us that means using reusable, OSS modules for Terraform, OpenTofu, or Pulumi.

We strongly believe that everyone should work to avoid reinventing the wheel in their IaC and fight the good fight against any [“Not Invented Here” culture](https://en.wikipedia.org/wiki/Not_invented_here). Chances are, your infrastructure isn't as unique as you might think. We're all spinning up and configuring similar load balancers, Postgres databases, and AI models. You might need some different routing rules or a few different database settings, but the underlying IaC that delivers those resources is going to look eerily similar to what your competitor's org is using. This means that if you're writing out each resource by hand to manage that load balancer or that DB cluster **you're delivering sub-par infrastructure at a slower pace**.

And who aspires to that?

There are very, very few Platform or DevOps teams out there with enough staff to fully support the number of application engineers they are expected to. The idea that such teams should use valuable time to write every line of IaC code for their organization is untenable.

In this post, we'll examine the reasons why you, the platform engineer, should be using OSS IaC and highlight options out there.

## The Why

First, let's break down why we believe OSS IaC is so critical. Reasons include:

1. Best practices out of the box
2. Security hardened infrastructure
3. Less maintenance thanks to community fixes and shared experience
4. Decreased Day-0 and Day-2 complexity

As we work through these topics, we'll share examples of solid open source modules. We're biased towards [the amazing module library](https://docs.cloudposse.com/modules/) that the fine folks at [Cloud Posse](https://cloudposse.com/) have built. In fact, we believe in their modules so much that we're big contributors and maintainers of that library. But you can find similar examples in any popular IaC module collection.

### Best Practices

There are many best practices that get built into OSS IaC modules, but I'll focus on two that are extremely important: Naming + Tagging.

{{< lightboximg "/img/updates/oss-iac/naming-hard.png" "Jeff Atwood on the 2 problems in software development" >}}

[Naming in software is hard](https://martinfowler.com/bliki/TwoHardThings.html). And naming in infrastructure is even worse. Even with the rise of infrastructure as code, the large majority of engineering orgs that we've run into don't follow a consistent naming or tagging pattern across all of their resources. This is a problem because without these consistent patterns, at scale an organization will struggle to find resources, group related resources, and, most importantly, correlate cost across them.

But with open source, you adopt and build upon best practices. Cloud Posse's modules and their usage of null-label are the first place we've seen naming and tagging done well. Read [our introductory article on null-label here](https://masterpoint.io/updates/terraform-null-label/) (and [follow up with our advanced article here](https://masterpoint.io/updates/terraform-null-label-advanced/) if interested) to get the full details.

For example, this [AWS lambda function child-module](https://github.com/cloudposse/terraform-aws-lambda-function) implements great naming and tagging. [You can see in their tests here](https://github.com/cloudposse/terraform-aws-lambda-function/blob/c05157ccc3c9ade68372cc3959588e26406f6b07/test/src/examplescomplete_test.go#L48) that this module creates well-defined names that include a namespace, the region the resources are deployed to, and the environment. These components of the name also are built into the tags.

By leveraging OSS modules for your IaC, you benefit in two ways:

- Your code that uses the modules gets the best practices they implement “out of the box”.
- You can look to these modules for inspiration around tasks like naming and tagging, improving your own IaC code.

### Security Hardened

Because open source modules are being used by hundreds or thousands of organizations, there are thousands of engineers' eyes on the code. Some of those thousands of engineers are going through compliance checks for SOC2, PCI, FedRamp, and other sundry security certifications. How does this impact the security of the modules?

At a bare minimum, those engineers need the open source module that they're using to have settings which can be configured to meet their security requirements. This means that you also have the ability to configure these modules in a secure fashion. At best, these developers upstream code or doc changes that make the module more secure by default.

Relying on open source helps you start off with the most secure configuration possible (e.g. [S3 buckets defaulting to block public access, requiring you to opt into public buckets](https://github.com/cloudposse/terraform-aws-s3-bucket/blob/eb66eee3174ff6514bd9aa744d633674053ab113/variables.tf#L207-L233)).

There are also plenty of open source modules that are scanned by security enhancing tools like `trivy` and `checkov`. [We do this at Masterpoint with our open source modules](https://github.com/masterpointio/terraform-aws-tailscale/blob/59acbd6fe0f4e264c3211018c2cfd64ba2cee8b7/.trunk/trunk.yaml#L29) and this helps us ensure that they're built to a secure standard and that they stay secure!

[Here is an example security patch pull-request](https://github.com/cloudposse/terraform-aws-alb/pull/179) from a contributor that bumps an AWS ALB module's default SSL policy to a newer policy version, the AWS recommendation. If you were using this module, then you wouldn't even need to think about the various options or what AWS recommends. Instead, you would upgrade your usage of the module and you'd then be more secure. Less work, more secure — that's a huge benefit to open source.

### Less Maintenance

This benefit has two flavors: bug fixes and new features.

When you write all of your IaC code from scratch, it's guaranteed that you're going to need to find and fix any bug that crops up. You'll also need to add features; you might be the platform engineer to enhance the IaC code to add IPv6 support when that day comes (I hear it is just around the corner 😁).

When you're using open source modules, you often find exactly what you're looking for because the community has already:

- run into a particular issue
- thought through it
- and provided a fix or turnkey way to implement it

This community effort means the fix for your issue is only a version bump away.

IPv6 is a _GREAT_ example. Are you ready for all of your public endpoints to be IPv6? I know that not all of our projects and client work is. Of course we're not the only ones!

But when IPv6 support is required, I know that [great contributions like this one](https://github.com/cloudposse/terraform-aws-alb/pull/186) will make it much easier to implement IPv6 support. We'll be able to lean on the efforts of the community instead of having to do days of in-the-trenches development work to make IPv6 happen.

This directly translates to lower operational costs and **frees up an organization's most expensive resource: engineers' time**. This enables them to focus on building product features that drive value, not on reinventing a solved problem.

### Decrease Day-0 and Day-2 Complexity

What's more complex to maintain: a codebase with 100K lines of code or one with 15K lines? When you build on OSS IaC, the sheer amount of code for which you're directly responsible for is greatly decreased. This makes it easier to both get started (Day-0) and to maintain the codebase long term (Day-2).

To use my favorite house building analogy, think about the choice of building a house from scratch vs building it with prefab components. If you're doing everything from scratch, you have to make sure that every wall, pipe, and wire is built and placed exactly to spec. But when building with prefabricated walls, pipes, and wiring, you only have to connect the various components and the house is move-in ready.

It helps with smaller projects too. Need to renovate that bathroom? That's a lot simpler when everything already follows a specification. Who knows, there might be upgraded components available that meet your needs.

While Lines of Code (LOC) is not the silver bullet when assessing software, it can be used as one component of approximating codebase complexity. As an example for this reason to use OSS, let's look at the number of LOC in some very commonly used modules:

1. [https://github.com/cloudposse/terraform-aws-vpc](https://github.com/cloudposse/terraform-aws-vpc) — 666 LOC
2. [https://github.com/cloudposse/terraform-aws-alb](https://github.com/cloudposse/terraform-aws-alb) — 1064 LOC
3. [https://github.com/cloudposse/terraform-aws-eks-cluster](https://github.com/cloudposse/terraform-aws-eks-cluster) — 1224 LOC

What's more efficient? For you to write (and maintain!) those 2K lines of code for your organization or for you to consume those 3 modules and benefit from the hard work that others have put into making them great?

## Objections to open source IaC

Of course, no solution is perfect. When I often suggest using OSS modules, I tend to hear these objections and will offer a brief rebuttal to each:

### “There are too many inputs to so-and-so module – [it feels like a leaky abstraction](https://en.wikipedia.org/wiki/Leaky_abstraction)”

This can happen and there are good examples of OSS modules who are prime offenders. I wouldn't recommend using them. Evaluate each module independently, review which inputs are required, and make an informed decision. OSS modules aren't magic pixie dust–you still have to do your due diligence.

### “Using external modules sounds like dependency hell"

Software is all about managing dependencies, whether OSS or not. The IaC ecosystem is not the Javascript ecosystem; If you use good modules, pin them to a specific version, and update when you need to then you won't run into the dependency issues that you may have elsewhere.

### “We can't use open source in my organization because of XYZ reason”

This is a sad reality for some folks and to those folks I suggest: Copy / pasta the open source module into your codebase, abiding by the license. Plan to update it from time to time.

### "Open source may have malicious code in it – what if we get hacked?"

This can be a valid concern if you're just using any OSS project that you stumble upon. But this is why we evaluate OSS projects before we use them and ensure they have strong security practices, are well maintained, and have a community behind them. See how to evaluate good OSS IaC below.

### “But I can generate all this IaC with AI… why wouldn't I do that?”

Did you take the time to understand the AI generated IaC code at a deep level? Did the person who reviewed it? If not, now you have a bunch of code that you need to maintain **and** it won't be getting updates from the community. Congrats, you've increased your future maintenance burden!

## How to evaluate good OSS IaC

Above I suggest that you need to do your own due diligence to ensure that the modules that you use in your organization are quality. Here are some questions that you can ask to check the quality of any given OSS module:

### Check the README

Does the README include clear usage instructions, contribution guidelines, examples, and contact info for maintainers?

### Check the feature support

Does it default to support your needs or can you configure it to support your needs? Does it meet 95% of your needs and a quick fork + commit will get it to 100%?

### What version of TF does it support

Is your version of TF supported and can you use the module without upgrading? Does it make sense to upgrade if you need to for this use-case?

### Evaluate the scope of the module

Is it too big and includes dozens of resources that you don't understand, won't use, and are for use-cases that you're not interested in? Is it too small and simply wraps a single resource without any supporting logic that provides value? Or, goldilocks style, is the size just right?

### Check the number of required `variable` inputs

Some modules have hundreds of inputs, and that can be a sign of poor module design, but is not always. What is more important is the number of inputs that are required. Does the module require you to supply a ton of values for it to work or does it have reasonable defaults?

### Ensure the module has tests and follows good practices

Good modules use some combination of `terratest`, [native TF testing](https://masterpoint.io/blog/terraform-opentofu-terminology-breakdown/#native-tf-testing), security checks like `trivy` or `checkov`, `terraform-docs`, and/or a pre-commit workflow. Is the developer of this module using those tools and testing their code on every PR?

### Investigate if there is a community behind the module

Does the module have a good number of GitHub stars (e.g. 20+)? Are there recent releases and conversation in the PRs or issues? Is there an active Slack or Discord community you can go to if you have questions or concerns? Does the OSS developer or organization have other modules that they support?

Answering these questions can help you understand the quality of the module. Not every module needs to get all of these things 100%, but use your own judgement after your evaluation process when deciding to adopt and use long term.

## Conclusion

We recommend OSS for IaC because it brings together best practices, strong security, reduced maintenance, and lower complexity — enabling teams to scale faster and focus their energy on innovation rather than reinvention. While it takes effort to choose the right modules, we hope this post helps you approach that process with the right mindset.

To that end, if you want some great open source module libraries to check out, start here:

1. [https://docs.cloudposse.com/modules/](https://docs.cloudposse.com/modules/)
2. [https://github.com/masterpointio](https://github.com/masterpointio)

And if you still feel using open source IaC for your organization isn't the right path, please reach out. I'd love to chat and hear your thoughts!
