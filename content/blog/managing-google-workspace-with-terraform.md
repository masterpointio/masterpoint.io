---
visible: true
draft: false
title: "Managing Your Google Workspace with Terraform"
author: Weston Platter
date: 2025-07-14
slug: managing-google-workspace-with-terraform
description: "Migrate Google Workspace from click-ops to Infrastructure as Code with our open source Terraform module. Includes design patterns and import examples."
tags: ["terraform", "google-workspace", "infrastructure-as-code", "automation"]
image: /img/updates/managing-googleworkspace-with-terraform/preview-3.png
# image: /img/updates/oss-iac/oss-iac.png
callout: <p>👋 <b>If you're ready to take your infrastructure to the next level, we're here to help. We love to work together with engineering teams to help them build well-documented, scalable, automated IaC that make their jobs easier. <a href='/contact'>Get in touch!</a>
---

## Table of Contents

- [Growing Pains](#growing-pains)
- [Why This Matters for Scaling Teams](#why-this-matters-for-scaling-teams)
- [Managing Google Workspace with Terraform](#managing-google-workspace-with-terraform)
- [Getting Started With the Module](#getting-started-with-the-module)
- [Module Design Decisions](#module-design-decisions)
  - [Implementing Integration and Validation Tests](#design-decision-1---implementing-integration-and-validation-tests)
  - [Choosing Intuitive Terraform Variable Structures](#design-decision-2---choosing-intuitive-terraform-variable-structures)
- [Wrapping Up](#wrapping-up)

## Growing Pains

As Masterpoint has been around for almost 10 years now, we've experienced growing pains transitioning from a one-person consultancy to a team of core full-time engineers, with the help of additional contractors when needed.

During that time, we've focused on client projects far more than our internal systems. When I joined in December, we started to feel the friction of onboarding a new team member, including adding their Google Workspace account. Matt (our CEO/CTO) had to,

- remember what permissions a new Google Workspace user gets by default
- how to provision SSO permissions for Masterpoint's AWS Accounts
- how to get a user set up for client-specific SSOs

Since the last onboarding was about 6 months prior, important details weren't fresh in mind, which resulted in my delayed access to the Masterpoint AWS accounts. In the end, he had to take time and focus away from other work due to these tedious administrative tasks.

## Why This Matters for Scaling Teams

In our small company and possibly in your own organization, it's not a big deal for the founder or early engineer to create a new employee's [Google Workspace](https://workspace.google.com/) account or give them SSO account access via the Admin UI. But as a company scales:

- Founders and engineers are focused on product, customers, and strategy.
- Nobody remembers why or when a permission was changed.
- Group membership becomes inconsistent.
- Onboarding/offboarding gets slower and error-prone.
- The consequences for getting security permissions incorrect increase.

As a company grows past ten, dozens, or a hundred people, teams (and dare we say departments) become more distributed. It is harder to manage user accounts across many different SaaS tools. It's important to have systems in place that provide clarity and enable individuals to get the right access to get their work done in a timely manner. We believe efficient systems are part of a company evolving toward higher levels of organizational maturity.

One aspect of that is finding a better way to manager your Google Workspace accounts.

## Managing Google Workspace with Terraform

We looked at a couple of open source solutions and decided on using the Terraform [Google Workspace](https://github.com/hashicorp/terraform-provider-googleworkspace) provider. We often use SaaS-specific Terraform providers to provision user accounts for DataDog and other SaaS services, so this was an easy decision.

We heard great things about [GAM](https://github.com/GAM-team/GAM) (an imperative command line tool) from a few colleagues, but we didn't need its full range of capabilities. We prefer to use declarative systems so we know the user account and group settings we see in config files are indeed the values in production.

While there are a few Terraform modules out there for managing Google Workspaces, we decided to create our own Terraform module to use the provider. The motivation to build a module from scratch stemmed from our desire to:

1. Easily manage [user specific SSO settings](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/933242a5d69401ea097f3b9f29894091f0581f5f/examples/import-existing-org/users.yaml#L12-L18) allowing engineers to sign into multiple AWS accounts using their Google Identity.
2. Organize `group` and `group_setting` variable inputs in clear and straight forward approach (more details on this in [Design Decision #2](#design-decision-2---choosing-intuitive-terraform-variable-structures))
3. Create default values for `user`, `group`, and `group_setting` making our config files easier to work with (see [this example](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/933242a5d69401ea097f3b9f29894091f0581f5f/examples/import-existing-org/users.yaml#L2-L18)).

Here's the GitHub link for our Google Workspace module:  
[https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation)

## Getting Started With the Module

To make the module easy to get up and running with your own Google Workspace, we included two practical examples:

1. **Import existing Google Workspace users and groups**  
   We expect most people will use the module with an existing Google Workspace. To make this easy, we included the Terraform and YAML configuration files we used to import our own workspace users and groups.

   The key component is the `imports.tf` file, which shows how to map existing Google Workspace resources to the module's resources. We also included a [Python script](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/main/examples/import-existing-org/debugging-script.py) to help debug by printing out the JSON objects as rendered by the Google APIs.

   Since importing cloud resources into Terraform modules can be tricky, we documented our complete approach in [import-existing-org](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/tree/main/examples/import-existing-org). The example includes these key files:

   - [main.tf](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/main/examples/import-existing-org/main.tf) - Module configuration
   - [imports.tf](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/main/examples/import-existing-org/imports.tf) - Import mappings
   - [users.yaml](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/main/examples/import-existing-org/users.yaml) - User definitions with YAML anchors
   - [groups.yaml](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/main/examples/import-existing-org/groups.yaml) - Group definitions with YAML anchors

2. **Create new users and groups**  
   For users who don't need to import users or groups, follow [this example](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/tree/main/examples/complete). This is a great starting point if you're setting up a new org or only creating new users and groups.

After the initial import or setup, your Google Workspace [root module](https://newsletter.masterpoint.io/p/multi-instance-vs-single-instance-root-modules) could end up being as simple as this:

```terraform
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

# Get users and groups from YAML files. You might choose to use other config files.
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
  # version = "X.X.X" # it's a best practive to version pin modules
  groups  = local.groups
  users   = local.users
}
```

The above code references `users.yaml` and `groups.yaml` files that contain your actual user and group configurations.

Here's an example `users.yaml` file, which uses YAML anchors to share user defaults and Google + AWS SSO configurations across team members:

```yaml
---
_default_user: &default_user
  is_admin: false
  groups:
    company: { role: member }
    engineering: { role: member }

_custom_schemas_client1: &_custom_schemas_client1
  schema_name: AWS_SSO_for_Client1
  schema_values:
    Role: '["arn:aws:iam::111111111111:role/GoogleAppsAdmin","arn:aws:iam::111111111111:saml-provider/GoogleApps"]'

user1.last@example.com:
  <<: *default_user
  primary_email: user1.last@example.com
  given_name: User1
  family_name: Last
  custom_schemas:
    - <<: *_custom_schemas_client1

user2.last@example.com:
  <<: *default_user
  primary_email: user2.last@example.com
  given_name: User2
  family_name: Last
  custom_schemas:
    - <<: *_custom_schemas_client1
```

And here's an example `groups.yaml` file, also leveraging YAML anchors to apply sane defaults to multiple goups.

```yaml
---
_default_active_settings: &_default_active_settings
  allow_external_members: false
  allow_web_posting: true
  archive_only: false
  custom_roles_enabled_for_settings_to_be_merged: false
  enable_collaborative_inbox: false
  is_archived: false
  primary_language: en_US
  who_can_join: ALL_IN_DOMAIN_CAN_JOIN
  who_can_assist_content: OWNERS_AND_MANAGERS
  who_can_view_group: ALL_IN_DOMAIN_CAN_VIEW
  who_can_view_membership: ALL_IN_DOMAIN_CAN_VIEW

company:
  email: company@example.com
  name: All Company Team
  description: Includes everyone in the company
  is_admin: false
  settings:
    <<: *_default_active_settings

engineering:
  email: engineering@example.com
  name: Engineering Team
  description: Engineering Team that all technical employees are members of by default
  is_admin: false
  settings:
    <<: *_default_active_settings
```

## Module Design Decisions

Below we point out a few Terraform module design decisions we made to reduce friction as others use the module.

### Design Decision #1 - Implementing Integration and Validation Tests

To ensure the Terraform module remains reliable after changes—whether by contributors or automated processes—we've added approximately 20 tests. Thankfully [Terraform](https://developer.hashicorp.com/terraform/tutorials/configuration-language/test#prerequisites) and [OpenTofu](https://opentofu.org/docs/cli/commands/test/) both include a built-in testing framework that allows us to write tests directly in HCL, replacing the previous Go-based approach. The tests validate that the module behaves as expected and prevent new changes from unintentionally breaking functionality that downstream consumers rely on.

We'll skip over the happy path tests ([example 1](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/9b9112a2d3ff0f3d415813a8b4de11cefcab56a9/tests/variables_users.tftest.hcl#L52-L70), [example 2](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/9b9112a2d3ff0f3d415813a8b4de11cefcab56a9/tests/variables_users.tftest.hcl#L72-L89), [example 3](https://github.com/masterpointio/terraform-googleworkspace-users-groups-automation/blob/9b9112a2d3ff0f3d415813a8b4de11cefcab56a9/tests/variables_users.tftest.hcl#L140-L157)) we added to validate things like email and password validation, since these basic unit tests can be easily generated using Cursor, GitHub Copilot, or other AI code generation tools.

Below are more complex examples validating integration between different provider resources.

1. **Validate that user and group inputs result in a user being a group member.** We view this as an integration test because we are testing if a user and a group correctly integrate and result in a user_to_group instance.

   ```terraform
   run "groups_member_role_success" {
     command = apply
     providers = {
       googleworkspace = googleworkspace.mock
     }
     variables {
       users = {
         "first.last@example.com" = {
           primary_email = "first.last@example.com"
           family_name   = "Last"
           given_name    = "First"
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

2. **Test validations in the variables.tf file.** We added variable validations to catch bad inputs early. This provides a fast feedback loop during a `terraform plan` rather than only getting this feedback from the Google Admin SDK APIs when running `terraform apply`. During Infrastructure as Code audits, we look at Terraform CI/CD workflows to ensure PRs are `terraform plan`-ed before merging to catch issues where a variable input has a bad value.

   ```terraform
   # users variable declaration
   variable "users" {
     description = "List of users"
     type = map(object({
       # other variable fields
       groups: optional(map(object({
         role: optional(string, "MEMBER"),
         delivery_settings: optional(string, "ALL_MAIL"),
         type: optional(string, "USER"),
       })), {}),
       primary_email : string,
     }))

     # validate users.groups.[group_key].type
     validation {
       condition = alltrue(flatten([
         for user in var.users: [
           for group in values(try(user.groups, {})): (
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

     # we expect the users variable to fail the "users.groups.[group_key].type" validation block
     expect_failures = [var.users]
   }
   ```

There are 4 more complex tests, helping us ensure this module won't break in the future.

### Design Decision #2 - Choosing Intuitive Terraform Variable Structures

In the Google Workspace provider, provisioning a group involves declaring two resources: `group` and `group_settings`.

```terraform
resource "googleworkspace_group" "sales" {
  email = "sales@example.com"
}

resource "googleworkspace_group_settings" "sales_settings" {
  email        = googleworkspace_group.sales.email
  who_can_join = "INVITED_CAN_JOIN"
}
```

This `group` and `group_setting` resource design mirrors Google's Admin SDK REST API structure. However, we felt that group settings more intuitively belonged as a nested attribute inside a group. So in our group variable, we added `settings`. Then, later, we extracted settings in the module's `local` block to meet the provider's expectations:

```terraform
# groups variable declaration
variable "groups" {
  description = "List of groups"
  type = map(object({
    name: string,
    email: string,
    settings: optional(object({
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

Yes, it's an abstraction which can sometimes lead to issues, but we think reducing cognitive friction for the module user is worth the added business logic in the Terraform code. Here's an example of a simpler configuration for groups:

```terraform
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

With this setup in place and a CODEOWNERS file, we're now transparently, consistently, and securely managing users and groups within Google Workspace. This helps our engineering leader, Matt, avoid having to keep account setup details in his head. It also enables us as a team to avoid waiting on him or any other one person. Need an adjustment to your google user - like enabling AWS SSO for a specific user? Open a PR, get the right approval from the CODEOWNERS, merge it, and automation takes care of the rest. We love this workflow and we hope it's useful to you and your team!

Want help automating your Google Workspace configuration with Terraform? Need to make sure your Workspace policies stay consistent and auditable? Want to avoid onboarding chokepoints like Matt used to be?

We do short, high-impact automation projects like this for engineering teams all the time—with long-term impact. If your onboarding still runs on sticky notes and muscle memory, reach out and we'll streamline your onboarding process.
