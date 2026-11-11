---
visible: true
draft: false
title: "Debugging Slow Terraform and OpenTofu Runs with OpenTelemetry Traces and AI Agents"
author: Yangci Ou
slug: debugging-slow-terraform-opentofu-runs-opentelemetry-traces
date: 2026-11-11
description: "A seven-minute plan could need a provider cache, bigger workers, or a more scoped root module. OpenTelemetry traces show where the time goes, and give an AI agent the evidence to investigate, propose a fix, and verify it."
tags:
  [
    "terraform",
    "opentofu",
    "opentelemetry",
    "datadog",
    "infrastructure-as-code",
    "ai",
    "spacelift",
  ]
image: /img/updates/debugging-slow-terraform-opentofu-runs-opentelemetry-traces/banner.png
hide_hero: true # keep `image` for the blog listing thumbnail and social previews, but not as a banner on the post
callout: "<p>👋 <b>Running into IaC performance issues at your organization?</b> <a href='/contact'>Get in touch</a>, we're the experts at helping organizations ship infrastructure fast and we'd love to chat!"
---

So, there you are, managing [Infrastructure as Code (IaC)](https://aws.amazon.com/what-is/iac/) with Terraform or OpenTofu and waiting on a plan that takes seven minutes to run. When you need to change one security group rule, you find yourself waiting seven minutes again, and inevitably you start wondering whether you need bigger CI/CD workers, a provider cache, or a more scoped root module. All three sound reasonable, but which one would actually help?

We ran into this recently with an enterprise whose root module was managing roughly 3,000 resources. Traces pointed us to slow Route 53 operations, and debug logs showed throttling. Excluding the Route 53 resources for a diagnostic plan brought execution down from roughly five to seven minutes to around two. We covered that investigation in our [OpenTofu `-exclude` post](/blog/using-opentofu-exclude-flag-isolate-performance-bottlenecks/), followed by [using adaptive retry mode for throttled requests](/blog/aws-adaptive-retry-mode-terraform-throttled-api-requests/).

![Plan duration: five to seven minutes for the full plan, around two minutes with the Route 53 resources excluded](/img/updates/debugging-slow-terraform-opentofu-runs-opentelemetry-traces/plan-duration.svg)

Those posts used an [OpenTelemetry trace](https://opentofu.org/docs/internals/tracing/) to explain the problem. This post explains how to get that trace, what to look for, and how to give an AI agent access to the same evidence so it can investigate, propose a change, and check whether the change helped.

The setup below uses OpenTofu.

## Trace the Run Before Refactoring or Changing the Code

Start with the trace. A trace represents an execution, with spans recording the operations inside it and how long they took. In our [OpenTofu traces](https://opentofu.org/docs/internals/tracing/), those operations include provider installation, module downloads, validation, and resource planning or application.

When reviewing a trace, you need to read the timeline as well as the durations. Both Terraform and OpenTofu execute resource operations concurrently. Ten overlapping 20-second spans don’t automatically mean the plan spent 200 seconds waiting.

![Ten overlapping 20-second spans add up to 200 seconds of span time but only 24 seconds of wall-clock time](/img/updates/debugging-slow-terraform-opentofu-runs-opentelemetry-traces/concurrent-spans.svg)

Once you’ve found a slow resource in the table, open its trace and look at what else was happening while it ran. Was it holding up other resources, or was it still running after everything else had finished? You might also see repeated batches of slow reads that add up over the course of the run.

[![Datadog waterfall view of a tofu plan trace: the root tofu span, the backend, validation and plan phases, and the individual resource planning spans starting within the plan phase](/img/updates/debugging-slow-terraform-opentofu-runs-opentelemetry-traces/plan-waterfall.png)](/img/updates/debugging-slow-terraform-opentofu-runs-opentelemetry-traces/plan-waterfall.png)

**Start with the trace to find where the time goes, then collect the evidence (with DEBUG logs if necessary) needed to explain why.**

## Get Your First Trace Into Datadog

We use Datadog here because it lets us investigate infrastructure runs alongside the applications they manage. You can use another OTLP-compatible backend such as Honeycomb or a local Jaeger instance, with the appropriate endpoint and authentication.

For Datadog, configure the following in the environment that runs `tofu`.

```bash {copy=true}
# Supply DD_API_KEY through your CI secret store.
export OTEL_TRACES_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://otlp.{region}.datadoghq.com/v1/traces
export OTEL_EXPORTER_OTLP_TRACES_HEADERS="dd-api-key=${DD_API_KEY},compute_stats=true"
export OTEL_SERVICE_NAME=terraform
export OTEL_RESOURCE_ATTRIBUTES=env=terraform

tofu init
tofu plan
tofu apply
```

Datadog's direct intake accepts HTTP OTLP, not gRPC. `compute_stats=true` enables trace metrics. See Datadog's intake documentation for configuration details.

Direct export keeps the initial setup small for an ephemeral CI worker. A Collector becomes useful when you need central filtering, redaction, buffering, or sampling. If your organization already has that pipeline, send the traces through it.

![Spans flow from the CI worker to Datadog's OTLP intake either directly or through an optional OpenTelemetry Collector that filters, redacts, buffers, and samples; another OTLP backend such as Honeycomb or Sentry can take Datadog's place](/img/updates/debugging-slow-terraform-opentofu-runs-opentelemetry-traces/trace-pipeline.svg)

[![Datadog trace explorer listing tofu traces from the opentofu/spacelift service with their durations and span counts](/img/updates/debugging-slow-terraform-opentofu-runs-opentelemetry-traces/trace-explorer-opentofu.png)](/img/updates/debugging-slow-terraform-opentofu-runs-opentelemetry-traces/trace-explorer-opentofu.png)

On container-per-job runners, a new container ID every run can look like a new host in Datadog. In our setup, we set `datadog.host.name` to a stable worker-pool name in `OTEL_RESOURCE_ATTRIBUTES`; the run ID identifies individual runs. Check Datadog’s hostname guidance for your runner environment before the first invoice.

## Give Every Trace a Stack, Commit, and Run ID

When a stack starts taking longer to run, you need to know which configuration and commit produced those traces so you can go back and work out what changed. Our Spacelift setup stores exporter settings in a shared context and adds run metadata before initialization using computed environment variables.

We also add these custom attributes through `OTEL_RESOURCE_ATTRIBUTES`:

| Attribute               | Purpose                                                             |
| ----------------------- | ------------------------------------------------------------------- |
| `terraform.stack`       | Compare executions of one stack                                     |
| `terraform.root_module` | Locate the configuration directory                                  |
| `git.commit_sha`        | Identify the exact revision                                         |
| `spacelift.run_id`      | Retrieve the run, logs, and plan                                    |
| `spacelift.run_type`    | Separate proposed (PR plans) and tracked runs (deployed TF applies) |

Include repository identity when working across repositories. Other CI systems can supply equivalent metadata.

One CI run can produce separate traces for init, plan, and show. The run ID connects them; a root command span excludes CI queue time and approval waits. Verify attributes on one stack before expanding the rollout.

![One Spacelift run produces a separate trace per tofu command; queue and approval waits are in no trace, and the shared run ID joins the traces together](/img/updates/debugging-slow-terraform-opentofu-runs-opentelemetry-traces/run-traces.svg)

These attributes also let an agent distinguish a code regression from a different execution context. Compare runs of the same stack and run type, and inspect command arguments when refresh behavior differs.

## Use the OTel Trace for Your Next Investigation

Use the trace to distinguish slow initialization from resource operations delayed by API throttling.

### Slow Initialization: Investigate Provider Installation

For example, initialization on one of our stacks took roughly 38 to 42 seconds, with 32 to 37 seconds in `Get Providers`. Your root module might use several providers, such as AWS, Kubernetes, Helm, and GitHub, which a fresh CI worker has to install. Or most of that time might come from downloading and decompressing one large provider package. Expand the child spans to see which installations take the time, then check whether the worker downloads those packages again on every run.

On one stack, installing the AWS provider took 27–29 seconds.

[![Datadog flame graph of a tofu init trace: Get Providers takes 33 of 37 seconds, most of it installing and decompressing the AWS provider](/img/updates/debugging-slow-terraform-opentofu-runs-opentelemetry-traces/init-get-providers-flame-graph.png)](/img/updates/debugging-slow-terraform-opentofu-runs-opentelemetry-traces/init-get-providers-flame-graph.png)

Both Terraform and OpenTofu support persistent plugin caches and provider network mirrors. A cache reuses downloaded packages; a nearby HTTPS mirror can shorten downloads for fresh workers. Compare cold and warm runs, and account for concurrent access if workers share a cache. Neither approach eliminates every decompression or storage bottleneck.

Trend `Install (http)` durations by provider. Simultaneous download slowdowns or errors across stacks suggest a shared network, registry, or module-source problem. Provider plugin caching does not cover Git-sourced modules.

### Slow Plans or Applies Phases

Throttling can affect reads during planning or writes during apply. In our Route 53 investigation, one record read took 2 minutes 55 seconds; debug logs confirmed throttling.

[![Datadog flame graph of a tofu plan trace with a 37-second Route 53 record planning span selected, and its opentofu.resource_instance.address in the span panel](/img/updates/debugging-slow-terraform-opentofu-runs-opentelemetry-traces/route53-plan-flame-graph.png)](/img/updates/debugging-slow-terraform-opentofu-runs-opentelemetry-traces/route53-plan-flame-graph.png)

Spans such as `Plan resource instance changes` carry `opentofu.resource_instance.address`, so you can connect a slow operation to an address like `module.alb.aws_lb_listener_rule.https["api"]`. In this example, an ALB module uses `for_each` to create HTTPS listener rules for several applications:

- `module.alb.aws_lb_listener_rule.https["api"]` routes requests to the API service.
- `module.alb.aws_lb_listener_rule.https["web"]` routes requests to the web frontend.
- `module.alb.aws_lb_listener_rule.https["admin"]` routes requests to the admin application.

These instances come from the same resource block, but each has its own resource address and planning span. If all three have long spans, one possibility is that requests made while refreshing the rules are hitting AWS API rate limits. Throttled requests can trigger provider retries with backoff, stretching a resource operation across seconds or minutes. Before changing anything, check the provider logs for throttling responses and retry delays, then look for other stacks making requests against the same service in the same AWS account and Region.

![The trace shows one span lasting 2 minutes 55 seconds; the debug logs show that span is twelve throttled attempts separated by growing backoff waits, then one success](/img/updates/debugging-slow-terraform-opentofu-runs-opentelemetry-traces/span-vs-retries.svg)

For an apply example, suppose a Terraform or OpenTofu change updates tags on 1,000 listener rules across multiple ALBs. Planning completes normally, but many `aws_lb_listener_rule` update spans stretch into minutes. Provider logs reveal throttled Elastic Load Balancing requests and repeated backoff.

In your tracing backend, find resource-planning or resource-application spans for the stack and phase you want to investigate. Group them by resource address and compare p95 durations alongside sample counts. Span names and attribute mappings can vary, so confirm them against your own traces.

The same data can answer several other questions:

- Did this commit make it slower?
- Why does this run hang or time out?
- Which data source is slow?
- Did an apply contribute to an application incident?

As a quick reference, here is what each trace pattern in this post points to:

| If the trace shows                                                                                       | It points to                                                     | Try                                                                       |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Init dominated by `Get Providers` and `Install (http)`                                                   | Providers downloaded again on every fresh worker                 | A persistent plugin cache or a nearby network mirror                      |
| A few resource spans stretched to minutes, with throttling in the DEBUG logs                             | API rate limits and provider retry backoff                       | Adaptive retry mode, or moving those resources into their own root module |
| A resource that is slow by nature, such as an RDS instance, a CloudFront distribution, or an EKS cluster | The service itself, not your configuration                       | Move it into its own root module so it doesn't hold up unrelated changes  |
| A slow run with a short trace                                                                            | Time spent outside the command, in CI queueing or approval waits | More workers or higher run concurrency                                    |

That also answers the question from the top of this post. A provider cache helps when initialization is the slow part. A more scoped root module helps when the plan is slow because of how much it has to refresh; if the same root module keeps showing up in slow runs, consider [breaking up a monolithic root module](/blog/terralith-monolithic-terraform-architecture/). Bigger or faster CI workers help when the time is spread thinly across the whole run with no single slow span, and do nothing for a throttled API or a slow provider download. Which one fits depends on your system. **That is a good question to put to the agent: with the traces, the code, and the run history in front of it, it has far more data about your architecture to base that decision on than a rule of thumb does.**

## Give the Agent Access to the Evidence

If you’re going to ask an agent what’s slowing a stack down, it needs access to the traces and enough context to connect what happened in the run to the code. Datadog's MCP tools support span searches, aggregations, and trace retrieval. You can also use other API / CLI tools.

With repository instructions defining the investigation method, start with one prompt:

```text {copy=true}
What's causing <root module / stack> to be so slow? Where is the time going,
when did it get slower, and what introduced the slowdown? Check the traces,
CI runs, and git history. What change would help most, and how can we verify
it? Link the evidence behind your conclusions.
```

Other questions work too: “Did the provider upgrade slow our plans?”, “Are we downloading providers every run?”, or “Why is this stack slower during business hours?”

The agent can also investigate:

- **Unnecessary serialization.** One module waits for another. Check the dependency graph for broad module-level `depends_on`, then propose narrower references that preserve required ordering. Module dependencies affect resources and data sources throughout the module.
- **Repeated lookups.** Application modules repeatedly fetch the same VPC or subnets. Confirm matching inputs and provider configurations, then consolidate the lookup and pass results to child modules.
- **Provider regressions.** Resource operations slow down after a lock-file change. Compare versions and test a compatible rollback or newer fix.

Start with aggregates and retrieve representative traces. Large trace responses can be truncated; the agent should report missing evidence instead of treating partial results as complete. Resource addresses, commit SHAs, and run IDs connect each finding to the code and logs.

## Make the Agent Verify the Performance Fix

Take the Route 53 investigation as an example. The agent finds that DNS record spans dominate the slow plans, confirms throttling in the run logs, and runs a diagnostic plan that excludes those records. If that removes most of the delay, it opens a PR: adaptive retries on a provider alias, or DNS in its own root module with an explicit state migration plan.

![The agent's loop: locate slow spans, explain them from run logs, test with a diagnostic plan, change the code, verify with matched full runs, and revise the hypothesis if the plan is not faster](/img/updates/debugging-slow-terraform-opentofu-runs-opentelemetry-traces/agent-loop.svg)

Then it verifies. A plan can get faster because refresh was turned off, resources were excluded, or the work moved to another stage, so a faster number on its own is not a fix. The agent checks that the full plan still manages the intended infrastructure and that comparable runs are faster, with provider versions, worker configuration, and cache conditions kept the same. A handful of matched runs is enough for a first signal; a claim about p95 needs more.

Ask for a PR with the baseline and candidate commit SHAs, run and trace links, sample counts, and observed durations. If the agent can't reproduce the slowdown or the change doesn't help, it should say so and revise the hypothesis.

**The completion condition is a correct full plan and measured improvement against comparable runs.**

## Keep the Telemetry Useful as Usage Grows

Build a dashboard showing command and phase durations, slow resources with sample counts, and span volume. Keep init, plan, and apply separate. Historical queries depend on retained data, so check coverage before trusting trends.

The dashboard below runs against our own internal stacks, so it looks tidy: a handful of runs per stack and durations that barely move. In a production environment with hundreds of stacks and runs every day, the same panels show far more spread, and that spread is where regressions and outliers stand out.

[![Datadog dashboard of OpenTofu run performance: plan phase p95 by stack over time, p95 of each phase over time, and tables of plan and init durations by stack with span counts](/img/updates/debugging-slow-terraform-opentofu-runs-opentelemetry-traces/dashboard-run-performance.png)](/img/updates/debugging-slow-terraform-opentofu-runs-opentelemetry-traces/dashboard-run-performance.png)

Add monitors and alarms so the team hears about regressions without having to watch the dashboard. For example:

- A stack's plan duration stays above twice its recent baseline across several comparable runs. Alert the team that owns the root module, with links to the slow runs and their commits.
- A resource-planning operation repeatedly exceeds 60 seconds. Include its resource address and trace link so an engineer or agent can investigate retries, throttling, or other provider behavior.

**With traces, run history, and the code in one place, you no longer have to guess where the time goes, the root cause, or the solution to fix it. Give that same context and data to an AI agent and it can diagnose the slowdown, make the best-informed decision about which fix suits your system, and show you the numbers that prove it helped.**
