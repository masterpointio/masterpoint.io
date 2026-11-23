#!/usr/bin/env python3
"""Check a proposed blog publication, without modifying files or accessing the network."""

import argparse
import io
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path, PurePosixPath

import yaml
from PIL import Image

MEDIA_FIELDS = ("og_img", "preview_image", "preview_image_contain")
MAX_BYTES = 5_000_000


def git(root, *args, check=True):
    return subprocess.run(
        ["git", "-C", str(root), *args], check=check, capture_output=True
    )


def frontmatter(data):
    text = data.decode("utf-8-sig")
    match = re.match(r"\A---\s*\r?\n(.*?)\r?\n---(?:\r?\n|$)", text, re.S)
    if not match:
        raise ValueError("expected YAML front matter between --- lines")
    fields = yaml.safe_load(match.group(1))
    if not isinstance(fields, dict):
        raise ValueError("front matter must be a mapping")
    return fields


def image_file(root, value):
    if not isinstance(value, str) or not value.startswith("/img/"):
        raise ValueError("must be a local /img/ path")
    if any(c in value for c in ("\\", "?", "#", "%")):
        raise ValueError("must be a plain /img/ path without escapes, query or fragment")
    if any(part in (".", "..") for part in value.split("/")):
        raise ValueError("path traversal is not allowed")
    if PurePosixPath(value).as_posix() != value:
        raise ValueError("must use a canonical /img/ path without repeated slashes")
    static = (root / "static").resolve()
    if not static.is_relative_to(root):
        raise ValueError("static directory must stay inside the repository")
    path = (static / value.lstrip("/")).resolve()
    if not path.is_relative_to(static / "img") or not path.is_file():
        raise ValueError("image must exist inside static/img (no escaping symlinks)")
    return path


def dimensions(path, social=False):
    if path.stat().st_size >= MAX_BYTES:
        raise ValueError("must be smaller than 5 MB; aim below 1 MB")
    suffix = path.suffix.lower()
    data = path.read_bytes()
    if suffix == ".svg" and not social:
        if re.search(br"<!\s*(DOCTYPE|ENTITY)", data, re.I):
            raise ValueError("SVG DTD/entity declarations are not supported")
        node = ET.fromstring(data)
        if node.tag.split("}")[-1] != "svg":
            raise ValueError("file is not an SVG")
        viewbox = node.get("viewBox", "").replace(",", " ").split()
        if len(viewbox) == 4:
            width, height = map(float, viewbox[2:])
        else:
            width, height = (
                float(node.get(key, "").removesuffix("px"))
                for key in ("width", "height")
            )
    elif suffix in (".png", ".jpg", ".jpeg"):
        with Image.open(io.BytesIO(data)) as image:
            expected = "PNG" if suffix == ".png" else "JPEG"
            if image.format != expected:
                raise ValueError("image encoding does not match filename extension")
            width, height = image.size
            image.verify()
        # Header verification alone does not decode JPEG pixel data.
        with Image.open(io.BytesIO(data)) as image:
            image.load()
    else:
        raise ValueError("OG must be PNG/JPEG; thumbnails may also be SVG")
    if not (0 < width <= 100_000 and 0 < height <= 100_000):
        raise ValueError("image dimensions must be positive and finite")
    return width, height


def check_publication(root, base, branch, files=None):
    root = Path(root).resolve()
    errors, checked = [], []
    if not branch:
        errors.append("Branch name is missing; pass --branch or check out a named branch.")
    elif branch.casefold().startswith("codex/"):
        errors.append(
            "Branch prefix codex/ is not allowed. Use a purpose-based name such as "
            "feat/provider-security, fix/blog-thumbnail or docs/blog-media."
        )
    # Resolve a single commit before constructing revision:path arguments.
    base_sha = git(root, "rev-parse", "--verify", f"{base}^{{commit}}").stdout.decode().strip()
    if files is None:
        files = git(root, "diff", "--no-renames", "--name-only", "-z", base_sha, "--").stdout.decode().split("\0")
    changed = set()
    for name in filter(None, files):
        path = PurePosixPath(name)
        if path.is_absolute() or ".." in path.parts or "\\" in name:
            errors.append(f"Invalid changed path: {name!r}")
        else:
            changed.add(path.as_posix())
    tracked = git(root, "ls-files", "-z", "content/blog").stdout.decode().split("\0")
    posts = set(tracked) | changed
    for name in sorted(posts):
        if not name.startswith("content/blog/") or not name.endswith(".md") or Path(name).name == "_index.md":
            continue
        path = root / name
        if not path.resolve().is_relative_to(root):
            errors.append(f"{name}: post path must stay inside the repository")
            continue
        if not path.is_file():  # Deleted posts are not publication candidates.
            continue
        try:
            fields = frontmatter(path.read_bytes())
        except (ValueError, yaml.YAMLError, UnicodeError) as exc:
            if name in changed:
                errors.append(f"{name}: {exc}")
            continue
        old_result = git(root, "show", f"{base_sha}:{name}", check=False)
        old = None
        if old_result.returncode == 0:
            try:
                old = frontmatter(old_result.stdout)
            except (ValueError, yaml.YAMLError, UnicodeError):
                old = {}
        referenced = set()
        # Include the legacy fallback and normalize aliases for dependency matching.
        # Validation below still rejects noncanonical references once affected.
        for key in (*MEDIA_FIELDS[:2], "image"):
            value = fields.get(key)
            if isinstance(value, str) and value.startswith("/img/"):
                dependency = PurePosixPath("static" + value).as_posix()
                referenced.add(dependency)
                try:
                    resolved = (root / dependency).resolve()
                    if resolved.is_relative_to(root):
                        referenced.add(resolved.relative_to(root).as_posix())
                except (OSError, RuntimeError):
                    pass  # A changed lexical reference will still fail validation.
        media_changed = old is not None and any(fields.get(k) != old.get(k) for k in (*MEDIA_FIELDS, "image"))
        became_public = old is not None and (old.get("draft") is True or old.get("visible") is False)
        relevant = (name in changed and (old is None or media_changed or became_public)) or bool(referenced & changed)
        if not relevant or fields.get("draft") is True or fields.get("visible") is False or fields.get("outbound"):
            continue
        checked.append(name)
        images = {}
        for key in MEDIA_FIELDS[:2]:
            try:
                images[key] = image_file(root, fields.get(key))
                size = dimensions(images[key], social=key == "og_img")
                if key == "og_img" and size != (1200, 630):
                    raise ValueError(f"OG dimensions are {size[0]} × {size[1]}; require 1200 × 630")
            except (ValueError, OSError, ET.ParseError, Image.DecompressionBombError) as exc:
                errors.append(f"{name}: {key}: {exc}")
        if len(images) == 2 and images["og_img"] == images["preview_image"]:
            errors.append(f"{name}: preview_image and og_img must be separate assets")
        if fields.get("preview_image_contain") is not True:
            errors.append(
                f"{name}: set preview_image_contain: true; the listing changes aspect ratio "
                "across breakpoints and cover sizing can crop lettering"
            )
    return {"ok": not errors, "base": base_sha, "branch": branch, "checked_posts": checked, "errors": errors}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True, help="PR base commit/ref; e.g. origin/main")
    parser.add_argument("--branch", help="PR source branch; defaults to current local branch")
    parser.add_argument("--files", nargs="+", help="Exact changed paths, including new untracked files")
    parser.add_argument("--root", type=Path, default=Path.cwd())
    args = parser.parse_args()
    try:
        branch = args.branch or git(args.root, "branch", "--show-current").stdout.decode().strip()
        report = check_publication(args.root, args.base, branch, args.files)
    except (subprocess.CalledProcessError, OSError, ValueError) as exc:
        report = {"ok": False, "errors": [f"Cannot check publication: {exc}"]}
    print(json.dumps(report, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
