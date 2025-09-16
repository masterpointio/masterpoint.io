---
visible: true
draft: false
title: "terraform-null-label: Advanced Usage"
author: Matt Gowie
slug: terraform-null-label-advanced
date: 2024-03-05
description: "A post highlighting some advanced usage of the terraform-null-label module showing root/child module relationship and implementation of a naming + tagging framework with context.tf"
image: /img/updates/terraform-null-label-part2.png
---

Following up from our last article on the `terraform-null-label` module, (if you haven’t read that already, [be sure to here](https://masterpoint.io/updates/terraform-null-label/)) we want to talk about some advanced usage scenarios. This module effectively helps to maintain consistent naming and tagging practices, but it can still be cumbersome to implement when you need to create lots of variables that implement the label interface. In that case, why not borrow a little bit from object-oriented programming (OOP) with [the concept of a "mixin"](https://en.wikipedia.org/wiki/Mixin)? The module has this capability through the drop-in `context.tf` file. It provides a great framework to implement naming and tagging, especially in scenarios where there’s lots of nesting and module dependencies. In this follow-up, we’ll explore mixins, and provide some code examples to help understand how to get the most out of `terraform-null-label`.

## Background

First off: what’s a mixin? A mixin is a concept from object-oriented programming (OOP) languages like Ruby and Python. For those who are unfamiliar with OOP, this [MDN article](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Object-oriented_programming) does a good job explaining the fundamentals. Mixins are essentially a way to have a class (object) make its methods available to another class _without explicit inheritance._ There are a variety of implications to this implementation, but a simple takeaway is that programmers can add functionality to different components without adding complexity or heavy coupling.

To illustrate, here’s a basic example of a mixin using Python. Imagine we have a database of customers and orders. We can get information about a given customer via the class methods, and we can do the same for orders. However, there’s also an API that can be used to query the database remotely. The API needs to return JSON, but we don’t really want to have to create that feature for each class. Enter mixins…

First, let’s define the JSONMixin class:

```python
class JSONMixin:
    def to_json(self):
        import json
        return json.dumps(self.__dict__)
```

Now the Customer and Order classes that use the JSONMixin class:

```python
class Customer(JSONMixin):
    def __init__(self, customer_id, name):
        self.customer_id = customer_id
        self.name = name

class Order(JSONMixin):
    def __init__(self, order_id, customer_id, total):
        self.order_id = order_id
        self.customer_id = customer_id
        self.total = total

# Creating instances
customer = Customer("C123", "Alice")
order = Order("O456", "C123", 99.99)

# Using the mixin's method
print("Customer JSON:", customer.to_json())
print("Order JSON:", order.to_json())
```

While this is a contrived example, it highlights the big win here: the behavior (returning JSON) only needs to be defined once, and it can be used over and over.

In the context of Terraform, you can think of mixins as reusable configuration files that you can simply drop into any Terraform project and immediately get value from. In `terraform-null-label`, the [context.tf file is a mixin](https://github.com/cloudposse/terraform-null-label/blob/main/exports/context.tf), and we’re going to be looking at that advanced usage below.

## Where `context.tf` is Used

We’ll be making use of the `context.tf` file. This provides functionality similar to the mixin example from OOP languages. Using this special file "object", we can pass around label metadata between modules while only having to define it once via variables. There are two primary areas within Terraform configurations where `context.tf` is used:

1. **[Root Modules](https://developer.hashicorp.com/terraform/language/modules#the-root-module)** - When `context.tf` is included at the base of a root module, it enables the developer to pass all of the important label variables to that root module **without** having to specify those variable blocks and it creates the root `null-label` module.

2. **[Child Modules](https://developer.hashicorp.com/terraform/language/modules#child-modules)** - When `context.tf` is included in a child module, it then supports passing the `context` object as a variable that it then uses in its own `null-label` module for naming and tagging all resources in that child module. This makes it so the child module does not need to specify all the possible variables, but also that it can have any of those variables overridden from the root context.

Don’t worry if this seems hard to understand in the abstract; in the following section we’ll lay out an example usage scenario that makes use of `context.tf` in both types of modules.

## Advanced `terraform-null-label` Usage

Now let’s look at some advanced usage in action.

For the infrastructure example, we’ll assume the following configuration:

- A root module with a basic AWS VPC, subnet, and EC2 instance.
- A simple, internal child module for organization-specific IAM configuration.
- The [terraform-aws-rds-cluster](https://github.com/cloudposse/terraform-aws-rds-cluster) from Cloud Posse which implements `context.tf`.
- The [context.tf](https://github.com/cloudposse/terraform-null-label/blob/main/exports/context.tf) mixin file provided by the [terraform-null-label](https://github.com/cloudposse/terraform-null-label/blob/main) module `exports/` folder.

Here is the basic structure of the example configuration

```txt
    terraform/ # root module (gets planned + applied)
    ├── main.tf
    ├── variables.tf
    ├── outputs.tf
    ├── dev.auto.tfvars
    ├── context.tf # Important
    └── iam-module/ # child module
        ├── main.tf
        ├── variables.tf
        ├── outputs.tf
        └── context.tf # Important
```

The root module will contain the basic network and compute configuration, as well as the module imports for IAM and RDS. But first, the important bits:

```hcl
# terraform/main.tf
module "vpc_label" {
  source  = "cloudposse/label/null"
  version = "0.25.0"

  name = "vpc"

  # Important!
  context = module.this.context
}
```

So why is that "context" directive important? It acts as a "mixin" for label metadata for `terraform-null-label`. Take another look at the [context.tf](https://github.com/cloudposse/terraform-null-label/blob/main/exports/context.tf) file; you’ll notice a special module named "this" defined:

```hcl
# terraform/context.tf
module "this" {
  source  = "cloudposse/label/null"
  version = "0.25.0" # requires Terraform >= 0.13.0

  enabled     = var.enabled
  namespace   = var.namespace
  tenant      = var.tenant
  environment = var.environment
  # ...
```

And further down, there are variable definitions with default values:

```hcl
variable "context" {
  type = any
  default = {
    enabled             = true
    namespace           = null
    tenant              = null
    environment         = null
    stage               = null
    name                = null
    delimiter           = null
    attributes          = []
    tags                = {}
    additional_tag_map  = {}
    regex_replace_chars = null
    label_order         = []
    id_length_limit     = null
    label_key_case      = null
    label_value_case    = null
    descriptor_formats  = {}
    # Note: we have to use [] instead of null for unset lists due to
    # https://github.com/hashicorp/terraform/issues/28137
    # which was not fixed until Terraform 1.0.0,
    # but we want the default to be all the labels in `label_order`
    # and we want users to be able to prevent all tag generation
    # by setting `labels_as_tags` to `[]`, so we need
    # a different sentinel to indicate "default"
    labels_as_tags = ["unset"]
  }
  description = <<-EOT
    Single object for setting entire context at once.
    See description of individual variables for details.
    Leave string and numeric variables as `null` to use default value.
    Individual variable settings (non-null) override settings in context object,
    except for attributes, tags, and additional_tag_map, which are merged.
  EOT

  validation {
    condition     = lookup(var.context, "label_key_case", null) == null ? true : contains(["lower", "title", "upper"], var.context["label_key_case"])
    error_message = "Allowed values: `lower`, `title`, `upper`."
  }

  validation {
    condition     = lookup(var.context, "label_value_case", null) == null ? true : contains(["lower", "title", "upper", "none"], var.context["label_value_case"])
    error_message = "Allowed values: `lower`, `title`, `upper`, `none`."
  }
}

variable "enabled" {
  type        = bool
  default     = null
  description = "Set to false to prevent the module from creating any resources"
}

variable "namespace" {
  type        = string
  default     = null
  description = "ID element. Usually an abbreviation of your organization name, e.g. 'eg' or 'cp', to help ensure generated IDs are globally unique"
}
# ... etc
```

So what do we get with that configuration? Essentially, this defines variables like `context`, `namespace` and `environment` all at once in our root module, and then we have the generated ID and tag metadata from `terraform-null-label` available wherever they pass the context. In our previous article, each resource or module required importing and defining a new `terraform-null-label` module. With `context.tf`, that only needs to be done once by dropping in that file, providing some tfvars, and then components of that label can be overridden as needed.

So instead of:

```hcl
module "public_vpc_label" {
  source  = "cloudposse/label/null"
  version = "0.25.0"

  namespace   = "mp"
  environment = "dev"
  name        = "vpc"
  attributes  = ["public"]

  tags = {
    BusinessUnit       = "ENG"
    ManagedByTerraform = "True"
  }
}

resource "aws_vpc" "public" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = module.public_vpc_label.id
  }
}
```

We get:

```hcl
# terraform/dev.auto.tfvars
# terraform-null-label elements
namespace   = "mp"
environment = "dev"
attributes  = ["acmeapp"]
tags        = {
  BusinessUnit       = "ENG"
  ManagedByTerraform = "True"
}
```

```hcl
# terraform/main.tf
module "vpc_label" {
  source  = "cloudposse/label/null"
  version = "0.25.0"

  name = "vpc" # Override name value from module.this.context

  # Important: all of the other label elements are passed as tfvars which end up in `module.this.context`
  context = module.this.context
}

resource "aws_vpc" "public" {
  cidr_block = "10.0.0.0/16"
  tags       = module.vpc_label.tags
}
```

This results in our VPC getting the `Name` tag of `mp-dev-vpc-acmeapp` and all of the rest of the tags are passed as well and they look like:

```hcl
# Output of `module.vpc_label.tags`:
{
  namespace          = "mp"
  environment        = "dev"
  attributes         = "acmeapp"
  Name               = "mp-dev-vpc-acmeapp"
  BusinessUnit       = "ENG"
  ManagedByTerraform = "True"
}
```

And we can repeat that for other resources:

```hcl
resource "aws_security_group" "frontend_sg" {
  name        = module.vpc_label.id # mp-dev-vpc-acmeapp
  description = "Allow SSH and web traffic"
  vpc_id      = aws_vpc.public.id
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = module.vpc_label.tags
}
```

Remember we’ve also got a child module for handling IAM. Let’s say the IAM module contains the following (remember this is a contrived example):

```hcl
# iam-module/main.tf

module "custom_policy_label" {
 source  = "cloudposse/label/null"
 version = "0.25.0"

 attributes = ["custom"]

 # Important: all of the label elements from the root module are passed here
 context = module.this.context
}

module "permission_boundary_label" {
 source  = "cloudposse/label/null"
 version = "0.25.0"

 attributes = ["permboundary"]

 # Important: all of the label elements from the root module are passed here
 context = module.this.context
}

data "aws_iam_policy_document" "assume_role_policy" {
 # not included for brevity...
 statement { }
}

data "aws_iam_policy_document" "permission_boundary" {
 # not included for brevity...
 statement { }
}

resource "aws_iam_policy" "permission_boundary" {
 name        = module.permission_boundary_label.id
 description = "Permission boundary for this custom role."
 policy      = data.aws_iam_policy_document.permission_boundary.json
 tags        = module.permission_boundary_label.tags
}

resource "aws_iam_role" "instance_role" {
 name                 = module.this.id
 assume_role_policy   = data.aws_iam_policy_document.assume_role_policy.json
 permissions_boundary = aws_iam_policy.permission_boundary.arn
 tags                 = module.this.tags
}

data "aws_iam_policy_document" "custom_policy" {
 # not included for brevity...
 statement { }
}

resource "aws_iam_policy" "custom_policy" {
 name        = module.custom_policy_label.id
 description = "Custom policy for this role."
 policy      = data.aws_iam_policy_document.custom_policy.json
 tags        = module.custom_policy_label.tags
}

resource "aws_iam_role_policy_attachment" "custom_policy" {
 role       = aws_iam_role.instance_role.name
 policy_arn = aws_iam_policy.custom_policy.arn
}
```

We can source it in the root module like this:

```hcl
# terraform/main.tf
module "iam" {
  source = "./iam-module"

  # This makes the same label values defined in the root module available
  # in the child module due to context.tf accepting the full context
  context = module.this.context
}
```

Since the IAM module has its own `context.tf` file at `terraform/iam-module/context.tf`, it can accept the `context` argument and use the same inputs and labels that are defined in the root module. Although this was an overly simplified example, more common IAM configurations often involve many roles and policies. With `context.tf`, it’s much easier to ensure consistent naming and tagging across IAM resources, which is one of the most common pain points in AWS environments for inconsistency and sprawl.

What if we wanted to use an external module, and wanted to override a couple of values? This is no problem if it implements `context.tf`:

```hcl
module "rds_cluster_aurora_postgres" {
  source  = "cloudposse/rds-cluster/aws"
  version = "1.7.0"

  name = "oltpdb"

  engine         = "aurora-postgresql"
  cluster_family = "aurora-postgresql9.6"
  cluster_size   = 2

  admin_user      = "admin1"
  admin_password  = var.admin_password
  db_name         = "dbname"
  db_port         = 5432
  instance_type   = "db.r4.large"
  vpc_id          = aws_vpc.public.id
  security_groups = [aws_security_group.db_security_group.id]
  subnets         = [aws_subnet.public_subnet.id]
  zone_id         = "Zxxxxxxxx"

  context = module.this.context
}
```

For this module, we’ve overridden the "name" ID element from `terraform-null-label`. Regardless of whatever value is defined for the root module’s "name" variable value that gets passed down in the `context` argument, the value will be "oltpdb", so this RDS cluster will end up with the name `mp-dev-oltpdb-acmeapp`. If we wanted to override "attributes" or any other of the `context.tf` variables that make up that label, we could do that too.

## Using `context.tf` In Your Project

To get the latest `context.tf` file for your child or root module, you can perform the following command in their respective terraform directory:

```bash
curl -sL https://raw.githubusercontent.com/cloudposse/terraform-null-label/main/exports/context.tf -o context.tf
```

## Wrap Up

Advanced usage of `terraform-null-label` requires digging in and getting a little comfortable with some unique concepts that we typically don’t see in Terraform. The payoff is huge, though: reduce cognitive load for your engineers, do lots of code reuse, and make your infrastructure comfortably scalable with minimal tech debt.

If you’re still not sure how to get started, or are already struggling with Terraform sprawl and tech debt, Masterpoint has a wealth of knowledge built on implementing infrastructure at scale. Let us do the heavy Terraform lifting, and we’ll get you set on a path towards shipping infrastructure faster. [Get in touch today!](https://masterpoint.io/contact/)

{{<signup>}}
