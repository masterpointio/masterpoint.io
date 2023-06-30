---
visible: true
draft: false
title: "Understanding the Terraform Check Block Feature"
author: Veronika Gnilitska
slug: understanding-the-terraform-check-block-feature
date: TBD
description: "We dive into one of Terraform's most recent features to leverage infrastructure validation."
# image: TBD
---
Table of Contents
=================
* [Overview](#overview)
* [How could this feature benefit my infrastructure?](#how-could-this-feature-benefit-my-infrastructure)
* [Do I need this if I'm already testing my Terraform code?](#do-i-need-this-if-im-already-testing-my-terraform-code)
* [How this can be set up?](#how-this-can-be-set-up)
* [Using a data source in the assertions - In progress](#using-a-data-source-in-the-assertions---in-progress)
* [Are there any potential pitfalls? - TBD](#are-there-any-potential-pitfalls---tbd)
* [Possible improvemends - TBD](#possible-improvemends---tbd)
* [Conclusion - TBD](#conclusion---tbd)
* [References](#references)

## Overview
Terraform offers multiple ways to ensure the accuracy of the infrastructure configuration with standard HCL features and syntax. These include defining validation conditions for input variables and specifying preconditions and postconditions for resources, data sources, and output.

With the release of version 1.5.0, Terraform has expanded its infrastructure validation capabilities by introducing the `check` feature. It allows testing assertions for the whole configuration with independent blocks as part of the infrastructure management workflow. A `check` block requires specifying at least one, but possibly multiple, assert blocks. Each assert block should include a `condition` expression and an `error_message` expression, matching the current [Custom Condition Checks](https://developer.hashicorp.com/terraform/language/expressions/custom-conditions#custom-conditions). All `check` blocks will be evaluated as the last step of the Terraform `plan` and `apply` operations.

## How could this feature benefit my infrastructure?
Unlike the previously mentioned options, `check` blocks are not coupled with the lifecycle of a specific resource, data source, or variable. A check can validate any attribute of the infrastructure or the functionality of the resource itself in the Terraform runs.

Here are some potential use cases to apply this feature:
1. **Service state validation**
  Utilize the `check` block to confirm the operational status of services. For instance, you can verify that database instances, Kubernetes clusters, or virtual machines are up and running, ensuring the overall health of your infrastructure.
1. **Endpoint confirmation**
  Leverage checks to validate endpoint connectivity. This involves sending an HTTP request and expecting a successful 200 response, ensuring that your services are accessible and interactable.
1. **Out-of-band change detection**
  Unanticipated changes made outside Terraform can cause surprising failures. Checks come in handy to detect such deviations, for example, the expiration of a TLS certificate or authentication tokens, preventing unforeseen interruptions.
1. **Enforcing naming and tagging conventions**
  Maintaining a consistent set of tagging and naming conventions within your organization can be crucial. Use the `check` block feature to enforce these standards across your infrastructure, fostering uniformity and orderliness.
1. **Upholding security best practices**
  Checks can help ensure adherence to security best practices within your infrastructure. For example, you can use it to verify that specific ports are closed, IAM configurations are properly set, and encryption is enabled, contributing to a more secure and robust environment.

## Do I need this if I'm already testing my Terraform code?
While similar in their goals of ensuring correct and efficient infrastructure operation, infrastructure validation and testing differ slightly in their scopes and methods.

_Infrastructure validation_ generally refers to checking the correctness of infrastructure code against specified standards or requirements before it's deployed. For instance, native Terraform commands like `validate` or `plan` or tools like [TFLint](https://github.com/terraform-linters/tflint) mainly focus on the correctness of code and check the syntax and internal consistency, ensuring it's well-structured and free from apparent errors before deployment.

_Infrastructure testing_, on the other hand, usually takes place after the infrastructure has been provisioned and validates that it's functioning as expected. This can include unit tests, integration tests, functional tests, and acceptance tests, among others. Testing tools like [Kitchen-Terraform](https://newcontext-oss.github.io/kitchen-terraform/) and [Terratest](https://terratest.gruntwork.io/) are commonly used for these kinds of tests. They can confirm that resources are adequately created and connected, security groups allow/deny correct traffic, etc.
Most infrastructure tools use declarative language to define the desired state. By its nature, declarative code does not specify the steps needed to reach this state. Inspecting the desired state's details to confirm proper changes while writing the tests can quickly become tedious.
This is where `check` blocks come into play, stepping in to handle assertions when the actual provisioning isn't the primary focus. Given the necessity of configuring external tools and writing tests in Ruby or Go, native HCL `check` blocks can be seen as a practical alternative. They can be used before running tests in sandbox environments — whether ephemeral or persistent, hosted in the cloud, or run locally using mocking tools.
In fact, the main practical testing scenario might involve validating the provisioning of the proposed changes. In certain instances, examining a single attribute of the final state could be sufficient.


## How this can be set up?
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

To start using `check` block, ensure you’re using Terraform v1.5+. It’s recommended to use a ~> constraint to set bounds on versions of Terraform and providers a [root module](https://developer.hashicorp.com/terraform/language/modules#the-root-module) depends on:

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

## Using a data source in the assertions - In progress
In addition to simple assertions, Terraform offers the ability to reference a data source within `check` block assertions. It’s queried by Terraform at the end of each operation to evaluate the checks and obtain the most recent data from your environment.
Terraform’s operation won’t be interrupted by failures in the scoped data block or any unsuccessful assertions. This unlocks continuous validation of your assumptions about the infrastructure rather than being confined to the point of initial provisioning.

Also, this allows to utilize [`external` data source](https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external) provided by Hashicorp. It green-lights integration of arbitrary external scripts into your Terraform configuration. This can be a Python script, a shell script, or any other program that can read JSON from standard input and write JSON to standard output. It's worth noting that the use of the external data source comes with a caveat: it can potentially make your configuration depend on the specific environment where it runs, as it might rely on specific external scripts being available.

Example: Add a case with Tailscale auth key expiration to Masterpoint repo.

## Are there any potential pitfalls? - TBD
* Performance issues for runs in case of complicated assertions, especially data sources.

## Possible improvemends - TBD
* Different check for plan and apply

## Conclusion - TBD
* Substitute terratest or other similar tools/custom scripts?
* Achieve a more reliable, predictable, and secure infrastructure management experience.

## References
* [GitHub - Release notes for hashicorp/terraform v1.5.0](https://github.com/hashicorp/terraform/releases/tag/v1.5.0)
* [Terraform Configuration Language - Checks with Assertions](https://developer.hashicorp.com/terraform/language/expressions/custom-conditions#checks-with-assertions)
* [Terraform Tutorials - Use Checks to Validate Infrastructure](https://developer.hashicorp.com/terraform/tutorials/configuration-language/checks)
