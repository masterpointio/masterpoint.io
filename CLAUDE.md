# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Masterpoint.io company website - a Hugo-based static site for an Infrastructure-as-Code (IaC) consulting firm specializing in Terraform, OpenTofu, Pulumi, and cloud infrastructure solutions. The site is deployed on Netlify with automatic builds from the Git repository.

## Essential Commands

### Development

```bash
# Install Hugo Extended (required - regular Hugo won't work due to SCSS)
aqua install

# Run development server (auto-reload on changes)
hugo serve

# Build the site for production
hugo --gc --minify

# Create new content (blog posts use date-prefixed naming)
hugo new blog/$(date +%Y-%m-%d)-my-new-post.md
hugo new case-studies/client-name.md

# Lint and format code
trunk check
trunk fmt
```

### Local Development

- Server runs on: `http://localhost:1313`
- Hugo Extended v0.145.0 is required (managed via Aqua)
- No npm/yarn commands - this is a pure Hugo project
- Trunk is used for linting (markdownlint, prettier, checkov, etc.)

## Architecture Overview

### Content Management

- All content is in Markdown files under `/content/`
- NetlifyCMS is configured for content editing (accessible at `/admin/`)
- Front matter in Markdown files controls metadata and page behavior
- Content types: blog posts, case studies, services, team profiles, landing pages

### Template System

```text
/layouts/
├── _default/        # Default templates (list.html, single.html)
├── partials/        # Reusable components (header, footer, etc.)
├── shortcodes/      # Custom Hugo shortcodes
└── [content-type]/  # Type-specific templates (blog, services, etc.)
```

### Styling Architecture

- Bootstrap 5.1.3 provides the CSS framework
- Custom SCSS in `/assets/css/style.scss`
- Pre-minified JavaScript plugins in `/assets/js/plugins.js`
- No build process for JS - uses static files

### Key Configuration Files

- `config.yaml` - Site configuration, menus, params
- `netlify.toml` - Build settings, redirects, Hugo version
- `aqua.yaml` - Manages Hugo Extended installation

## Content Creation Patterns

### Blog Posts

Example blog post header:

````markdown
---
visible: true
draft: false
title: "The Platform Engineering Way to Manage Google Workspace Users"
author: Weston Platter
date: 2025-07-17
date_modified: 2025-07-19  # Optional: Shows "Updated" date if different from publish date
slug: platform-engineering-way-to-manage-google-workspace-users
description: "Migrate Google Workspace from ClickOps to Infrastructure as Code with our open source Terraform module. Includes design patterns and import examples."
tags: ["terraform", "google-workspace", "infrastructure-as-code", "automation"]
image: /img/updates/managing-googleworkspace-with-terraform/preview-3.png
callout: <p>👋 <b>If you're ready to take your infrastructure to the next level, we're here to help. We love to work together with engineering teams to help them build well-documented, scalable, automated IaC that make their jobs easier. <a href='/contact'>Get in touch!</a></p>
---

<CONTENT>

### Custom Shortcodes

- `{{< button link="/path" text="CTA Text" >}}` - Call-to-action buttons
- `{{< buttonout link="https://external.com" text="External Link" >}}` - External buttons
- `{{< form formName="contact" >}}` - Contact forms
- `{{< testimonials >}}` - Client testimonials
- `{{< faqs >}}` - FAQ sections
- `{{< team >}}` - Team member displays
- `{{< services >}}` - Service listings
- `{{< process >}}` - Process steps
- `{{< supports >}}` - Support/technology logos
- `{{< client-logos >}}` - Client logo displays

## Code Quality & Linting

The project uses Trunk for code quality management with multiple linters:

- **Markdown**: markdownlint with custom config (`.markdownlint.yaml`)
- **YAML**: yamllint for configuration files
- **Security**: checkov for infrastructure security, gitleaks for secrets
- **Formatting**: prettier for consistent code style
- **Images**: oxipng for PNG optimization, svgo for SVG optimization

```bash
# Run all linters
trunk check

# Auto-fix issues where possible
trunk fmt

# Check specific files
trunk check path/to/file.md
```

## Important Development Notes

1. **Hugo Extended Required**: Regular Hugo will fail due to SCSS compilation needs
2. **Absolute URLs**: Use absolute paths in content (e.g., `/blog/` not `blog/`)
3. **Image Paths**: Reference images from `/img/` (maps to `/static/img/`)
4. **Draft Content**: Set `draft: true` in front matter to hide from production
5. **Menu Items**: Configure in `config.yaml` under `menu` section
6. **Redirects**: Add to `netlify.toml` (e.g., `/updates/*` → `/blog/*`)
7. **Blog Naming**: Use date-prefixed format: `YYYY-MM-DD-title.md`

## Deployment Process

1. Push to Git repository (main branch)
2. Netlify automatically builds and deploys
3. Preview deployments created for pull requests
4. Production URL: https://masterpoint.io

## Common Tasks

### Add a New Blog Post

```bash
# Blog posts use date-prefixed naming (YYYY-MM-DD-title.md)
hugo new blog/$(date +%Y-%m-%d)-my-post-title.md
# Edit content/blog/YYYY-MM-DD-my-post-title.md
# Add banner image to static/img/blog/
# Set draft: false when ready
```
````

### Update Team Member

- Edit files in `/content/team/`
- Update image in `/static/img/team/`
- Follows pattern: `firstname-lastname.md`

### Modify Site Navigation

- Edit `config.yaml` → `menu` section
- Supports nested menus and external links

### Add Client Logo

- Add logo to `/static/img/clients/`
- Reference in `/content/clients.md` or relevant partial

## Troubleshooting

- **SCSS Compilation Errors**: Ensure Hugo Extended is installed via `aqua install`
- **Missing Content**: Check `draft` status in front matter
- **404 Errors**: Verify URL paths are absolute (start with `/`)
- **Build Failures**: Check Netlify logs, ensure Hugo version matches
