# Blog publication checks

Use a purpose-based branch such as `feat/provider-security`, `fix/blog-thumbnail`
or `docs/blog-media`. The checker rejects `codex/` prefixes, case-insensitively.
It does not impose a naming rule on `main` or rename existing branches.

New published blog posts need separate social and listing assets:

```yaml
og_img: /img/updates/example/example-og-1200x630.png
preview_image: /img/updates/example/example-card.svg
preview_image_contain: true
```

- **Social image:** PNG or JPEG, exactly 1200 × 630 pixels, under 5 MB. Aim below
  1 MB. Use PNG for sharp graphics and JPEG for photography.
- **Listing thumbnail:** a separate local PNG, JPEG or SVG, under 5 MB, with valid
  dimensions. A square layout works well for diagrams, but no fixed thumbnail
  ratio can fit every responsive card. `preview_image_contain: true` preserves
  the whole image in the existing variable-width card instead of cropping it.
- References must point inside `static/img/`, without traversal, remote URLs,
  query strings or escaping symlinks. Social images cannot be SVGs.
- `image` still controls the optional article hero; `hide_hero: true` keeps that
  image out of the article body. These checks do not require all posts to hide
  their hero.

## Run before opening a PR

```sh
python3 -m venv /tmp/masterpoint-publication-venv
/tmp/masterpoint-publication-venv/bin/pip install -r scripts/publication-requirements.txt
/tmp/masterpoint-publication-venv/bin/python scripts/check-publication.py \
  --base origin/main --branch feat/provider-security \
  --files content/blog/2026-11-23-example.md static/img/updates/example/example-card.svg
/tmp/masterpoint-publication-venv/bin/python -m unittest discover -s scripts -p 'test_publication.py'
```

Pass the exact intended changed paths, including new untracked posts/assets.
Without `--files`, the checker uses the tracked working-tree diff against the
base; it deliberately ignores unrelated untracked drafts. It reads the current
working tree, so run it on the candidate checkout, not another branch.

Existing posts are checked when their media fields or referenced media change,
or when a draft/hidden post becomes public. Copy-only edits to legacy posts do
not demand a media retrofit. Deleted posts, drafts, hidden posts, blog indexes
and outbound-link entries are excluded.

The `Blog media and branch checks` CI job runs the same script. The existing
shared lint workflow is unchanged. This job reports failures on PRs, but it is
**not a required merge check until a repository administrator adds it to the
ruleset**; the local pre-PR workflow must run it before publication.

## Visual review is still required

Dimensions and file existence cannot prove readable type, good composition,
correct brand artwork or working CSS. Build with the pinned Hugo version and
inspect the actual blog listing at desktop, narrow tablet and mobile widths
(1440, 1024, 768, 600, 575 and 390 pixels cover the current layout). Confirm all
labels and logos remain visible, other cards are unchanged, and social metadata
still selects the OG asset. Use a dedicated headless browser for automated
checks, never the user's normal GUI browser. Keep the final screenshots with
the PR validation evidence.
