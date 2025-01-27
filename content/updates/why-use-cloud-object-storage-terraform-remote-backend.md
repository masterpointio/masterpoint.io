---
visible: true
draft: false
title: "Why Use Cloud Object Storage for Terraform's Remote Backend & State"
author: Yangci Ou
slug: why-use-cloud-object-storage-terraform-remote-backend
date: 2025-01-xx # TODO DATE
description: This article explores the challenges and pitfalls of Terralith, a monolithic Terraform architecture in Infrastructure as Code, and uncovers why a Terralith is not considered best practice.
image: /img/updates/cloud-object-storage-terraform-remote-backend/cloud-object-storage-for-terraform-remote-backend.webp # check if it supports webp!
# static/img/updates/cloud-object-storage-terraform-remote-backend/cloud-object-storage-for-terraform-remote-backend.webp
# preview_image: /img/updates/terralith/terralith-preview-image.png # check difference
callout: <p>👋 <b>If you're ready to take your infrastructure to the next level, we're here to help. We love to work together with engineering teams to help them build well-documented, scalable, automated IaC that make their jobs easier. <a href='/contact'>Get in touch!</a></p>
---

<h2>Table of Contents</h2>

- [Introduction and Why Use a Cloud Object Storage for Backend & Remote State in Terraform](#introduction-and-why-use-a-cloud-object-storage-for-backend--remote-state-in-terraform)
- [What is Remote State and a Remote Backend?](#what-is-remote-state-and-a-remote-backend)
- [Why Use Remote State and a Remote Backend?](#why-use-remote-state-and-a-remote-backend)
- [Why Cloud Based Object Storage Shines as a Remote Backend](#why-cloud-based-object-storage-shines-as-a-remote-backend)
- [How do I create a Remote State Backend?](#how-do-i-create-a-remote-state-backend)
- [Conclusion](#conclusion)

## Introduction and Why Use a Cloud Object Storage for Backend & Remote State in Terraform

At Masterpoint, as we build out or modernize many of our clients’ Infrastructure as Code (IaC) projects, one common question that comes up is Terraform/OpenTofu’s backend and remote state. It’s a well-known good practice to have a remote state backend, but why? In this post, we'll dive into the importance of using a remote backend for your IaC project, and why cloud based object storage services should be your go-to choice for a remote backend.

## What is Remote State and a Remote Backend?

Before we dive deeper, let’s give some background on what a remote state (which can only be supported by a remote backend) is in the context of  Terraform, OpenTofu, or Pulumi, hereafter referred to as TF. Remote state means storing the IaC state files in a location separate from your local machine. The state files are crucial in a TF setup because they keep track of the resources TF manages and their current configurations. The backend specifies where these state files are stored and controls how your system and TF accesses them. The backend is responsible for storing the state and providing features such as access locking, which prevents concurrent operations that could corrupt the state. [By default, a TF project uses a local backend to store state on your local machine, but can be configured in the `backend` block](https://opentofu.org/docs/language/settings/backends/configuration).

## Why Use Remote State and a Remote Backend?

Remote state in TF isn’t just a fancy feature - it’s a necessity for any non-trivial IaC codebase. Imagine trying to collaborate on a complex infrastructure project with team members across the world using local state files. It would be like building a skyscraper together with everyone working from their own set of blueprints. The state files would each be different sources of truth for each person, making it nearly impossible to collaborate as a team.

Using a remote backend to manage state solves issues like these by allowing any engineer to access the state data in a centralization and secure location. There are other benefits as well:

1. Collaboration: Multiple team members can work on the same infrastructure concurrently (assuming no lock contention, which we’ll discuss further below). No more stepping on each other’s toes for dealing with conflicting changes. The blueprint of your infrastructure, the state file, is always up to date because it’s in one central location and is the ultimate source of truth. This is essential for integration with CI/CD pipelines and automation.

2. Security and Access Control: With remote state, you can implement access controls and permissioning, restricting who can read or modify the state. This is important because infrastructure information is highly sensitive.

3. State Locking: Most backends with remote state allow for [state locking](https://opentofu.org/docs/language/state/locking/). Locking prevents race conditions that could corrupt your state file when multiple members access and modify it at one time.

4. Disaster Recovery: If your local machine's state files gets corrupted or lost, you lose track of the infrastructure being managed by TF. You'd have to manually import it all which is a lot of grunt work, or else you'd lose all the benefits of IaC. Many remote state backends (such as AWS S3) have automated backups and cross-region replication in the rare case that disaster strikes, your state files are safe.

![Using Cloud for Terraform Remote Backend State](/img/updates/cloud-object-storage-terraform-remote-backend/aws-s3-terraform-remote-backend.png)

## Why Cloud Based Object Storage Shines as a Remote Backend
Now you might be wondering, "Okay, remote state sounds great, but where should I store it?" There are various options for the backend - [here’s a list for OpenTofu](https://opentofu.org/docs/language/settings/backends/configuration/).

Cloud service object storage such as Amazon Web Service’s (AWS) S3 is a particularly great choice for the backend for remote state. Here’s why:

1. Battle-Tested & Reliable: Cloud object storage solutions are already used by countless organizations for a variety of different use cases. By choosing this route, you’re benefitting from a battle-tested and community approved approach. Object storage solutions have been around for decades. Your backend and remote state for IaC will be as resilient as the infrastructure they represent - [S3 is designed for 99.99% availability](https://docs.aws.amazon.com/AmazonS3/latest/userguide/DataDurability.html)!

2. Avoid Tooling & Vendor Lock-In: Unlike proprietary IaC management platforms, object storage services have a shared API, allowing you to migrate between them if needed. [While platforms such as Terraform Cloud offer remote state storage solutions, it’s not as easy to migrate off of these backends](https://masterpoint.io/updates/how-to-migrate-off-tfc/) because each service has their own implementations. If you ever need to switch IaC automation providers, which is more likely than migrating your cloud infrastructure, you can easily do so. Your state and backend are universal and unchanged, remaining on AWS S3 or your chosen cloud object store.

3. Portability: As mentioned above, organizations are unlikely to switch cloud providers, but in the case that it does happen, the transition is smooth. Object storage APIs are standard, making provider switches a walk in the park. It’s as easy as changing a few lines in your backend configuration to point to the new storage (of course, you’d also have to actually migrate the state files to the new provider as well, [which is handled during reinitialization](https://developer.hashicorp.com/terraform/language/backend#change-configuration)).

4. Familiarity with Cloud Services: If you’re dealing with IaC, you are likely already working with cloud services such as AWS and Google Cloud (GCP). Using object storage for your remote state means that you can leverage your existing cloud infrastructure functionality, such as [versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html), [encryption](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingEncryption.html), and your cloud’s [IAM permission system for RBAC](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-api-access-authorization/access-control-types.html#rbac).

By leveraging cloud object storage for your remote backend, you get enterprise-grade reliability and security that far surpasses the limitation of a local state backend.

## How do I create a Remote State Backend?
Setting up a remote state backend is straightforward and simple using any cloud provider. We’ll be using AWS as an example with S3 and DynamoDB. It’s as simple as three steps:

1. Create an S3 bucket to store your state files. Configure permissions and any additional features such as encryption at rest.
2. Create a DynamoDB table (with partition key of `LockID` of type `String`, [see detailed documentation](https://developer.hashicorp.com/terraform/language/backend/s3#dynamodb_table)) for state locking. This is strongly recommended to prevent multiple users from using the same state file at once to avoid corrupting the file.
3. Configure the backend in the IaC. For example, in Terraform:
```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state-bucket"
    key            = "terraform.tfstate"
    workspace_key_prefix = “your-root-module-name”
    region         = "us-east-1"
    dynamodb_table = "terraform-state-lock-example-table"
    encrypt        = true
  }
}
```

Initialize it using `terraform init`, then use TF as normal. Each time the state is modified, the backend ensures the changes are stored safely in AWS S3.

To simplify the process of creating your S3 Backend, you can use open-source modules that are specifically designed for this purpose. These offer  best practices and follow strong security practices so you don’t need to reinvent the wheel by writing out TF code for S3 and DynamoDB. [Cloud Posse’s `terraform-aws-tfstate-backend` module](https://github.com/cloudposse/terraform-aws-tfstate-backend) is one we recommend and use across many client accounts.

Here’s an example of how it can be used:
```hcl
module "terraform_state_backend" {
  source = "cloudposse/tfstate-backend/aws"
  version = "1.5.0"  # Use the latest version

  namespace  = "your-namespace"
  stage      = "shared"
  name       = "tfstate-backend"


  terraform_backend_config_file_path = "."
  terraform_backend_config_file_name = "backend.tf"
  force_destroy                      = false
}
```

This will create a new `backend.tf` file that defines the backend with newly provisioned state bucket and state lock table - all of these come right out of the box as an open source Terraform module. Read up more on the [GitHub repository](https://github.com/cloudposse/terraform-aws-tfstate-backend)!

## Conclusion

While local backend state might suffice for small personal projects or proof of concepts, as your infrastructure grows in scale and complexity, remote state is not just beneficial but completely essential. Among the various remote backend options, cloud service object storage stands out because of its reliability, flexibility, and integration with existing cloud ecosystems.

In the world of Infrastructure as Code, your state file is as crucial as the infrastructure that it manages. Be sure to store your state safely in a remote backend. Your future self (and your team) will thank you!

P.S. Interested in exploring more IaC state management readings? We recently published a [case study about migrating over 43,000 resources from Terraform Cloud to Spacelift](https://masterpoint.io/power-digital-case-study/)!
