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
 *     --paged               paginate to A4 instead of one continuous page
 *     --width <px>          layout/page width in px (default 1200)
 *
 * REQUIREMENTS
 *   npm install -D playwright   (or:  npx playwright …)
 *   npx playwright install chromium
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const opts = { base: "http://localhost:1313", width: 1200, paged: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--paged") opts.paged = true;
    else if (a === "--url") opts.url = argv[++i];
    else if (a === "--out") opts.out = argv[++i];
    else if (a === "--base") opts.base = argv[++i];
    else if (a === "--width") opts.width = Number(argv[++i]);
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
  /* Keep cards from splitting awkwardly across pages in --paged mode. */
  .csi-section, .cs-stat-strip__inner { break-inside: avoid; }
  /* Zero out page margins so the continuous-page height math lines up. */
  html, body { margin: 0 !important; }
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

  console.log(`→ rendering ${url}`);
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: opts.width, height: 1400 },
    deviceScaleFactor: 2,
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
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  await mkdir(path.dirname(out), { recursive: true });

  const pdfOpts = { path: out, printBackground: true };
  if (opts.paged) {
    pdfOpts.format = "A4";
    pdfOpts.margin = { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" };
  } else {
    // One continuous page sized to the full document — no mid-card page breaks.
    // +2px buffer + zero margins keep an overflow sliver from spilling onto a
    // near-empty second page.
    const height = await page.evaluate(() =>
      Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
      ),
    );
    pdfOpts.width = `${opts.width}px`;
    pdfOpts.height = `${height + 2}px`;
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
