---
visible: true
draft: false
title: "How to Migrate off Terraform Cloud"
author: Veronika Gnilitska
slug: how-to-migrate-off-tfc
date: 2024-07-25
description: "Need to to migrate off Terraform Cloud? We're happy to share some tips about preparation, pitfalls, and the process itself based on Masterpoint's experience."
image: /img/updates/migrate-off-tfc.jpeg
callout: <p>👋 <b>If you're ready to take your infrastructure to the next level, we're here to help. We love to work together with engineering teams to help them build well-documented, scalable, automated IaC that make their jobs easier. <a href='/contact'>Get in touch!</a>
---

# Introduction

Migrating off Terraform Cloud could seem a dreaded task, but with proper planning and execution, it can be done smoothly and efficiently. Whether you're moving due to cost considerations, the need for more control, or other reasons, this post will walk you through the essential steps and action items to successfully transition your infrastructure management away from Terraform Cloud.

# Preparation for Migration

Before diving into the migration process, it's crucial to assess your current usage of Terraform Cloud.

1. Locate your state files. They should ideally be in your cloud object store (e.g., S3 in AWS). You must transition the states to retain them if they're in Terraform Cloud.
1. Evaluate the variables and secrets stored within Terraform Cloud.
1. Assess your infrastructure for signs of the "Terralith" issue.
1. Consider any additional requirements by the Infrastructure as Code (IaC) tool you choose.

This initial assessment will help you plan your migration strategy and ensure no critical data is lost during the transition.

## State File Management

### Locating and Exporting State Files

The transition will be more straightforward if your state files are stored in a cloud object service like S3. However, if they're stored directly in Terraform Cloud, you must export them.

Terraform provides commands to download your state files, which you can then upload to your preferred storage solution. Here is a detailed guide from the Hashicorp team member on how to achieve that: [Document the migration path from Terraform Cloud to a standard backend #33214](https://github.com/hashicorp/terraform/issues/33214#issuecomment-1553223031)

Ensure your new storage solution is properly configured to handle Terraform state files, including setting appropriate access permissions and encryption settings.

## Variables and Secrets Management

While you can access (and copy) the value of variables stored in Terraform Cloud Workspace, _sensitive_ data requires careful handling during migration. Unfortunately, sensitive variables are never shown in the HCP Cloud UI or API, can't be edited, and may not be directly accessible. However, they may appear in Terraform logs if your configuration is designed to output them.

Make a list of all sensitive data used in your Terraform configurations and ensure you have copies. Otherwise, you'll need to regenerate or retrieve them manually.

### Introducing SOPS for Secret Management

For better secrets management, consider using [SOPS](https://github.com/getsops/sops) - a tool for Secret OPerationS launched by Mozilla and is now overseen by a group of maintainers within the CNCF. It enables you to store secrets in your Git repository in a file (e.g., YAML or JSON) encrypted with AWS KMS, GCP KMS, etc. The [SOPS Terraform provider](https://github.com/carlpett/terraform-provider-sops) can be smoothly integrated into your Terraform code to utilize these encrypted secrets, providing an additional layer of security and ease of management. Check out [terraform-secrets-helper](https://github.com/masterpointio/terraform-secrets-helper) by Masterpoint to gain a more in-depth understanding and explore the example provided.

## Breaking Up Monolithic Configurations (Terraliths)

Migrating off Terraform Cloud might be an excellent opportunity to refactor the large, monolithic Terraform configurations often called Terraliths. It might sound like a nonsensical idea - you're already working on a complex migration task, so why add another challenging item to the scope? However, based on our experience, _in some cases_, it can be very beneficial, reducing risks and simplifying the migration process and testing.

Are your state files too large? Does the `plan` operation take forever due to the number of resources? Is it hard to maintain? It might be a good time to review your Terraform configurations, reorganize the resources, and thereby make your code more manageable.

# Migration Tips

## Migrating Development and Non-Production Environments First

Start your migration with development and non-production environments to reduce risk. This allows you to refine your migration process and address any issues in a lower-risk setting.

Automate the migration steps as much as possible to ensure consistency and repeatability.

## Batch Migrations for Larger Environments

If you manage complex but repeatable environments (e.g. a large number of resources for hundreds of clients), consider migrating in batches and, basically, performing canary deployment. This approach helps minimize circumstances where you must fix the same issue in different environments.

Ensure that each batch is thoroughly tested before proceeding to the next.

## Testing the Migration

Thorough testing is crucial to a successful migration. Identify key areas where things could go south and that need testing. In the perfect case your plan should have no changes after the migration but the reality is usually far from that.
1. Consider adding or improving tests to your Terraform configuration.
1. Diligently review all the changes in the plan and ensure they are expected. Sometimes, even unexpected provider upgrades could cause drifts or errors.
1. After the migration, initiate your usual application testing procedure (e.g., smoke testing). If it's a manual process, focus on the things that could be affected, e.g., checking the third-party vendor integration to ensure the migrated secrets are properly consumed.

Prepare a detailed checklist to validate each aspect of the migration and ensure nothing is overlooked.

## Using Import Blocks vs. `state mv`

When migrating state files, prefer using [import blocks](https://opentofu.org/docs/language/import/) instead of the `state mv` command. Import blocks provide a more straightforward and reliable method for handling state file transitions.

You can pass variables and locals to the import blocks, which saves you from writing complex migration scripts. Here is an example of the `import` block that is reusable across all the configurations:

```hcl
locals {
  gh_repo = format("client-%s", lower(var.client_name))
}

variable "gh_repository_ruleset_id" {
  type        = number
  description = "GitHub Repository Ruleset ID"
}

import {
  to = module.github.github_repository_ruleset.this
  id = format("%s:%s", local.gh_repo, var.gh_repository_ruleset_id)
}
```

## General Best Practices for Terraform Migrations

- **Backup and Versioning**: Always have backups of your state files and configurations before starting the migration.
- **Communication Plan**: Keep everyone informed about the migration progress and any potential disruptions.
- **Infrastructure Drift**: Be vigilant about infrastructure drift during the migration process and have a strategy to address it.
- **Security Considerations**: Ensure that new storage solutions for state files and secrets comply with your organization's security policies.
- **Rollback Plan**: Have a rollback plan in place in case the migration encounters significant issues.

# Conclusion

Migrating off Terraform Cloud requires careful planning and execution, but by following these tips, you can achieve a smooth transition. Remember to document your migration process, communicate with your team, and continuously test and refine your approach. With the right preparation, you'll be well on your way to managing your infrastructure with greater control and flexibility.

Good luck! 🌟

