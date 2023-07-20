---
visible: true
draft: false
title: "Understanding the Terraform Check Block Feature"
author: Veronika Gnilitska
slug: understanding-the-terraform-check-block-feature
date: TBD
description: "We dive into one of Terraform's most recent features to leverage infrastructure validation."
image: /img/updates/tf-check-blog-post.png
---
<h2>Table of Contents</h2>

- [Intro](#intro)
- [How could this feature benefit my infrastructure?](#how-could-this-feature-benefit-my-infrastructure)
- [Do I need this if I'm already testing my Terraform code?](#do-i-need-this-if-im-already-testing-my-terraform-code)
- [How can this be set up?](#how-can-this-be-set-up)
- [Using a data source in the assertions](#using-a-data-source-in-the-assertions)
  - [Limitations to consider](#limitations-to-consider)
- [Are there any potential pitfalls?](#are-there-any-potential-pitfalls)
- [Conclusion](#conclusion)
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
2. **Out-of-band change detection:** an unanticipated change made outside Terraform can cause surprising failures, especially if it can't be detected via a built-in drift detection mechanism (for instance, when another root module manages a resource). Checks can come in handy to ensure deviations such as the expiration of a TLS certificate or authentication tokens won't create unforeseen interruptions.
3. **Enforcing naming and tagging conventions:** maintaining a consistent set of tagging and naming conventions within your organization can be crucial. Use the `check` block feature to enforce these standards across your infrastructure, fostering uniformity and orderliness.
4. **Upholding security best practices:** checks can help ensure adherence to security best practices within your infrastructure. For example, you can use it to verify that specific ports are closed, IAM configurations are properly set, and encryption is enabled, contributing to a more secure and robust environment.

## Do I need this if I'm already testing my Terraform code?

While similar in their goals of ensuring correct and efficient infrastructure operation, infrastructure validation and testing differ slightly in their scopes and methods.

_Infrastructure validation_ generally refers to checking the correctness of infrastructure code against specified standards or requirements before it's deployed. For instance, native Terraform commands like `validate` or `plan` or tools like [TFLint](https://github.com/terraform-linters/tflint) mainly focus on the correctness of code and check the syntax and internal consistency, ensuring it's well-structured and free from apparent errors before deployment.

_Infrastructure testing_, on the other hand, usually takes place after the infrastructure has been provisioned and validates that it's functioning as expected. This can include unit tests, integration tests, functional tests, and acceptance tests, among others. Testing tools like [Kitchen-Terraform](https://newcontext-oss.github.io/kitchen-terraform/) and [Terratest](https://terratest.gruntwork.io/) are commonly used for these kinds of tests. They can confirm that resources are adequately created and connected, security groups allow/deny correct traffic, etc.

Terraform uses declarative language to define the desired state of your infrastructure. By its nature, declarative code does not specify the steps needed to reach this state. Inspecting the desired state's details to confirm proper changes while writing the tests can quickly become tedious.

This is where `check` blocks come into play, stepping in to handle assertions when the actual provisioning isn't the primary focus. Given the necessity of configuring external tools and writing tests in Ruby or Go, native HCL `check` blocks can be seen as a practical alternative. They can be used before running tests in sandbox environments — whether ephemeral or persistent, hosted in the cloud, or run locally using mocking tools.
In fact, the main practical testing scenario might involve validating the provisioning of the proposed changes. In certain instances, examining a single attribute of the final state could be sufficient.

## How can this be set up?

Adding a simple check is trivial. Let’s assume we have a root module that manages AWS EKS cluster configuration and contains the resource `aws_eks_cluster`:
```hcl
resource "aws_eks_cluster" "default" {
  name     = "my-cluster"
  role_arn = var.role_arn
  vpc_config {
    subnet_ids = var.subnet_ids
  }
}
```

To start using the `check` block, ensure you’re using Terraform v1.5+. Since the release of terraform 1.0, we recommend to use the [pessimistic constraint operator](https://developer.hashicorp.com/terraform/language/expressions/version-constraints#-3) (i.e. `~>`) to set bounds on the version of Terraform and the providers a [root module](https://developer.hashicorp.com/terraform/language/modules#the-root-module) depends on:

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

In addition to simple assertions, Terraform offers the ability to reference a data source within `check` block assertions. It’s queried by Terraform at the end of each operation to evaluate the checks and obtain the most recent data from your environment.

Terraform’s operation won’t be interrupted by failures in the scoped data block or any unsuccessful assertions. This unlocks continuous validation of your assumptions about the infrastructure rather than being confined to the point of initial provisioning.

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
    The list of expected tags is: [${join(",", local.tailscale_tags)}]
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
```

### Limitations to consider

1. **Approval is required for `terraform apply`**

In case of a successful assertion, Terraform requires approval for every `apply` operation due to a configuration reload needed to verify a check block, e.g.:

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

This should be considered when introducing check to existing CI/CD pipelines.

2. **Multiple data resource blocks are not supported**

Unfortunately, it's possible to define only one data source per check at the moment. Otherwise, the error will be thrown:

```sh
This check block already has a data resource defined at main.tf:83,3-27.
```

This limitation restrains creating complex assertions within one `check` block.

## Are there any potential pitfalls?

In addition to the limitations above, we recommend paying attention to a couple of things:

* While, by design, Terraform should not halt due to a check, the use of a data source can increase the operation's execution time and might cause timeout errors if Terraform fails to fetch it. Consider setting a retry limit if the provider offers this option.
* As `terraform plan` and `terraform apply` represent different stages in the workflow, the purpose of checks can also diverge into post-plan, post-apply, and the ones relevant for both cases. We see great potential for improvement here, such as the possibility of labeling or ignoring checks for a particular stage so that checks could be built-in as smoothly as possible.

## Conclusion

The check block feature provided by Terraform is a valuable addition to the IaC toolkit, boosting comprehensive and continuous validation capabilities. It's easy to implement and integrate into your existing infrastructure. While it's unlikely to replace testing tools and strategies completely, it can undoubtedly bear the burden in some cases, especially considering potential improvement areas.

Like all tools, the check block feature should be used judiciously and in conjunction with other validation and testing methodologies to ensure your infrastructure's overall health, performance, and security.
We recommend exploring and leveraging this feature and look forward to hearing feedback and thoughts from the community!

## References

* [GitHub - Release notes for hashicorp/terraform v1.5.0](https://github.com/hashicorp/terraform/releases/tag/v1.5.0)
* [Terraform Configuration Language - Checks with Assertions](https://developer.hashicorp.com/terraform/language/expressions/custom-conditions#checks-with-assertions)
* [Terraform Tutorials - Use Checks to Validate Infrastructure](https://developer.hashicorp.com/terraform/tutorials/configuration-language/checks)
