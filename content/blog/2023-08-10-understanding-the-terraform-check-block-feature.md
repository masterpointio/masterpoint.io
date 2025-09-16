---
visible: true
draft: false
title: "Understanding the Terraform Check Block Feature"
author: Veronika Gnilitska
slug: understanding-terraform-check
date: 2023-08-10
description: "We dive into one of Terraform's most recent features to leverage infrastructure validation."
image: /img/updates/tf-check-blog-post.png
callout: "<p>👋 <b>Interested in platform engineering for your organization</b>, but not sure where to start? <a href='/contact'>Get in touch,</a> we're an expert team of platform engineers who deliver high-quality cloud platforms for startups and SMBs looking to scale. We enable your application engineers to focus on your product and in turn generate more value for your business.</p><a href='/contact' class='button'>Get In Touch &rsaquo;</a>"
---

<h2>Table of Contents</h2>

- [Intro](#intro)
- [How could this feature benefit my infrastructure?](#how-could-this-feature-benefit-my-infrastructure)
- [Do I need this if I'm already testing my Terraform code?](#do-i-need-this-if-im-already-testing-my-terraform-code)
- [How can this be set up?](#how-can-this-be-set-up)
- [Using a data source in the assertions](#using-a-data-source-in-the-assertions)
- [Are there any potential pitfalls?](#are-there-any-potential-pitfalls)
- [Final thoughts](#final-thoughts)
  - [Update: new `test` command in Terraform v1.6](#update-new-test-command-in-terraform-v16)
- [References](#references)

## Intro

Terraform offers multiple ways to ensure the accuracy of the infrastructure configuration with standard HCL features and syntax. These include defining [validation conditions for input variables](https://developer.hashicorp.com/terraform/language/expressions/custom-conditions#input-variable-validation) and specifying [preconditions and postconditions](https://developer.hashicorp.com/terraform/language/expressions/custom-conditions#preconditions-and-postconditions) for resources, data sources, and output.

With the release of version 1.5.0, Terraform has expanded its infrastructure validation capabilities by introducing the `check` feature. It allows testing assertions for the whole configuration with independent blocks as part of the infrastructure management workflow. A `check` block requires specifying at least one, but possibly multiple, assert blocks. Each assert block includes a `condition` expression and an `error_message` expression, matching the current [Custom Condition Checks](https://developer.hashicorp.com/terraform/language/expressions/custom-conditions#custom-conditions). All `check` blocks will be evaluated as the last step of the Terraform `plan` and `apply` operations.

In this article, we'll be diving into this new feature, show you how it can be used in the real world, and discuss the potential pitfalls.

## How could this feature benefit my infrastructure?

Unlike the previously mentioned options, `check` blocks are not coupled with the lifecycle of a specific resource, data source, or variable. A check can validate any attribute of the infrastructure or the functionality of the resource itself in the Terraform runs.

Here are some potential use cases to apply this feature:

1. **Service state validation:** utilize the `check` block to confirm the operational status of services. For instance, you can verify that database instances, Kubernetes clusters, or virtual machines are up and running, ensuring the overall health of your infrastructure.
1. **Endpoint confirmation:** leverage checks to validate endpoint connectivity. This involves sending an HTTP request and expecting a successful 200 response, ensuring that your services are accessible and available.
1. **Out-of-band change detection:** an unanticipated change made outside Terraform can cause surprising failures, especially if it can't be detected via a built-in drift detection mechanism (for instance, when another root module manages a resource). Checks can come in handy to ensure deviations such as the expiration of a TLS certificate or authentication tokens won't create unforeseen interruptions.
1. **Enforcing naming and tagging conventions:** maintaining a consistent set of tagging and naming conventions within your organization can be crucial. Use the `check` block feature to enforce these standards across your infrastructure, fostering uniformity and orderliness.
1. **Upholding security best practices:** checks can help ensure adherence to security best practices within your infrastructure. For example, you can use it to verify that specific ports are closed, IAM configurations are properly set, and encryption is enabled, contributing to a more secure and robust environment.

## Do I need this if I'm already testing my Terraform code?

While similar in their goals of ensuring correct and efficient infrastructure operation, infrastructure validation, and testing differ slightly in their scopes and methods.

_Infrastructure validation_ generally refers to checking the correctness of infrastructure code against specified standards or requirements before it's deployed. For instance, native Terraform commands like `validate` or `plan` or tools like [TFLint](https://github.com/terraform-linters/tflint) mainly focus on the correctness of code and check the syntax and internal consistency, ensuring it's well-structured and free from apparent errors before deployment.

_Infrastructure testing_, on the other hand, usually takes place after the infrastructure has been provisioned and validates that it's functioning as expected. This can include unit tests, integration tests, functional tests, and acceptance tests, among others. Testing tools like [Kitchen-Terraform](https://newcontext-oss.github.io/kitchen-terraform/) and [Terratest](https://terratest.gruntwork.io/) are commonly used for these kinds of tests. They can confirm that resources are adequately created and connected, security groups allow/deny correct traffic, etc.

Both infrastructure validation and testing are essential for a healthy development process. Here is where the `check` feature comes into play and might feed two birds with one crumb.

First, checks can work great when the actual resource provisioning isn't the primary focus of the assertion.

Furthermore, Terraform uses declarative language to define your infrastructure's desired state and, by its nature, does not specify the steps needed to reach this state. Examining the details of the expected state to confirm proper changes while writing tests can quickly become tedious. An effective test could be to check if the changes have indeed been applied - for this, you only need to look at one part of the result. For example, confirm that the worker nodes have joined the EKS cluster.

So give it a try, assess your current validation and testing kit and determine scenarios where checks could be beneficial, either as an addition or a replacement.

## How can this be set up?

Adding a simple check is trivial. Let’s assume we have a [root module](https://developer.hashicorp.com/terraform/language/modules#the-root-module) that manages AWS EKS cluster configuration and contains the resource `aws_eks_cluster`:

```hcl
resource "aws_eks_cluster" "default" {
  name     = "my-cluster"
  role_arn = var.role_arn
  vpc_config {
    subnet_ids = var.subnet_ids
  }
}
```

To start using the `check` block, ensure you’re using Terraform v1.5+. Since the release of terraform 1.0, we recommend to use the [pessimistic constraint operator](https://developer.hashicorp.com/terraform/language/expressions/version-constraints#-3) (i.e. `~>`) to set bounds on the version of Terraform and the providers a root module depends on:

```hcl
terraform {
  required_version = "~> 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}
```

Let’s define a check that validates that our cluster instance is healthy and available:

```hcl
check "aws_eks_cluster_default" {
  assert {
    condition     = aws_eks_cluster.default.status == "ACTIVE"
    error_message = "EKS cluster ${aws_eks_cluster.default.id} status is ${aws_eks_cluster.default.status}"
  }
}
```

## Using a data source in the assertions

In addition to simple assertions, Terraform offers the ability to reference a data source within `check` block assertions. It’s queried by Terraform at the end of each plan and apply operations to evaluate the checks and obtain the most recent data from your environment.

**Terraform’s operation won’t be interrupted by failures in the scoped data block or any unsuccessful assertions**. This unlocks continuous validation of your assumptions about the infrastructure rather than being confined to the point of initial provisioning.

Also, this allows us to utilize the [`external`](https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external) data source provided by Hashicorp. It green-lights integration of arbitrary external scripts into your Terraform configuration. This can be a Python script, a shell script, or any other program that can read JSON from standard input and write JSON to standard output. It's worth noting that the use of the external data source comes with a caveat: it can potentially make your configuration depend on the specific environment where it runs, as it might rely on specific external scripts and language runtimes being available. This can introduce complexity into your terraform runtime environment that you may want to avoid.

Let's consider an example from our own open source module [masterpointio/terraform-aws-tailscale](https://github.com/masterpointio/terraform-aws-tailscale/tree/feature/check_auth_key) where we validate the desired object state using a data source. We use this module to setup Tailscale, a modern VPN tool, that we use with our clients to help them easily access their private AWS resources like databases and internal services. Our module provisions an AWS EC2 instance that serves as a [Tailscale subnet router](https://tailscale.com/kb/1019/subnets/) device and that allows us to tunnel into our private network. The subnet router setup is deployed via `userdata`, and upon authentication with a [Tailnet key](https://registry.terraform.io/providers/tailscale/tailscale/latest/docs/resources/tailnet_key) — managed by Terraform — the device is automatically tagged. Correct tagging of the Tailscale subnet router is critical for its proper functioning. We can introduce the checks in [checks.tf](https://github.com/masterpointio/terraform-aws-tailscale/blob/feature/check_auth_key/checks.tf) to validate if the tags were successfully applied.

The first assertions verifies that the device has been tagged; the second one confirms that the tags applied are as expected:

```hcl
variable "tailnet_name" {
  type        = string
  description = <<EOF
  This unique name of the Tailnet that is used when registering DNS entries, e.g. 'cat-crocodile.ts.net'.
  See https://tailscale.com/kb/1217/tailnet-name/ for more information.
  EOF
}

check "device" {
  data "tailscale_device" "default" {
    name     = format("%s.%s", module.this.id, var.tailnet_name)
    wait_for = "30s"
  }

  assert {
    condition     = length(data.tailscale_device.default.tags) > 0
    error_message = "Device ${data.tailscale_device.default.name} is not tagged."
  }

  assert {
    condition     = sort(data.tailscale_device.default.tags) == sort(tolist(local.tailscale_tags))
    error_message = <<EOF
    Device ${data.tailscale_device.default.name} is not tagged with the correct tags.
    The list of expected tags is: [${join(", ", formatlist("\"%s\"", local.tailscale_tags))}]
    EOF
  }
}
```

Example of the failed assertion:

```sh
Warning: Check block assertion failed
  on ../../../terraform-aws-tailscale/checks.tf line 19, in check "device":
  19:     condition     =  sort(data.tailscale_device.default.tags) == sort(tolist(local.tailscale_tags))
    ├────────────────
    │ data.tailscale_device.default.tags is set of string with 1 element
    │ local.tailscale_tags is tuple with 1 element
Device mp-automation-tailscale-subnet-router.cat-crocodile.ts.net is not tagged with the correct tags.
The list of expected tags is: ["tag:mp-automation-tailscale-subnet-router"]
```

## Are there any potential pitfalls?

We recommend paying attention to a couple of things:

- While, by design, Terraform should not halt due to a check, **the use of a data source can increase the operation's execution time and might cause timeout errors** if Terraform fails to fetch it. Consider setting a retry limit if the provider offers this option.
- As `terraform plan` and `terraform apply` represent different stages in the workflow, **the purpose of checks can also diverge into post-plan, post-apply, and the ones relevant for both cases**. We see great potential for improvement here, such as the possibility of labeling or ignoring checks for a particular stage so that checks could be built-in as smoothly as possible.

In addition to that we've faced some limitations with data source usage in the assertsions.

- In case of a successful assertion, **Terraform requires approval for every `apply` operation** due to a configuration reload needed to verify a check block, e.g.:

  ```sh
  Terraform will perform the following actions:

    # module.tailscale_subnet_router.data.tailscale_device.default will be read during apply
    # (config will be reloaded to verify a check block)
  <= data "tailscale_device" "default" {
        + addresses = [
            + "100.100.48.62",
          ]
        + id        = "8181818181818181"
        + name      = "mp-automation-tailscale-subnet-router.cat-crocodile.ts.net"
        + tags      = [
            + "tag:mp-automation-tailscale-subnet-router",
          ]
        + wait_for  = "30s"
      }

  Plan: 0 to add, 0 to change, 0 to destroy.

  Do you want to perform these actions?
    Terraform will perform the actions described above.
    Only 'yes' will be accepted to approve.

    Enter a value:
  ```

- Unfortunately, it's possible to define only one data source per check at the moment, and **multiple data resource blocks are not supported**. Otherwise, the error will be thrown:

  ```sh
  This check block already has a data resource defined at main.tf:83,3-27.
  ```

  This limitation restrains creating complex assertions within one `check` block.

## Final thoughts

While intriguing on paper, Terraform's new check block feature has yet to live up to our initial expectations fully. Its practical integration into our Terraform code has revealed some limitations, and it felt less revolutionary than we'd hoped. There were a few hitches like it being equally tied to the plan and apply lifecycle and not being able to flag a check block as a critical fail-safe.

We realize its effectiveness may vary across different scenarios and contexts. It's easy to implement and integrate into your existing infrastructure. While it's unlikely to replace testing tools and strategies completely, it can undoubtedly bear the burden in some cases, especially considering potential improvements in the future. We'll keep this feature in our toolkit as we refine our infrastructure code.

That being said, there's still a good deal of progress to be made in Terraform's testing and validation arena. We recommend exploring and leveraging this feature and look forward to hearing feedback and thoughts from the community!

### Update: new `test` command in Terraform v1.6

As we were wrapping up this blog post, the Terraform team has released a preview of v1.6, announcing that it will primarily add a new `terraform test` command that we're very excited for! [More information can be found here](https://discuss.hashicorp.com/t/request-for-testing-terraform-test/56254), and we look forward to testing this out and sharing insights in an upcoming Masterpoint post!

## References

- [GitHub - Release notes for hashicorp/terraform v1.5.0](https://github.com/hashicorp/terraform/releases/tag/v1.5.0)
- [Terraform Configuration Language - Checks with Assertions](https://developer.hashicorp.com/terraform/language/expressions/custom-conditions#checks-with-assertions)
- [Terraform Tutorials - Use Checks to Validate Infrastructure](https://developer.hashicorp.com/terraform/tutorials/configuration-language/checks)
