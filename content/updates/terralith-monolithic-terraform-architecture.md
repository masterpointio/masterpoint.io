---
visible: true
draft: false
title: "The Terralith: Monolithic Architecture of Terraform & Infrastructure as Code"
author: Yangci Ou
slug: terralith-monolithic-terraform-architecture
date: 2024-08-99 # TBD
description: This article explores the challenges and pitfalls of Terralith, a monolithic Terraform architecture in Infrastructure as Code, and uncover why a Terralith is not considered best practice.
image: /img/updates/terraform-controller-overview/tf_controller_0.png # TODO
callout: <p>👋 <b>If you're ready to take your infrastructure to the next level, we're here to help. We love to work together with engineering teams to help them build well-documented, scalable, automated IaC that make their jobs easier. <a href='/contact'>Get in touch!</a>
---

<h2>Table of Contents</h2>

- [What is a Terralith?](#what-is-a-terralith)
- [In a Nutshell](#in-a-nutshell)
- [Setting the Stage for GitOps with Terraform Controller](#setting-the-stage-for-gitops-with-terraform-controller)
- [Managing Infrastructure-as-Code with Terraform Controller](#managing-infrastructure-as-code-with-terraform-controller)
  - [Backend options](#backend-options)
  - [Source reference](#source-reference)
  - [Service account](#service-account)
- [Version Control and Terraform Compatibility](#version-control-and-terraform-compatibility)
- [Known Limitations](#known-limitations)
  - [Terraform Plan and Drift Detection](#terraform-plan-and-drift-detection)
  - [IPv6 and EKS Compatibility](#ipv6-and-eks-compatibility)
  - [The Future of `tfctl` CLI](#the-future-of-tfctl-cli)
- [Areas of Improvement](#areas-of-improvement)
  - [Implementing ChatOps for Terraform Operations](#implementing-chatops-for-terraform-operations)
  - [Utilizing Other Optional Features](#utilizing-other-optional-features)
  - [Open Source UI](#open-source-ui)
- [Time-sensitive: Weaveworks Issues and Further Impact on the Project](#time-sensitive-weaveworks-issues-and-further-impact-on-the-project)
- [Conclusion](#conclusion)
- [Further Reading and Resources](#further-reading-and-resources)

## What is a Terralith?

In the world of software engineering, we often hear about monolithic architecture, which is a model of software built with multiple components combined into a single program. Tightly coupled services live together. Updating or deploying one requires updating or deploying all of them. At a certain  scale, this can be very painful. A single massive root module that contains all the infrastructure definitions sounds like trying to cram an entire city into one skyscraper!

In this post, we’ll explore a similar concept in the realm of Infrastructure as Code (IaC): the “Terralith.” This term is derived from the words “Terraform” and “monolith.” While not an official term, it was first coined by Nicki Watt of OpenCredo during [a HashiCorp Terraform talk](https://www.hashicorp.com/resources/evolving-infrastructure-terraform-opencredo) in 2019.

A Terralith is a Terraform or OpenTofu (which will be collectively referred to as "TF") project which manages multiple infrastructure across the platform within one root module (i.e. one state file). While a monolithic software application might have all its services contained within one codebase, ranging in functionality from authentication to payments to business logic, a Terralith might represent a majority of the infrastructure, including networking, compute, and storage.

The Terralith is the simplest pattern in any new IaC project organization, and as such, it is one of the most common starting points. The defining characteristic of a Terralith is a [single state file](https://opentofu.org/docs/language/state/) that holds the entire state of the infrastructure. All infrastructure is provisioned from a single root module where it continuously expands as requirements grow. This centralized approach can seem appealing at first, but we’ll point out the issues that come from this pattern later.

Below is an example of a Terralith. Although there are some reusability through [child modules](https://opentofu.org/docs/language/modules/#child-modules), it still has a monolithic root module. This means that all resources are managed in **_one singular state file_** and therefore tightly coupled together:
![Terralith Monolith Example File Structure](/img/updates/terralith/terralith-file-structure-example.png) <!-- Made with carbon.now.sh and Excalidraw -->


## Why It’s Bad: Pitfalls & The Scalability Ceiling of Terraliths

At first glance, a Terralith might seem like a good idea. It simplifies the initial setup and is easy to manage. You don’t have to worry about running multiple tf apply commands, splitting configurations, or managing multiple states. Everything is in one place which makes it easy to navigate, modify, and deploy.

However, as your infrastructure grows, the Terralith approach becomes problematic. Let’s examine why.
1. [Complexities with the 3 M’s: Multi-Environment, Multi-Region, Multi-Account](#complexities-with-the-3-ms-multi-environment-multi-region-multi-account)
2.

#### Complexities with the 3 M’s: Multi-Environment, Multi-Region, Multi-Account
One of the primary challenges is environment isolation. With all infrastructure configuration in one place, separating resources for different environments is difficult. This  leads to a higher risk of unintended cross-environmental impacts where changes meant for one environment inadvertently affect others.

In any non-trivial infrastructure, there are more variables than just the environment (production, staging, development). There are also [multiple regions](https://aws.amazon.com/about-aws/global-infrastructure/regions_az/) (e.g. AWS’ US East, US West, etc.) and multiple accounts (artifacts, log archive, disaster recovery, etc). With all these intertwined, the Terralith IaC pattern becomes prone to errors and misconfigurations. It becomes difficult to understand the relationships and dependencies between resources.

In the context of fitting a city into a single skyscraper analogy, this is like trying to fit residential areas, industrial zones, commercial districts, and corporate headquarters all into different floors of the same building. It certainly is possible, but it becomes a nightmare to manage - think about all the noise complaints from the industrial zones! And it certainly is not easy to scale when this city’s population expands.

####
Collaboration in a Terralith setup can be challenging as well. Since all the resources are provisioned with one root module, state is stored in one file. A common best practice in TF is to use [state locking](https://developer.hashicorp.com/terraform/language/state/locking), which locks the state file so only one operation can be executed at a given time. This is intended to prevent odd drift scenarios and state file corruption.

Because of this best practice, two engineers working on completely different infrastructure in the Terralith at the same time can find themselves unable to perform state operations concurrently.

Here is a diagram of what that might look like in practice. This highlights the hit to engineering productivity that the Terralith causes:





## Conclusion

The Terraform Controller could be a real game-changer in managing infrastructure as code via GitOps. We believe with some further investment and improvements that it would be solid competitor to the primary open-source Terraform automation tool, [Atlantis](https://www.runatlantis.io/). Still, we acknowledge that building a strong system around this tool requires effort and our suggestion is to only entertain using this tool if your org is ready for some level of bleeding-edge investment themselves. If you're intrigued by that idea, we welcome any engineering organizations who are eager to operationalize this tool internally to [reach out and chat with us](https://masterpoint.io/contact/) as we'd love to help you build a true GitOps Terraform system!

We would like to emphasize our positive experience with the community aspect of this product. The development team has been very responsive to our questions, providing fast and complete responses. While we understand that it may take some time to add requested features/fixes to the roadmap and implement them, we feel that the team was highly receptive to user feedback. Given recent news, we hope everything goes as smoothly as possible for the team and the product they have been working so hard on.

Overall, we're still on a mission to explore the evolving landscape of GitOps and Terraform, and we need your help! [Get in touch with us on LinkedIn](https://www.linkedin.com/company/masterpoint-consulting/) so you can share your experiences and thoughts so we can work together to make them even better!

## Further Reading and Resources

* Dive into the official [Weaveworks GitOps Terraform Controller documentation](https://weaveworks.github.io/tf-controller/) for more in-depth knowledge.
* Follow [Get Started with the Terraform Controller](https://docs.gitops.weave.works/docs/terraform/get-started/) to try it out.
* Check out an [EKS scaling example](https://github.com/tf-controller/eks-scaling).
* Join [Terraform Controller Slack space](https://weave-community.slack.com/archives/C054MR4UP88) to participate in community discussions.
* Go through the [roadmap](https://github.com/weaveworks/tf-controller#roadmap) to understand the future development milestones.
