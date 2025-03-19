---
visible: true
draft: false
title: Terraform + OpenTofu Terminology Breakdown
slug: terraform-opentofu-terminology-breakdown
author: Matt Gowie
date: 2025-03-01
description: List of Terraform and OpenTofu terms with definitions and explanations.
image: /img/updates/terraform-null-label-part1.png
callout: <p>👋 <b>Got a term that you're still confused on in the TF or IaC space that you want us to include here? <a href='/contact'>Get in touch and we'd be happy to add it!</a>
---

The Terraform and OpenTofu (collectively referred to as "TF") ecosystem has evolved significantly since HashiCorp's initial release, and the growing sea of tooling and management platforms has led to some interesting (and occasionally frustrating) terminology fragmentation. We're going to break down some essential TF terminology that you'll encounter: workspaces, modules, state management, testing frameworks, and more.

## Workspaces

Let's start with one of the most commonly misunderstood concepts: workspaces. The term "workspace" has different meanings depending on whether you're using Terraform CLI or Terraform Cloud, so it's important to be aware of the context you're working in when using them.

### TF CLI Workspaces

In the context of TF CLI, workspaces are named, isolated instances of state within a single backend. Think of them as separate environments for managing different versions of the same infrastructure. A common use case is maintaining development, staging, and production infrastructure environments using the same TF configuration.

Here's where people often get tripped up: CLI workspaces are not equivalent to long-lived branches in your version control system. Unlike branches, you don't "promote" or merge changes from one workspace to another. Each workspace maintains its own state file, but they all use the same configuration code. The differences between workspaces typically come from the variable values you apply; for example, setting different instance sizes or replica counts based on environment needs.

When you switch workspaces with `terraform workspace select`, you're not changing branches or code; you're just telling Terraform which state file to use. Your infrastructure changes are still managed through your normal Git workflow, with code moving through branches and pull requests before being applied to different workspaces.

This makes CLI workspaces more like environment-specific state containers rather than a code management tool.

### Terraform Cloud Workspaces

When you step into Terraform Cloud territory, the term "workspace" takes on a broader meaning. These are organizational units that maintain their own state, variables, and permissions. If you're familiar with other infrastructure management platforms such as CloudFormation, you might recognize this concept as being similar to what they call "stacks."

Terraform Cloud workspaces pack additional features that their CLI counterparts don't offer, such as remote execution capabilities and team management. This expanded functionality makes them more suited for collaborative enterprise environments where multiple teams need to manage infrastructure together.

## Module Types

Modules are one of the most important elements of TF for organizing your infrastructure code effectively. Modules are the primary way to encapsulate, abstract, and reuse your infrastructure configurations. They allow you to build your infrastructure in logical components, much like how functions and classes work in traditional programming.

### Root Modules

Root modules serve as the main working directory where Terraform or OpenTofu is executed (that is, planned and then applied to bring your infrastructure into line with your IaC config). These modules contain your primary configuration files (main.tf, variables.tf, providers.tf, versions.tf, etc.) and are typically responsible for consuming and composing child modules. Think of root modules as the orchestrators of your infrastructure. They map to one or many state files and they're where you bring together all the pieces of your configuration.

### Child Modules

Child modules are reusable units of Terraform configuration that are intended to be used by root modules or other child modules. They maintain their own input variables and outputs, making them ideal for encapsulating specific infrastructure patterns or services. By separating out large, complicated configurations into child modules, you can more easily reuse common infra definitions and keep your root modules cleaner and much easier to maintain. These are a key method of TF abstraction.

Here is an example of a child module: [cloudposse/terraform-aws-vpc](https://github.com/cloudposse/terraform-aws-vpc)

### Submodules

While often used interchangeably with "child modules", submodules typically refer to modules nested within another module's directory structure. These aren't modules defined within the same file as their parent - they're separate module directories that physically exist inside the parent module's directory.

For example, you might have a directory structure like this:

```txt
vpc/
├── main.tf
├── variables.tf
├── outputs.tf
└── modules/
  └── vpc-endpoints/
      ├── main.tf
      ├── variables.tf
      └── outputs.tf
```

In this case, "vpc-endpoints" is a submodule of the "vpc" parent. This nesting capability provides additional flexibility in organizing your infrastructure code, but it's worth noting that if you're building many submodules within a child module, it may just be time to break up your child module into separate, stand-alone modules.

Here is an example of a submodule: [cloudposse/terraform-aws-vpc/tree/main/modules/vpc-endpoints](https://github.com/cloudposse/terraform-aws-vpc/tree/main/modules/vpc-endpoints)

## TF Organization Patterns

When using Vanilla TF, there are two primary ways that we've seen people organize their root modules within a given TF project / repo. These are Masterpoint terms that we came up with to help discuss issues surrounding these patterns. We define them here as we believe there is value in sharing these.

### Multi-instance Root Modules

Multi-instance is when a root module directory can have multiple state files that are associated with it. This is done with either TF workspaces or with dynamical backend configurations (what we simply call "Dynamic Backends" - explained below). An example of this is that you have an `db-cluster` root module and you deploy it with different configurations for your dev, stage, and prod environments. Think one directory to many state files.

### Single-instance Root Modules

A root module directory has *only one* associated state file. This means the engineering team has directly encoded configuration into the root module for the given environment that it is being deployed to. Examples that match the above would mean that you would have `db-cluster-dev`, `db-cluster-stage`, and `db-cluster-prod` root modules as their own separate directories and each would have the configuration necessary to deploy those clusters for their associated environment. Think one directory to one state file.

## State Management

State is the foundation of how TF tracks and manages your infrastructure. It serves as a record of what resources have been provisioned in your cloud environment,their current configuration, and what resource blocks in code that they map to.

### Backends

Backends refers to where and how Terraform stores its state files. These state files contain the mapping between your Terraform configuration and the real-world resources that have been created. The backend configuration determines not just where the state is stored, but also how state locking, versioning, and team collaboration works.

State management in Terraform comes in two primary flavors: local and remote backends.

Local backends store state files on your local filesystem, which works well for proofs of concept but presents challenges in team environments.

Remote backends, on the other hand, store state in shared locations like S3 or Azure Storage, enabling multiple engineers to collaborate safely on the same configurations, while also providing better security controls.

We wrote an article on the best Backends to use here: [https://masterpoint.io/updates/why-use-cloud-object-storage-terraform-remote-backend/](https://masterpoint.io/updates/why-use-cloud-object-storage-terraform-remote-backend/) 

### State Locking

Locking is a fundamentally important concept regardless of backend choice. When you run TF operations that could modify state, a lock prevents others from simultaneously making changes that could corrupt your infrastructure state. Different backends implement locking mechanisms differently - for instance, S3 backends typically use DynamoDB for locking..

### Dynamic Backends (OpenTofu only)

With the release of [early variable / locals evaluation in OpenTofu v1.8](https://opentofu.org/docs/v1.8/intro/whats-new/#early-variablelocals-evaluation), we now have the ability to dynamically configure our backend. Previously this was not possible, as variables and locals were not allowed in the backend configuration. This enables projects to share a centralized backend configuration file and pass in variables to define where the state should be stored. For example, you can dynamically configure that your dev workspace stores state in a dev bucket and similar for upper environments.

## Testing Frameworks

Without proper testing, infrastructure changes could potentially lead to costly outages or misconfigurations that result in security vulnerabilities. The TF ecosystem has evolved several testing approaches that help catch these types of issues early in the development process.

### Check Blocks

Terraform 1.5 introduced built-in validation through check blocks, which run during the planning phase. These blocks allow you to make assertions about your resource configurations before any changes are applied, providing an additional layer of confidence in your infrastructure changes. [We have an article that breaks down this topic that you can read here](https://masterpoint.io/updates/understanding-terraform-check/).

### Native TF Testing

The [native testing framework in Terraform CLI](https://developer.hashicorp.com/terraform/language/tests) and Open[Tofu CLI](https://opentofu.org/docs/cli/commands/test/) provides a basic framework to validate your infrastructure code. It runs complete TF workflows, creating temporary state and resources to verify your configurations work as intended. This approach is particularly valuable for testing modules, as it allows you to validate the actual behavior of your infrastructure patterns. [You can view an example of TF testing in action in our terraform-spacelift-automation module](https://github.com/masterpointio/terraform-spacelift-automation/blob/main/tests/main.tftest.hcl).

### Terratest

[Terratest](https://terratest.gruntwork.io/) takes a different approach: an external Go-based testing framework. While it requires additional setup compared to native testing, Terratest offers more flexibility in how you validate your infrastructure. Its ability to work across multiple providers makes it particularly valuable for teams managing complex, multi-cloud environments. [The Cloud Posse module library liberally uses terratest to ensure their child modules do not have feature regressions when changes are made](https://github.com/cloudposse/terraform-aws-vpc/blob/32bc2ed18339cb2ddba6154fb1ebdcf3fa2f6ca9/test/src/examples_complete_test.go#L20-L62).

## Industry Terms

As the Terraform ecosystem has matured, new terms have emerged beyond the core concepts. These terms represent specialized tools, architectural patterns, and platform-specific nomenclature that you'll encounter when working with Terraform at scale.

### Provider

A provider in TF is a plugin that enables interaction with an API; typically for a specific infrastructure platform or service. Providers serve as the bridge between TF configuration code and the actual infrastructure resources you're managing. Each provider (like AWS, Azure, GCP, Kubernetes, GitHub, CloudFlare, DataDog, etc.) contains resource types and data sources that correspond to services offered by that platform. Providers must be configured in your TF code with the necessary authentication credentials and regional settings before you can use their associated resources.

The term "Provider" has also been adopted by the wider IaC tools like Crossplane + Pulumi.

### TACOS

TACOS stands for "Terraform Automation and Collaboration Software." This term is associated with the various Terraform automation products in the space like HCP Terraform, Spacelift, Env0, Scalr, and similar. These are generally hosted platforms that serve as execution environments for TF that help teams collaborate on infrastructure changes, manage workflows, handle approvals, and provide visibility into the state of the organization's infrastructure across multiple environments and projects.

### TF Frameworks

TF frameworks are wrapper projects that help you with some of the tedium in Terraform and OpenTofu. Frameworks tend to be lighter-weight implementations that typically wrap CLI execution

These tools execute TF on your behalf and as a result they provide benefits like convention focused directory structures, dynamic backend configuration, root module dependencies, scripting hooks, and similar that Vanilla TF does not. The primary players in this space are [Terragrunt](https://terragrunt.gruntwork.io/), [Terramate](https://terramate.io/), [Atmos](https://atmos.tools/), and [Terraspace](https://terraspace.cloud/).

At Masterpoint, we've used ALL of these frameworks through either greenfield projects or through helping clients dig themselves out of an existing hole that they ended up in. The choice of whether to use a framework or not could take up a full post, so we'll save our thoughts on this topic for later.

### Stack

The term "stack" has one of the most ambiguous definitions. Different platforms in the Terraform ecosystem refer to different concepts when they use this term. Here's how different platforms define "stacks":

* Spacelift: a deployment unit with its own state and configuration: [https://docs.spacelift.io/concepts/stack](https://docs.spacelift.io/concepts/stack)
* Atmos: a collection of components and modules: [https://docs.cloudposse.com/resources/legacy/stacks/](https://docs.cloudposse.com/resources/legacy/stacks/)
* HashiCorp: TF configurations organized into components across multiple environments [https://developer.hashicorp.com/terraform/language/stacks](https://developer.hashicorp.com/terraform/language/stacks)
* Terramate: Collections of resources managed as a unit [https://terramate.io/docs/cli/stacks/](https://terramate.io/docs/cli/stacks/)
* [Te](https://terramate.io/docs/cli/stacks/)rragrunt: A collection of "units" (single instance of infrastructure) managed by Terragrunt: [https://terragrunt.gruntwork.io/docs/getting-started/terminology/#stack](https://terragrunt.gruntwork.io/docs/getting-started/terminology/#stack)

Platforms like Env0 and Scalr, which provide a more holistic, top-down management of infrastructure configurations like Terraform and Kubernetes, wrap Terragrunt's toolchain to provide stack functionality.

### Terralith Pattern

The [Terralith pattern](https://masterpoint.io/updates/terralith-monolithic-terraform-architecture/) represents a specific approach to TF architecture that opts for a single state file for all infrastructure using a monolithic root module approach. While it's often seen as a natural starting point for new projects, teams should view it as technical debt that needs to be addressed in the future. The pattern's fundamental limitations - from state file locking issues to increased blast radius of changes - make it unsuitable for long-term use or any environment that needs to scale beyond basic infrastructure management.

Dealing with the Terralith problem and want to know more? [Check out our original post on this topic here](https://masterpoint.io/updates/terralith-monolithic-terraform-architecture/) and then [learn how to break up a Terralith in our follow up article here](https://masterpoint.io/updates/steps-to-break-up-a-terralith/).

### Demystifying HashiCorp Offerings: Terraform Cloud vs Terraform Enterprise vs HCP Terraform

HashiCorp has gone back and forth on some of their naming conventions around their Terraform product offering. As a result, it's a confusing product landscape. Terraform Cloud and Terraform Enterprise (sometimes referred to as TFE) offer essentially the same functionality, but Enterprise is self-hosted and has, as anything with the word Enterprise in it would be expected to have, a higher price tag. HCP Terraform, which is an acronym  for Hashicorp Cloud Platform Terraform, is the new name for Terraform Cloud.

You'll see all of these names in practice and can largely equate them to the same thing.

## Wrapping Up

Navigating terminology across the TF ecosystem can be challenging, but this diversity in the ecosystem isn't necessarily a bad thing. Different interpretations and implementations of concepts like workspaces, stacks, and testing frameworks give teams the flexibility to choose approaches that best fit their needs. This variety of tools and platforms means there are multiple paths to implementing scalable, performant infrastructure.

The key is understanding how these terms are used in different contexts and choosing the tools and implementation patterns that actually gets your software infrastructure to where you want it to be: easy to manage and easy to scale.
