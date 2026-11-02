// Takes a small screenshot of the top of every page and news post, for the team dashboard's cards:
// site/dashboard/previews/<pages|news>-<file>.jpg. Run after scripts/build.js (npm run build does).
// Without a browser (no Playwright Chromium and no CHROMIUM_PATH) it says so and the dashboard shows
// cards without pictures.
const fs = require("fs");
const path = require("path");
const http = require("http");
const { read } = require("./kit/site-files");

const ROOT = path.resolve(__dirname, "..");
const SITE = path.join(ROOT, "site");
const OUT = path.join(SITE, "dashboard", "previews");
const TYPES = { ".html": "text/html", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".pdf": "application/pdf" };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, r) => {
      let f = path.join(SITE, decodeURIComponent(req.url.split("?")[0]));
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
      if (!f.startsWith(SITE) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { "content-type": TYPES[path.extname(f).toLowerCase()] || "application/octet-stream" });
      fs.createReadStream(f).pipe(r);
    }).listen(0, () => res(srv));
  });
}

(async () => {
  let chromium;
  try { ({ chromium } = require("playwright")); } catch (e) { console.log("previews skipped: Playwright not installed"); return; }
  let browser;
  try { browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}); }
  catch (e) { console.log("previews skipped: no browser (run npx playwright install chromium, or set CHROMIUM_PATH)"); return; }
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const base = `http://localhost:${srv.address().port}`;
  // A 1280x800 view drawn at half scale: a 640x400 picture of the top of the page as a visitor sees it.
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.5 });
  // Outside sites embedded in a page (submission apps, video) aren't needed for a preview.
  await page.route(/^https?:\/\/(?!localhost|fonts\.(googleapis|gstatic)\.com)/, r => r.abort());
  let n = 0;
  for (const [dir, items] of [["pages", read("pages")], ["news", read("news")]]) {
    for (const p of items) {
      await page.goto(base + encodeURI(p.meta.path), { waitUntil: "load" }).catch(() => {});
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      await page.screenshot({ path: path.join(OUT, `${dir}-${p.file}.jpg`), type: "jpeg", quality: 72 });
      n++;
    }
  }
  await browser.close(); srv.close();
  console.log(`previews written: ${n}`);
})();
