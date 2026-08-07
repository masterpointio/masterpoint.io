---
visible: true
draft: false
title: "Using AWS Adaptive Retry Mode with Terraform for Throttled API Requests"
author: Yangci Ou
slug: aws-adaptive-retry-mode-terraform-throttled-api-requests
date: 2026-08-10
# date_modified: 2026-xx-xx Be sure to use this if you've updated the post as this helps with SEO and index freshness
description: "Terraform's AWS provider retries throttled requests with exponential backoff, but each request backs off blind to the others. Adaptive retry mode adds a client-wide rate limiter that paces requests once throttling is detected to avoid being rate limited."
image: /img/updates/aws-adaptive-retry-mode-terraform/aws-adaptive-retry-mode.png
callout: "<p>👋 <b>Running into IaC performance issues at your organization?</b> <a href='/contact'>Get in touch</a>, we're the experts at helping organizations ship infrastructure fast and we'd love to chat!"
---

<h2>Table of Contents</h2>

- [Intro](#intro)
- [Standard Mode, Where Every Request Backs Off Naively](#standard-mode-where-every-request-backs-off-naively)
- [Adaptive Mode, so the Client Paces Itself When Throttling is Detected](#adaptive-mode-so-the-client-paces-itself-when-throttling-is-detected)
  - [Why Not Just Raise Max Retries?](#why-not-just-raise-max-retries)
  - [Why Not Just Lower Parallelism?](#why-not-just-lower-parallelism)
- [Enable It in the TF Provider Block, Not the Environment](#enable-it-in-the-tf-provider-block-not-the-environment)
- [Don't Apply It Everywhere](#dont-apply-it-everywhere)

## Intro

By default, Terraform's AWS provider retries each throttled request with exponential backoff, but every request backs off on its own with no idea what the other in-flight requests are doing. With Terraform's parallelism, the client as a whole keeps slamming AWS' API, so the operation drags on and can burn through `max_retries`, erroring out or timing out entirely. Adaptive retry mode adds a client-wide rate limiter that paces requests once it detects throttling. We'll dig into this functionality below.

## Standard Mode, Where Every Request Backs Off Naively

By default, the [Terraform AWS provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs) (via the AWS SDK underneath it) retries every [throttled and rate-limited API request with exponential backoff](https://github.com/hashicorp/terraform-provider-aws/blob/main/docs/retries-and-waiters.md#default-aws-go-sdk-retries). If your Terraform or OpenTofu operation is drowning in `ThrottlingException` or `Rate exceeded` errors, it is not because TF forgot to back off.

The default _standard_ retry mode backs off **per request**: each throttled call politely waits, doubles, waits again, with no awareness of what any other in-flight request is doing. Terraform runs a default `-parallelism` of 10 resource operations at once, and each operation is rarely a single API call (the create or update, the read-back to refresh state, a polling waiter checking for completion). While one request sleeps through its backoff, nine others are firing fresh calls, and expired backoffs re-collide with new traffic. In an enterprise setting, with multiple operations running at once from multiple systems, this compounds!

## Adaptive Mode, so the Client Paces Itself When Throttling is Detected

[Adaptive mode](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html) keeps everything standard mode does and adds the missing piece, which is a client-side rate limiter that watches for throttling responses and dials the client's send rate up or down accordingly, hence the name "adaptive". **When throttles appear, it cuts the rate and paces all requests from the Terraform Provider to avoid errors from rate limits, instead of blindly firing AWS API requests.**

- Without this, requests keep getting retried and throttled since the naive backoff never accounts for the other in-flight calls, so the operation drags on far longer than it should. Eventually it burns through `max_retries` and **errors out the whole run, or times out before it ever finishes**.

As the [AWS SDKs and Tools documentation on retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html) puts it, adaptive mode "can delay or block the _initial_ request, not just retries, when throttling is detected." The client's own sending is governed at the source.

[AWS recommends adaptive mode](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html) if "your client targets a single resource (for example, one DynamoDB table) and you expect frequent throttling responses. This is common in automated workflows, batch processors, or AI workloads that call a single API operation at high volume."

A big Terraform operation against API rate-capped services fits that description well. Think a monolithic root module ([terralith](https://masterpoint.io/blog/terralith-monolithic-terraform-architecture/)) with hundreds of [IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html) roles and policies, thousands of [ALB listener rules](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-limits.html) where every rule is a resource whose refresh hammers the ELB Describe APIs, or [Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/DNSLimitations.html#limits-api-requests-route-53), which caps you at five API requests per second _per account_. **You should always request a Service Quotas increase first, but for limits like these, sometimes it gets denied or doesn't buy you enough headroom.**

### Why Not Just Raise Max Retries?

It's tempting to just bump max retries ([`max_retries`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs#max_retries-1)), which controls how many times the provider re-attempts a failed AWS API call before giving up, but that doesn't fix anything. If you're not addressing the throttling itself, a request that gets rate limited on attempt #3 gets rate limited on attempt #30 too, since nothing about how you're sending has changed. All you've done is make the operation take longer before it fails. Adaptive mode is different because it slows down how fast the requests go out in the first place.

### Why Not Just Lower Parallelism?

The other knob is [`-parallelism`](https://developer.hashicorp.com/terraform/cli/commands/apply#parallelism-n), dropped from the default of 10 to 2 or 3 so fewer requests are in flight. That does reduce throttling, but it's a blunt instrument since parallelism is **global** while throttling almost never is. It's usually one or two API surfaces hitting their limits while everything else in the root module is perfectly fine, so **turning parallelism down slows every resource in the run to accommodate a small slice of it**, on every run, whether throttling shows up that day or not. Adaptive mode only kicks in once throttling is actually observed, and with provider aliases (more on that below) you can scope it to just the resources prone to rate limits while everything else runs at full speed.

## Enable It in the TF Provider Block, Not the Environment

You _can_ switch modes with the `AWS_RETRY_MODE` environment variable or the shared AWS config file, since the provider honors both.

<u>**We would recommend using the provider block, not the environment variable.**</u>

An env var is invisible in code & reviews, lives outside version control, and applies to **everything** in that process and shell: every provider configuration in the run, and even the AWS CLI in the same CI job. That's the opposite of what we want, since adaptive should only be on where it's necessary, and reviewers & future readers should be able to _easily see_ where it's on.

The provider block gives you both visibility and scoping. Since v5 of the Terraform AWS provider, [`retry_mode` is a natively supported provider argument](https://registry.terraform.io/providers/hashicorp/aws/latest/docs#retry_mode-1):

```hcl
provider "aws" {
  region     = "us-east-1"
  retry_mode = "adaptive"
}
```

To tailor the root module further, use [provider aliases](https://developer.hashicorp.com/terraform/language/block/provider#alias) so only the resources prone to throttling get adaptive mode:

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

Using [provider aliases with child modules](https://developer.hashicorp.com/terraform/language/modules/develop/providers#passing-providers-explicitly) is similar via `providers = { aws = aws.adaptive_requests }`. The blast radius is exactly the resources you chose, and it's all greppable in code rather than an environment variable that's under the hood.

## Don't Apply It Everywhere

As per the AWS documentation, [adaptive mode is not recommended as a general default](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html).

This is because there are costs. **Typical operations get slower**, since delaying first attempts is the mechanism itself, so a Terraform or OpenTofu workspace that never gets throttled gains nothing and may still pay a latency cost after a transient blip. And that per-client rate limiter is **shared across operations**, so one throttle-prone API surface slows every call the client makes, including ones that were never in trouble (hence the provider aliases above).

The important nuance is that adaptive mode only **pays a latency cost on requests that would have succeeded immediately anyway**. For resources that are already being throttled, there’s no real speed to preserve because standard retries are just bouncing off `Rate exceeded errors`.

We have a practical rule at Masterpoint that is simple: keep the standard mode by default, and use adaptive retry mode where throttling occurs or is expected (Route53, we're looking at you). A paced request that succeeds is better than a burst of fast requests that AWS rejects.
