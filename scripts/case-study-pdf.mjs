#!/usr/bin/env node
/**
 * Generate a print-quality, TEXT-SELECTABLE PDF of a case-study page.
 *
 * The PDF is produced by Chromium's print engine (via Playwright), so:
 *   - body text stays highlightable / copy-pasteable (it is NOT an image),
 *   - links remain clickable (Chromium emits real PDF link annotations),
 *   - the dark "immersive" design is preserved (backgrounds are printed).
 *
 * The page uses AOS scroll-in animations (elements start at opacity:0 and only
 * fade in once scrolled into view). A naive capture would render most of the
 * body blank, so this script injects CSS that neutralizes AOS and hides the
 * site chrome (nav header, footer, the schedule-assessment band, and the
 * in-hero "Download PDF" button itself) before printing.
 *
 * USAGE
 *   1. Build + serve the site (any local server pointing at the built site or
 *      `hugo serve`), e.g.:
 *        hugo serve
 *   2. In another shell, generate the PDF:
 *        node scripts/case-study-pdf.mjs marketspark
 *
 *   Options:
 *     <slug>                positional; page = <base>/case-studies/<slug>/,
 *                           output = static/case-studies/<slug>.pdf
 *     --url   <url>         full page URL (overrides slug-derived URL)
 *     --out   <path>        output PDF path (overrides slug-derived path)
 *     --base  <origin>      origin for slug URLs (default http://localhost:1313)
 *     --width <px>          layout/page width in px (default 1200)
 *     --page-height <px>    page height for the default paged mode (default 1600)
 *     --single              one continuous page (seamless but slow to open)
 *     --a4                  standard A4 portrait pages (most compatible)
 *                           (default, no flag: desktop-width paged — fast + on-brand)
 *
 * REQUIREMENTS
 *   npm install -D playwright   (or:  npx playwright …)
 *   npx playwright install chromium
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  // mode: "paged" (default) = desktop-width pages broken between cards — fast to
  //       open because viewers render page-by-page; "single" = one continuous
  //       page (looks seamless but an 80in+ page is slow/janky in many viewers);
  //       "a4" = standard A4 portrait (most universally compatible).
  const opts = {
    base: "http://localhost:1313",
    width: 1200,
    pageHeight: 1600,
    mode: "paged",
  };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--single") opts.mode = "single";
    else if (a === "--a4") opts.mode = "a4";
    else if (a === "--paged") opts.mode = "paged";
    else if (a === "--url") opts.url = argv[++i];
    else if (a === "--out") opts.out = argv[++i];
    else if (a === "--base") opts.base = argv[++i];
    else if (a === "--width") opts.width = Number(argv[++i]);
    else if (a === "--page-height") opts.pageHeight = Number(argv[++i]);
    else rest.push(a);
  }
  opts.slug = rest[0];
  return opts;
}

// Injected at generation time only — never shipped to site visitors.
const EXPORT_CSS = `
  /* Reveal everything AOS would otherwise keep hidden until scroll. */
  [data-aos] {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
  /* Drop site chrome so the PDF is just the case study. */
  #preloader,
  #sitewideNote,
  header[aria-label="header"],
  footer,
  #scrollUp,
  #schedule-assessment,
  .cs-hero__actions {
    display: none !important;
  }
  /* The nav header is position:absolute over the hero; once hidden, reclaim its
     top padding so the PDF doesn't open with a tall empty band. */
  .case-study-modern .cs-hero { padding-top: 3.5rem !important; }
  /* Paged mode: break BETWEEN cards, never through one. Card heights all fit
     under the page height, so every break lands in a gap. */
  .cs-hero, .cs-stat-strip, .csi-section, .csi-cta { break-inside: avoid; }
  /* Zero out page margins so the page-height math lines up, and paint the page
     backdrop pine so the gaps between cards stay on-brand (not white). */
  html, body { margin: 0 !important; background: #0e383a !important; }
`;

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.url && !opts.slug) {
    console.error(
      "Error: provide a case-study slug (e.g. `marketspark`) or --url.",
    );
    process.exit(1);
  }

  const url = opts.url || `${opts.base}/case-studies/${opts.slug}/`;
  const out =
    opts.out ||
    path.join("static", "case-studies", `${opts.slug}.pdf`);

  console.log(`→ rendering ${url} (mode: ${opts.mode})`);
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: opts.width, height: 1400 },
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

  // Scroll through to trigger any lazy-loaded images, then return to top.
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0;
      const step = () => {
        window.scrollTo(0, y);
        y += window.innerHeight;
        if (y < document.body.scrollHeight) setTimeout(step, 30);
        else {
          window.scrollTo(0, 0);
          resolve();
        }
      };
      step();
    });
  });

  await page.addStyleTag({ content: EXPORT_CSS });
  await page.emulateMedia({ media: "screen" }); // keep the dark design
  // Wait for web fonts (the site's brand font, proxima-nova, is loaded from
  // Adobe Typekit). Needs outbound access to use.typekit.net at render time, or
  // the PDF falls back to system fonts.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  await mkdir(path.dirname(out), { recursive: true });

  const pdfOpts = { path: out, printBackground: true };
  if (opts.mode === "a4") {
    pdfOpts.format = "A4";
    pdfOpts.margin = { top: "0", right: "0", bottom: "0", left: "0" };
  } else if (opts.mode === "single") {
    // One continuous page sized to the full document — looks seamless, but an
    // 80in+ tall page is slow/janky to open in many viewers. +2px buffer +
    // zero margins stop an overflow sliver spilling onto a near-empty 2nd page.
    const height = await page.evaluate(() =>
      Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
      ),
    );
    pdfOpts.width = `${opts.width}px`;
    pdfOpts.height = `${height + 2}px`;
    pdfOpts.margin = { top: "0", right: "0", bottom: "0", left: "0" };
  } else {
    // Default "paged": desktop-width pages of a fixed height. Cards all fit
    // under the page height and carry break-inside:avoid, so breaks land
    // between cards; the pine page backdrop fills the gaps. Renders fast
    // because viewers paint one normal-sized page at a time.
    pdfOpts.width = `${opts.width}px`;
    pdfOpts.height = `${opts.pageHeight}px`;
    pdfOpts.margin = { top: "0", right: "0", bottom: "0", left: "0" };
  }

  await page.pdf(pdfOpts);
  await browser.close();
  console.log(`✓ wrote ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
