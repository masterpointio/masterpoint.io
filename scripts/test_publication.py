"""Offline regression tests for the publication guard; no browser or network."""

import importlib.util
import subprocess
import tempfile
import unittest
from pathlib import Path

from PIL import Image

SPEC = importlib.util.spec_from_file_location("publication", Path(__file__).with_name("check-publication.py"))
publication = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(publication)


class PublicationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git("init", "-q")
        self.git("config", "user.name", "Test")
        self.git("config", "user.email", "test@example.invalid")
        self.write("README.md", "fixture\n")
        self.git("add", ".")
        self.git("commit", "-qm", "base")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.post = "content/blog/2026-11-23-example.md"
        self.png("og.png", (1200, 630))
        self.write("static/img/card.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 960"/>')

    def git(self, *args):
        return subprocess.check_output(["git", "-C", str(self.root), *args], text=True)

    def write(self, path, value):
        file = self.root / path
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(value)

    def png(self, name, size):
        target = self.root / "static/img" / name
        target.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", size, "teal").save(target)

    def post_text(self, extra="", og="/img/og.png", preview="/img/card.svg"):
        return f"---\ntitle: Example\nog_img: {og}\npreview_image: {preview}\npreview_image_contain: true\n{extra}---\nCopy.\n"

    def check(self, branch="feat/example", files=None):
        return publication.check_publication(self.root, self.base, branch, files or [self.post])

    def test_new_post_passes_and_branch_prefix_is_case_insensitive(self):
        self.write(self.post, self.post_text())
        self.assertTrue(self.check()["ok"])
        for branch in ("codex/example", "CODEX/example", "CoDeX/example"):
            self.assertIn("codex/ is not allowed", " ".join(self.check(branch)["errors"]))
        self.assertTrue(self.check("fix/codex-example")["ok"])

    def test_dimensions_missing_and_distinct_assets(self):
        self.write(self.post, self.post_text())
        self.png("og.png", (1200, 628))
        self.assertIn("require 1200 × 630", " ".join(self.check()["errors"]))
        self.png("og.png", (1200, 630))
        self.write(self.post, self.post_text(preview="/img/og.png"))
        self.assertIn("separate assets", " ".join(self.check()["errors"]))
        self.write(self.post, "---\ntitle: Missing assets\n---\nCopy\n")
        self.assertFalse(self.check()["ok"])

    def test_containment_is_required_to_prevent_responsive_crop(self):
        self.write(self.post, self.post_text().replace("preview_image_contain: true", "preview_image_contain: false"))
        self.assertIn("cover sizing", " ".join(self.check()["errors"]))

    def test_paths_reject_traversal_external_url_and_escaping_symlink(self):
        for path in ("https://example.com/image.png", "/img/../secret.png", "/img/%2e%2e/secret.png", "/img/card.svg?x=1"):
            self.write(self.post, self.post_text(preview=path))
            self.assertFalse(self.check()["ok"], path)
        outside = self.root / "secret.svg"
        outside.write_text('<svg viewBox="0 0 10 10"/>')
        (self.root / "static/img/escape.svg").symlink_to(outside)
        self.write(self.post, self.post_text(preview="/img/escape.svg"))
        self.assertFalse(self.check()["ok"])

    def test_unchanged_legacy_and_copy_only_edit_are_grandfathered(self):
        self.write(self.post, "---\ntitle: Legacy\nimage: /img/old.png\n---\nOld copy\n")
        self.git("add", ".")
        self.git("commit", "-qm", "legacy")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.write(self.post, "---\ntitle: Legacy\nimage: /img/old.png\n---\nNew copy\n")
        self.assertEqual(self.check()["checked_posts"], [])
        self.write(self.post, "---\ntitle: Legacy\nimage: /img/new.png\n---\nNew copy\n")
        self.assertFalse(self.check()["ok"])

    def test_changed_asset_revalidates_its_unchanged_post(self):
        self.write(self.post, self.post_text())
        self.git("add", ".")
        self.git("commit", "-qm", "published")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.png("og.png", (20, 20))
        result = self.check(files=["static/img/og.png"])
        self.assertEqual(result["checked_posts"], [self.post])
        self.assertFalse(result["ok"])

    def test_legacy_image_fallback_asset_change_is_not_grandfathered(self):
        self.write(self.post, "---\ntitle: Legacy\nimage: /img/og.png\n---\nCopy\n")
        self.git("add", ".")
        self.git("commit", "-qm", "legacy")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.png("og.png", (20, 20))
        result = self.check(files=["static/img/og.png"])
        self.assertEqual(result["checked_posts"], [self.post])
        self.assertFalse(result["ok"])

    def test_repeated_slash_reference_asset_change_is_rejected(self):
        self.write(self.post, self.post_text(og="/img//og.png"))
        self.git("add", ".")
        self.git("commit", "-qm", "noncanonical reference")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.png("og.png", (20, 20))
        result = self.check(files=["static/img/og.png"])
        self.assertEqual(result["checked_posts"], [self.post])
        self.assertIn("canonical /img/ path", " ".join(result["errors"]))

    def test_internal_symlink_target_change_revalidates_post(self):
        (self.root / "static/img/alias.png").symlink_to("og.png")
        self.write(self.post, self.post_text(og="/img/alias.png"))
        self.git("add", ".")
        self.git("commit", "-qm", "internal alias")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.png("og.png", (20, 20))
        result = self.check(files=["static/img/og.png"])
        self.assertEqual(result["checked_posts"], [self.post])
        self.assertFalse(result["ok"])

    def test_draft_to_public_requires_media(self):
        self.write(self.post, "---\ntitle: Draft\ndraft: true\n---\nCopy\n")
        self.assertTrue(self.check()["ok"])
        self.git("add", ".")
        self.git("commit", "-qm", "draft")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.write(self.post, "---\ntitle: Draft\ndraft: false\n---\nCopy\n")
        self.assertFalse(self.check()["ok"])

    def test_bad_size_corruption_and_default_tracked_diff(self):
        self.write(self.post, self.post_text())
        self.git("add", ".")
        result = publication.check_publication(self.root, self.base, "feat/example")
        self.assertEqual(result["checked_posts"], [self.post])
        (self.root / "static/img/og.png").write_bytes(b"broken")
        self.assertFalse(self.check()["ok"])
        (self.root / "static/img/og.png").write_bytes(b"x" * publication.MAX_BYTES)
        self.assertIn("smaller than 5 MB", " ".join(self.check()["errors"]))

    def test_renamed_asset_revalidates_unchanged_reference(self):
        self.write(self.post, self.post_text())
        self.git("add", ".")
        self.git("commit", "-qm", "published")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.git("mv", "static/img/og.png", "static/img/renamed.png")
        result = publication.check_publication(self.root, self.base, "feat/example")
        self.assertEqual(result["checked_posts"], [self.post])
        self.assertFalse(result["ok"])

    def test_truncated_jpeg_pixel_data_is_rejected(self):
        target = self.root / "static/img/og.jpg"
        Image.new("RGB", (1200, 630), "teal").save(target)
        data = target.read_bytes()
        target.write_bytes(data[:len(data) // 2])
        self.write(self.post, self.post_text(og="/img/og.jpg"))
        self.assertFalse(self.check()["ok"])


if __name__ == "__main__":
    unittest.main()
