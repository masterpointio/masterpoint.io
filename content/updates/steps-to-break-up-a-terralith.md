---
visible: true
draft: false
title: "Steps to Break Up a Terralith"
author: Veronika Gnilitska
slug: steps-to-break-up-a-terralith
date: 2025-03-06
description: In this follow-up to our "What Is a Terralith?" article, we shift the focus from describing the problem to providing a detailed migration plan, practical guidance, and a handy checklist for breaking up a Terralith into smaller, more manageable root modules.
image: /img/updates/steps-to-break-up-a-terralith/main.png
preview_image: /img/updates/steps-to-break-up-a-terralith/preview.png
callout: <p>👋 <b>If you're ready to take your infrastructure to the next level, we're here to help. We love to work together with engineering teams to help them build well-documented, scalable, automated IaC that make their jobs easier. <a href='/contact'>Get in touch!</a></p>
---

<h2>Table of Contents</h2>

- [Overview](#overview)
- [Why Is It a Problem?](#why-is-it-a-problem)
- [Before You Get Started — What You Need to Think About](#before-you-get-started--what-you-need-to-think-about)
  - [The Importance of Version Selection in Terralith Migration](#the-importance-of-version-selection-in-terralith-migration)
  - [Identify Logical Groupings](#identify-logical-groupings)
  - [Assess Dependencies](#assess-dependencies)
  - [State Management](#state-management)
  - [Key Organizational and Team Questions](#key-organizational-and-team-questions)
- [Migrating to Modular Terraform](#migrating-to-modular-terraform)
  - [#1 Confirm a Clean Plan](#1-confirm-a-clean-plan)
  - [#2 Create a Backup](#2-create-a-backup)
  - [#3 Create New Module Structures](#3-create-new-module-structures)
  - [#4 Inter-Module Communication (if any)](#4-inter-module-communication-if-any)
  - [#5 Move Resources to The New State](#5-move-resources-to-the-new-state)
  - [#6 Validate the New Modules](#6-validate-the-new-modules)
- [The Final Checks and Tips](#the-final-checks-and-tips)
- [Grab Our Terralith Breakup Checklist](#grab-our-terralith-breakup-checklist)
- [Conclusion](#conclusion)

## Overview

Do you manage your infrastructure with Terraform or OpenTofu (collectively referred to from here on out as TF)? Have you noticed long `plan` and `apply` durations? Or are you concerned about the blast radius of changes? If so, you might be dealing with a **Terralith**. “Terralith” refers to a monolithic TF architecture where all your resources are managed within a single root module and state file. This setup leads to inefficiencies and increased risk when making changes.

In our previous article, [“What Is a Terralith?”](https://masterpoint.io/updates/terralith-monolithic-terraform-architecture/), we explored the challenges associated with Terraliths and why it’s beneficial to break them into smaller, manageable pieces.

In this guide, we’ll walk you through the steps to break up a Terralith, helping you improve your infrastructure’s maintainability, and overall performance.

## Why Is It a Problem?

The Terralith anti-pattern is insidious. It might not cause immediate disruptions, but that single root module grows behind the scenes. Eventually, it snowballs into a significant challenge that hits hard when you least expect it. The longer you wait to address it, the more complex and time-consuming the solution becomes.

Let’s take a look at the typical symptoms of a Terralith:
- **Large state file(s)**: A large number of resources are stuffed into a single `.tfstate` state file. There’s no universally correct file size or resource count for TF. However, our experience suggests that **if your state files have between a few hundred and 1000+ resources** then you're likely dealing with performance and manageability issues. Not all APIs are the same, so that might not be the case for you, but we're painting with a broad brush here to give you an idea. Ideally, your TF root modules are built around service boundaries that share the same lifecycle, allowing for easy division.
- **One big root module**: There is no clear separation of concern or logical grouping of services, such as databases, networking, and DNS. While deciding how to segment resources can be complex, a foundational best practice is to place unrelated resources in separate root modules. For example, if a Route 53 alias is only used by Service A — and never by Service B — avoid defining it in the same module as Service B.
- **Slow plan/apply operations**: Having many resources in a single state file can cause TF `plan` and `apply` operations to slow down considerably. Even if you don’t know the exact file size or resource count, experiencing sluggish performance is a sign. If your plan regularly takes 10 minutes or more, congrats, you have a Terralith! This issue can also arise when a root module manages many of the same resource types, such as DataDog monitors. In these cases, consider restructuring your configuration (e.g., grouping monitors into logical modules based on who owns them in the organization or their business impact).
- **Complex deployments**: If your deployment process frequently relies on partial or “targeted” applies — for example, using `terraform apply -target=<resource>` — or other manual interventions, your root module resources are too entangled.
- **High blast radius**: If even a small change or upgrade in one part of the infrastructure can affect unrelated components, you probably have a Terralith. This situation increases operational risk.

Over time, these issues compound. They won’t resolve themselves without some investment. Repeated failures during TF operations may block infrastructure or application releases, forcing you to rely on cumbersome workarounds to deploy updates.

If you find yourself hitting these roadblocks, **it’s time to break it up**!

## Before You Get Started — What You Need to Think About

Breaking up a Terralith is a significant undertaking that requires careful planning. Before you begin, let’s cover a few key points that will help you carve up your sprawling root module.

![Terralith Decomposition](/img/updates/steps-to-break-up-a-terralith/decomposition.png)


### The Importance of Version Selection in Terralith Migration

When breaking up a Terralith, choosing the right TF version can significantly enhance your migration process. If you’re still on Terraform 1.4 or earlier, it’s worth upgrading — Terraform/OpenTofu 1.5 and 1.7 introduce new language features that can streamline large-scale refactoring and state manipulation.

**Recommended Terraform/OpenTofu Versions**

We strongly recommend upgrading to **1.7+** for both Terraform and OpenTofu. This version includes the ability to import multiple resources in a single go (by iterating over maps or sets) and the [`removed` block](https://opentofu.org/docs/language/resources/syntax/#removing-resources) for fully declarative state operations. Together, these capabilities simplify the process of major code reorganizations.

If upgrading directly to 1.7 isn’t feasible, moving at least to **1.5+** will still provide benefits, such as declarative [`import` blocks](https://opentofu.org/docs/language/import/) for easier resource management.

### Identify Logical Groupings

Deciding how to split your Terralith depends on your use of TF. Here are some strategies that we've seen work well to split one root module into many:

1. **Functional Root Modules**

    Group resources by their **overall function** - such as networking, storage, or application root modules. While this approach might still result in a large number of resources within a single module, grouping them by a common purpose can simplify their management and lifecycle because they collectively deliver a specific operational domain.

    For example, consider a root module dedicated to managing an ECS (AWS Elastic Container Service) environment. This module would handle the entire lifecycle of the ECS setup, including the ECS cluster, ECS services, autoscaling configuration, and ECS task definitions.

    By grouping these components together, you can update or troubleshoot the ECS environment as a whole without juggling multiple state files or modules. All related resources are versioned and deployed together, ensuring consistent lifecycle updates. One drawback is that if only part of the ECS environment requires frequent changes, you might need to redeploy the entire module — even if some components remain unchanged.

    Functional root modules are ideal when you want to manage a cohesive set of related resources in a centralized manner, making management and lifecycle coordination straightforward but potentially leading to larger module sizes.

2. **Fine-grained Root Modules**

    Break down resources into even smaller, more specialized root modules that focus on **individual services**. This approach takes a deeper level of granularity than functional grouping.

    For example, within the same ECS environment, you might separate the module into:
    -  A dedicated root module for the ECS cluster and its core configuration.
    -  One or more independent root modules for individual ECS services.

    This way, if a team needs to update a particular ECS service, they can do so without potentially affecting the underlying cluster or other services. Such granularity demands a higher degree of Infrastructure as Code (IaC) automation and coordination among teams.

    Fine-grained root modules offer greater flexibility and faster operations by isolating individual components into their own root modules. However, this approach increases operational complexity due to the higher number of moving parts.

3. **Update Frequency**

    Consider which resources change most often (e.g., application-level changes) versus those that remain relatively static (e.g., your VPC). Splitting them by how frequently they’re updated can help isolate the high-change infrastructure from more stable infrastructure.

    You might think to use **environment-based** **segregation** or **modules aligned with the organizational structure** (such as departments or teams). Although this can help isolate changes to specific environments or foster team autonomy, we generally don’t recommend it. As your organization grows, there’s a high likelihood these organization-based root modules will expand until they become another Terralith.

### Assess Dependencies

Resource and data source attributes, along with module outputs, are often used to share values among dependent resources. Before splitting your Terralith, identify these dependencies so you don’t introduce issues during deployment. Determine which resources rely on outputs from others to avoid breaking critical links throughout the migration.

You can do this by:
- Searching the codebase: Use a text search in your repository to find where resource names or outputs are referenced.
- Using [`graph`](https://opentofu.org/docs/cli/commands/graph/): This command generates a dependency graph you can visualize to see how resources interconnect.
- Temporarily commenting out resources: Another quick approach is to comment out a resource and run `plan` to see if there are errors indicating dependencies still linked to that resource.
- Checking TF state: Running `state list` can help confirm which resources are managed, then cross-reference them with your code to see where outputs or data sources might be consumed.

### State Management

Plan how you’ll manage multiple state files and keep them consistent. The organization of these files may differ based on your needs. We recommend storing your TF state in a reliable cloud storage solution. For example, on AWS, use an S3 bucket in the root or shared-services account as your backend, with DynamoDB for state locking. This solution offers versioning, encryption and enforces access control using IAM. A resource to help you set up state management on S3 is the open-source child module [cloudposse/terraform-aws-tfstate-backend](https://github.com/cloudposse/terraform-aws-tfstate-backend).

We explore this topic in detail in our blog post on [why cloud object storage is the best option for a Terraform remote state and backend](https://masterpoint.io/updates/why-use-cloud-object-storage-terraform-remote-backend/).

### Key Organizational and Team Questions

Breaking up a Terralith is not only a technical problem. There are organizational hurdles as well.

Questions you might ask yourself include:
- What updates must we make in our CI/CD pipelines to accommodate these changes?
- Are we prepared to revert changes if issues are detected? Do we have a rollback plan if something goes wrong?
- Which teams will be affected, and how do we collaborate and communicate effectively with them?
- Should we pause all IaC changes, so the breakup can be scheduled? If so, when?
- Do we have a clear understanding of every step in the migration process? Do affected teams?
- What’s the most effective way to document this migration, both to ensure smooth execution and to maintain a historical record?
- How can we build in guardrails to avoid future drifts toward a Terralith?

There may be additional factors unique to your organization that warrant further exploration, such as compliance requirements, security policies, budget constraints, or company-specific workflows.

## Migrating to Modular Terraform

Now that you’ve done the prep work above, we’ll outline a step-by-step process, including key insights and lessons learned from our experience. While every migration we’ve worked on has taken a unique path, there are recurring patterns and common gotchas worth highlighting.

### #1 Confirm a Clean Plan

Before making any changes:

- Run `terraform plan` or `tofu plan` against your Terralith root module to ensure there are no pending additions, modifications, or deletions.
- If you don't have a clean plan, **stop now**. Resolve any drift between your configuration and the actual state. This is important to do now so you can accurately validate if the breakup of your Terralith introduced any changes to your IaC or underlying infrastructure when the migration is complete.

### #2 Create a Backup

Always keep backups of your Terraform state files before doing any large-scale operations. Use `state pull` command to retrieve the current state and pipe it into a file. For example:
```sh
tofu state pull > $(date +%F)-terraform-state-backup.tfstate
```

This command saves your state to a timestamped file. Remember to store your backups in a secure location!

### #3 Create New Module Structures

- For each new root module that you plan to introduce, create a separate directory.
- Move the relevant resource configurations from the Terralith into the new root modules.
- Initialize each new root module to ensure the backend is configured correctly.

### #4 Inter-Module Communication (if any)

If any root module depends on outputs from another, update the references using data sources, variables, or remote state. We recommend using data sources over [`terraform_remote_state`](https://developer.hashicorp.com/terraform/language/state/remote-state-data) whenever possible.

For example, instead of retrieving subnets from a “network” module via [terraform_remote_state](https://registry.terraform.io/providers/hashicorp/terraform/latest/docs/data-sources/remote_state), you can use the AWS data source for subnets when provisioning a “database” module. This approach reduces coupling, keeps modules more autonomous, and ensures that changes in one module (like adding a subnet) don’t break another. Plus, any orchestration tool can trigger each root module independently, letting them fetch the latest infrastructure details directly from AWS without inter-module dependency on state files.

### #5 Move Resources to The New State

There are several ways to migrate the resources to their new state files depending on your TF version, the providers in use, and the data you must supply for imports.

- **Option 1: Declarative Migrations Using TF 1.5+**

  This is our preferred method. The idea here is to use declarative TF blocks to import resources into the new root modules state and then declaratively remove them from the old state.

  **Importing existing resources**

  In newer versions of TF, you can define [import](https://developer.hashicorp.com/terraform/language/import) blocks to move resources between modules in a declarative fashion. This method preserves resource history in Git and is more transparent and less error-prone than the alternative of manual state manipulation. This block is idempotent - once a resource is successfully imported, subsequent runs won’t trigger the same import action as long as that resource remains in that particular state file.

  You can place `import` blocks in a separate file `imports.tf` in your new root module and then remove it after completing the migration.

  While the import functionality is great, it gets even better. With Terraform or OpenTofu v1.7 or later, you can import several resources by iterating over a map or a set. Below is a sample configuration demonstrating how to use an import block with `for_each` for multiple GitHub repositories.

  ```hcl
  locals {
    # Define a list of repository names to import
    repos = {
      "repo-foo": { description = “Our repo foo” },
      "repo-bar": { description = “Our repo bar” },
    }
  }

  resource "github_repository" "default" {
    # Create one github_repository resource for each entry in local.repository_names
    for_each = local.repos

    name        = each.key
    description = "${each.value.description}. Managed by Terraform"
    visibility  = "private"
  }

  import {
    # Loop over the same list of repository names
    for_each = local.repos

    # Link each repository name to the corresponding github_repository instance
    to = github_repository.default[each.key]

    # Use the repository name (string) as the ID to import
    # Docs: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository#import
    id = each.key
  }
  ```


  **Removing resources from your configuration (with Terraform/OpenTofu 1.7 or later)**

  Even though we're importing the resources into the new root module’s state, that does not mean our Terralith will stop managing them. To finalize the migration, we need to remove the imported resources both from the code and from the state file.

  To remove them from the code, simply delete the `resource` of `module` blocks from the Terralith root module that you imported into the new root module.

  To remove them from the state, utilize the [`removed`](https://opentofu.org/docs/language/resources/syntax/#removing-resources) block. When released, this was a highly anticipated feature that complements the `import` block, enabling fully declarative state removal operations. By adding it to your Terralith root module, you tell TF to remove specific resources (or modules with multiple resources) from its state without destroying the actual infrastructure objects. Once added, an `apply` will remove the specified blocks from the state file.

  ```hcl
  removed {
    # No need to specify instance keys such as `module.github_repos["foo"]`
    from = module.github_repos
  }
  ```

  Once the new root module manages the existing resources and they have been successfully removed from the Terralith codebase and state file, the migration of those resources is complete.

  **Are there any caveats?**

  Yes! Keep the following in mind:
  - **Provider limitations**: Not all providers or resources fully support import blocks. In some cases, you may need to rely on command-line operations or scripting (see the example script below).
  - **Immediate removal**: Once a resource has been imported elsewhere, remove it from the legacy Terralith root module right away to avoid collisions between two states managing the same resource.
  - **Collecting resource identifiers for import:** You’ll need to gather the necessary data to import your resources. Sometimes resources can be imported by name, making them easy to identify and collect. In other cases, you may need unique IDs that require pulling data from an API using custom scripts. Be sure to factor these requirements into your planning.

  If you are not using TF 1.7+, you should remove the resources using the CLI. We’ll look at that option next.

- **Option 2: Migration Using CLI Commands**

  When importing isn’t possible (for example, you’re not ready to upgrade the TF version or the provider doesn’t support importing that resource), you should use `terraform state mv` or `tofu state mv` [commands](https://opentofu.org/docs/cli/commands/state/mv/) to operate on the live state files. We recommend automating this process which consists of several main steps: *pull* the current state, *move* the resources, and *push* the updated new state. This requires having both the old and new state files accessible locally.

  Common practice is to write shell scripts to batch-move multiple resources. This is necessary if your Terralith contains hundreds of resources. Scripting avoids repetitive manual commands and reduces the likelihood of human error.

  Below is an [example migration script](https://gist.github.com/gberenice/4d51f117586cba8359751599b4ed66ac) adapted for GitHub repository resources. It demonstrates how to move resources from a `terralith` root module to a dedicated `github-repos` module.

  ```sh
  #!/bin/bash
  ###
  ### `github_repos_migration.sh` script purpose is to migrate the state to a new GitHub repositories root module.
  ### This script must be run from your root-modules directory, see below for the expected directory structure.
  ### └── root-modules
  ###            ├── terralith # legacy root module ($SRC_ROOT_MODULE)
  ###            └── github-repos # new root module ($DESTINATION_ROOT_MODULE)

  set -eu -o pipefail

  SRC_ROOT_MODULE="terralith"
  DESTINATION_ROOT_MODULE="github-repos"
  DATE=$(date +"%Y-%m-%d")
  DESTINATION_STATE_FILE="github-repos-state-$DATE.tfstate"
  SRC_STATE_FILE="terralith-state-$DATE.tfstate"

  function mv_resource() {
      if ! tofu state mv -state-out="../$DESTINATION_ROOT_MODULE/$DESTINATION_STATE_FILE" "$1" "$1"; then
          echo "Check if the resource exists in the source state with: tofu state list | grep $1"
          exit 1
      fi
  }

  function main() {
      echo "⏳ Starting migration..."
      # Change into destination root module so we can pull state file and confirm initialized
      cd "$DESTINATION_ROOT_MODULE"
      tofu init

      # Pull the destination state into a local file so we can move resources to it
      tofu state pull > "$DESTINATION_STATE_FILE"

      # Confirm the source root module is initialized
      cd "../$SRC_ROOT_MODULE"
      tofu init

      # Pull the source state into a local file as a backup
      tofu state pull > "$SRC_STATE_FILE"

      # Move resources
      mv_resource "github_repository.foo"
      mv_resource "github_repository.bar"

      # Push the updated state file
      cd "../$DESTINATION_ROOT_MODULE"
      tofu state push "$DESTINATION_STATE_FILE"

      echo "Migration completed 🎉"
  }

  main
  ```

  **Importing and Removing resources**

  Alternatively, you can use two separate scripts instead of one in case you'd like to import resources first, validate everything, and only then remove them from the old state once you’re confident the new setup is functioning correctly.

  [*Importing*](https://opentofu.org/docs/cli/import/) existing resources to bring them into a new root module state, using `import`:

  ```sh
  tofu import module.github_repos["foo"] "foo-repo"
  ```

  [*Removing*](https://opentofu.org/docs/cli/commands/state/rm/) resources from the Terralith root module’s state (you simply stop tracking certain resources without destroying them in the underlying infrastructure), using `state rm`:

  ```sh
  tofu state rm github_repository.foo
  ```

  **Are there any caveats?**
  - Always back up your state files before performing any state manipulations.
  - Be meticulous when specifying resource addresses to prevent state corruption! Remember that resource names can differ between the source and destination root modules, so confirm your resource identifiers carefully during migrations.

### #6 Validate the New Modules

After moving resources into their new root modules and state files, run `terraform plan` in each module to check for any surprises. You should have a clean plan. Ensure that Terraform recognizes all resources correctly and doesn’t attempt to re-create or destroy anything inadvertently.

## The Final Checks and Tips

Consider these tips to ensure a smooth, risk-free migration:
- **Automate the process**: Whenever possible, script your migration tasks rather than relying on manual terraform state commands.
- **Test in lower environments**: Run your migration scripts in a sandbox or development environment before applying them to more critical environments.
- **Coordinate with your team**: Make sure no one (whether people or CI/CD tools like Spacelift) is modifying the same state in parallel, which could lead to conflicts or drifts.
- **Take it in stages**: For large or complex migrations, break out resources one by one rather than all at once. Start with those that pose the least risk - such as less risky or less frequently updated services - to minimize impact if something goes wrong. As you gain confidence, tackle more critical or frequently changing components. This reduces risk and helps iron out issues early in the process.

Automated validation is crucial to ensure the integrity of your infrastructure after the breakup and in the future. Don’t forget about these tools and processes you can rely on when it comes to validation and testing:

- **Automated testing:** Use tools like Terratest or native TF testing to write automated tests. Integrate tests into your CI/CD pipeline.
- **Monitoring and alerting:** Configure alerts for anomalies or downtime.
- **Review logs**: Monitor logs for any errors or warnings.

##  Grab Our Terralith Breakup Checklist

<div style="text-align: center;">
  <img src="/img/updates/steps-to-break-up-a-terralith/checklist.png" alt="Terralith Breakup Checklist">
</div>


Ready to move from theory to action? We’ve consolidated everything into a single, handy checklist. Refer to the [Terralith Breakup Checklist](https://docs.google.com/document/d/1rQy-jomBuE25h2WWM7-7f-_YTRTRUAotTO6ShsM0a-w/edit?usp=sharing) to ensure you don’t miss any critical details and set yourself up for a smooth, successful migration.

## Conclusion

Breaking up a Terralith into smaller, more manageable modules is **crucial** for organizations seeking to improve speed, reduce risk, and follow modular best practices in Infrastructure as Code. While newer Terraform/OpenTofu features like `import` and `remove` blocks have made migrations easier, there is still complexity and potential for error. Hence, our emphasis on scripts, backups, careful planning, and validation.

While the process requires care during planning and execution, the benefits of a modular and maintainable infrastructure are well worth the effort.

If you need assistance or have questions about the process, our team at Masterpoint are the go-to experts in IaC. We’ve done this dozens of times and can help guide you through breaking up your Terralith and setting up future-proof IaC.

We also love to nerd out about this stuff. Feel free to reach out with your thoughts, stories, and experiences about breaking up Terraliths!
