---
visible: true
draft: false
title: "terraform-null-label: the why and how it should be used"
author: Matt Gowie
date: 2023-10-24
description: "A post highlighting one of our favorite terraform modules: terraform-null-label. We dive into what it is, why it's great, and some potential use cases in Terraform configurations."
image: /img/updates/terraform-null-label-part1.png
---

If you haven’t noticed, there’s been… a _lot_ of change in the Infrastructure as Code (IaC) ecosystem recently. The recent licensing changes made by Hashicorp have permanently altered the future of the community and how infrastructure is managed. That being said, one constant remains: the need for robust, reliable software infrastructure. Despite the current uncertainties, Terraform (and OpenTofu when it’s ready) continues to be our tool of choice at Masterpoint. Its versatility is unmatched, and it continues to help us deliver capable platforms for our clients.

One of the most significant hurdles we encounter in our infrastructure work is the issue of technical debt and resource sprawl, often stemming from inconsistent naming and tagging standards. This inconsistency leads to disorganization, slow delivery, lack of cost intelligence, and, in the worst cases, security vulnerabilities from unaccounted-for resources. It's a problem that is all too common in the infrastructure space, and one that we are constantly striving to address.

One place where there has been an attempt at helping this effort is the AWS’ providers introduction of [default tags](https://registry.terraform.io/providers/hashicorp/aws/latest/docs#default_tags). This feature allows users to assign tags to all resources created by that provider, which can help with organization and identification. However, this solution is far from perfect. The implementation is somewhat clumsy, and it does not fully address the issue of naming. It's a band-aid solution, a temporary fix that doesn't get to the root of the problem. And of course it’s only for the AWS provider.

Our good colleagues at [Cloud Posse](https://cloudposse.com/) have come up with a much more elegant solution (and huge shout out to them for doing so). They have developed a module called [terraform-null-label](https://github.com/cloudposse/terraform-null-label), which offers a much cleaner approach to this problem. This module generates and standardizes names and tags for resources across an entire Terraform environment, ensuring consistency. As part of this post, we’d like to take some time to explore the cleanest solution to this problem we’ve ever seen.

## The Importance of Consistent Naming

In the early stages of a startup (or any project stack), the infrastructure is often simple and straightforward. The server and database are probably named something like `server01` and `database01`, respectively. The configuration files are easily accessible, and the team, being small, is intimately familiar with the system's architecture. The naming conventions, at this point, are uncomplicated and intuitive.

However, as the project grows and evolves, so does its infrastructure. The once simple system expands to accommodate multiple customer-facing applications and a dozen other resources enter the mix. Infrastructure as Code (IaC) is implemented to manage and provision the increasingly complex tech stack. Amidst this growth, `database01` persists, but what about `database10`? It's now `database10-us-east1-prod`; absolutely more descriptive and useful, but no one wants to rename `database01` because it’s probably hardcoded into more than a few places.

The issue of inconsistent naming becomes even more pronounced when we consider tags. What was once simply "backend" now has new variations like "backend-auth" and "backend-job-processor". Are those cloud resources getting tagged correctly so whoever is paying the bill knows that the "job processor" is costing 10x what the "auth" service is? Probably not.

As the stack expands and you need to hire more engineers, the cognitive load and spool-up time for each new hire grows and grows. As it becomes harder to understand and categorize and "know about" the infrastructure, it becomes a bigger security/attack surface. Eventually billing and resource attribution becomes a problem too.

## The Solution

Let's face it: naming things is hard. We want consistent naming and tagging, but the challenge has always been getting a growing, changing roster of engineers to decide on, implement, and enforce a consistent standard _over time_.

Good luck with that. Maybe you’ve written down your standards in documentation, but that’s hard to find, rarely read, and not easily enforceable.

Why not use code? The `terraform-null-label` module, available at [https://github.com/cloudposse/terraform-null-label](https://github.com/cloudposse/terraform-null-label), offers a much better solution. We’ll look at some example usage in the next section but at a high level It allows users to define up to six primary inputs, referred to as "ID elements". These include:

1. **Namespace:** A short abbreviation of the company name, typically 2-4 letters.
2. **Tenant:** This is used for resources dedicated to a specific customer or team (for a team like "data analytics" => "da").
3. **Environment:** This refers to the AWS region (note that this nomenclature may be inverse to what most engineers are used to).
4. **Stage:** This indicates the stage of the application, such as `dev`, `stage`, `prod`. While this is what we would normally call an `environment` in most settings, for legacy reasons the naming within the module has made this a bit funky. It may help to think of the term "stage" by its general English usage, referring to a distinct phase or period within a series of events or a larger process.
5. **Name:** This is the name of the component or service, such as `rds`, `eks`, or `backend-auth`.
6. **Attributes:** This is an arbitrary list of strings that can be used to add additional descriptors to the final ID.

The `terraform-null-label` module provides a standardized set of outputs that combine these various ID elements for easy usage across resources and modules. For example, if the following ID elements were supplied to a label module named `frontend_label`:

```hcl
  namespace   = "mp" # Shorthand for Masterpoint
  environment = "uw2" # Shorthand for the AWS us-west-2 region
  stage       = "prod"
  name        = "frontend"
  attributes  = ["public"]
```

The output value of `module.frontend_label.id` would be `mp-uw2-prod-frontend-public`. The `tags` output of the label is similar but it is a map of all ID elements combined with the module’s `tags` input variable value. We'll see a full example of this below.

These output values are now available to apply to any `name` or `tags` input for any Terraform resource or module, saving engineers the cognitive load of needing to remember and apply the correct naming or tagging structure.

A couple other features that are great to know about as well:

1. [Delimiters](https://github.com/cloudposse/terraform-null-label#input_delimiter) are configurable e.g. swap out hyphens for underscores in the final ID by passing `delimiter = "_"`.
2. The [ordering](https://github.com/cloudposse/terraform-null-label#input_label_order) of the generated ID is configurable e.g. drop the namespace ID element by passing `label_order = ["environment", "stage", "name", "attributes"]`.

Also, in terms of justification, using `terraform-null-label` for consistency in naming and tagging is especially important for billing and any FinOps processes. One of the biggest challenges in managing cloud costs is properly attributing resource usage across different teams and business units; without consistency in tagging, it’s a nearly impossible task to do effectively.

## Utilizing the `terraform-null-label` module

Below, we have a hypothetical example infrastructure that will be a simple implementation of an AWS Load Balancer. Most platform engineers have encountered these resources before (and their corresponding IaC), and are likely aware of the massive waste of time and cognitive effort it is to remember to name and tag every resource consistently when more resources continue to get added.

Enter `terraform-null-label`. Here’s an example infrastructure, with the label module applied:

**NOTE:** This is a simplistic take on this configuration. Real production ready configurations are often _much_ more complex, with many more resources at play, but you can already see the potential for reuse and the time and consistency wins with `terraform-null-label`.

```hcl
  module "public_alb_label" {
    source  = "cloudposse/label/null"
    version = "0.25.0"

    namespace   = "mp"
    stage       = "prod"
    environment = "uw2"
    name        = "alb"
    attributes  = ["public"]

    tags = {
      BusinessUnit       = "ENG"
      Team               = "Reporting"
      ManagedByTerraform = "True"
    }
  }

  # ALB
  resource "aws_lb" "default" {

    # ID is the concatenation result of all ID element inputs i.e. `mp-uw2-prod-alb-public`
    name               = module.public_alb_label.id

    internal           = false
    load_balancer_type = "application"
    security_groups    = [aws_security_group.alb_sg.id]
    subnets            = ["subnet-abc12345", "subnet-xyz67890"]

    # terraform-null-label outputs the merged tags input and all ID element inputs as a map value
    # i.e. { namespace: "mp", stage: "prod", Team: "Reporting", ManagedByTerraform: "True", ... }
    tags = module.public_alb_label.tags
  }

  resource "aws_security_group" "alb_sg" {
    name        = module.public_alb_label.id
    description = "Allow inbound traffic over HTTPS"
    vpc_id      = "vpc-12345678"
    tags        = module.public_alb_label.tags

    ingress {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
```

It’s worth noting that in our examples, we’re using the AWS provider, but the label module can be used anywhere in Terraform regardless of provider or use-case.

In the above example, the `terraform-null-label` module lets engineers define some common-sense values for the ID elements like stage and namespace, and then it can be used to apply a consistent name and tagging scheme to every resource and/or module that the team uses. "Write once, read many" and DRY (Don’t repeat yourself) are important factors we talk a lot about within good application code, and null-label enables us to easily incorporate those ideas into our platform code.

Now, obviously that’s a very simplified and abstract example. In complex configurations, there are likely going to be many resources and modules with different usage, and in this case even with `terraform-null-label` it can start to get cumbersome to have to define new label modules each time you need to have variations in your ID elements. There is a solution to that however as one of the module’s most powerful features addresses exactly that: the `context` input + output value.

Going back to our example, what if we needed to deploy another internal load balancer alongside the public one? That is going to share a lot of the same label id elements with a couple of overrides. Here’s how easy that is:

```hcl
  module "public_alb_label" {
    source  = "cloudposse/label/null"
    version = "0.25.0"

    namespace   = "mp"
    stage       = "prod"
    environment = "uw2"
    name        = "alb"
    attributes  = ["public"]

    tags = {
      BusinessUnit       = "ENG"
      Team               = "Reporting"
      ManagedByTerraform = "True"
    }
  }

  module "private_alb_label" {
    source  = "cloudposse/label/null"
    version = "0.25.0"

    attributes  = ["private"]

    # Here's the important bit
    context = module.public_alb_label.context
  }
```

By passing in the context output from the first label module, all of the original values are present, with only the defined ones overridden. With that, you get:

* `module.public_alb_label.id` equates to `mp-uw2-prod-alb-public`
* `module.public_alb_label.tags` equates to:

   ```yaml
   Namespace: "mp"
   Environment: "uw2"
   Stage: "prod"
   Name: "alb"
   Attributes: "public"
   BusinessUnit: "ENG"
   Team: "Reporting"
   ManagedByTerraform: "True"

* `module.private_alb_label.id` equates to `mp-uw2-prod-alb-private`
* `module.private_alb_label.tags` equates to:

   ```yaml
   Namespace: "mp"
   Environment: "uw2"
   Stage: "prod"
   Name: "alb"
   Attributes: "private"
   BusinessUnit: "ENG"
   Team: "Reporting"
   ManagedByTerraform: "True"

The new label module only needs to have new values defined; the previous values are still present and do not need to be redefined.

Admittedly, that’s still a pretty simplified example. Real Terraform configurations often employ root and child modules and various workspaces / folders for each; to this point our examples have been constrained to one workspace, working directory, and statefile. There is a nice solution to simplify that process however via the [`context.tf`](https://github.com/cloudposse/terraform-null-label/blob/main/exports/context.tf) file, but we’re going to explore that advanced usage in a separate article, so be sure to watch this space!

## Wrap-up

The `terraform-null-label` is one of the best solutions we’ve found to the difficult problem of _designing_ and ultimately _implementing_ a consistent naming and tagging standard across an entire engineering organization's infrastructure. It helps platform engineers and application engineers bring order to chaos, lessen cognitive load, helps business and FinOps teams collaborate with engineers to manage cloud costs, and can even boost security efforts. There are a lot more advanced implementations of `terraform-null-label` as well that revolve around `context.tf` which we mentioned above. We’ll save that for another post!

Is your cloud environment a mis-named and mis-tagged mess? Reach out to Masterpoint to learn how we can help.
