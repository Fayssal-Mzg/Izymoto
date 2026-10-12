// Génère les PDF du guide à partir des sources HTML de docs/guide/.
//   node scripts/guide/pdf.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const DOCS = [
  { src: "docs/guide/guide-fonctionnel.html", out: "docs/guide/guide-fonctionnel.pdf" },
  { src: "docs/guide/presentation-entreprises.html", out: "docs/guide/presentation-entreprises.pdf" },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const d of DOCS) {
  await page.goto(pathToFileURL(path.resolve(d.src)).toString(), { waitUntil: "load" });
  await page.pdf({
    path: d.out,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate:
      '<div style="font-size:8px;color:#888;width:100%;text-align:center;">Izymoto · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: "14mm", bottom: "16mm", left: "14mm", right: "14mm" },
  });
  console.log("pdf", d.out);
}
await browser.close();
