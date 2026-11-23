---
visible: true
draft: false
title: "Infrastructure Security: Choosing Providers in the Age of AI"
author: Matt Gowie
date: 2026-11-23
slug: infrastructure-security-choosing-providers-ai
description: "What recent provider security incidents mean for your production secrets, credential permissions, incident plans, and infrastructure choices."
tags: ["security", "infrastructure", "cloud", "ai"]
image: /img/updates/infrastructure-security/provider-evaluation-og-1200x630.png
preview_image: /img/updates/infrastructure-security/provider-evaluation-card-960x960.svg
preview_image_contain: true
og_img: /img/updates/infrastructure-security/provider-evaluation-og-1200x630.png
hide_hero: true
---

Fireworks AI, Railway, and Northflank all reported security incidents involving customer secrets this fall.

If you deploy on a platform like those, you pasted in a database connection string or an AI key, the app came up, and you moved on to the next thing. Most of us do that, and Masterpoint has apps on Vercel that we do it with too. That key now lives in someone else's control plane, and you probably haven't looked at it since.

Here is what happened, what to do on your side, and how I'd pick a provider with this in mind.

## What happened

**Fireworks AI.** In its [October bulletin](https://fireworks.ai/security/bulletins/october-2026-security-incident), Fireworks said an attacker accessed secrets used in evaluation jobs for a limited number of customer accounts. Its [November 9 update](https://fireworks.ai/security/bulletins/october-2026-security-incident-update) described how the attacker later reached Fireworks development machines through a cloud provider. The attacker accessed datasets and incomplete model weights for some customers.

**Railway.** [Its preliminary report](https://blog.railway.com/p/preliminary-report-october-security-incident) says an attacker reached internal systems and decrypted stored environment variables for a subset of workspaces. The attackers were seeking AI-provider API keys.

**Northflank.** Its [November 17 incident report](https://northflank.com/blog/incident-report-october-30-security-incident) says an attacker exploited a vulnerability in its API to run commands inside a component that could access stored secrets and the keys used to decrypt them. 1.5% of customer teams were affected, and 1.8% of the secret values stored on the platform were taken. Northflank found no evidence that customer workloads or workload data were accessed.

Zoom out and these are not one-offs. [Google's threat intel group](https://cloud.google.com/blog/topics/threat-intelligence/vulnerability-discovery-and-exploitation-trends-in-the-ai-era/) found monthly vulnerability disclosures more than doubled between January and August 2026, and much of the growth was exploitation after disclosure, not zero-days. Attackers are finding and using bugs faster. Your providers have to patch faster too.

## What to do on your side

### Know your secrets

Can you list every production credential a provider holds? What each one can do, and who can revoke it?

If the answer is one person, and that person is on a plane, you have a problem to fix this week. Name a backup, make sure the backup already has access, and write the procedure down somewhere both of them can find it.

Also know what breaks when you revoke. Finding out mid-incident that three services share one production key is a bad afternoon.

<picture>
  <source media="(max-width: 600px)" srcset="/img/updates/infrastructure-security/credential-reach-mobile.svg" />
  <img src="/img/updates/infrastructure-security/credential-reach.svg" alt="Illustrative map: credentials held by an application hosting platform can authorize specific actions in a separately hosted database, cloud account, payment processor, and AI service. Reach depends on effective permissions." loading="lazy" style="width: 100%; height: auto;" />
</picture>

### Least privilege

Scope each credential to the work it does. Separate dev and prod. If you gave the deploy integration org-wide admin to get the first deploy working, go back and check whether it still needs it.

Look past your own team's roles too. Railway's attacker got into internal systems, so ask what the provider's build systems and internal tools can reach. Narrow credentials limit the damage even when the compromise happens on their side.

<picture>
  <source media="(max-width: 600px)" srcset="/img/updates/infrastructure-security/scoped-permissions-mobile.svg" />
  <img src="/img/updates/infrastructure-security/scoped-permissions.svg" alt="A scoped credential limits access to reading Storage A. A broad credential also permits writing Storage A and reading Storage B. If stolen, the scoped credential can still read Storage A." loading="lazy" style="width: 100%; height: auto;" />
</picture>

### Write-only secrets, with a caveat

I like controls that let you supply a secret without letting anyone read it back. [Vercel's Secret environment variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables) work this way.

But hidden in the dashboard is not the same as safe. Railway's secrets were encrypted, and the attacker still got them: encrypted values were taken first, then decrypted once compromised credentials allowed it. So ask the provider what stops a compromised internal system from reaching the keys that decrypt your secrets.

AWS Secrets Manager is not inherently write-only either. You control who can retrieve values with IAM, and with a customer-managed KMS key they also need decrypt permission. Review those permissions. Also check who can change those identities or deploy code that uses them.

<picture>
  <source media="(max-width: 600px)" srcset="/img/updates/infrastructure-security/secret-read-paths-mobile.svg" />
  <img src="/img/updates/infrastructure-security/secret-read-paths.svg" alt="A hidden dashboard value does not establish who can retrieve a secret. Authorized runtime retrieval is shown separately from architecture-dependent internal read, decrypt, and deployment permissions." loading="lazy" style="width: 100%; height: auto;" />
</picture>

### Have an incident plan

For any serious application, someone has to be on call with the access to act. An SRE team or a platform team, whatever name fits your org and size. A breach notice sitting in an unwatched inbox is not something that will work out well for your org or your career.

Practice a rotation in a safe environment. You will find missing access and undocumented dependencies before an incident hands you the deadline.

And think about where the new keys go. Railway reports rotating keys again after confirming the attacker was out. If the system receiving the new key is still compromised, you can simply hand over new keys and they immediately get compromised.

## Picking a provider

**Maturity.** I put real weight on operating history. A provider asking to run critical production infrastructure should be able to show it has done that safely before. A younger company has more to prove before I'd hand it a sensitive client or Masterpoint internal workload. Age alone doesn't answer it of course. You should ask how the provider isolates customers, who can touch production, how it handles vulnerabilities, and what it logs. Ask what a compromised build credential could reach.

**Certifications.** Ask for the SOC 2 report and read it: systems covered, examination period, exceptions, and what's left to you. SOC 2 is an examination report and you shouldn't treat it as "all is well" blanket security certification. [Northflank lists SOC 2 Type II and ISO 27001](https://northflank.com/security), so check which deployment models those documents actually cover and go deeper if your workload is critical or sensitive.

**Match the platform to the workload.** A prototype on synthetic data and a service handling health or financial data should not get the same infrastructure decision. For the sensitive stuff, my default is to own the cloud account and invest in running it well. I'd want a very strong case for a shared app platform, and saving day 0 setup time isn't a viable retort.

That comes with real work: identity, networking, secrets, monitoring, recovery. [AWS's shared responsibility model](https://aws.amazon.com/compliance/shared-responsibility-model/) spells out a lot of that stuff. And if you use a bring-your-own-cloud platform like [Northflank's](https://northflank.com/security), ask what permissions its control plane gets inside your account and how you can best lock it down.

<picture>
  <source media="(max-width: 600px)" srcset="/img/updates/infrastructure-security/evaluation-checklist-mobile.svg" />
  <img src="/img/updates/infrastructure-security/evaluation-checklist.svg" alt="Provider evaluation checklist covering operational maturity, access and control, independent assurance, and workload fit. For each area, it pairs a practical question with evidence to request from the provider." loading="lazy" style="width: 100%; height: auto;" />
</picture>

## The bigger picture

I expect incidents like these to push some teams toward AWS and Google Cloud. They are more work to operate of course, but they're also more proven. I'd rather see teams take that on deliberately than find out the hard way what the shortcut cost.

I'd be wary of defaulting to Azure too. Microsoft has had a number of high-profile breaches in recent years and personally they're on my "they don't have a good security track record" list.

## Start with one app

Suggestion for you to move this forward: Pick one of your prod apps. Trace all the credentials you've handed to that app's infrastructure provider. For each one, write down what it can reach and who can revoke it. And then bring the gaps to your next architecture discussion.

If you find a credential that your org can't easily close, figure out what you'd need to run yourself and who would own it. Do this sort of thing before the next provider incident forces you into a bad day.

If you'd like help reviewing your infra providers and hardening your landscape, [talk to us at Masterpoint](https://masterpoint.io/contact/).
