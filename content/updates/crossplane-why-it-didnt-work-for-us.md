---
visible: true
draft: false
title: "Crossplane: Why it Didn't Work for Us"
author: Veronika Gnilitska
slug: crossplane-didnt-work
date: 2023-06-26T14:48:43.602Z
description: We investigated Crossplane at a deep level and found it wasn't for
  us. Read on to learn about our investigation and the issues we found.
image: /img/updates/crossplane-blog-post-image.png
---
## Our current solution and desired improvements

At Masterpoint, our entire focus is on creating solid cloud platforms for our clients by utilizing our subject matter expertise in AWS, Terraform, and Kubernetes. As part of that thought process, we see GitOps as one of the core patterns that our Platform Engineering team relies upon when we build new cloud-native platforms. This pattern of continuous delivery increases transparency and accelerates the overall delivery process by eliminating [configuration drift](https://www.aquasec.com/cloud-native-academy/vulnerability-management/configuration-drift/).

While we aim to apply GitOps for both customer applications and the infrastructure that it runs on, we have found having declarative IaC managed by Terraform brings extra challenges: it requires an intermediate tool to provide continuous reconciliation. This potentially causes unwanted complications at scale when Terraform modules twist into a knotty structure that requires extra maintenance, including complex pipelines or tricky hacks. This becomes particularly problematic when application engineers lack experience with Terraform and must exert additional efforts to participate in the IaC setup. 

Because of this we’ve been looking to replace Terraform and our automation of it with a solution that simplifies IaC maintenance and reduces the work required to support continuous reconciliation.

## Enter Crossplane

The idea that Kubernetes could be used as a declarative infrastructure automation tool is a concept that really stuck with us because of its existing place within our stack and application engineers ability to pick it up quickly. The declarative approach is a fundamental aspect of Kubernetes, and is essential to its ability to provide reliable and efficient management of containerized applications and their associated resources. While there are several solutions for managing cloud infrastructure as Kubernetes objects available, [Crossplane](https://www.crossplane.io/) by Upbound was the most popular option and what we decided to investigate.

There are a number of features that pulled in our attention, and distinguished Crossplane from other, more conventional IaC tools: 

1. It’s Kubernetes-native. Crossplane is built on top of Kubernetes, which means that it can be deployed as a Kubernetes add-on, extended through custom resource definitions (CRDs), and managed using tools we and a very large ecosystem of others already know. 
2. The interface to manage infrastructure becomes plain Kubernetes YAML. This helps simplify management of infrastructure and reduces the learning curve for organizations that are already using and know Kubernetes.
3. It’s an open-source project with a growing community of contributors and users. At the core of Masterpoint, we value open-source ecosystems and always prefer open solutions to closed source or SaaS products. This enables us to continually get the benefits of the upstream community contributions and contribute back where we can. 



## POC setup

Considering our interest, we did a small proof of concept (POC) to evaluate if this tool meets our needs and improves our Platform Engineering processes. The goal was to have a local [kind](https://kind.sigs.k8s.io/docs/user/quick-start/) cluster with a simple setup that deploys common AWS resources like a VPC, an EKS cluster, required IAM and KMS resources, and the [SOPS operator](https://github.com/isindir/sops-secrets-operator) via their helm chart. As a starting point, we used Upbound’s platform reference repo, [platform-ref-aws](https://github.com/upbound/platform-ref-aws#build-and-push-your-platform). We cloned that repository locally and started modifying it for our needs, and ended up with the code you can find in our repository here: [masterpointio/crossplane-poc](https://github.com/masterpointio/crossplane-poc).

When discussing the structure of a repository and how to arrange Crossplane resources, it is important to note that working directly with basic AWS resources like [VPC](https://marketplace.upbound.io/providers/upbound/provider-aws/latest/resources/ec2.aws.upbound.io/VPC/v1beta1) via Customer Resource Definitions is an option, but Crossplane provides high-level abstraction mechanisms called Compositions and Packages. A Composition allows the creation of complex resources by combining simpler ones supplied by multiple providers. You could think of a Composition as a Terraform module; a coupling of resources, inputs, and outputs that are used together as a cohesive unit. A Package can contain one or more Composition resources, and it conforms to the OCI specification for packaging and distributing container images. These container images can be published to a registry, such as Docker Hub or a private ECR, and then installed into a Crossplane instance using the Kubernetes API. That means that users can define and manage infrastructure as a cohesive set of hierarchical components, rather than a collection of disparate resources, and this was of particular interest to us.



## Challenges we’ve faced

Through out our POC, we encountered several challenges that we struggled to address:

1. Code heaviness. Although our team has a good understanding of Kubernetes, adding new features to the Composition manifests or modifying existing ones seemed to take more effort than we’d expect. The reason for this is that working with the various complex components of a Composition requires modifications in multiple locations, and it can be easy to overlook something. Though Crossplane supports [patches](https://docs.crossplane.io/v1.10/reference/composition/#patch-types) to pass values between/to related resources the string expressions appear to be bulky even for the simplest cases. Smart tricks like using YAML anchors and aliases are possible, but don’t get the job done. Below is an example of an IAM policy statement where we need to compute the Principal and the Condition. We were not happy with how this turned out or the tool’s index based templating.![](https://lh4.googleusercontent.com/EtXOiv0TzpTEllN8K4fb7eLjYqeDZnSAV2fslVI8ftX1NyproesmvOCECORZ4FjYaBjcfwC00J15pgS3iTLfriLSn06Uua8S4aIzvuqiiORS5fkcT48DmfH8mmBDHNMlVYPKwSGdDVxL2ho9Yvbo5rc)
2. Learning curve. While we had hoped that the learning curve for Crossplane would be straightforward since it is Kubernetes-native, the reality is that it turned out to be more challenging than anticipated, primarily due to the complex object model. We expected this could have a major impact on our team and on our client’s application engineering teams, especially for any Kubernetes beginners.
3. Debug complexity. Essentially, the primary troubleshooting tool that Crossplane provides was using the \`kubectl get events\` command, which raises concerns around scalability and accommodating future system growth. There is definitely room for improvement here and we believe it would require a centralized logging or event hub.
4. Bootstrap and handoff procedure. One of the key aspects for us was the ease of automating a new client project on our own cloud and then creating a smooth transition to the client owning the automation within their cloud. Our primary idea to solve that was to have our own bootstrap cluster and then establish a process for transferring infrastructure control to another cluster designated for continuous infrastructure reconciliation. But, because Crossplane stores the state of infrastructure in [etcd](https://kubernetes.io/docs/concepts/overview/components/#etcd), that leads to various questions: how to migrate the bootstrap setup from one cluster to another? What processes and tools do we need to provide for disaster recovery?
5. Limited resource support. While the AWS Crossplane provider supports many common cloud resources, and is actively extending the list, there are some large areas and features that are not yet supported. For instance, [SES](https://github.com/crossplane-contrib/provider-aws/issues/414), [SSM](https://github.com/upbound/provider-aws/issues/441) and [WAF](https://github.com/upbound/provider-aws/pull/476) services are heavily used in our projects, but major improvements are required to achieve the desired  configuration.
6. Complicated usage for shared or external resources. In order to organize and structure our infrastructure we take heavy advantage of shared resources like [terraform-null-label](https://github.com/cloudposse/terraform-null-label) (from our friends at [Cloud Posse](https://cloudposse.com)) which guarantees us consistent naming and tagging. Despite what we saw as the potential availability of methods to implement this concept using the Composition model, it still appeared to be too cumbersome and we could not get a working example of this use-case implemented within a reasonable amount of time.
7. Common IaC needs are not yet implemented. Certain IaC features, such as data sources or [ignore changes](https://github.com/crossplane/crossplane/issues/3516) in Terraform, can significantly simplify the organization and maintenance of resources, but they are not supported yet. Ability to define a common set of tags via a [PatchSet](https://github.com/crossplane/crossplane/issues/3847) could also be a great enhancement. Some workarounds are available, but aren’t elegant enough.

Due to these limitations and challenges, our team’s gut feeling ended up being to pass on Crossplane. 

## Conclusion

Overall, Crossplane has great potential. It’s been developing intensively - just during the work on the POC a number of [provider-aws](https://marketplace.upbound.io/providers/upbound/provider-aws) versions were released, and we’ve found a couple of subprojects and issues in the roadmap that show a wide range of areas for improvement (such as [Composition Functions)](https://github.com/crossplane/crossplane/pull/3465). We believe it could be successfully adopted in large, Enterprise organizations that are fully committed to Kubernetes and seeking multi-cloud, self-service functionality. However, Masterpoint is focused primarily on startups and SMBs. We require tooling that is full-featured and more application engineer friendly.

In the end, Crossplane wasn’t our choice at this point. With all the questions described above it felt like we would be walking away from the core of our subject matter expertise, and putting a decent amount of effort into reaching a goal that could be achieved via a shorter path.

One last thing, if you're interested, here are some great resources to check out regarding CrossPlane, beyond Upbound’s [blog](https://blog.crossplane.io/) and [docs](https://docs.crossplane.io/):

* <https://vrelevant.net/crossplane/> - Great series of posts explaining different aspects about Crossplane
* <https://medium.com/nerd-for-tech/introduction-to-crossplane-2f873ae0f9f3> - Crossplane intro
* <https://grem1.in/post/crossplane/> - Crossplane intro