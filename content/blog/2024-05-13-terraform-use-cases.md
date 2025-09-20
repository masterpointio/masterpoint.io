---
visible: true
draft: false
title: "Three Terraform Use-cases You Need to Start Implementing"
author: Matt Gowie
date: 2024-05-13
# date_modified: 2025-xx-xx Be sure to use this if you've updated the post as this helps with SEO and index freshness
slug: terraform-use-cases
description: "Engineering orgs that use IaC tools like Terraform aren’t typically maximizing their leverage. This article highlights at least three uses of Terraform and IaC automation that don’t necessarily center around traditional application workload infrastructure."
image: /img/updates/tf-use-cases.jpeg
callout: <p>👋 <b>If you're ready to take your infrastructure to the next level, we're here to help. We love to work together with engineering teams to help them build well-documented, scalable, automated IaC that make their jobs easier. <a href='/contact'>Get in touch!</a>
---

One of the main themes we’ve noticed is that platform teams often struggle when embracing the "as code" philosophy. Sure, they'll use OpenTofu or Terraform (collectively referred to from here on out as “TF”) to manage compute and other cloud resources, but they tend to stop short of applying the same principles to _everything_ in their operational domain.

The goal isn't just to automate a few things here and there; the real aim is to automate _everything_. Every single operations process should be represented as code.

Why? Because when you do that, you unlock a new level of consistency and reliability in managing systems that have traditionally been afterthoughts for infrastructure-as-code.

In this article, we're going to highlight some resources you might be surprised to learn can be managed:

- users
- Git repos
- monitoring and alerting configuration

Hopefully, your takeaway is the same thing we preach to everyone we work with: if you want a solid platform, use IaC for _everything_.

### Why Aren’t People Using Terraform for Everything?

There are a few reasons why engineers might not be using Terraform to deploy resources like Git repositories, user management, or monitoring. One common reason we often see is that they simply don't think to do it, as they may be more focused on implementing everything else from scratch. In the case of Git repositories, engineers might view it as a chicken-and-egg problem, where they manually create repositories before deploying code, rather than automating the entire process with Terraform. Additionally, time constraints and pressure to deliver quickly can lead engineers to stick with their tried-and-tested workflows instead of exploring new approaches like using Terraform to handle it all.

### Team member account management and Role Based Access Control

Managing user accounts and roles across multiple SaaS products can be a real headache, especially when those products don't support Single Sign-On (SSO). It's a task that often falls on the shoulders of senior leadership and engineering teams, eating up hours of their time that could be better spent on more strategic initiatives. Fortunately, TF can make this process much less painful.

Before we look at an example, it's worth noting that many SaaS vendors seem to have missed the memo on the importance of SSO for security. As highlighted by [The SSO Wall of Shame](https://sso.tax/), many vendors offer SSO but treat it as a premium feature, bundling it with expensive "Enterprise" pricing tiers or charging multiple times the base product price for the functionality. This practice disincentivizes the use of SSO and encourages poor security practices, especially for smaller organizations that may not have the budget for the higher-tier plans.

In a typical software engineering organization, there are likely several service platforms that require managing users and access levels. A common, bare-minimum stack might include AWS, GitHub, CloudFlare, and Datadog for starters. For teams without the benefit of SSO, access to these services is a cumbersome task to manage manually. Each time a team member joins or leaves the organization means one person needs to log in to all of these platforms and add or remove that team member. With TF, you can centralize users and identity management and make life much easier (and more secure).

For AWS users, AWS offers [IAM Identity Center](https://aws.amazon.com/iam/identity-center/) (formerly AWS SSO), which simplifies AWS account and role management. But for organizations that haven't jumped on the SSO bandwagon yet, or are using a mix of services with and without SSO support, TF can standardize onboarding and offboarding regardless of vendor. By defining users and roles in a `team.yaml` file, TF Root Modules can automatically create and manage these entities across all the different platforms you're using.

Here’s an excerpt of a `team.yaml` file that describes a hypothetical DevOps team:

```yaml
devops_team:
  name: DevOps
  description: Internal DevOps Team
  privacy: closed
  members:
    - name: Jane Doe
      gh_username: JaneyDoe100
      email: doe@abccorp.com
      gh_role: maintainer
      datadog_role: Standard
    - name: John Smith
      gh_username: CloudWizard1212
      email: smith@abccorp.com
      gh_role: member
      datadog_role: Read-Only
    - name: Finn Mertens
      gh_username: IceKing99
      email: mertens@abccorp.com
      gh_role: member
      datadog_role: Standard
```

We can use this central file to manage our team in code. Rather than requiring N clicks, adding a new service or user account only requires updating this file. Then, we can read this file and deploy this team to all the services using TF. In this example, we’ll update GitHub and Datadog:

```hcl
locals {
  # We choose to make this a YAML file we load instead of a variable so that
  # other team members can easily add / edit / remove entries without any TF
  # knowledge
  team_data = yamldecode(file("${path.root}/team.yaml"))
}

resource "github_team" "devops" {
  name        = local.team_data.devops_team.name
  description = local.team_data.devops_team.description
  privacy     = local.team_data.devops_team.privacy
}

resource "github_team_members" "devops_members" {
  for_each = { for member in local.team_data.devops_team.members : member.gh_username => member }

  team_id  = github_team.devops.id
  username = each.value.gh_username
  role     = each.value.gh_role
}

module "datadog_users" {
  source  = "masterpointio/datadog/users"
  version = "X.X.X"

  users = [ for member in local.team_data.devops_team.members: {
      email    = member.email,
      name     = member.name,
      role     = [member.datadog_role],
      username = member.gh_username
    }
  ]
}
```

This is a simple example, but it should provide an idea of the possibilities when adopting IaC to manage users and roles. By using IaC, instead of having to log in to each platform individually to add or remove team members, we can now change a single file and have everything update automatically when we deploy code changes. Additionally, since all changes are tracked in Git, we have a complete history of who made the change, what was changed, when it was changed, and why it was changed.

### Git Repository Management

If you're managing code repositories across GitHub, GitLab, or other Git providers, you know how much of a headache it can be, especially if you're working with a [polyrepo](https://github.com/joelparkerhenderson/monorepo-vs-polyrepo?tab=readme-ov-file#what-is-polyrepo) setup. Managing branch protections and keeping access control consistent across all those repos? It's a real challenge. It should be no surprise that we again reach for IaC to help us maintain consistent and secure repository configurations.

In many organizations, developers are tasked with setting up code repositories manually, leading to a patchwork of inconsistent configurations and security settings across projects. Without a standardized approach, each repository may have different branch protection rules, access controls, and other settings, making it difficult to ensure that best practices are being followed consistently. Rolling out new configuration turns into a project. Finally, lack of uniformity can lead to vulnerabilities and make it harder to manage repositories at scale.

We’re big proponents of not re-inventing the wheel, particularly when there are so many great, community-maintained off-the-shelf modules that can be used, and GitHub repository Terraform is no exception. We like the repository module from our friends at Mineiros (now the team behind [Terramate](https://terramate.io/)): [https://github.com/mineiros-io/terraform-github-repository](https://github.com/mineiros-io/terraform-github-repository). This module offers a wide range of features that go beyond the basic `github_repository` resource, including more secure defaults like private repo, read-only deploy keys, as well as branch management and protection, merge strategies, metadata, and more. Here’s a simplified example of how we use this module to deploy multiple repositories:

```hcl
locals {
  repositories = {
    backend-api = {
      name               = "backend-api"
      license_template   = "apache-2.0"
      gitignore_template = "Go"
    },
    infra = {
      name              = "infra"
      license_template   = "mit"
      gitignore_template = "Terraform"
    }
  }
}

module "repositories" {
  source  = "mineiros-io/repository/github"
  version = "0.18.0"

  for_each = local.repositories

  name               = each.value.name
  license_template   = each.value.license_template
  gitignore_template = each.value.gitignore_template
}
```

### Monitor and Alert Management

Another task engineers often get stuck with: setting up monitoring and alerting configurations manually. It is no surprise that this leads to a hodgepodge of inconsistent thresholds and settings across different services and stacks. Without a standardized approach, similar application deployments may have different criteria for what constitutes an alert, making it difficult to ensure that best practices are being followed consistently. This lack of uniformity can lead to noisy or missing alerts and make it harder to manage monitoring at scale.

But there's a better way! Managing your metric thresholds and alert configurations via code enables shared context across your teams. It makes it easier for a developer to add a new alert or modify an existing one that's been driving everyone crazy with false positives. Managing this integration layer this way also avoids “ClickOps”: using provider UIs to deploy complex infrastructure. Instead, application resources _and their monitoring configurations_ can be provisioned in code, as well as versioned together.

We’re big fans, contributors, and maintainers of the Cloud Posse Module library, and luckily that module library includes two great modules for this use-case: the [terraform-datadog-platform](https://github.com/cloudposse/terraform-datadog-platform) and [terraform-aws-datadog-integration](https://github.com/cloudposse/terraform-aws-datadog-integration) modules. We utilize the integration module to activate the initial integration between our target AWS accounts and a Datadog account, and the platform module to configure a variety of Datadog resources, including:

- monitors
- synthetics
- and more

Here is an example of a monitor configuration that we use with many clients:

```yaml
rds-cpuutilization:
  enabled: true
  name: "[${environment}] (RDS) CPU utilization is high"
  query: |
    avg(last_15m):avg:aws.rds.cpuutilization{env:${environment}} by {dbinstanceidentifier} > 90
  type: metric alert
  message: |
    {{#is_warning}}
    {{dbinstanceidentifier}} CPU Utilization above {{warn_threshold}}%
    {{/is_warning}}
    {{#is_alert}}
    {{dbinstanceidentifier}} CPU Utilization above {{threshold}}%
    {{/is_alert}}
  escalation_message: ""
  tags: ${tags}
  priority: 3
  notify_no_data: false
  notify_audit: false
  require_full_window: true
  enable_logs_sample: false
  force_delete: true
  include_tags: true
  locked: false
  renotify_interval: 60
  timeout_h: 0
  evaluation_delay: 60
  new_group_delay: 0
  new_host_delay: 300
  groupby_simple_monitor: false
  renotify_occurrences: 0
  renotify_statuses: []
  validate: true
  no_data_timeframe: 10
  threshold_windows: {}
  thresholds:
    critical: 90
    warning: 85
```

Defining monitoring inside IaC not only improves the consistency of your platform’s site reliability operations, but it also delivers a significant reduction in iteration and delivery times for production applications.

## Conclusion

Infrastructure as Code (IaC) is a powerful tool that makes managing software infrastructure much easier; unfortunately we often see engineering teams that don’t go all the way with it. Don’t get us wrong: using IaC to deploy application infrastructure like containers and databases is a massive win, but not using it for things like repositories and monitoring is missing out on a huge part of the value proposition. This is why we use TF after all: so we can translate more than just our compute and storage into code.

Making the transition to **fully** automated infrastructure requires a committed effort from engineers, but the benefits are clear. By leveraging IaC to its full potential, you can create platforms that are more reliable, more efficient, and better able to scale as your organization and applications do.
