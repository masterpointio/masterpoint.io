# MarketSpark · From ClickOps to 100% IaC

**Modernizing & migrating MarketSpark's manually-managed AWS Cloud to 100% Infrastructure as Code.**

> _Description for SEO / share previews:_ How Masterpoint rebuilt MarketSpark's AWS environment from a single ClickOps-managed account into an 11-account AWS Organization, 100% codified in OpenTofu, with 100+ AWS ECS and Lambda services across Development, Staging, and Production. Handed off to engineers who were already shipping against it.

## At a glance

- **1 → 11** · AWS accounts · monolith to Organization
- **0% → ~100%** · Infrastructure as Code coverage
- **100+ Services** · AWS ECS & Lambda codified with [Principle of Least Privilege (PoLP)](https://en.wikipedia.org/wiki/Principle_of_least_privilege) across Development, Staging, and Production environments
- **Hours, not weeks** · full-region disaster recovery

---

## Executive Summary

MarketSpark's AWS environment had outgrown its manually managed, monolithic single-account origins. Masterpoint rebuilt it from the ground up: an **11-account AWS Organization** with environment-isolated VPC networking, **~100% of infrastructure managed by Infrastructure as Code in OpenTofu** (the open-source-licensed successor to Terraform) and automated through Spacelift, SSO on AWS federated to Microsoft Entra ID, IAM and security best practices applied with principle of least privilege, centralized Datadog observability, and **100+ AWS ECS and Lambda services codified in OpenTofu across Development, Staging, and Production** (with the ECS fleet migrated from ECS-on-EC2 to Fargate as part of the rebuild).

The migration cutover was seamless — every workload moved inside the planned maintenance window, with no rollback and no unplanned downtime. The result is an infrastructure that documents itself, costs less to run with FinOps AWS tagging, has less maintenance overhead, full-region disaster recovery measured in hours instead of weeks, and is aligned with industry security and compliance frameworks (SOC 2, ISO 27001, HIPAA, PCI DSS). **By handoff, MarketSpark engineers were already shipping and iterating against the platform on their own.**

> **About MarketSpark**
> _Placeholder for a 1–2 sentence company description — what they do, who they serve, why their infrastructure matters to their product._

---

## MarketSpark's Starting Point

With MarketSpark scaling, new customers coming online and the product surface widening, the infrastructure underneath was still the original one, manually built by hand when the footprint was smaller.

Day to day, that showed up in ways the team felt constantly. Every change was manually done (ClickOps) in the AWS Console. There was no infrastructure as code, and the "source of truth" was whatever someone had clicked last and screenshots in documents. There was no centralized observability: logs, APM, and tracing were scattered, and alerting was ad-hoc. Engineer access to private resources relied on a manually-maintained OpenVPN server running on an EC2 instance. Long-lived IAM credentials held broad access.

MarketSpark's entire AWS footprint (Development, Staging, and Production) all lived inside a single AWS account, sharing the same VPCs, security groups, and IAM policies. Every change carried a blast radius far larger than it should have.

The MarketSpark team knew they had outgrown this setup. They had already begun planning an improvement: splitting their monolithic VPC into multiple VPCs, one per environment, to achieve isolation.

That's when Masterpoint came in.

---

## The Audit

Our engagement started with a comprehensive **Infrastructure as Code (IaC) and Amazon Web Services (AWS) audit**. We sat down with stakeholders and engineers, mapped the existing architecture, identified risk, and produced a written recommendations and modernization roadmap.

One of the core outputs was a recommendation for isolated AWS Organization accounts and managing AWS infrastructure with IaC.

> **Why account isolation, not VPC isolation?**
> AWS's own guidance is explicit: the Well-Architected Framework's Security Pillar names *"Separate workloads using accounts"* as a top-line best practice (`SEC01-BP01`). VPC-per-environment still shares the same IAM scope, control plane, billing surface, and blast radius. Account-per-environment gives **hard IAM boundaries enforced by AWS itself**, separate billing, separate Service Control Policies, and a complete isolation story for compliance.

Separate accounts give a hard security boundary VPCs alone can't provide: blast-radius containment, IAM isolation, billing clarity, and a clean path to compliance and security frameworks (e.g. SOC2). It's the foundation everything else gets built on.

---

## What We Built

### A Multi-Account AWS Organization with Dedicated VPCs, IAM Best Practices, and Guardrails

MarketSpark went from one (1) monolithic account to eleven (11), each with its own IAM boundary. Accounts include **Root, Identity, Log Archive, Audit, DNS, Artifacts, Automation,** and the workload environment platform accounts: **Sandbox, Development, Staging, and Production.**

- The single shared VPC was replaced by **environment-isolated VPCs**, one for each workload environment.

![Before: one monolithic AWS account. After: eleven isolated accounts in an AWS Organization.](/img/case-studies/marketspark/account-isolation.svg)
*From a single shared account to eleven function- and environment-isolated accounts inside an AWS Organization.*

Long-lived IAM users, a security liability we see in nearly every cloud infrastructure audit, are gone. Identity and access are rebuilt around AWS-native best practices:

- **AWS IAM Identity Center federated to Microsoft Entra ID**, with codified, auditable, trivially-revocable permission sets.
- **Service Control Policies** as preventative guardrails at the Organization level.
- **OIDC trust** with GitHub Actions and Spacelift — zero static credentials in CI/CD.

> **Business impact**
> **Hardened blast-radius containment.** A misconfiguration in Development can no longer reach Production. Each environment runs in its own AWS account with its own dedicated VPC and IAM scope, so failures, mistakes, and security incidents stay where they happen. Billing splits cleanly by environment too, so runaway costs in Dev no longer touch Production.

### A Complete Infrastructure as Code (OpenTofu) Codebase

MarketSpark went from **0% to ~100% of their AWS infrastructure managed as code**. Every resource (VPCs, Aurora PostgreSQL clusters, ECS Fargate services, Lambdas, API Gateways, SQS/SNS, S3, CloudFront, WAF) is defined in code. Changes flow through GitHub pull requests, with the IaC lifecycle automated through Spacelift.

![IaC coverage went from 0% to approximately 100%](/img/case-studies/marketspark/iac-coverage.svg)
*Every resource type is now declared in OpenTofu: networking, data, compute, messaging, edge, security.*

- **Spacelift** wires every root module into a stack with policy-driven approval flows and self-service deployment. PRs are the change interface; Spacelift runs are the audit trail.
- **Tailscale** replaced the fragile EC2 OpenVPN. Engineers get zero-friction, identity-aware access to private resources, with no keys, configs, or EC2 instance to maintain. Routes and ACLs live in IaC as well.
- **Datadog** brought centralized observability where previously there was none, with Datadog Agent and log-router sidecars, APM and tracing, log forwarding from CloudWatch, and monitors, all defined in IaC.

> **TODO:** Show Spacelift Automation. Drop in a real screenshot of the Spacelift dashboard or a stack run.

> **Infrastructure that documents itself.** When every VPC, IAM policy, ECS service, and Lambda function is defined in Git, you stop asking questions like "wait, why does this security group exist?" The code is the answer. Pull requests are the changelog. Onboarding a new engineer goes from a multi-week safari through the AWS Console to reading a repository.
>
> — *The shape of the engagement*

> **Business impact**
> **Faster product velocity, lower operational risk.** The PR is what creates the democracy — every engineer ships infrastructure the same way they ship application code. What used to require a senior engineer in the AWS console (careful not to break the wrong environment) is now a reviewed PR. Centralized observability through Datadog means incidents are caught by the MarketSpark engineering team in minutes, instead of being reported by customers. And full-region disaster recovery drops from weeks of manual rebuilding to hours of automated deploys.
>
> **Enterprise-grade trust, ready to sell against.** SOC 2 and adjacent frameworks (ISO 27001, HIPAA, PCI DSS) no longer block on a future infrastructure rebuild. Account isolation, codified IAM, audit trails, TLS everywhere, least-privilege access, and zero long-lived credentials are already in place. MarketSpark can pursue formal certification when the business is ready, unlocking enterprise deals where compliance posture is a procurement gate.

### 100+ AWS ECS & Lambda Services Codified Across Every Environment

**100+ AWS ECS and Lambda services** were codified in OpenTofu (the open-source-licensed successor to Terraform) across Development, Staging, and Production environments with [Principle of Least Privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege) (PoLP) IAM applied to every workload.

During the audit, Masterpoint and MarketSpark engineers also concluded that all ECS services were Fargate compatible. The ECS fleet was migrated from **ECS-on-EC2 to ECS Fargate**, with **Fargate Spot** enabled where tolerated (delivering up to a 70% discounted AWS rate).

Per-task right-sizing means a real reduction in compute spend since it means no more allocating peak headroom per host. Each task runs in its own micro-VM, eliminating noisy-neighbor problems. Scaling responsiveness improves without EC2 capacity-provider resource planning. No more EC2 patching, AMI tuning, or ASG management.

> **Business impact**
> **Less infrastructure overhead, more focus on the product.** With Fargate replacing EC2 hosts, the maintenance overhead (patching, AMI tuning, capacity planning, ASG management) shifts to AWS. Combined with Fargate Spot and per-task right-sizing, MarketSpark also pays less for compute on the same workload. MarketSpark engineers can now spend their time delivering business value to customers instead of troubleshooting hosts.

---

## Additional Infrastructure Modernization Wins

With the infrastructure already under the knife, Masterpoint folded in several improvements that weren't strictly in the original scope but only became feasible because everything was being rebuilt in IaC.

- **[Principle of Least Privilege (PoLP)](https://en.wikipedia.org/wiki/Principle_of_least_privilege) applied everywhere.** With every IAM and security resource being rebuilt in IaC, Masterpoint engineers treated it as the perfect opportunity to audit the access surface end-to-end and codify least-privilege from the ground up. Every role now grants only the permissions its workload actually needs, scoped to the specific resources it touches, and any future change flows through a reviewed pull request.
- **Aurora PostgreSQL two-major-version upgrade, applied in flight** during the migration, ahead of AWS deprecating the older version due to end of life (EOL).
- **TLS everywhere, RDS Proxy universally.** Every ECS service and Lambda now connects to RDS Proxy and ElastiCache (Valkey/Redis) over enforced TLS.
- **ECS Exec replacing SSH.** Operators no longer SSH into hosts to debug a running container. [`aws ecs execute-command`](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html) over IAM-controlled access provides the capability without SSH keys, bastion hosts, or an exposed SSH port.
- **A re-architected IoT networking path.** MarketSpark's product depends on connectivity to cellular routers in the field, which require VPN tunnels with specific IP allowlists. The previous architecture handled this at the application layer, scattered across EC2 instances and application code. We rebuilt it as a network-layer concern, handled by VPC, route tables, and NAT configuration, so the application team is no longer responsible for maintaining VPN plumbing inside their services. MarketSpark called this out as one of the top retro wins of the engagement.
- **FinOps visibility, built in.** A uniform tagging strategy was applied across every resource in every account. Combined with account isolation, MarketSpark can allocate cost by environment and service for the first time. Cost runaways in dev no longer touch production billing.

    > **TODO:** Link Masterpoint's null context label blog post here.

The IoT networking re-architecture in particular is worth a closer look:

> **TODO:** Abstracted diagram of NAT on VPC Subnet Route Table level. Current placeholder below is illustrative; swap with the real architecture diagram.

![Before, VPN logic lived in application code on EC2; after, it lives at the network layer in VPC route tables and NAT.](/img/case-studies/marketspark/iot-networking.svg)
*The application team no longer owns VPN plumbing. Network changes are a route-table PR.*

---

## Handing Off to MarketSpark's Engineering Team

By the end of the engagement, MarketSpark's engineering team wasn't just inheriting an infrastructure codebase — they were already shipping changes against it. During the transition and immediately after handoff, MarketSpark engineers independently modified existing root modules, authored new ones from scratch, and self-deployed infrastructure with the new systems and automation.

**That, more than any artifact delivered, is the measure of a successful platform engagement.**

This was by design. Knowledge transfer wasn't a final phase tacked onto the end — it was paired with the work as it shipped. Recorded walkthroughs, READMEs, documentation, architecture diagrams, and OpenTofu + Spacelift training sessions occurred over the course of the engagement. Masterpoint engineers worked directly with MarketSpark engineers throughout, so the codebase was never a black box handed over the wall.

> **Business impact**
> **An engineering organization that scales without proportional headcount.** Self-documenting infrastructure cuts onboarding from weeks of console safaris to days of reading a repo. Engineers stop burning cycles on EC2 patching, OpenVPN maintenance, and archaeology on "who set up this S3 bucket." MarketSpark can grow customer-facing engineering capacity without hiring a dedicated platform team just to keep the lights on.

---

> **TODO (placeholder quote):** Quote below is temporary / made up. Replace with a real MarketSpark engineer voice from the retro.

> "The week before cutover, I was still ClickOps-ing security groups in three windows. The week after, I opened a PR, watched Spacelift plan it, hit approve, and went to lunch. That's the whole difference."
>
> — *MarketSpark engineer (placeholder)*

---

## Closing quote

> _Placeholder quote, to be replaced with MarketSpark's words on the engagement._
>
> — **MarketSpark Engineering**, Platform Team
