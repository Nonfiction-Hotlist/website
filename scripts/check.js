// Checks the built site (site/): every internal link, image and file resolves; every address from the
// Squarespace sitemap (capture/capture.json) still lands on a page or a redirect; and each page opens in
// a browser without script errors or sideways scrolling on a phone. Outside requests are blocked.
// Run: npm run check   (CHROMIUM_PATH=/path/to/chrome to use an installed browser)
const fs = require("fs");
const path = require("path");
const http = require("http");
const { chromium } = require("playwright");
const { PUBLIC } = require("./lib/address");

const SITE = path.resolve(__dirname, "..", "site");
const problems = [];
const exists = p => {
  const f = path.join(SITE, decodeURIComponent(p.split("#")[0].split("?")[0]));
  return fs.existsSync(f) && (fs.statSync(f).isFile() || fs.existsSync(path.join(f, "index.html")));
};
const htmlFiles = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? htmlFiles(path.join(dir, e.name)) : e.name.endsWith(".html") ? [path.join(dir, e.name)] : []);

// 1. Internal links and assets
const pages = htmlFiles(SITE);
for (const f of pages) {
  const html = fs.readFileSync(f, "utf8");
  for (const m of html.matchAll(/(?:href|src)="(\/[^"/][^"]*|\/)"/g))
    if (!exists(m[1])) problems.push(`${path.relative(SITE, f)}: broken link ${m[1]}`);
  // The shared top bar uses full addresses on this site (so it also works on the list pages).
  for (const m of html.matchAll(new RegExp(`href="${PUBLIC.replace(/\./g, "\\.")}(/[^"#]*)`, "g")))
    if (!exists(m[1])) problems.push(`${path.relative(SITE, f)}: broken link ${PUBLIC}${m[1]}`);
}

// Redirect pages must lead somewhere else.
for (const f of pages) {
  const m = fs.readFileSync(f, "utf8").match(/http-equiv="refresh" content="0; url=([^"]+)"/);
  const here = "/" + path.relative(SITE, f).replace(/index\.html$/, "");
  if (m && m[1].replace(/\/$/, "") === here.replace(/\/$/, "")) problems.push(`${here}: redirects to itself`);
}

// 2. Every old address still works
const capture = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "capture", "capture.json"), "utf8"));
for (const p of capture.pages) {
  const old = decodeURIComponent(new URL(p.url).pathname);
  if (!exists(old)) problems.push(`old address ${old} leads nowhere`);
}

// 3. In a browser
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, r) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      let f = path.join(SITE, p);
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
      if (!f.startsWith(SITE) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
      const type = { ".html": "text/html", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".pdf": "application/pdf", ".xml": "text/xml", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".mp4": "video/mp4", ".json": "application/json" }[path.extname(f).toLowerCase()];
      r.writeHead(200, { "content-type": type || "application/octet-stream" });
      fs.createReadStream(f).pipe(r);
    }).listen(0, () => res(srv));
  });
}

(async () => {
  const srv = await serve();
  const base = `http://localhost:${srv.address().port}`;
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  let where = "";
  page.on("pageerror", e => problems.push(`${where}: script error ${e.message}`));
  page.on("response", r => { if (r.status() >= 400 && r.url().startsWith(base)) problems.push(`${where}: HTTP ${r.status()} ${r.url().slice(base.length)}`); });
  // Redirect stubs move on at once; they are covered by the checks above.
  const real = pages.filter(f => !fs.readFileSync(f, "utf8").includes('http-equiv="refresh"'))
    .map(f => "/" + path.relative(SITE, f).replace(/index\.html$/, "")).filter(p => !p.endsWith("404.html"));
  for (const p of real) {
    where = p;
    await page.goto(base + encodeURI(p));
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) problems.push(`${p}: scrolls sideways on a phone`);
  }
  await browser.close(); srv.close();
  console.log(`checked ${real.length} pages, ${capture.pages.length} old addresses`);
  if (problems.length) { console.log(`${problems.length} problem(s):\n- ${problems.join("\n- ")}`); process.exit(1); }
  console.log("all clear");
})();
