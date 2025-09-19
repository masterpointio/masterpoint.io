---
visible: true
draft: false
title: "Using MCPs to Run Terraform"
author: Weston Platter
date: 2025-04-17
# date_modified: Be sure to use this if you've updated the post as this helps with SEO and index freshness
slug: using-mcps-to-run-terraform
description: "We jump into a hands-on exploration of Model Context Protocol (MCP), sharing our experiment using a MCP client to run terraform init, plan, apply. We share our take on where agents add value and highlight security considerations when adding MCPs to your workflow."
image: /img/updates/using-mcps-to-run-terraform/header5.png
callout: <p>👋 <b>If you're ready to take your infrastructure to the next level, we're here to help. We love to work together with engineering teams to help them build well-documented, scalable, automated IaC that make their jobs easier. <a href='/contact'>Get in touch!</a>
---

## Table of Contents
- [Quick Note](#quick-note)
- [Introduction](#introduction)
- [Demo / Walk Through](#demo--walk-through)
  - [MCP configuration](#mcp-configuration)
  - [Terraform code](#terraform-code)
  - [Debugging terraform apply](#debugging-terraform-apply)
- [Takeaways](#takeaways)


<br>

## Quick Note
We’re diverging from the typical Masterpoint beat and looking at an emerging trend: MCPs in agentic workflows and how it relates to Infrastructure as Code (IaC). Our goal is to share what we’re learning and experimenting with in the AI realm.

We’re specifically interested in:
- roles and responsibilities that AI agents might take on  
- security boundaries required to keep client infra safe  
- ways new tech can simplify how clients manage IaC

<br>

# Introduction
You might have heard about Anthropic’s [Model Context Protocol](https://modelcontextprotocol.io/introduction) (MCP) and their implementation as MCP clients or servers (MCPs) — they’ve been gaining attention in the agentic workflow space. At a high level, MCP clients/servers act as universal connectors between your AI tool of choice (like Cursor or Claude Desktop) and the tools, APIs, and data sources you want the agent to work with.

You might be asking yourself, “*Where do MCPs provide value for the average person?*” Here are a couple of examples I’m thinking about using MCPs to streamline my work days,

- **Sprint planning admin work.** Imagine passing a sprint planning task into your Cursor Agent chat, have AI review the task’s description and acceptance criteria for grammar clarity, and then have a [Notion MCP](https://github.com/makenotion/notion-mcp-server) add the task as a Story in the client specific Epic filling in the relevant Notion fields.

<!-- - **Revising Figma designs.** Imagine directing an AI to update existing designs in your company’s Figma account. (credit goes to Andy Osmami’s [substack post on MCPs](https://addyo.substack.com/i/159868119/ai-figma-programmatic-ui-design) for this example).  "AI, can you grab the color palette from the Login screen design?" The AI, via MCP, fetches the design document from Figma and returns the color styles. Or say "Increase the padding of the signup button and export it as an image" – the AI can command Figma to adjust that element and retrieve an updated asset, then perhaps use it in code. -->

- **Revising Figma designs.** Imagine directing an AI to update existing designs in your company’s Figma account (credit to Andy Osmami’s [Substack post on MCPs](https://addyo.substack.com/i/159868119/ai-figma-programmatic-ui-design) for this example). For instance:

  > "AI, can you grab the color palette from the Login screen design?"

  The AI — via MCP — fetches the Figma file and returns the color styles. Or:

  > "Increase the padding of the signup button and export it as an image."

  The AI then instructs Figma to adjust that element, retrieves the updated asset, and makes it available for use in your code.


The core idea is that MCPs enable AIs to securely connect to your accounts, services, and APIs - accessing authenticated data and performing tasks on your behalf. If you’re just getting up to speed, we recommend these resources:
- Explainer video on YouTube: [Model Context Protocol (MCP)](https://www.youtube.com/watch?v=5ZWeCKY5WZE)
- Article on Substack: [What is MCP and Why it Matters](https://addyo.substack.com/p/mcp-what-it-is-and-why-it-matters)

<br>
<br>

## Demo / Walk Through

To explore how and where agents with MCPs can take on more responsibilities within the Infrastructure as Code realm, I ran a small experiment using a Terraform MCP client — [tfmcp](https://github.com/nwiizo/tfmcp) — to run commands like `init`, `plan`, and `apply` on my local computer.

My example infrastructure use-case for this experiment was to  create a Postgres database, a schema, and give an app user scoped read/write access — just enough to get a feel for using an MCP client in practice.

### MCP configuration
To get started, I needed to configure a few things:

1. **Install tfmcp.** I followed the install instructions in the [tfmcp's README](https://github.com/nwiizo/tfmcp/tree/b0fcc5c32f4bf0a71f373dd18891ce9faf36f09b?tab=readme-ov-file#installation).

2. **Set up tfmcp in Cursor.** I followed [Cursor’s instructions](https://docs.cursor.com/context/model-context-protocol\#configuring-mcp-servers]) and plugged in the relevant tfmcp settings (see example `mcp.json`).

3. **Configure tfmcp to run Terraform commands in the desired directory.** For this config I needed to tell tfmcp where my terraform was located and add my homebrew install location to the tfmcp path (again, see example `mcp.json`).


Example Cursor `mcp.json` config file
```json
{
  "mcpServers": {
    "tfmcp": {
      "command": "/Users/weston/clients/westonplatter/tfmcp/target/release/tfmcp",
      "args": [
        "mcp"
      ],
      "env": {
        "HOME": "/Users/weston",
        "PATH": "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin",
        "TERRAFORM_DIR": "/Users/weston/clients/westonplatter/example-devops"
      }
    }
  }
} 
```


### Terraform code

From there, I added a `main.tf` file in the configured `TERRAFORM_DIR` and wrote some basic terraform code to provision the Postgres resources:

* **Terraform block**: sets the required provider, `cyrilgdn/postgresql`
* **Provider config**: connects to a local Postgres instance as `admin_user`
* **Postgres Role resource**: creates a login-enabled role for the app
* **Postgres Database resource**: creates a DB owned by the app role
* **Schema resource**: creates a schema in the DB owned by the app role

```terraform
# declare terraform providers
terraform {
 required_providers {  
   postgresql  = {  
     source    = "cyrilgdn/postgresql"
     version   = "1.25.0"
   }  
 }  
}

# configure the postgres provider with auth credentials for the postgres db
provider "postgresql" {  
 host             = "localhost"
 port             = 5432  
 database         = "postgres"  
 username         = "admin_user"  
 password         = ""  
 sslmode          = "disable"  
 connect_timeout  = 15  
}

# create a role for the app  
resource "postgresql_role" "app_role" {  
 name     = "app_role"
 login    = true  
 password = "mypass" # intentionally insecure password for demo
}

# create a database for the app
resource "postgresql_database" "app_db" {  
  name                   = "app_db"  
  owner                  = postgresql_role.app_role.name  
  template               = "template0"  
  lc_collate             = "C"  
  connection_limit       = -1  
  allow_connections      = true  
  alter_object_ownership = true  
}

# create a schema for the app  
resource "postgresql_schema" "app_schema" {  
  name     = "app_schema"  
  owner    = postgresql_role.app_role.name  
  database = postgresql_database.app_db.name  
}
```

<br>

### Debugging terraform apply
At this point, I was ready for the agent to run terraform plan and apply my changes. And here is where the rubber meets the road in using MCPs 🙂. Here’s what I ran into:

**The first issue** was a permissions error — `admin_user` couldn’t create Postgres roles. This issue was totally my fault — I hadn’t granted it any meaningful privileges. I had Cursor run `terraform apply` via the MCP, but it didn't report back if the apply was successful. I think we're in the **very early** stages of MCP workflows and usability concerns like surfacing logs and interpreting errors needs more attention to reduce friction.

{{< lightboximg "/img/updates/using-mcps-to-run-terraform/debug1a.png" "First issue - view from Cursor" >}}

I reverted to running `terraform apply` directly in the terminal and got a helpful error: `admin_user` lacked the required privileges. I jumped into Postgres on the command line via `psql` and granted it `CREATEROLE` and `CREATEDB`.

{{< lightboximg "/img/updates/using-mcps-to-run-terraform/debug1b.png" "First issue - view from Terminal" >}}

**The second issue** was with the provider config — even after fixing the role permissions, `terraform apply` kept failing when run via the MCP (see screenshots). Again, the specific terraform error wasn’t surfaced.

{{< lightboximg "/img/updates/using-mcps-to-run-terraform/debug2.png" "MCP doesn't show the acutual error" >}}

After retrying a couple times, the Cursor Agent Mode suggested I run `terraform apply` via [Cursor's Run capability](https://docs.cursor.com/chat/tools#run), which I did. Cursor was actually decent at running the CLI command and parsing the output. Once it got access to the error message, Cursor Agent mode suggested a working config update (specifically, setting `superuser = false`). At that point, I continued using Cursor Run to terraform apply the changes. Afterwards, I was able to jump back and use `tfmcp` to run terraform operations.

Cursor suggesting run terraform apply Run Tool
{{< lightboximg "/img/updates/using-mcps-to-run-terraform/debug3.png" "Cursor suggesting run terraform apply Run Tool" >}}


Cursor suggests setting `superuser = false`
{{< lightboximg "/img/updates/using-mcps-to-run-terraform/debug4.png" "Cursor suggests fix for the error" >}}

Cursor successfully running terraform apply
{{< lightboximg "/img/updates/using-mcps-to-run-terraform/debug5.png" "Cursor successfully ran terraform apply" >}}


Both issues were pretty minor, and while tfmcp made it possible to run Terraform via the agent, it didn’t really make the workflow easier. The real value came from Cursor’s Agent mode — it read the CLI errors, interpreted them, and proposed fixes. That’s where the magic is starting to show.

<br>

## Takeaways

My takeaways from the experience:

- **MCPs feel like ChatOps, but still rely on developer expertise.** This specific MCP was able to run infra commands, but when bugs popped up, you still needed to know how to debug, interpret errors, and fix configs. It's a layer of convenience, not a replacement for core understanding.

- **MCPs are inferior to muscle memory — unless they offer something meaningfully better.** While the MCP setup was helpful, I would’ve been much faster running terraform operations on the command line \- mostly because I’ve developed muscle memory for this and have 3-letter command line aliases for terraform init, plan, and apply. I would be persuaded away from using the command line if I had a collection of MCPs that worked in concert together. For example, a process to receive business requests to make an infrastructure change, make appropriate terraform code changes, critique code changes for security and correctness, and (if everything looks good) then run terraform plan + apply actions. Below is a screenshot exemplifying a similar approach using [n8n](https://n8n.io/) to create a collection of MCPs for Firecrawl, Github Actions, Airtable, Brave, and Airbnb (pulled from [this video](https://youtu.be/OUPW4DJMAsA?t=1408)).

{{< lightboximg "/img/updates/using-mcps-to-run-terraform/mcp-collective.png" "Collection of MCPs" >}}

- **Surfacing feedback loops is where agentic tools can shine.** Most of the pain in this experiment came from not seeing the error — not from the error itself. Agentic workflows that help you interpret state, errors, or diff outputs (and offer remediations) are more valuable than abstracting away the command execution. The real unlock isn’t just running `terraform apply` — it’s making sense of what went wrong and suggesting what to do next.

<br>

## The Hidden Risks

One last - but critical - consideration around MPCs is security.  MCPs have unique attack surfaces with the tools, prompts, and resources they provide. However, this is nothing new when compared to using open source packages from the internet. We've seen malicious code [in node/NPM packages](https://cycode.com/blog/malicious-code-hidden-in-npm-packages/), [ruby gems](https://www.sonatype.com/blog/rubygems-laced-with-bitcoin-stealing-malware), and [python packages](https://unit42.paloaltonetworks.com/malicious-packages-in-pypi/). You’re running another dev’s code on your machine, and that means you could easily run malicious code if it’s in the MCP. We found [this post](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks) by **Invariant Labs** helpful in describing 3 creative Tool Poisoning attacks.


<!-- ## (Appendeix) Instructions to Fully Replicate the Experiment
If you're interested in running the example same experiment, here are waypoints to follow,

- Create admin\_role with no privileges  
- Run terraform apply via MCP  
- Expect to get failures with no surfaced error messages  
- Add privileges to admin\_user role  
  - CREATEROLE  
  - CREATEDB  
- Run terraform apply via MCP  
- Expect to get failures with no surfaced error messages  
- Have Cursor Agent run terraform apply via the CLI  
- Make superuser \= false change in provider  
- Have Cursor Agent run terraform apply via the CLI  
- Expect successful apply -->
