---
visible: true
draft: false
title: "Using AWS Adaptive Retry Mode with Terraform for Throttled API Requests"
author: Yangci Ou
slug: aws-adaptive-retry-mode-terraform-throttled-api-requests
date: 2026-07-26 # TODO: Update with correct date
# date_modified: 2026-xx-xx Be sure to use this if you've updated the post as this helps with SEO and index freshness
description: "Terraform's AWS provider retries throttled requests with exponential backoff, but each request backs off blind to the others. Adaptive retry mode adds a client-wide rate limiter that paces requests once throttling is detected to avoid being rate limited."
image: /img/updates/aws-adaptive-retry-mode-terraform/aws-adaptive-retry-mode.png
callout: <p>👋 <b>If you're ready to take your infrastructure to the next level, we're here to help. We love to work together with engineering teams to help them build well-documented, scalable, automated IaC that make their jobs easier. <a href='/contact'>Get in touch!</a></p>
---

<h2>Table of Contents</h2>

- [Standard Mode, where Every Request Backs Off Naively](#standard-mode-where-every-request-backs-off-naively)
- [Adaptive Mode, so the Client Paces Itself When Throttling is Detected](#adaptive-mode-so-the-client-paces-itself-when-throttling-is-detected)
  - [Why Not Just Raise Max Retries?](#why-not-just-raise-max_retries)
- [Enable It in the TF Provider Block, Not the Environment](#enable-it-in-the-tf-provider-block-not-the-environment)
- [Don't Apply It Everywhere](#dont-apply-it-everywhere)

> **TL;DR:** By default, Terraform's AWS provider retries each throttled request with exponential backoff, but every request backs off on its own with no idea what the other in-flight requests are doing. With concurrency, the client as a whole keeps slamming AWS' API, so the operation drags on and can eventually burn through `max_retries` and error out or time out entirely. Adaptive retry mode adds a client-wide rate limiter that paces requests once it detects throttling.

## Standard Mode, where Every Request Backs Off Naively

By default, the [Terraform AWS provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs) (via the AWS SDK underneath it) retries every [throttled and rate-limited API request with exponential backoff and jitter](https://github.com/hashicorp/terraform-provider-aws/blob/main/docs/retries-and-waiters.md#default-aws-go-sdk-retries). If your Terraform or OpenTofu operation is drowning in `ThrottlingException` or `Rate exceeded` errors, it is not because TF forgot to back off.

The default _standard_ retry mode backs off **per request**: each throttled call politely waits, doubles, waits again, with no awareness of what any other in-flight request is doing. Terraform is concurrent with a default `-parallelism` of 10 resource operations at once, and each operation is rarely a single API call (there's the create or update, the read-back to refresh state, or a polling waiter checking whether the resource operation is completed). While one request sleeps through its backoff, nine other requests are firing fresh calls, and expired backoffs re-collide with new traffic. In an enterprise setting, where multiple operations are running at the same time from multiple systems, this compounds!

## Adaptive Mode, so the Client Paces Itself When Throttling is Detected

[Adaptive mode](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html) keeps everything standard mode does and adds the missing piece, which is a client-side rate limiter that watches for throttling responses and dials the client's send rate up or down accordingly. **When throttles appear, it cuts the rate and paces itself to avoid errors from rate limits, instead of blindly firing AWS API requests.**

- Without this, those requests just keep getting throttled and retried, so the operation ends up far slower than it should be. Eventually a request burns through `max_retries` and **errors out the whole run, or the operation times out before it ever finishes**.

As the [AWS SDKs and Tools documentation on retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html) puts it, adaptive mode "can delay or block the _initial_ request, not just retries, when throttling is detected." That means the client's own sending is governed at the source.

[AWS recommends adaptive mode](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html) if "your client targets a single resource (for example, one DynamoDB table) and you expect frequent throttling responses. This is common in automated workflows, batch processors, or AI workloads that call a single API operation at high volume."

A big Terraform operation against a rate-capped service fits that description well. Examples such as [IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html), where you might have a monolithic Terraform root module with hundreds of roles and policies, [ALB listener rules](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-limits.html) in the thousands are another, where every rule is a Terraform resource whose refresh hammers the ELB Describe APIs, or [Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/DNSLimitations.html#limits-api-requests-route-53) is limited to only five API requests per second _per account_. **You should always request a Service Quotas increase first, but for limits like these, sometimes it gets denied or doesn't buy you enough headroom.**

### Why Not Just Raise `max_retries`?

You might be tempted to just bump max retries ([`max_retries`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs#max_retries-1)), which controls how many times the provider re-attempts a failed AWS API call before it gives up. That doesn't really fix anything though. If you're not addressing the throttling itself, a request that gets rate limited on attempt three is going to get rate limited on attempt thirty as well, since nothing about how you're sending has changed. All you've done is make the operation take longer before it fails. Adaptive mode is different because it slows down how fast the requests go out to prevent errors.

## Enable It in the TF Provider Block, Not the Environment

You _can_ switch modes with the `AWS_RETRY_MODE` environment variable or the shared AWS config file, since the provider honors both.

<u>**We would recommend using the provider block, not the environment variable.**</u>

An env var is invisible in code & reviews, lives outside version control, and applies to **everything** in that process and shell: every provider configuration in the run, and even the AWS CLI in the same CI job. That's the opposite of what we want, since adaptive should only be on where it's necessary, and reviewers should be able to _see_ where it's on.

The provider block gives you both visibility and scoping. Since v5 of the Terraform AWS provider, [`retry_mode` is a natively supported provider argument](https://registry.terraform.io/providers/hashicorp/aws/latest/docs#retry_mode-1):

```hcl
provider "aws" {
  region     = "us-east-1"
  retry_mode = "adaptive"
}
```

For further solution engineering to tailor the root module, you can go one step further and use [provider aliases](https://developer.hashicorp.com/terraform/language/block/provider#alias) so only certain resources prone to rate limits and throttling get adaptive mode:

```hcl
provider "aws" {
  region = "us-east-1" # default: standard retries
}

provider "aws" {
  alias      = "adaptive_requests"
  region     = "us-east-1"
  retry_mode = "adaptive" # paced client, scoped by alias
}

resource "aws_iam_role" "app" {
  provider = aws.adaptive_requests
  for_each = local.roles
  # ...
}
```

Using [provider aliases with child modules](https://developer.hashicorp.com/terraform/language/modules/develop/providers#passing-providers-explicitly) in the same way via `providers = { aws = aws.adaptive_requests }`. The blast radius is exactly the resources you chose, and it's all greppable when it's in code rather than an environment variable that applies to everything.

## Don't Apply It Everywhere

As per the AWS documentation, [adaptive mode is not recommended as a general default](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html).

This is because there are costs. **Typical operations get slower** since delaying first attempts is the mechanism when there is throttling, so a Terraform/OpenTofu workspace that never gets throttled gains nothing and may still pay latency after a transient blip. Also, that per-client rate limiter is **shared across operations**, so one throttle-prone API surface slows every call the client makes, including calls to operations that were never in trouble (hence the example above with Terraform provider aliases).

The important nuance is that these costs only exist where requests were succeeding in the first place: for resources that are actually being throttled, "slower" is a non-issue, because the fast version wasn't going through anyway. An operation stuck cycling through `Rate exceeded` errors has no latency worth protecting, and a **paced request that lands beats multiple quick ones that bounces**. For the throttled resources, pacing is precisely what finally gets them through. So scope it to resources where throttling is the _expected_ failure mode. There, you're not giving up any speed because the requests via standard retries were already being throttled.
