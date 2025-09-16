---
visible: true
draft: false
title: "How to Migrate off Terraform Cloud"
author: Veronika Gnilitska
slug: how-to-migrate-off-tfc
date: 2024-10-10
description: "Need to to migrate off Terraform Cloud? We're happy to share some tips about preparation, pitfalls, and the process itself based on Masterpoint's experience."
image: /img/updates/migrate-off-tfc/main.webp
preview_image: /img/updates/migrate-off-tfc/preview.webp
callout: <p>👋 <b>If you're ready to take your infrastructure to the next level, we're here to help. We love to work together with engineering teams to help them build well-documented, scalable, automated IaC that make their jobs easier. <a href='/contact'>Get in touch!</a>
---

# Introduction

Migrating off Terraform Cloud (TFC) can seem a dreadful task, but with proper planning and execution, it can be done smoothly and efficiently. Whether you're moving due to cost considerations, the need for more control, or the recent licensing changes, this post will walk you through the essential steps and action items to successfully transition your infrastructure automation away from Terraform Cloud.

As a quick aside, we have nothing against HCP Terraform or HashiCorp. The product is full-featured, does a great job at automating Terraform, and the team building it has our respect. We do know many clients, prospects, and colleagues within the industry who are switching away due to their pricing model, the recent acquisition by IBM, or the change in licensing that occurred last year.

The goal of this post is to support that portion of the community as well as share our experience.

By the end of this post, you’ll learn how to migrate away from Terraform Cloud successfully.

# Preparation for Migration

Before diving into the actual migration process, it's crucial to assess your current usage of Terraform Cloud. Here is what you need to do:

1. Decide on the platform to migrate to.
1. Locate your state files. You will need to migrate these state files if they're stored in Terraform Cloud.
1. Evaluate the variables and secrets stored within Terraform Cloud.
1. Evaluate any additional Terraform Cloud use cases or tools that you rely on (for example, drift detection, Infracost, Sentinel, or similar tools).
1. Consider and define any new or different configuration that your new IaC migration destination requires.

This initial assessment will help you plan your migration strategy and ensure no critical data is lost during the transition.

Let’s walk through these steps in more detail.

## Decide On A Platform To Migrate To

You’ve probably already picked one, but in case you’re still hesitating, here are some options to consider: [Spacelift](https://spacelift.io/), [Terrateam](https://terrateam.io/), [Terramate](https://terramate.io/), [Env0](https://www.env0.com/), [Scalr](https://www.scalr.com/), [Atlantis](https://www.runatlantis.io/), [Terrakube](https://terrakube.org/), [Digger](https://digger.dev/), or similar.

Some of them have already taken care of specific migration instructions, e.g. [How to Migrate From Terraform Cloud to Spacelift](https://spacelift.io/blog/how-to-migrate-from-terraform-cloud), [Migrating to Terrakube](https://docs.terrakube.io/user-guide/migrating-to-terrakube), [Migration TFC/E to Scalr](https://github.com/Scalr/terraform-scalr-migrate-tfc). Reviewing provider-specific documentation is a good idea, but this post will help you with a migration no matter your destination.

There’s a lot that goes into choosing a destination, from pricing to features, so make sure you do your due diligence. This guide focuses on tasks you’ll have to go through no matter which solution you choose.

## State File Management

### Locating and Exporting State Files

The transition will be more straightforward if your state files are stored in a cloud object service like Amazon S3. However, if they're stored in Terraform Cloud, you must export and migrate them to a new [state backend](https://developer.hashicorp.com/terraform/language/settings/backends/configuration).

It’s important to note that simply changing the backend configuration (e.g., from Terraform Cloud to S3) when running `terraform init` will **not** automatically migrate your state like it will for other state backends. Instead, you’ll encounter an error, as Terraform does not yet support automated migration from TFC:

```sh
❯ terraform init

Initializing the backend...
Migrating from Terraform Cloud to backend "s3".
╷
│ Error: Migrating state from Terraform Cloud to another backend is not yet implemented.
│
│ Please use the API to do this: https://www.terraform.io/docs/cloud/api/state-versions.html

```

To migrate the state, you must use the Terraform [API](https://www.terraform.io/docs/cloud/api/state-versions.html) to download your state files, which you can then upload to your preferred storage solution.

This extra step makes the migration process more labor-intensive compared to other backends. We’ve found [this detailed guide on downloading your Terraform state files to be helpful](https://github.com/hashicorp/terraform/issues/33214#issuecomment-1553223031). It is a GitHub comment by a HashiCorp team member.

Ensure your new storage solution is configured correctly to handle Terraform state files, including appropriate redundancy, access permissions, and encryption settings. While there are other options, we encourage our clients to utilize their primary cloud’s object storage solution, like AWS S3, Google Cloud Storage, or Azure’s Blob Storage, to ensure that the infrastructure management process is secure, reliable, and integrated within the broader cloud environment. If you want a jumpstart on using S3 as your state storage, [check out Cloud Posse’s tfstate-backend module](https://github.com/cloudposse/terraform-aws-tfstate-backend).

## Variables and Secrets Management

While you can access (and copy) the value of plain variables stored in Terraform Cloud Workspace, _sensitive_ data requires careful handling during migration. Unfortunately, sensitive variables are never shown in the Terraform Cloud UI or API, cannot be edited, and are not directly accessible.

Make a list of all variable and sensitive values used in your Terraform configurations and ensure you have valid values that you can migrate.

If you don’t know the value of a sensitive variable such as a database password, you have several options:

- **Regenerate them**: This means creating a new value for the sensitive variable. However, after regeneration, you need to synchronize the change across your systems that rely on that sensitive variable. For example, if you regenerate the password for a database, any application that connects to that database must be updated with the new password. Some systems, like AWS IAM, allow multiple active credentials at once, giving you time to update dependencies before revoking the old credentials. In more sensitive cases, like database passwords, you may need to schedule a maintenance window to ensure both the database and application configurations are updated simultaneously, preventing any downtime or access issues.
- **Retrieve them by getting Terraform Cloud to output them**: You can configure Terraform Cloud to output sensitive variables if you need to access them directly. To do so, design your configuration so that these variables are marked as non-sensitive and then output them as part of the Terraform state or logs.
- **Retrieve the secrets from the third-party service**: Some services allow you to retrieve existing sensitive credentials (like API keys or access tokens) directly from them.

### Storing Secrets In The Migration Destination

For cloud-independent, vendor-neutral secrets management, we advise clients to use [SOPS](https://github.com/getsops/sops). SOPS is a tool for **S**ecret **OP**eration**S** launched by Mozilla and is now part of the CNCF. It enables you to store secrets in your Git repository in a JSON, YAML, or other file securely encrypted with AWS KMS, GCP KMS, or another cloud key management service. The [SOPS Terraform provider](https://github.com/carlpett/terraform-provider-sops) can be smoothly integrated into Terraform code to use these encrypted secrets.

In addition, we use the [terraform-secrets-helper](https://github.com/masterpointio/terraform-secrets-helper), which is a reusable mixin that we created to further simplify and standardize secrets management in Terraform. It works **in conjunction with** the SOPS Terraform provider and allows users to easily retrieve values from a SOPS-encrypted YAML file. Users provide a path to the SOPS file and the name of the secret (a key in the YAML file), and the helper allows referencing the secret value via a simple local expression, such as `local.secrets["db_pass"]`.

## Additional Considerations

As part of the migration, you don’t want to leave behind any functionality that your organization needs. Terraform Cloud functionality like drift detection or integrations with tools like Infracost, Synk, OPA, and Sentinel are all important aspects of the system that your migration plan must take into account.

Consider these questions for your migration plan:

1. Do you have a cost analysis tool that needs to be implemented in your new solution?
1. Do you have infrastructure management access policies that need to be implemented in your new solution? Think of Sentinel or OPA.
1. Do you have any security scanning that needs to be implemented in your new solution? Consider integrating with Snyk or other similar tools.
1. Do you have any webhooks or notifications executed from Terraform Cloud? You’ll need to migrate the configuration, including tokens, recipients, and anything else.
1. Do you run Drift Detection for any of your Terraform Cloud Workspaces? Do you need your new solution to have analogous functionality?

Finding the answers to these questions for your organization and coming up with a plan to deal with each use case in the planning phase will help ensure a smooth migration.

If you don’t use these tools but want to, plan for an after-migration project. It’s better to migrate functionality between Terraform Cloud and your new solution without improvements or unneeded changes to minimize migration complexity.

## Additional Destination Configuration

The destination you choose might have additional features, configuration, or functionality.

For example, if you’re going to migrate to Spacelift, there is configuration that either doesn’t have a direct equivalent in TFC or wasn’t available because of the tier level:
Do you want to tailor user permissions or workflow very specifically? Define your custom rules with [Rego-based](https://www.openpolicyagent.org/docs/latest/policy-language/) policies.
Are you trying to solve the problem of managing segmentation and access control in large organizations or complex projects with multiple teams? Consider using [Spaces](https://docs.spacelift.io/concepts/spaces) to section up your various Stacks.

Investigate your migration destination and make a plan for using these new features. Again, unless the new functionality is required, plan for a post-migration project.

# Migration Tips

You’re done planning! Now, you can begin the process of migrating. Check out these migration tips and the summarized checklist below, which will help you have a smooth migration process.

## Ensure Your Terraform Cloud Workspaces Have No Drift

One of the best ways to test your migration is to check that a clean plan happens in Terraform Cloud, and after migration, that same clean plan occurs in your new system. If you have any pending changes to your TFC Workspaces, reconcile that drifted state before you begin a migration so that this test strategy is available to you.

## Automate, Automate, Automate

Unless you are migrating fewer than ten TFC Workspaces, use scripts to automate your migration. Avoiding manual steps in your migration efforts will ensure consistency and repeatability.

One great candidate for automation is the process of migrating state file storage out of Terraform Cloud and into an S3 bucket or analogous cloud storage.

## Batch Migrations

Have one hundred instances of the same TFC Workspace? Consider migrating in batches of ten or twenty workspaces at a time and then performing validation on the workspaces you moved.

This approach is faster than migrating one TFC Workspace at a time, but the real value is in risk mitigation. The batch approach minimizes the unpleasant situation where you must fix an issue or logic bug that affects all workspace migrations.

## Testing the Migration

Thorough testing is crucial to a successful migration. While you are planning or migrating a development TFC Workspace, identify key areas where the move could go south and plan for testing. Your ideal scenario is a Terraform plan that shows no changes after the migration, but the reality is usually far from that.

During testing, do the following:

1. Consider adding or improving tests to your Terraform root modules.
1. Diligently review all the changes in the Terraform plan and ensure they are expected. Sometimes, unexpected provider upgrades cause drifts or errors.
1. After the migration, initiate your usual application testing procedure (e.g., smoke testing). If it's a manual process, focus on what could be affected. For example, plan to check the third-party vendor integration to ensure secrets are migrated correctly.

Prepare a detailed checklist to validate each aspect of the migration and ensure nothing is overlooked. There’s an example of such a checklist below.

## Using Import Blocks vs. `state mv`

If your migration includes moving resources between states, prefer using [import blocks](https://opentofu.org/docs/language/import/) instead of the `state mv` command. This option only applies if you are on Terraform 1.5 or later.

Import blocks provide a more straightforward, reliable, and IaC native method for handling state file migrations.

You can pass variables and locals to the import blocks, which saves you from writing complex migration scripts. Here is an example of an `import` block that imports an existing GitHub repository ruleset using the provided repository name and ruleset ID. It is reusable across all the configurations:

```hcl
variable "gh_repository_ruleset_id" {
 type        = number
 description = "GitHub Repository Ruleset ID"
}

variable "gh_repository_name" {
 type        = string
 description = "GitHub Repository Name"
}

import {
 to = github_repository_ruleset.this
 id = format("%s:%s", var.gh_repository_name, var.gh_repository_ruleset_id)
}
```

## General Best Practices for Terraform Migrations

- **Backup and Versioning**: Always have backups of your state files and configurations before starting the migration.
- **Communication Plan**: Keep everyone informed about the migration progress and any potential disruptions.
- **Infrastructure Code Freeze**: Execute an infrastructure code freeze during the migration to prevent any unintended changes or conflicts.
- **Infrastructure Drift**: If you’ve been running Terraform operations against the infrastructure regularly, this is unlikely to happen. Be vigilant about infrastructure drift during the migration process and have a strategy to address it. This may require:
  - Updating variables to match existing resources.
  - Dealing with Terraform providers' updates.
  - Reviewing outstanding proposed changes and applying them.
- **Security Considerations**: Ensure that new storage solutions for state files and secrets comply with your organization's security policies.
- **Rollback Plan**: Have a rollback plan in place in case the migration encounters significant issues. This varies wildly based on your infrastructure, but at the minimum, you should prepare scripts that revert state migration and be ready to revert any changes within the infrastructure code.

## Checklist

Here’s the promised [checklist](https://docs.google.com/document/d/1ibwIi3gKIx7KmhsnQtz8Xseb_gpLasC4wPMRyG57jiA/edit?usp=sharing) in GDoc form, which you can easily copy. This list covers common tasks, but you should review and customize them for your migration project’s unique needs.

# Conclusion

Migrating off Terraform Cloud requires careful planning and execution, but by following these tips, you can achieve a smooth transition. Remember to document your migration process, communicate with your team, and continuously test and refine your approach.

With the right preparation, you'll be well on your way to managing your infrastructure with greater control and flexibility.

Finally, feel free to [reach out to us](https://masterpoint.io/contact/) if you need help or a second set of eyes.

Good luck! 🌟
