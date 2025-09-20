---
visible: true
draft: false
title: "Mastering GitOps with Terraform Controller"
author: Veronika Gnilitska
slug: terraform-controller-overview
date: 2024-02-08
# date_modified: 2025-xx-xx Be sure to use this if you've updated the post as this helps with SEO and index freshness
description: The post explores how Terraform Controller by Weaveworks can enable GitOps for infrastructure management.
image: /img/updates/terraform-controller-overview/tf_controller_0.png
callout: "<p>👋 <b>Interested in platform engineering for your organization</b>, but not sure where to start? <a href='/contact'>Get in touch,</a> we're an expert team of platform engineers who deliver high-quality cloud platforms for startups and SMBs looking to scale. We enable your application engineers to focus on your product and in turn generate more value for your business.</p><a href='/contact' class='button'>Get In Touch &rsaquo;</a>"
---

<h2>Table of Contents</h2>

- [Introduction](#introduction)
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

## Introduction

In this post, we continue exploring effective tools for bridging the gap between Infrastructure as Code and GitOps. We aim to harness the optimal benefits of these practices as they are fundamental to our thoughts on building great platforms. One such tool that has gained our attention is [Terraform Controller](https://weaveworks.github.io/tf-controller/) by [Weaveworks](https://www.weave.works/), and we'd like to share our experience.

Before going into the details, we recommend reading our experience with a framework called [Crossplane](https://www.crossplane.io/), which we've passed on in our [previous blog post](https://masterpoint.io/updates/passing-on-crossplane/). While Crossplane offers deep Kubernetes integration, treating infrastructure management as a native Kubernetes operation, it also brings certain complexities and limitations. In contrast, Terraform Controller interconnects the Kubernetes ecosystem with Terraform's robust infrastructure management capabilities.
A key distinction lies in their operational models - Terraform Controller builds upon Terraform's established state management and operational principles. For those already well-acquainted with Terraform, this offers a certain familiarity, reliability, and feature completeness.

## In a Nutshell

Terraform Controller is a Kubernetes controller that translates Kubernetes resources into Terraform configurations. This process involves several essential [Kubernetes custom resources (CR)](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/) - Terraform and Flux source objects.

The **Terraform object** is a CR that defines the Terraform root module configuration and, optionally, backend configuration along with GitOps automation options.

The **Flux object** is a source of configuration files that tells the Controller _where_ to find the Terraform root module. In this way, the Controller utilizes Flux's mechanisms for continuous synchronization of configuration from a source.

When you define a Terraform object in Kubernetes, the Controller detects drift, creates a Terraform plan, and executes it to update your infrastructure. Several GitOps automation modes are available: automatic execution with "auto apply" enabled, a "plan and manual apply" mode for greater control, and an option for drift detection only.

## Setting the Stage for GitOps with Terraform Controller

As often happens when introducing a new tool to the core of a platform solution - a chicken-and-egg problem exists. The Controller needs the Kubernetes cluster to operate while we'd like to manage all the IaC using GitOps, including the cluster where the Controller is bootstrapped. There is no silver bullet known to us. For our research purposes, we prefer managing a bunch of bootstrap Terraform resources by executing commands locally.

A few initial steps need to be taken before we actually can talk about GitOpsifying our infrastructure. First, set up the infrastructure on AWS: creating AWS account(s), setting up a VPC, an EKS cluster, and required IAM resources. Next, as Flux plays a pivotal role in this setup, we install it to the cluster [with Terraform resource `flux_bootstrap_git` using the Flux provider](https://fluxcd.io/flux/installation/#bootstrap-with-terraform). The bootstrap procedure commits Flux components (including a Kustomization manifest) to a desired Git repository and configures synchronization to the same.

![Terraform Controller components in the Git repository](/img/updates/terraform-controller-overview/tf_controller_1.png)

At this point, we're ready to push the Controller manifests from the [release location](https://raw.githubusercontent.com/weaveworks/tf-controller/main/docs/release.yaml) to the repository and watch how it's deployed to the cluster to the namespace `flux-system`.

![Terraform Controller and Flux pods running in the cluster](/img/updates/terraform-controller-overview/tf_controller_2.png)

We won't emphasize organizing the repository here since tailoring the manifests' structure should meet your organization's specific needs. However, it's worth mentioning that we aimed to maintain clarity and readability in our code, striving to adhere to the DRY principle as much as possible.

Possible sources for your inspiration are:

- [Ways of structuring your repositories](https://fluxcd.io/flux/guides/repository-structure/) by Flux team.
- [TF-controller demo: GitOps EKS node group](https://github.com/tf-controller/eks-scaling) by the Controller developers.

Both examples rely on Kustomize, which we've found somewhat inflexible regarding manifest templating. However, this method could certainly be highly effective for other organizations.

## Managing Infrastructure-as-Code with Terraform Controller

At its core, the Terraform Controller consists of two main elements: the Controller itself and the Runners.

The **Controller** is the brain of the operation. It monitors Kubernetes for specific resource definitions and acts upon changes. When a new Terraform resource is defined in Kubernetes, the Controller picks it up and initiates the necessary actions.

**Runners**, on the other hand, are the workhorses. Each Runner is a "disposable" pod (see `*-tf-runner` pod on the screenshot below) that executes the Terraform plans generated by the Controller.

![Runner of our ECR managed by Terraform Controller](/img/updates/terraform-controller-overview/tf_controller_3.png)

The example of the Runner logs:

```sh
15:18:56 ❯ kubectl -n flux-system logs -f mp-poc-ecr-aws-packages-tf-runner
2024/01/25 13:18:43 Starting the runner... version  sha
{"level":"info","ts":"2024-01-25T13:18:57.256Z","logger":"runner.terraform","msg":"preparing for Upload and Extraction","instance-id":""}
{"level":"info","ts":"2024-01-25T13:18:57.261Z","logger":"runner.terraform","msg":"write backend config","instance-id":"","path":"/tmp/flux-system-mp-poc-ecr-aws-packages","config":"backend_override.tf"}
{"level":"info","ts":"2024-01-25T13:18:57.261Z","logger":"runner.terraform","msg":"write config to file","instance-id":"","filePath":"/tmp/flux-system-mp-poc-ecr-aws-packages/backend_override.tf"}
{"level":"info","ts":"2024-01-25T13:18:57.262Z","logger":"runner.terraform","msg":"looking for path","instance-id":"","file":"terraform"}
{"level":"info","ts":"2024-01-25T13:18:57.264Z","logger":"runner.terraform","msg":"creating new terraform","instance-id":"ce60329d-1c1f-4435-aa8e-fe45382b05b2","workingDir":"/tmp/flux-system-mp-poc-ecr-aws-packages","execPath":"/usr/local/bin/terraform"}
{"level":"info","ts":"2024-01-25T13:18:57.273Z","logger":"runner.terraform","msg":"setting envvars","instance-id":"ce60329d-1c1f-4435-aa8e-fe45382b05b2"}
{"level":"info","ts":"2024-01-25T13:18:57.274Z","logger":"runner.terraform","msg":"getting envvars from os environments","instance-id":"ce60329d-1c1f-4435-aa8e-fe45382b05b2"}
{"level":"info","ts":"2024-01-25T13:18:57.275Z","logger":"runner.terraform","msg":"setting up the input variables","instance-id":"ce60329d-1c1f-4435-aa8e-fe45382b05b2"}
{"level":"info","ts":"2024-01-25T13:18:57.275Z","logger":"runner.terraform","msg":"mapping the Spec.Values","instance-id":"ce60329d-1c1f-4435-aa8e-fe45382b05b2"}
{"level":"info","ts":"2024-01-25T13:18:57.275Z","logger":"runner.terraform","msg":"mapping the Spec.Vars","instance-id":"ce60329d-1c1f-4435-aa8e-fe45382b05b2"}
{"level":"info","ts":"2024-01-25T13:18:57.275Z","logger":"runner.terraform","msg":"mapping the Spec.VarsFrom","instance-id":"ce60329d-1c1f-4435-aa8e-fe45382b05b2"}
{"level":"info","ts":"2024-01-25T13:18:57.284Z","logger":"runner.terraform","msg":"generating the template founds"}
{"level":"info","ts":"2024-01-25T13:18:57.285Z","logger":"runner.terraform","msg":"main.tf.tpl not found, skipping"}
{"level":"info","ts":"2024-01-25T13:18:57.287Z","logger":"runner.terraform","msg":"initializing","instance-id":"ce60329d-1c1f-4435-aa8e-fe45382b05b2"}
{"level":"info","ts":"2024-01-25T13:18:57.287Z","logger":"runner.terraform","msg":"mapping the Spec.BackendConfigsFrom","instance-id":"ce60329d-1c1f-4435-aa8e-fe45382b05b2"}
{"level":"info","ts":"2024-01-25T13:19:03.832Z","logger":"runner.terraform","msg":"workspace select"}
{"level":"info","ts":"2024-01-25T13:19:03.834Z","logger":"runner.terraform","msg":"creating a plan","instance-id":"ce60329d-1c1f-4435-aa8e-fe45382b05b2"}
{"level":"info","ts":"2024-01-25T13:19:14.502Z","logger":"runner.terraform","msg":"show the raw plan file","instance-id":"ce60329d-1c1f-4435-aa8e-fe45382b05b2"}
{"level":"info","ts":"2024-01-25T13:19:18.145Z","logger":"runner.terraform","msg":"cleanup TmpDir","instance-id":"ce60329d-1c1f-4435-aa8e-fe45382b05b2","tmpDir":"/tmp/flux-system-mp-poc-ecr-aws-packages"}
```

This separation of duties ensures a process where monitoring and execution are handled independently but in a coordinated manner.

As briefly described above, the key element in this setup is the Terraform object. Think of it as an instance definition of one of your Terraform root modules. It includes several essential fields that define how your infrastructure is managed:

```yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: mp-automation-ecr-aws-packages
  namespace: flux-system
spec:
  interval: 5m
  path: ./
  approvePlan: auto
  storeReadablePlan: human
  sourceRef:
    kind: GitRepository
    name: terraform-aws-ecr-0.38.0
    namespace: flux-system
  backendConfig:
    customConfiguration: |
      backend "s3" {
        key = "ecr/automation/aws-packages/terraform.tfstate"
      }
  backendConfigsFrom:
    - kind: ConfigMap
      name: mp-automation-backend-s3
  varsFrom:
    - kind: ConfigMap
      name: mp-automation-shared-vars
  vars:
    - name: name
      value: ecr-aws-packages
  writeOutputsToSecret:
    name: mp-automation-ecr-aws-packages-output
```

Let's quickly discuss some of these fields.

### Backend options

This is where you define where the state of your Terraform runs is stored.
While Kubernetes ConfigMap is the default backend, there are significant advantages to using external storage like Amazon S3 for portability and resilience. S3 allows for easier migration and access across different environments, ensuring that your infrastructure state is not tied to a specific Kubernetes cluster. Additionally, S3 provides robustness against data loss, which is crucial for maintaining the integrity of your infrastructure state.

Also, note that the backend options can be derived from a shared ConfigMap, which simplifies the process by reducing the number of parameters we need to manage.

### Source reference

The fields under `spec.sourceRef` specify the source of your Terraform configurations. You can reference a [Git](https://fluxcd.io/flux/components/source/gitrepositories/) or an [OCI](https://fluxcd.io/flux/components/source/ocirepositories/) (Open Container Initiative) repository. What's interesting here is the flexibility in how you can group Terraform objects. They can range from a simple set of resources to an external module maintained by the community or an internally developed one.

### Service account

By default, a Runner uses the Service Account managed by the Terraform Controller Helm chart [`tf-controller`](https://github.com/weaveworks/tf-controller/tree/main/charts/tf-controller). It's possible to utilize [IAM Roles for Service Accounts](https://docs.gitops.weave.works/docs/terraform/aws-eks/) (IRSA) to supply credentials of various levels to the runner pods. This approach is especially beneficial from a security perspective compared to AWS access keys. Also, this simplifies the implementation of a centralized cluster model capable of managing the entire organization's infrastructure, regardless of the complexity of its AWS account structure.

Understanding these components and their roles is important for effectively leveraging the Terraform Controller. It's not just about automating infrastructure deployment; it's about creating a cohesive, well-orchestrated system where each element plays a specific role in maintaining the desired state of your infrastructure.

## Version Control and Terraform Compatibility

In Terraform Controller, the selection and management of Terraform versions are closely tied to the Runner images. Each Runner image contains a specific version of Terraform, which can be set via the chart values only, limiting the flexibility of using multiple Terraform versions simultaneously.

It's important to note that, as of now, multiple runners are not automatically released in tandem with each new version of the Terraform Controller. This issue was highlighted in a [GitHub discussion](https://github.com/weaveworks/tf-controller/issues/1023) and we're looking forward to seeing this get addressed.

We also love to see the upcoming potential support for [OpenTofu](https://opentofu.org/) in the Terraform Controller. The GitHub issue [#1132 on the Weaveworks Terraform Controller repository](https://github.com/weaveworks/tf-controller/issues/1132) responds to the growing interest in OpenTofu following HashiCorp's decision to change Terraform's licensing. OpenTofu, a fork of Terraform, remains open-source and is managed by the Linux Foundation, making it an appealing alternative for the community.
This initiative is particularly significant given the broad appeal of OpenTofu and its alignment with open-source principles.

As of January 2024, there is ongoing dialogue and interest in this feature, indicating that future versions of Terraform Controller might include support for OpenTofu.

## Known Limitations

We've encountered a number of limitations while getting to know the product.

### Terraform Plan and Drift Detection

A notable limitation arises in scenarios where the Terraform source hasn't changed and auto-approval is disabled. As discussed in [this GitHub issue](https://github.com/weaveworks/tf-controller/issues/890), the Terraform Controller does not automatically detect and apply changes in such cases. If there are no updates in the Terraform configuration, even if the actual infrastructure has drifted from the desired state, the Controller won't take any action unless the source is updated or a manual trigger is initiated. This behavior is important to consider for maintaining the desired state of your infrastructure.

### IPv6 and EKS Compatibility

Currently, the Terraform Controller's behavior is tailored towards IPv4 for creating mTLS certificates. This focus on IPv4 might present challenges in environments that are either IPv6-dominant or require IPv6 compatibility. This is especially important in EKS (Elastic Kubernetes Service). If your existing EKS cluster is configured for dual-stack or IPv6-only networking, you will need to recreate the cluster to switch it to support an IPv4 network configuration.

### The Future of `tfctl` CLI

The `tfctl` command-line utility, designed for Terraform Controller operations, is undergoing a significant change.

![Get info about Terraform object](/img/updates/terraform-controller-overview/tf_controller_4.png)

Weaveworks plans to migrate the features of `tfctl` into the Weaveworks GitOps CLI. This shift is important as the current CLI is more focused on interacting with Terraform objects rather than managing state or resources directly. Consequently, some functionalities, like the `import` command and other state-oriented operations, are currently missing. However, ongoing discussions on GitHub issues address implementing at least some of these features, indicating potential enhancements in future updates.

## Areas of Improvement

We've been studying the Controller for some time now, and it's clear that several important areas could be addressed to make this solution more solid.

### Implementing ChatOps for Terraform Operations

We'd like to explore the integration of ChatOps to manage Terraform operations. This includes viewing, approving, and declining pending plans and notifying about errors. Implementing ChatOps can significantly enhance communication and decision-making processes within an organization. Team members discussing infrastructure updates directly from their chat interface - wouldn't that be great?

### Utilizing Other Optional Features

We're also interested in the [Branch Planner feature](https://weaveworks.github.io/tf-controller/branch-planner/branch-planner-getting-started/). This new component detects an open PR and either creates a new Terraform object or updates an existing one, applying a Plan Only mode based on the original Terraform object. This functionality aligns really well with GitOps workflows, providing a dynamic and transparent way to manage infrastructure changes via pull requests.

### Open Source UI

Another area of interest that we'd like to see built out further is the Open Source UI, which is introduced in the [Weaveworks GitOps documentation](https://docs.gitops.weave.works/docs/open-source/getting-started/ui-OSS/). The ability to easily oversee and control all the details and stages of infrastructure deployment and management is always a valuable addition that we've found incredibly useful from tools like [Spacelift](https://spacelift.io/).

## Time-sensitive: Weaveworks Issues and Further Impact on the Project

While we've been working on this blog post, some unfortunate news has spread - Weaveworks is shutting down. The official public statement was published [on LinkedIn by Alexis Richardson](https://www.linkedin.com/feed/update/urn:li:activity:7160295096825860096/), CEO of Weaveworks, on 5 Feb 2024.
We have to admit that the future of the Terraform Controller project is uncertain, and the future steps of the repository's owning organization are not yet clear. Currently, the team is discussing whether to move the repository with the source code or push the latest code to the [
TF Controller Community](https://github.com/tf-controller), which was the original organization before `tf-controller` was moved to Weaveworks.

Despite these challenges, we still hope for the best outcome. The project is still alive, with some team members continuing their work and planning future developments. We're happy to hear that the community is committed to continuing discussions about the project's future and development, and we're ready to support them as we believe this tool has some real potential.

## Conclusion

The Terraform Controller could be a real game-changer in managing infrastructure as code via GitOps. We believe with some further investment and improvements that it would be solid competitor to the primary open-source Terraform automation tool, [Atlantis](https://www.runatlantis.io/). Still, we acknowledge that building a strong system around this tool requires effort and our suggestion is to only entertain using this tool if your org is ready for some level of bleeding-edge investment themselves. If you're intrigued by that idea, we welcome any engineering organizations who are eager to operationalize this tool internally to [reach out and chat with us](https://masterpoint.io/contact/) as we'd love to help you build a true GitOps Terraform system!

We would like to emphasize our positive experience with the community aspect of this product. The development team has been very responsive to our questions, providing fast and complete responses. While we understand that it may take some time to add requested features/fixes to the roadmap and implement them, we feel that the team was highly receptive to user feedback. Given recent news, we hope everything goes as smoothly as possible for the team and the product they have been working so hard on.

Overall, we're still on a mission to explore the evolving landscape of GitOps and Terraform, and we need your help! [Get in touch with us on LinkedIn](https://www.linkedin.com/company/masterpoint-consulting/) so you can share your experiences and thoughts so we can work together to make them even better!

## Further Reading and Resources

- Dive into the official [Weaveworks GitOps Terraform Controller documentation](https://weaveworks.github.io/tf-controller/) for more in-depth knowledge.
- Follow [Get Started with the Terraform Controller](https://docs.gitops.weave.works/docs/terraform/get-started/) to try it out.
- Check out an [EKS scaling example](https://github.com/tf-controller/eks-scaling).
- Join [Terraform Controller Slack space](https://weave-community.slack.com/archives/C054MR4UP88) to participate in community discussions.
- Go through the [roadmap](https://github.com/weaveworks/tf-controller#roadmap) to understand the future development milestones.
