---
visible: true
draft: false
title: "Terraform Destroy Doesn’t Delete Your State File"
author: Yangci Ou
slug: clean-up-orphaned-terraform-state-after-destroy
date: 2026-11-17
# date_modified: 2026-xx-xx Be sure to use this if you've updated the post as this helps with SEO and index freshness
description: "Terraform destroy leaves state in your S3 backend. When you retire a root module or workspace, clean up its empty state and decide what to retain from its version history."
metaDescription: "Terraform destroy leaves state in your S3 backend. When you retire a root module or workspace, clean up its empty state and decide what to retain from its version history."
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
preview_image: /img/updates/clean-up-orphaned-terraform-state-after-destroy/banner.png
preview_image_contain: true
hide_hero: true
callout: <p>👋 <b>If you're ready to take your infrastructure to the next level, we're here to help. We love to work together with engineering teams to help them build well-documented, scalable, automated IaC that make their jobs easier. <a href='https://masterpoint.io/contact/'>Get in touch!</a></b></p>
---

Decommissioning a Terraform or OpenTofu (TF) root module or workspace usually means running `destroy` and removing its directory and code. The resources are gone, and the PR is ready to merge. But the state object is still in the backend.

After a successful `destroy`, that object contains an empty resources list. In a versioned S3 bucket, earlier copies can still contain the full pre-destroy state. Removing the directory or CI stack doesn’t clean up those copies unless you have a separate cleanup step.

This is easy to overlook when multiple root modules and workspaces share a backend bucket. State cleanup should be part of retiring the module or workspace.

## What `destroy` leaves behind

At Masterpoint, we generate the S3 prefix from the root module’s directory name and use named workspaces for instances such as dev and prod. That comes from our backend configuration. TF doesn’t infer the S3 path from a directory name on its own.

Smaller root modules give components independent lifecycles, including when they’re retired. That’s one reason we recommend them over a [Terralith: a monolithic Terraform architecture](https://masterpoint.io/blog/terralith-monolithic-terraform-architecture/).

Using a test root module with a simple `random_pet` resource, here’s the apply-and-destroy lifecycle with the bucket listed after each step. This minimal example stores `terraform.tfstate` at the bucket root. Output is abbreviated from the original test.

<!-- prettier-ignore -->
````text {copy=true collapse=false}
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
````

The object did not go away after `destroy`. It shrank. Here’s the remaining state, with the version and lineage abbreviated:

<!-- prettier-ignore -->
````text {copy=true collapse=false}
{
  "version": 4,
  "terraform_version": "<version>",
  "serial": 2,
  "lineage": "c219d9b8-...",
  "outputs": {},
  "resources": [],
  "check_results": null
}
````

An empty state file with a serial, a lineage, and no resources in it. From TF’s point of view this is correct behavior: `destroy` is an apply whose plan removes the managed resources, and the result of an apply is a new state. Retiring the workspace and its stored state is a separate operation.

## What happens when the name gets reused

In practice, it’s easy to skip `workspace delete` and go straight from `destroy` to removing the code. I tried that sequence with `demo-service`. After I deleted its directory, its empty state was still current in S3.

When I recreated `demo-service`, our backend configuration pointed TF back to the old prefix. Creating the `testing` workspace failed:

<!-- prettier-ignore -->
````text {copy=true collapse=false}
$ tofu workspace new testing
Error: Workspace "testing" already exists
````

Picture someone browsing the TF backend a few months later. They see a state file for `demo-service`’s `testing` workspace even though `demo-service` has been retired. The name looks like any other workspace. Even if they open it and find an empty resource list, they still have to check the repo to figure out whether `testing` was retired or is waiting for its first apply.

## Old versions can still contain the full state

Now the part that matters more than the 152 bytes. Listing the object versions in the minimal test’s bucket still showed the full pre-destroy state. Here’s an abbreviated excerpt, with timestamps replaced by placeholders:

<!-- prettier-ignore -->
````text {copy=true collapse=false}
$ aws s3api list-object-versions --bucket $BUCKET --output table
+----------+----------------------------+-----------------------------+-------+
| IsLatest |            Key             |        LastModified         | Size  |
+----------+----------------------------+-----------------------------+-------+
|  True    |  terraform.tfstate         |  YYYY-MM-DDT05:38:07+00:00  |  152  |
|  False   |  terraform.tfstate         |  YYYY-MM-DDT05:38:05+00:00  |  474  |
|  False   |  terraform.tfstate.tflock  |  YYYY-MM-DDT05:38:07+00:00  |  254  |
|  False   |  terraform.tfstate.tflock  |  YYYY-MM-DDT05:38:04+00:00  |  256  |
+----------+----------------------------+-----------------------------+-------+
````

The 474-byte version is the full pre-destroy state, still retrievable using its version ID. For a `random_pet` that’s harmless. For a root module that manages a secret like an IAM access key, a noncurrent version can contain sensitive attributes TF stored in state. Those versions remain until they’re explicitly deleted or removed by a lifecycle policy.

We recommend enabling versioning on a state bucket. If a write corrupts the state or someone accidentally overwrites it, an earlier version gives you a copy to recover from. When you retire the module, decide whether you still need that history.

## Clean up state when you retire the module

That’s why we recommend removing the empty state file when its root module or workspace is decommissioned. It’s easier to do while the backend configuration is still available, before removing the directory and code. There are three parts to the cleanup:

1. Remove the retired workspace. Once `destroy` has succeeded, the workspace no longer tracks resources, and no CI run or teammate is still using it, you can delete it. For a named workspace such as `testing`, TF requires you to select another workspace first:

   <!-- markdownlint-disable MD014 -->
   <!-- prettier-ignore -->
   ````text {copy=true collapse=false}
   $ tofu workspace select default
   $ tofu workspace delete testing
   ````

   <!-- markdownlint-enable MD014 -->

   The same commands work with `terraform` in place of `tofu`. If `workspace delete` refuses because it still tracks resources, those resources need attention before the state goes away. Using `-force` would leave TF unable to manage them. The default workspace can’t be deleted this way, so retiring that configuration requires handling its exact S3 state key separately.

2. Decide what to do with the old versions. In a versioned bucket, an ordinary object deletion adds a delete marker, so the earlier versions are still there. If you no longer need that history for recovery or retention, you can list the versions for the retired state’s exact key and permanently delete the intended version IDs. In a shared bucket, the other modules’ state needs to stay where it is.

3. Check what’s left. The retired named workspace should no longer appear in the workspace list. In S3, the current state should be gone, along with any historical versions you chose to remove. If you’re keeping the history, a note in the decommissioning PR tells the next engineer why it’s still there.

Cleaning it up in the same change saves the next engineer from having to piece that together.
