// netlify-plugin-image-optim runs every published SVG through SVGO, which
// strips the <style> keyframes / clipPath ids our animated diagrams rely on.
// SVGs are already optimized at the source (trunk ignores static/img/**/*.svg
// for the same reason — see .trunk/trunk.yaml), so after image-optim runs we
// copy the committed originals back over the mangled ones. This plugin must
// stay listed AFTER netlify-plugin-image-optim in netlify.toml — same-event
// plugins run in listed order.
const fs = require("fs");
const path = require("path");

const SRC = "static/img";

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(p);
    return p.endsWith(".svg") ? [p] : [];
  });

module.exports = {
  onPostBuild: ({ constants }) => {
    let restored = 0;
    for (const src of walk(SRC)) {
      const dest = path.join(
        constants.PUBLISH_DIR,
        "img",
        path.relative(SRC, src),
      );
      if (fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        restored += 1;
      }
    }
    console.log(
      `restore-animated-svgs: restored ${restored} SVG(s) from ${SRC} verbatim`,
    );
  },
};
