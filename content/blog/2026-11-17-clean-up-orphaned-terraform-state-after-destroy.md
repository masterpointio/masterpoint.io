---
visible: true
draft: false
title: "Terraform Destroy Doesn't Delete Your State File - Clean Up Orphaned State in Remote Backend (e.g. AWS S3)"
author: Yangci Ou
slug: clean-up-orphaned-terraform-state-after-destroy
date: 2026-11-17
# date_modified: 2026-xx-xx Be sure to use this if you've updated the post as this helps with SEO and index freshness
description: "Destroying a root module, its directory with its code, and the stack on CI/CD never removes the state object in your Terraform backend. The empty state file, and with versioning every previous copy of it, lives in the bucket forever unless you delete it yourself."
tags:
  [
    "terraform",
    "opentofu",
    "aws",
    "s3",
    "state-management",
    "terraform-backend",
    "terraform-remote-backend",
    "iac",
    "infrastructure-as-code",
  ]
image: /img/updates/clean-up-orphaned-terraform-state-after-destroy/banner.png
hide_hero: true
callout: <p>👋 <b>If you're ready to take your infrastructure to the next level, we're here to help. We love to work together with engineering teams to help them build well-documented, scalable, automated IaC that make their jobs easier. <a href='https://masterpoint.io/contact/'>Get in touch!</a></b></p>
---

<h2>Table of Contents</h2>

- [How Root Modules Become State Objects](#how-root-modules-become-state-objects)
- [What `destroy` Leaves Behind](#what-destroy-leaves-behind)
- [What happens when the name gets reused](#what-happens-when-the-name-gets-reused)
- [Cleanup the State Files during Decommissioning of a Root Module](#cleanup-the-state-files-during-decommissioning-of-a-root-module)

Decommissioning a Terraform or OpenTofu (TF) root module or workspace usually means running `destroy`, and removing its directory & the code. The resources are gone, and the PR is ready to merge. But the state object is still in the backend, like AWS S3 if that's your remote backend.

After destroy, that object contains an empty resources list. Running a `destroy` and removing the directory or stack doesn't clean up those copies.

This is easy to overlook when multiple root modules and workspaces share a backend bucket, so you should take decommission the orphaned state file as part of destroying a root module or workspace.

## How Root Modules Become State Objects

At Masterpoint, we recommend using a centralized Terraform state backend, and we generate the S3 prefix from the root module's directory name and use named workspaces for instances such as `dev` and `prod`. Here's what some TF state files might look like in one bucket:

```text
s3://company-tfstate/network/dev/terraform.tfstate
s3://company-tfstate/network/stage/terraform.tfstate
s3://company-tfstate/network/prod/terraform.tfstate
s3://company-tfstate/demo-service/prod/terraform.tfstate
```

A single root module managing most of a platform may instead have just one state object. We call that a [Terralith: a monolithic Terraform architecture](https://masterpoint.io/blog/terralith-monolithic-terraform-architecture/). As it grows, the problems extend beyond a large state file: slower plans and applies, contention for the same state lock, a wider blast radius, and difficulty separating environments, regions, and accounts. Smaller root modules give components independent lifecycles, including when they're retired, so we always recommend more narrow and scoped root modules.

## What `destroy` Leaves Behind

Using a test root module that as a simple `random_pet` resource that generates some string and the backend block above pointed at a fresh bucket Here's the whole lifecycle with the bucket listed after each step:

```console
$ tofu apply -auto-approve
random_pet.this: Creation complete after 0s [id=outgoing-iguana]
Apply complete! Resources: 1 added, 0 changed, 0 destroyed.

$ aws s3 ls s3://$BUCKET --recursive
YYYY-MM-DD 00:38:05        474 terraform.tfstate

$ tofu destroy -auto-approve
random_pet.this: Destruction complete after 0s
Destroy complete! Resources: 1 destroyed.

$ aws s3 ls s3://$BUCKET --recursive
YYYY-MM-DD 00:38:07        152 terraform.tfstate
```

## What happens when the name gets reused

In practice, it's easy to skip `workspace delete` and go straight from destroy to removing the code. I tried that sequence with `demo-service`. After I deleted its directory, its empty state was still current in S3. Removing the CI stack would also leave that state in place unless the stack had a separate cleanup step.

When I recreated `demo-service`, the directory name pointed TF back to the old prefix. Workspace setup failed:

```console
$ tofu workspace new testing
Error: Workspace "testing" already exists
```

The object did not go away after `destroy`. It shrank. Here is what the 152 bytes contain:

```json
{
  "version": 4,
  "terraform_version": "<version>",
  "serial": 2,
  "lineage": "c219d9b8-...",
  "outputs": {},
  "resources": [],
  "check_results": null
}
```

An empty state file with a serial, a lineage, and nothing in it. From TF's point of view this is correct behavior: `destroy` is an apply whose plan removes everything, and the result of an apply is a new state. TF has no concept of "this configuration is retired, discard the state entirely."

Now the part that matters more than the 152 bytes. Listing the object versions:

```console
$ aws s3api list-object-versions --bucket $BUCKET --output table
+----------+----------------------------+-----------------------------+-------+
| IsLatest |            Key             |        LastModified         | Size  |
+----------+----------------------------+-----------------------------+-------+
|  True    |  terraform.tfstate         |  YYYY-MM-DDT05:38:07+00:00  |  152  |
|  False   |  terraform.tfstate         |  YYYY-MM-DDT05:38:05+00:00  |  474  |
|  False   |  terraform.tfstate.tflock  |  YYYY-MM-DDT05:38:07+00:00  |  254  |
|  False   |  terraform.tfstate.tflock  |  YYYY-MM-DDT05:38:04+00:00  |  256  |
+----------+----------------------------+-----------------------------+-------+
```

The 474-byte version is the full pre-destroy state, still retrievable with a `--version-id`. For a `random_pet` that's harmless. For a root module that manages a secret like an IAM access key, that noncurrent version contains the content and attributes TF stores in state, and it outlives the resource by as long as the bucket exists (unless you have lifecycle policies on the objects).

We recommend enabling versioning on a state bucket. If a write corrupts the state or someone accidentally overwrites it, an earlier version gives you a copy to recover from. If you no longer need that history when you retire the module, you can remove its old versions as part of decommissioning.

## Cleanup the State Files during Decommissioning of a Root Module

Picture someone browsing the TF backend containing all the state files a few months later. They see `serviceA/testing/terraform.tfstate` even though clearly `serviceA` has clearly been retired already. The name looks like any other workspace. Even if they open it and find an empty resource list, they still have to check the repo to figure out whether testing was retired or is waiting for its first apply, and it's just not obvious so it causes confusion.

That’s why we recommend removing the empty state file when its root module or workspace is decommissioned. Cleaning it up in the same change saves the next engineer from having to piece that together.
