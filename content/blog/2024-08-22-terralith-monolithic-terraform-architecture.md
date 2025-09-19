---
visible: true
draft: false
title: "The Terralith: Monolithic Architecture of Terraform & Infrastructure as Code"
author: Yangci Ou
slug: terralith-monolithic-terraform-architecture
date: 2024-08-22
# date_modified: 2025-xx-xx Be sure to use this if you've updated the post as this helps with SEO and index freshness
description: This article explores the challenges and pitfalls of Terralith, a monolithic Terraform architecture in Infrastructure as Code, and uncovers why a Terralith is not a good practice.
image: /img/updates/terralith/terralith-article.png
preview_image: /img/updates/terralith/terralith-preview-image.png # Use preview_image to prevent image overflow, best aspect ratios 270x355 or 600x700
callout: <p>👋 <b>If you're ready to take your infrastructure to the next level, we're here to help. We love to work together with engineering teams to help them build well-documented, scalable, automated IaC that make their jobs easier. <a href='/contact'>Get in touch!</a></p>
---

<h2>Table of Contents</h2>

- [What is a Terralith?](#what-is-a-terralith)
- [Why It’s Bad: Pitfalls & The Scalability Ceiling of Terraliths](#why-its-bad-pitfalls--the-scalability-ceiling-of-terraliths)
  - [Complexities with the 3 M’s: Multi-Environment, Multi-Region, Multi-Account](#complexities-with-the-3-ms-multi-environment-multi-region-multi-account)
  - [Collaborating in a Terralith](#collaborating-in-a-terralith)
  - [State File Bloat -> Plans + Applies Slow Down](#state-file-bloat-plans-and-applies-slow-down)
  - [Blast Radius: Walking Through a Minefield](#blast-radius-walking-through-a-minefield)
- [What To Do About It / Avoiding a Terralith](#what-to-do-about-it--avoiding-a-terralith)
- [Conclusion](#conclusion)

## What is a Terralith?

In the world of software engineering, we often hear about monolithic architecture, which is a model of software built with multiple components combined into a single program. Tightly coupled services live together. Updating or deploying one requires updating or deploying all of them. At a certain scale, this can be very painful.

In this post, we’ll explore a similar concept in the realm of Infrastructure as Code (IaC): the “Terralith.” This term is derived from the words “Terraform” and “monolith.” While not an official term, it was first coined by Nicki Watt of OpenCredo during [a HashiCorp Terraform talk](https://www.hashicorp.com/resources/evolving-infrastructure-terraform-opencredo).

A Terralith is a Terraform or OpenTofu (which will be collectively referred to as "TF") project which manages many infrastructure resources across the platform within one [root module](https://opentofu.org/docs/language/modules/#the-root-module) (i.e., one state file). While a monolithic software application might have all its services contained within one codebase, ranging in functionality from authentication to payments to business logic, a Terralith codebase might represent the majority of the infrastructure in a single root module, including networking, compute, and storage. A single massive root module that contains all the infrastructure definitions is like trying to cram an entire city into one skyscraper!

The Terralith is the simplest pattern in any new IaC project organization, and as such, it is one of the most common starting points. The defining characteristic of a Terralith is a [single state file](https://opentofu.org/docs/language/state/) that holds the entire state of the infrastructure. All infrastructure is provisioned from a single root module where it continuously expands as requirements grow. This centralized approach can seem appealing at first, but we’ll point out the issues that come from this pattern later.

Below is an example of a Terralith. Although there are some reusability through [child modules](https://opentofu.org/docs/language/modules/#child-modules), it still has a monolithic root module. This means that all resources are managed in **_one singular state file_** and therefore tightly coupled together:
![Terralith Monolith Example File Structure](/img/updates/terralith/terralith-file-structure-example.png) <!-- Made with carbon.now.sh and Excalidraw and Lucid -->

## Why It’s Bad: Pitfalls & The Scalability Ceiling of Terraliths

At first glance, a Terralith might seem like a good idea. It simplifies the initial setup and is easy to manage. You don’t have to worry about running multiple `tf apply` commands, splitting configurations, or managing multiple states. Everything is in one place which makes it easy to navigate, modify, and deploy.

However, as your infrastructure grows, the Terralith approach becomes problematic. Let's examine some of the reasons why.

1. [Complexities with the 3 M’s: Multi-Environment, Multi-Region, Multi-Account](#complexities-with-the-3-ms-multi-environment-multi-region-multi-account)
2. [Collaborating in a Terralith](#collaborating-in-a-terralith)
3. [State File Bloat -> Plans + Applies Slow Down](#state-file-bloat-plans-and-applies-slow-down)
4. [Blast Radius: Walking Through a Minefield](#blast-radius-walking-through-a-minefield)

###### Complexities with the 3 M’s: Multi-Environment, Multi-Region, Multi-Account

One of the primary challenges is environment isolation. With all infrastructure configuration in one place, separating resources for different environments is difficult. This leads to a higher risk of unintended cross-environmental impacts where changes meant for one environment inadvertently affect others.

In any non-trivial infrastructure, there are more variables than just the environment (production, staging, development). There are also [multiple regions](https://aws.amazon.com/about-aws/global-infrastructure/regions_az/) (e.g. AWS’ US East, US West, etc.) and multiple accounts (artifacts, log archive, disaster recovery, etc). With all these intertwined, the Terralith IaC pattern becomes prone to errors and misconfigurations. It becomes difficult to understand the relationships and dependencies between resources.

In the context of fitting a city into a single skyscraper analogy, this is like trying to fit residential areas, industrial zones, commercial districts, and corporate headquarters all into different floors of the same building. It certainly is possible, but it becomes a nightmare to manage - think about all the noise complaints from the industrial zones! And it certainly is not easy to scale when this city’s population expands.

###### Collaborating in a Terralith

Collaboration in a Terralith setup can be challenging as well. Since all the resources are provisioned with one root module, state is stored in one file. A common best practice in TF is to use [state locking](https://developer.hashicorp.com/terraform/language/state/locking), which locks the state file so only one operation can be executed at a given time. This is intended to prevent odd drift scenarios and state file corruption.

Because of this practice, two engineers working on completely different infrastructure in the Terralith at the same time can find themselves unable to perform state operations concurrently.

Here is a diagram of what that might look like in practice. This highlights the hit to engineering productivity that the Terralith causes:

![Collaboration in a Terralith](/img/updates/terralith/terralith-collaboration.png) <!-- Made with Excalidraw -->

###### State File Bloat: Plans and Applies Slow Down

Imagine a Terralith’s state file like a single, massive spreadsheet tracking every item in a rapidly growing warehouse. Eventually, it becomes so large that comparing the current state of the resources with the state recorded in the file or updating it takes forever.

In IaC, the workflow first checks all resources against the real infrastructure, then plans the changes from your infrastructure code, and finally executes the plan by applying it. Even if we are trying to modify something as minor as renaming one resource, **the system must verify against every single resource in the state file**.

It’s a domino effect because this not only slows down the development and deployment process, but also increases the vulnerability to transient errors such as credential expirations and API rate limits. At Masterpoint, we've had clients with Terralith codebases which took over 30+ minutes for simple plans and applies. As you can imagine, they often timed out or reached the API limits.

![Terralith API Limit Example](/img/updates/terralith/terralith-api-limit-example.png) <!-- API Limit Screenshot -->

###### Blast Radius: Walking Through a Minefield

With the single Terralith state file containing all resources, you have to be concerned about the blast radius and risk of change. When everything is interconnected in a single configuration and state file, changes in one area can be far reaching and have unintended consequences in other areas. The risk associated with updates and modifications becomes harder to isolate. Containing the impact of changes is more difficult.

For example, a critical bug fix for your application deployed on [ECS](https://aws.amazon.com/ecs/) might be blocked because an untested database upgrade was merged into the IaC codebase. That upgrade was not tested because there was a networking change that held the state file locked. And so on.

A Terralith cannot deploy only one change, leaving the team stuck and the application unfixed, despite the changes being unrelated.

[Targeted applies](https://developer.hashicorp.com/terraform/tutorials/state/resource-targeting) can provide temporary relief for Terralith challenges. These update specific resources or modules within your IaC without applying the whole configuration. But targeted applies are a band-aid solution as they do not solve the root problem of a Terralith.

![Terralith Blast Radius](/img/updates/terralith/terralith-blast-radius.png) <!-- Made with Excalidraw -->

## What To Do About It / Avoiding a Terralith

Recognizing the limitations of a Terralith architecture in Infrastructure as Code is the first step towards a more scalable and maintainable solution. While there's no one-size-fits-all process, the transition typically involves breaking down the monolithic root module into smaller, more manageable pieces. You can use a [strangler pattern](https://martinfowler.com/bliki/StranglerFigApplication.html) - modularization allows for better organization of resources, improved reusability, and easier management of complex infrastructure services.

Breaking up a monolithic TF architecture is like splitting each floor of the skyscraper into its own separate building in our earlier analogy. Now, changes to the “residential” portion won’t affect the “commercial” portion. Each structure can be managed independently, solving the problems mentioned in the above sections.

Of course, there are scenarios where a Terralith might make sense, such as smaller projects, prototyping, and proof of concepts. “But as you evolve, as you have more teams and more complicated setups, you need to think about [blast radius, state management, and architecture],” as said by [Nicki Watt](https://www.hashicorp.com/resources/evolving-infrastructure-terraform-opencredo).

While the specific end structure will vary based on organizational needs, a general approach to breaking up a Terralith involves splitting infrastructure into different services and drawing clear boundaries around them. You have a few options to do this. At Masterpoint, we typically create root modules at the service boundary: AWS RDS clusters, AWS SQS Queues, Lambda Functions, and ECS Services all get their own root module. Then we instantiate instances of these root modules with specific configuration for each time the service is used within our client’s infrastructure. For example, if you have a prod and a staging database, the same AWS RDS root module would be configured differently and used two times.

[TF Workspaces](https://opentofu.org/docs/language/state/workspaces/) is another method to manage this complexity. By leveraging workspaces, teams can maintain separation between environments while reusing the same TF codebase. This approach adheres to the [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) principle, reducing duplication and helping some of the pitfalls mentioned above.

Infrastructure as Code wrapper tools such as [Atmos](https://atmos.tools/), [Terramate](https://terramate.io/), [Terragrunt](https://terragrunt.gruntwork.io/), among others, can also assist in managing complex, modular TF setups. These tools help organize resources and modules into components, which itself is an opinionated term, allowing each to have its own isolated state and backend in every environment, unlike a Terralith where all resources are congested into one single backend.

## Conclusion

Each organization has its own needs and constraints when deciding on their approach to organizing their Infrastructure as Code. As mentioned above, the Terralith has its place, but can cause issues as your infrastructure grows.

Ultimately, the key is to have a scalable strategy where the goal is to create a flexible, maintainable IaC structure that can evolve with your organization's needs. You must balance separation of concerns with ease of management.

By understanding the pitfalls of the Terralith architecture, you and your teams can avoid mistakes that will lead to further issues.

Stay tuned for one of our upcoming post featuring practical tips on breaking down a Terralith, as well as a case study detailing how we helped a client decompose their Terralith to achieve a more scalable and maintainable infrastructure!

_**12/2/2024 Update:** We've published the case study where we decomposed a 43,000+ resource Terralith. [Take a read here!](https://masterpoint.io/power-digital-case-study/)_
