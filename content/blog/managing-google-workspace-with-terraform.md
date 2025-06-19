---
visible: true
draft: false
title: "Managing Your Google Workspace with Terraform"
author: Weston Platter
date: 2025-06-19
slug: managing-google-workspace-with-terraform
description: "Migrate Google Workspace from click-ops to Infrastructure as Code with our open source Terraform module. Includes design patterns and import examples."
tags: ["terraform", "google-workspace", "iac", "automation"]
callout: <p>👋 <b>If you're ready to take your infrastructure to the next level, we're here to help. We love to work together with engineering teams to help them build well-documented, scalable, automated IaC that make their jobs easier. <a href='/contact'>Get in touch!</a>
---

## Table of Contents

- [Why This Matters for Growing Teams](#why-this-matters-for-growing-teams)
- [Managing Google Workspace with Terraform](#managing-google-workspace-with-terraform)
- [Getting Started With the Module](#getting-started-with-the-module)
- [Design Decisions to Make It Intuitive](#design-decisions-to-make-it-intuitive)
  - [Design Decision #1 - Testing with Integration and Validation Tests](#design-decision-1---testing-with-integration-and-validation-tests)
  - [Design Decision #2 - Chose intuitive Terraform variables that diverged from Terraform resources](#design-decision-2---chose-intuitive-terraform-variables-that-diverged-from-terraform-resources)
- [Wrapping Up](#wrapping-up)

# Managing Your Google Workspace with Terraform

As Masterpoint has been around for almost 10 years now, we've experienced growing pains transitioning from a one-person consultancy to a small team of core full-time engineers, with the help of additional contractors when needed.

During that time, we've focused on client projects more than our own internal systems. When I joined in December, we started to feel the friction of onboarding a new Google Workspace user more acutely. Matt (CEO/CTO) had to remember what permissions a new Google Workspace user gets by default, how to provision SSO permissions for Masterpoint's AWS Accounts, and how to get a user set up for client-specific SSOs. Since he hadn't gone through that process in 6 months, he forgot some important details, which resulted in delayed access to the Masterpoint AWS accounts and took time away from his ability to focus on other work due to tedious administrative tasks.

## Why This Matters for Growing Teams

In our small company and possibly in your own organization, it's not a big deal for the founder or early engineer to create a new employee's Google Workspace account or give them SSO account access via the Admin UI. But as a company scales:

- Founders or engineers are (hopefully) focused on product, customers, and strategy.
- Nobody remembers why or when a permission was changed.
- Group membership becomes inconsistent.
- Onboarding/offboarding gets slower and error-prone.
- The stakes for getting security permissions correct increase.

As a company grows past 10, dozens, or 100+ people, teams (and dare we say departments) become more distributed and harder to manage across many different SaaS tools. It's important to have systems in place that provide clarity and enable individuals to get the right work done in a timely manner. We believe efficient systems are part of a company evolving into higher levels of organizational maturity.

## Managing Google Workspace with Terraform

We looked at a couple of open source solutions and decided on using the Terraform [Google Workspace](https://github.com/hashicorp/terraform-provider-googleworkspace) provider. We often use SaaS-specific Terraform providers to provision user accounts for DataDog and other SaaS services, so this was an easy decision.

We heard great things about [GAM](https://github.com/GAM-team/GAM) (an imperative command line tool) from a few colleagues, but we didn't need its full range of capabilities and prefer to use declarative systems so we know the user account and group settings we see in config files are indeed the values in production.

In terms of using the provider, while there are a few Terraform modules out there for managing Google Workspaces, we decided to create our own Terraform module. The motivation to build a new module from scratch stemmed from our desire to:

1. Democratize user onboarding powers so Matt (CEO/CTO) is not a bottleneck.
2. Provide transparency and history for changes to our team's permissions.
3. Easily manage SSO configurations allowing engineers to sign into multiple AWS accounts using their Google Identity.
4. Intuitively organize user and team settings in a clear and straight forward approach.

Here's the GitHub link for the Google Workspace module:  
[https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation)

## Getting Started With the Module

To make the module easy to get up and running with your own Google Workspace, we included two practical on-ramps for existing and brand new Google Workspaces:

1. **Import an existing Google Workspace**  
   We shared the [terraform code](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/main/examples/import-existing-org/main.tf) we used to declare existing [users](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/main/examples/import-existing-org/users.yaml) and [groups](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/main/examples/import-existing-org/groups.yaml) in YAML, and the [import blocks](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/main/examples/import-existing-org/imports.tf) to easily import an existing setup. We additionally shared a [Python script](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/main/examples/import-existing-org/debugging-script.py) to view the JSON of your existing resources (which you could give to an LLM and tell it to follow the example to create your own `users.yaml` and `groups.yaml` files).

2. **Create New Resources**  
   Start fresh by managing Google Workspace users and groups directly from Terraform. This is a great starting point if you're setting up a new org or moving toward automation-first infra practices.

After the initial import or setup, your Google Workspace [root module](https://newsletter.masterpoint.io/p/multi-instance-vs-single-instance-root-modules) could end up being as simple as this:

```hcl
locals {
  oauth_scopes = [
    "https://www.googleapis.com/auth/admin.directory.group",
    "https://www.googleapis.com/auth/admin.directory.user",
    "https://www.googleapis.com/auth/admin.directory.userschema",
    "https://www.googleapis.com/auth/apps.groups.settings",
    "https://www.googleapis.com/auth/iam",
  ]
}

provider "googleworkspace" {
  customer_id             = "my_customer"
  credentials             = local.secrets["googleworkspace_admin_credentials_json"]
  impersonated_user_email = var.impersonated_user_email
  oauth_scopes            = local.oauth_scopes
}

# Get users and groups from YAML files. You might choose to use other config file.
# Note: path.module refers to the directory where terraform/tofu plan/apply is run
# var.googleworkspace_configs is a variable for the directory containing config files
locals {
  config_path = "${path.module}/${var.googleworkspace_configs}"
  all_groups = yamldecode(file("${local.config_path}/groups.yaml"))
  all_users  = yamldecode(file("${local.config_path}/users.yaml"))

  # Skip objects that start with "_", which we use as default or prototype objects
  groups = { for k, v in local.all_groups : k => v if !startswith(k, "_") }
  users  = { for k, v in local.all_users : k => v if !startswith(k, "_") }
}

module "googleworkspace_users_groups" {
  source  = "masterpointio/users-groups-automation/googleworkspace"
  version = "X.X.X"
  groups  = local.groups
  users   = local.users
}
```

## Design Decisions to Make It Intuitive

Below we point out a few Terraform module design decisions we made to reduce friction as others use the module.

### Design Decision #1 - Testing with Integration and Validation Tests

To ensure the Terraform module remains reliable after changes—whether by contributors or automated processes—we've added approximately 20 tests. Thankfully [Terraform](https://developer.hashicorp.com/terraform/tutorials/configuration-language/test#prerequisites) and [OpenTofu](https://opentofu.org/docs/cli/commands/test/) both include a built-in testing framework that allows us to write tests directly in HCL, replacing the previous Go-based approach. The tests validate that the module behaves as expected and prevent new changes from unintentionally breaking functionality that downstream consumers rely on.

We'll skip over the happy path tests ([example 1](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/9b9112a2d3ff0f3d415813a8b4de11cefcab56a9/tests/variables_users.tftest.hcl#L52-L70), [example 2](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/9b9112a2d3ff0f3d415813a8b4de11cefcab56a9/tests/variables_users.tftest.hcl#L72-L89), [example 3](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/9b9112a2d3ff0f3d415813a8b4de11cefcab56a9/tests/variables_users.tftest.hcl#L140-L157)) we added to validate things like email and password validation, since these basic unit tests can be easily generated using Cursor, GitHub Copilot, or other AI code generation tools.

Below are more complex examples validating integration between different provider resources.

1. **Validate that user and group inputs result in a user being a group member.** We view this as an integration test because we are testing if a user and a group correctly integrate and result in a user_to_group instance.

```hcl
run "groups_member_role_success" {
  command = apply
  providers = {
    googleworkspace = googleworkspace.mock
  }
  variables {
    users = {
      "first.last@example.com" = {
        primary_email = "first.last@example.com"
        family_name  = "Last"
        given_name   = "First"
        groups = {
          "team" = {
            role = "MEMBER"
          }
        }
      }
    }
    groups = {
      "team" = {
        name = "Team"
        email = "team@example.com"
      }
    }
  }
  assert {
    condition     = googleworkspace_group_member.user_to_groups["team@example.com/first.last@example.com"].role == "MEMBER"
    error_message = "Expected 'role' to be 'MEMBER'."
  }
}
```

1. **Test validations in the variables.tf file.** We added variable validations to catch bad inputs early. This provides a fast feedback loop during a `terraform plan` rather than only getting this feedback from the Google Admin SDK APIs when running `terraform apply`. During Infrastructure as Code audits, we look at Terraform CI/CD workflows to ensure PRs are `terraform plan`-ed before merging to catch issues where a variable input has a bad value.

```hcl
# users variable declaration
variable "users" {
  description = "List of users"
  type = map(object({
    # other variable fields
    groups : optional(map(object({
      role : optional(string, "MEMBER"),
      delivery_settings : optional(string, "ALL_MAIL"),
      type : optional(string, "USER"),
    })), {}),
    primary_email : string,
  }))

  # validate users.groups.[group_key].type
  validation {
    condition = alltrue(flatten([
      for user in var.users : [
        for group in values(try(user.groups, {})) : (
          group.type == null || contains(["USER", "GROUP", "CUSTOMER"], upper(group.type))
        )
      ]
    ]))
    error_message = "group type must be either 'USER', 'GROUP', or 'CUSTOMER'"
  }
}

run "group_member_type_invalid" {
  command = plan
  providers = {
    googleworkspace = googleworkspace.mock
  }
  variables {
    users = {
      "invalid.type@example.com" = {
        primary_email = "invalid.type@example.com"
        family_name  = "Type"
        given_name   = "Invalid"
        groups = {
          "test-group" = {
            type = "INVALID-TYPE"
          }
        }
      }
    }
    groups = {
      "test-group" = {
        name  = "Test Group"
        email = "test-group@example.com"
      }
    }
  }
  expect_failures = [var.users]
}
```

### Design Decision #2 - Chose intuitive Terraform variables that diverged from Terraform resources

In the Google Workspace provider, provisioning a group involves declaring two resources: `group` and `group_settings`.

```hcl
resource "googleworkspace_group" "sales" {
  email = "sales@example.com"
}

resource "googleworkspace_group_settings" "sales_settings" {
  email        = googleworkspace_group.sales.email
  who_can_join = "INVITED_CAN_JOIN"
}
```

This `group` and `group_setting` resource design mirrors Google's Admin SDK REST API structure. However, we felt that group settings more intuitively belonged as a nested attribute inside a group. So in our group variable, we added `settings` and extracted settings in the module's `local` block:

```hcl
# variable declaration
variable "groups" {
  description = "List of groups"
  type = map(object({
    name    : string,
    email   : string,
    settings : optional(object({
      who_can_join: optional(string),
    }))
  }))
}

# locals block
locals {
  group_settings = {
    for k, v in var.groups : k => merge(v.settings, { email = v.email })
  }
}

# group_settings resource
resource "googleworkspace_group_settings" "defaults" {
  for_each     = local.group_settings
  email        = each.value.email
  who_can_join = "INVITED_CAN_JOIN"
}
```

Yes, it's an abstraction which can sometimes lead to issues, but we think reducing cognitive friction is worth the added business logic in the Terraform code. Here's an example of a simpler configuration for groups:

```hcl
locals {
  default_group_settings = {
    who_can_join = "ALL_IN_DOMAIN_CAN_JOIN"
  }
}

module "googleworkspace" {
  source  = "masterpointio/users-groups-automation/googleworkspace"
  version = "X.X.X"

  groups = {
    support = {
      name    = "Support"
      email   = "support@example.com"
      settings = merge(local.default_group_settings, {})
    }
    engineers = {
      name    = "Engineering"
      email   = "engineering@example.com"
      settings = merge(local.default_group_settings, {
        who_can_join = "INVITED_CAN_JOIN"
      })
    }
  }
}
```

## Wrapping Up

With this setup in place and a CODEOWNERS file, we're now transparently, democratically, and securely managing users and groups within Google Workspace. This helps our engineering leader, Matt, avoid having to keep this in his head and enables us as a team to avoid waiting on him. Want access to AWS SSO? Open a PR and get the right approval from the CODEOWNERS, merge it, and automation takes care of the rest. We love this workflow and we hope it's useful to you and your team!

Want help implementing this terraform module set in your Google Workspace?

We do short, high-impact automation projects like this for engineering teams all the time—with long-term impact. If your onboarding still runs on sticky notes and muscle memory, reach out and we'll streamline your onboarding process.
