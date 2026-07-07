---
visible: true
draft: false
title: "Using OpenTofu's Exclude Flag to Isolate Performance Bottlenecks"
author: Yangci Ou
slug: using-opentofu-exclude-flag-isolate-performance-bottlenecks
date: 2026-06-22
# date_modified: 2026-xx-xx Be sure to use this if you've updated the post as this helps with SEO and index freshness
description: "Pair OpenTofu's exclude flag with OpenTelemetry tracing to isolate and prove Terraform performance bottlenecks. A real-world story of cutting plan times from 7 minutes to 2 by pinpointing AWS Route 53 API rate limiting."
image: /img/updates/opentofu-exclude-flag-performance-bottlenecks/opentofu-exclude-flag.png
callout: <p>👋 <b>If you're ready to take your infrastructure to the next level, we're here to help. We love to work together with engineering teams to help them build well-documented, scalable, automated IaC that make their jobs easier. <a href='/contact'>Get in touch!</a></p>
---

<h2>Table of Contents</h2>

- [Real-World Story: Cutting Plan Times From 7 Minutes to 2 Minutes](#real-world-story-cutting-plan-times-from-7-minutes-to-2-minutes)
  - [The Suspect: AWS Route 53's Strict Hard Cap of 5 Requests per Second](#the-suspect-aws-route-53s-strict-hard-cap-of-5-requests-per-second)
  - [Isolating the Suspect with `-exclude`](#isolating-the-suspect-with--exclude)
- [The Line Between Debugging and Avoidance](#the-line-between-debugging-and-avoidance)

OpenTofu (the open-source licensed successor to Terraform under the Linux Foundation, referred to as TF throughout this article) has an exclude (`-exclude`) flag (which was [added in 1.9](https://opentofu.org/docs/v1.9/intro/whats-new/#the--exclude-flag)). With exclude, you can pass TF a resource address and the plan or apply executes as if that resource or anything that depends on it weren't there.

The most obvious use case for this flag is when a resource is broken or stuck mid-operation. You exclude the broken resource and then the rest of the TF operation goes through. You clean up afterwards.

There's a better, less common use case: **pair `-exclude` with OpenTelemetry traces to isolate and validate TF execution performance bottlenecks**.

<div style="margin:1.5rem 0;">
  <div style="display:flex; gap:1rem;">
    <div style="display:flex; flex-direction:column; align-items:center;">
      <span style="display:inline-flex; align-items:center; justify-content:center; width:2rem; height:2rem; flex:0 0 auto; border-radius:50%; background:#0e383a; color:#fff; font-weight:800;">1</span>
      <span style="flex:1 0 auto; width:2px; background:#cfe3d3; margin:.4rem 0;"></span>
    </div>
    <div style="padding-bottom:1.25rem; color:#333;"><strong style="color:#0e383a;">Locate</strong>: run a TF plan with <a href="https://opentofu.org/docs/internals/tracing/">OpenTelemetry tracing</a>; the spans and flame graphs reveal where time is actually spent.</div>
  </div>
  <div style="display:flex; gap:1rem;">
    <div style="display:flex; flex-direction:column; align-items:center;">
      <span style="display:inline-flex; align-items:center; justify-content:center; width:2rem; height:2rem; flex:0 0 auto; border-radius:50%; background:#00a4a4; color:#fff; font-weight:800;">2</span>
    </div>
    <div style="color:#333;"><strong style="color:#0e383a;">Prove</strong>: run TF again with the <a href="https://opentofu.org/docs/cli/commands/plan/#resource-targeting"><code>-exclude</code></a> flag on the slowest resources (determined above) to isolate the cost and confirm the bottleneck.</div>
  </div>
</div>

<div style="margin:2rem 0; padding:1.25rem 1.5rem; background:#f6faf7; border:1px solid #d6e6d8; border-left:4px solid #00a4a4; border-radius:0 10px 10px 0;">
  <div style="font-weight:800; color:#0e383a; margin-bottom:.5rem;">You already know the cause from the traces — so why prove it with <code>-exclude</code>?</div>
  <div style="color:#333;">The fix usually involves nontrivial engineering work with real blast radius — too big a commitment to make on circumstantial evidence. The exclude flag lets you test that hypothesis in minutes and gives you the hard evidence to justify the work, without changing a line of code or any possibility of affecting real infrastructure.</div>
</div>

## Real-World Story: Cutting Plan Times From 7 Minutes to 2 Minutes

In one particular instance we saw, the root module workspace managed around 3,000 resources, so nobody expected instant plans. They averaged about 4-5 minutes, but intermittently, on busy afternoons, the same module would **crawl to ~7 minutes**.

During the execution of `terraform plan/apply` or `tofu plan/apply`, TF refreshes the state by calling the [provider](https://registry.terraform.io/browse/providers) (e.g. AWS/Azure/GCP) through API requests. These requests examine the live infrastructure to compare against the TF infrastructure code. That happens even when nothing in your TF code changed, so even if **only one resource is modified** within a root module with a thousand resources, **it fires thousands API requests** per plan.

One TF execution in isolation is fine, but an enterprise is never that quiet. At any given moment the same AWS API is being hit from every direction: multiple pull requests triggering TF for CI/CD, engineers clicking around the console (API requests under the hood), and even internal tooling. Because some AWS rate limits are account-level, those draw from the same bucket.

### The Suspect: AWS Route 53's Strict Hard Cap of 5 Requests per Second

Looking at the OpenTelemetry traces, it showed that individual `aws_route53_record` reads (lookups that should take seconds) stretched across for minutes, for no visible reason. Setting `TF_LOG=DEBUG` mode showed the underlying reason: the request was rate limited and TF was retrying with backoff.

![Route 53 throttling and retries in the TF debug logs](/img/updates/opentofu-exclude-flag-performance-bottlenecks/opentelemetry-traces-route53.png)

```xml
<ErrorResponse xmlns="https://route53.amazonaws.com/doc/2013-04-01/">
  <Error>
    <Type>Sender</Type>
    <Code>Throttling</Code>
    <Message>Rate exceeded</Message>
  </Error>
  <RequestId>xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</RequestId>
</ErrorResponse>
```

Route 53 has a [hard cap of five API requests per second, per account](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/DNSLimitations.html#limits-api-requests), according to the official AWS documentation. We even filed a ticket with AWS support to see if there was any way to get it raised; the answer a flat "no" because DNS is critical infrastructure and 5 requests / second is the hard limit. This matches with other [engineers' experiences](https://github.com/rancher/rancher/issues/3257) as well.

Buried in the 3,000 resources were 400 AWS Route 53 records, each as its own [TF resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record), and the provider read each record as individual API requests. 400 records (AWS API requests) at 5 requests per second is 80 seconds. But as mentioned above, in an enterprise environment, there are many dependencies, so the bottleneck compounds well past the theoretical 80 seconds.

<div style="display:flex; align-items:center; justify-content:center; gap:1rem; flex-wrap:wrap; margin:2rem 0; padding:1.5rem; border-radius:10px; background:#f6faf7; border:1px solid #d6e6d8; text-align:center;">
  <span style="font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace; font-size:1.5rem; font-weight:800; color:#0e383a;">400 records</span>
  <span style="font-size:1.5rem; color:#7f7e97;">÷</span>
  <span style="font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace; font-size:1.5rem; font-weight:800; color:#0e383a;">5 req/sec</span>
  <span style="font-size:1.5rem; color:#7f7e97;">=</span>
  <span style="font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace; font-size:1.5rem; font-weight:800; color:#00a4a4;">~80s floor</span>
  <span style="flex-basis:100%; color:#555; font-size:.9rem;">…and that's the <em>best</em> case — before any contention (since the rate limit is account-wide).</span>
</div>

![AWS Route 53 console failing to list hosted zones with "Rate exceeded" errors](/img/updates/opentofu-exclude-flag-performance-bottlenecks/aws-console-route53-rate-limited.png "Here, even the AWS Console itself can't list Route 53 resources because the rate limit is account-wide.")

### Isolating the Suspect with `-exclude`

Because the existing setup is a [Terralith](https://masterpoint.io/blog/terralith-monolithic-terraform-architecture/) — a single monolithic Terraform root module that manages multitudes of infrastructure components through one shared state, so unrelated resources are tightly coupled and can't be changed in isolation — the fix required a refactor. We can take either of the following approaches, or both:

- pull DNS out into its own small root module with its own isolated state
- migrate the zone to [`aws_route53_records_exclusive`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_records_exclusive), which manages all records in a DNS zone as a single resource and [performs a batch AWS API request](https://docs.aws.amazon.com/Route53/latest/APIReference/API_ListResourceRecordSets.html).

Because any refactors would be non-trivial work, before making any architecture proposals, I wanted hard evidence to prove that Route 53 rate limiting / throttling was the bottleneck, not just a plausible story.

**The hypothesis is that if Route 53 API requests are the bottleneck, then a TF plan that excludes all Route 53-related resources should be <u>dramatically faster and show zero throttling</u> in the debug logs.** I took these steps:

- Extract the `aws_route53_record` resource addresses from the TF state backend (via `tofu state list`, inspecting the state file directly, or with an [IaC orchestration platform like Spacelift](https://docs.spacelift.io/concepts/resources)).
- Execute TF with the `-exclude` flag. Inline, it looks like this (this stops being fun around the fifth address, especially with hundreds of records):

```bash
tofu plan \
  -exclude='aws_route53_record.alb-us-east-1-example-com' \
  -exclude='aws_route53_record.alb-us-west-2-example-com' \
  -exclude='aws_route53_record.alb-eu-west-1-example-com' \
  -exclude='aws_route53_record.alb-eu-central-1-example-com' \
  -exclude='aws_route53_record.alb-ap-northeast-1-example-com'
# ...plus the other 395
```

Since OpenTofu 1.10, [targeting files](https://opentofu.org/docs/cli/state/resource-addressing/#resource-addresses-in-targeting-files) is a cleaner option. It looks something like this, where `exclude-route53.txt` contains all the TF resource addresses that begins with `aws_route53_record`:

```bash
tofu state list | grep 'aws_route53_record\.' > exclude-route53.txt
tofu plan -exclude-file=exclude-route53.txt
```

Then I ran it multiple times and compared the time it took before and after. I ran this during business hours to make sure the expected API load (from all the other tools and TF plans) was present:

<div style="display:flex; flex-wrap:wrap; gap:1rem; margin:2rem 0 1rem;">
  <div style="flex:1 1 260px; border-radius:10px; padding:1.5rem; background:#f7f2f6; border:1px solid #ecd9e8;">
    <div style="font-size:.8rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#b066a4;">Before (full plan)</div>
    <div style="font-size:2.4rem; font-weight:800; color:#0e383a; line-height:1; margin:.4rem 0;">~5–7<span style="font-size:1rem; font-weight:600; color:#7f7e97;"> min / plan</span></div>
    <div style="color:#555; font-size:.95rem;">OpenTelemetry traces showing Route53 resources taking the longest, with logs showing API throttling.</div>
  </div>
  <div style="flex:1 1 260px; border-radius:10px; padding:1.5rem; background:#eef9f9; border:1px solid #c7eaea;">
    <div style="font-size:.8rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#00a4a4;">After (excluding Route53)</div>
    <div style="font-size:2.4rem; font-weight:800; color:#0e383a; line-height:1; margin:.4rem 0;">~2<span style="font-size:1rem; font-weight:600; color:#7f7e97;"> min / plan</span></div>
    <div style="color:#555; font-size:.95rem;">No rate limiting anywhere in the debug logs.</div>
  </div>
</div>

<div style="margin:0 0 2rem; padding:.9rem 1.25rem; border-radius:10px; background:#0e383a; color:#fff; text-align:center; font-weight:600;">Over <span style="background:linear-gradient(90deg,#ede497,#2ad9c2,#d891ce); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent; font-weight:800;">2× faster</span>: 10% of the TF workspace drove more than <strong style="color:#ede497;">50% of the runtime</strong>.</div>

The same root module, refreshing the other ~2,600 TF resources with AWS API requests, had a performance improvement of over 2x. The savings far exceed the 80-second theoretical AWS Route 53 floor mentioned earlier. That gap is the contention tax: throttled Route 53 API requests backing off and retrying behind the same account quota bucket.

Using the `-exclude` flag confirmed the hypothesis and **<u>proved that the Route 53 resources were the source of the bottleneck</u>**. 400 Route 53 records (roughly ~10% of a 3,000-resource workspace) accounted for more than 50% of every plan's runtime.

## The Line Between Debugging and Avoidance

It would be tempting to stop there without refactoring the TF architecture; the excluded plan is fast. Why not just run with `-exclude` or `-exclude-file` forever, only dropping the flag when you actually need to make Route 53 DNS changes in this example?

Because that's precisely the failure mode the docs warn about. If your pipeline always skips your DNS records, you've stopped detecting drift on your DNS and have no way to manage them via TF. When you do want to update DNS, it's an edge case to "un-exclude" and that's only a band-aid to avoid.

The OpenTofu docs are blunt about targeting and exclusion, and they're right to be.

> It is not recommended to use these options for routine operations, because that can lead to undetected configuration drift and confusion about how the true state of resources relates to configuration. Instead of using resource targeting to operate on isolated portions of very large configurations, prefer to break large configurations into several smaller configurations that can each be independently applied.
>
> — [OpenTofu documentation, resource targeting](https://opentofu.org/docs/cli/commands/plan/#resource-targeting)

We used OpenTelemetry traces with the exclude flag to isolate the problem & confirm the root cause, then went forward with the refactor. It helped us gain the hard evidence that confirms the benefits to justify the refactor.

When TF runs are mysteriously slow and you suspect a particular resource type or module is the culprit, OpenTofu's excluding feature lets you test that hypothesis in minutes, against your real state, without refactoring a line of code or affecting real infrastructure.
