---
visible: true
draft: false
title: "From Terraform to OpenTofu: Why and How"
author: Matt Gowie
slug: opentofu-early-adopters
date: 2024-04-08
description: "We're early adopters of OpenTofu. Read about what it took for us to make the switch and how it's going."
image: /img/updates/opentofu-early-adopters/logo.png
---

### Intro

On January 29th, we started down the exciting journey of upgrading one of our client projects to [OpenTofu](https://opentofu.org/). As early adopters of this innovative shift in the infrastructure as code (IaC) landscape, we wanted to share our experience and the steps we took during this migration.

If you’re not familiar with OpenTofu, the project started shortly after [HashiCorp changed the licensing](https://www.hashicorp.com/blog/hashicorp-adopts-business-source-license) of their open-source tools (including Terraform) to a Business Source License (BSL) in August of 2023. This event caused significant strife within the Terraform community. This move, which we at Masterpoint view as a departure from true open-source principles, prompted us to search for alternatives that align with our community-focused values. OpenTofu is the recent community-led fork of Terraform and it has emerged as the best alternative. It offers a fully open-source solution designed to be compatible with Terraform's existing infrastructure as code management software, but without the restrictive licensing.

### Why the Migration?

The question of why we did the migration has come up in conversation repeatedly.  It comes down to three reasons:

1. At Masterpoint, we emphasize and prioritize open-source in our engagements because open-source tooling and communities drive more value faster, ensure the solutions we deliver are secure, and provide clients with long-term support. As a result, we are dedicated open-source developers, contributors, and maintainers in the Terraform and Platform Engineering ecosystem. Truly open-source tooling like OpenTofu aligns with our values.
2. Regardless of how much we love open-source, we do recognize that certain projects and scenarios call for paid SaaS tools. **[Spacelift](https://spacelift.io/)** (an IaC Continuous Delivery tool) is one such tool that we’ve used in a number of our client projects. It allows us to deliver great results for our clients without reinventing the wheel with our own pipelines. Since Spacelift can no longer use Terraform v1.6 and above (which are the versions affected by the HashiCorp BSL change), if we wanted to upgrade Terraform then we needed to migrate our pipelines off of Spacelift to Terraform Cloud or another solution. That wasn’t acceptable to us. Instead we chose to migrate off of Terraform and on to OpenTofu, which Spacelift supports, allowing us to stick with tooling we are happy with.

3. Moving to OpenTofu gave us the ability to keep on top of evolving tools while still remaining true to our beliefs. For instance, we want to be better about testing our IaC logic. TerraTest has been the Terraform standard, but requires writing Golang, which is an obstacle for many of our clients. We were excited to test out `terraform test` but this new functionality is only available in BSL licensed versions of Terraform. Luckily, by choosing OpenTofu, we gain access to this and other future functionality.

### A Little About Our Setup

To give you a bit of a background, here are high level details about the tools and scope of our project:

- **Terraform 1.5.7:** The last open-source version before the BS, err, I mean BSL licensing shift.

- **[aqua](https://aquaproj.github.io/docs/):** A tool management system that allows us to specify our tool versions (e.g. `TomWright/dasel@v2.6.0`, `mozilla/sops@v3.7.3`, or `opentofu/opentofu@v1.6.1`).

- **[Atmos](https://atmos.tools/):** Comparable to [Terragrunt](https://terragrunt.gruntwork.io/) or [Terramate](https://terramate.io/), Atmos is a framework for managing Terraform at scale. This tool plays a crucial role in our infrastructure automation.

- **[Spacelift](https://spacelift.io/):** Our IaC continuous delivery tool, which we leverage to automate all of our infrastructure management.

- The **[terraform-spacelift-cloud-infrastructure-automation](https://github.com/cloudposse/terraform-spacelift-cloud-infrastructure-automation) module**: We utilize this module to automate Spacelift, so we don’t need to ClickOps any changes in the Spacelift UI except for “Apply” confirmations. We write Atmos YAML stack files, which gives us a completely automated Spacelift platform.

To give you an idea of the size of the project moved:

- Our IaC manages 2386 resources across AWS, GitHub, Tailscale, Google Cloud, and many other providers.
- We manage over 90 workspaces / state files.
- This project has over 39K lines of Terraform code across over 480 files.

To give you  a visual understanding, here is our internal TF Automation diagram for Spacelift:

<div style="width: 960px; height: 720px; margin: 10px; position: relative;"><iframe allowfullscreen frameborder="0" style="width:960px; height:720px" src="https://lucid.app/documents/embedded/7da15015-b1da-42b0-b72a-410da7f16e04" id="wHGggXXNNQO4"></iframe></div>

### What Did We Need To Do?

The transition to OpenTofu was impressively smooth, with our normal Terraform code requiring **not a single change** to support compatibility with the new CLI tool, `tofu`, and the OpenTofu framework. We were blown away by that! The version we migrated to, [OpenTofu 1.6.1](https://github.com/opentofu/opentofu/releases/tag/v1.6.1), was only the 2nd release of the project, so we expected to run into at least one issue. We were pleasantly surprised. The compatibility between `tofu` and `terraform` out of the gate underscores the OpenTofu team’s serious chops and ability to deliver a reliable tool.

Now just because OpenTofu was able to run all of our Terraform code, that doesn’t mean we didn’t need to make any changes at all. Using OpenTofu isn’t like waving a magic wand. To support it in our environment, we needed to update our Atmos and Spacelift configurations to execute `tofu`  instead of `terraform`. And since OpenTofu was so new, we upstreamed fixes for some niggling issues. 

Here are the details of those changes:

1. We had to add OpenTofu to our project so  our team members had access to the binary. Since we’re using [aqua](https://aquaproj.github.io/), this was as simple as running the command `aqua generate -i opentofu/opentofu` and committing the update!
2. We had to update the `terraform-spacelift-cloud-infrastructure-automation` module to support setting the ["workflow tool" argument](https://registry.terraform.io/providers/spacelift-io/spacelift/latest/docs/resources/stack#terraform_workflow_tool) to a new `OPEN_TOFU` value. After we upgraded our internal usage of that module, this change enabled us to designate OpenTofu as our preferred tool, instead of Terraform. [The open source PR for that module change was made here](https://github.com/cloudposse/terraform-spacelift-cloud-infrastructure-automation/pull/162).
3. We had to update our atmos configuration to ensure that atmos commands executed `tofu` and not `terraform`.
4. Critically, we had to pass the `OPEN_TOFU` workflow tool value to Spacelift. This required the following changes in our base atmos `_defaults.yaml` file:

```yaml
terraform:
  command: tofu
  settings:
    spacelift:

      # Tofu > Terraform
      terraform_workflow_tool: OPEN_TOFU

```

![Pull Request Description for my changes to introduce OpenTofu](/img/updates/opentofu-early-adopters/pr-header.png "Pull Request Description for my changes to introduce OpenTofu")

And that was it! Once that PR got merged, all of our Spacelift Automation and local usage of Atmos changed over to  OpenTofu and we were done! 🏁

### How Long Did It Take?

Sure, the changes were minimal, but how long did it really take to implement them?

As mentioned above, we manage thousands of resources, over 90 workspaces, 39,000+ lines of code over nearly 500 files. But due to the automation Masterpoint has built and compatibility of OpenTofu, this migration took just over **7 hours** of work across multiple days. I personally did this migration work myself, and I was pleasantly surprised and happy with how quickly it all came together.

### How Has It Been Going?

Our migration journey has been very positive. We’ve only hit a couple minor issues that were quickly addressed:

1. GPG Key signing support for non-mainstream providers is still a WIP. This results in tiny warnings like the screenshot; we find these to be an eyesore and prefer our logs to be clean to avoid missing any true issues. Luckily, for such providers, we’ve opened issues and it appears these will be fixed very soon:
    1. [https://github.com/carlpett/terraform-provider-sops/issues/115](https://github.com/carlpett/terraform-provider-sops/issues/115) – Fixed!
    2. [https://github.com/cloudposse/terraform-provider-utils/issues/344](https://github.com/cloudposse/terraform-provider-utils/issues/344) ([@kevcube](https://github.com/kevcube) is a Masterpoint engineer) – Fixed!
    3. [https://github.com/tailscale/terraform-provider-tailscale/issues/335](https://github.com/tailscale/terraform-provider-tailscale/issues/335) – Open (as of the time of writing)

![An example GPG Key Warning](/img/updates/opentofu-early-adopters/gpg-key-warning.png "An example GPG Key Warning")

1. About 3 weeks into our usage of OpenTofu, we ran into an issue related using a recently published version of one of our own modules, [masterpointio/terraform-aws-tailscale](https://github.com/masterpointio/terraform-aws-tailscale). The problem was discussed[(you can view it in the OpenTofu Slack here)](https://opentofucommunity.slack.com/archives/C05R0FD0VRU/p1708463312128849) but the core of the issue is that a hiccup in the OpenTofu registry caused our newly published module to not show up until the registry was manually poked. The OpenTofu team was very responsive and helpful in getting this solved and it was fixed within a few hours. We were very appreciative of this short time to resolution. To me, it seems like that team is continuing to work through the outlier bugs in the registry which is understandable considering how new it is. Given the quick fix too, I find this to be a very acceptable problem!

### Conclusion

Reflecting on this quick journey from Terraform to OpenTofu, I’m excited about this project! As CEO of Masterpoint, I only spend approximately 10% of my time hands on keyboard coding in a typical month, but I was able to personally accomplish this migration in a single week of disjointed work. And with those changes we’re now back to supporting a true open-source project and staying within the toolset that we were already happy with.

So what’s next? My team and I are definitely excited to continue helping clients migrate to OpenTofu – It feels like the stability and innovation of this project are solid at this point. We feel strongly that more and more adoption will happen. We’re also interested in some of the new functionality coming in OpenTofu like [state encryption](https://www.linkedin.com/feed/update/urn:li:activity:7168571335248363520/) and [provider functions](https://www.linkedin.com/posts/opentofuorg_provider-defined-functions-ugcPost-7169353021015928832-rpor/). We’re stoked to check those out soon. We’d like to share a blog post on one or both of them in the coming months.

Interested in migrating from Terraform to OpenTofu or curious about how the tools we use can enhance your infrastructure practices? [Reach out to us](https://masterpoint.io/contact/). Masterpont is at the forefront of this innovative transition, ready to share our expertise or roll up our sleeves to facilitate your success.
