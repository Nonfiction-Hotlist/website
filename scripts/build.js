// Builds the website from content/ into site/. Pages are plain on purpose: structure and copy only,
// with design to come. Run: npm run build
//
// content/pages/*.md and content/news/*.md: front matter ("key: JSON value" lines between ---), then
// Markdown with these additions:
//   ::: section name  ...  :::     a band of the page
//   ::: faq  ...  :::              "### Question" followed by its answer
//   ::: marquee  ...  :::          a list of words that scroll by
//   ::: form contact  :::          a form from content/forms/contact.json
//   ::: embed URL  :::             another site in a frame (submission apps, the Canva deck)
//   ::: news-list  :::             every news post, newest first
//   [Label](/path){.button}        a button
const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const blocks = require("./lib/blocks");
const { videoName } = require("./lib/video");
const { headerHTML } = require("./lib/header");
const { FORMS } = require("./lib/address");
const { buildBrand } = require("./brand/build-brand");
const { homePage } = require("./pages/home");
const { designedPage, articlePage, notFoundPage } = require("./pages/page");

const ROOT = path.resolve(__dirname, "..");
const C = path.join(ROOT, "content");
const OUT = path.join(ROOT, "site");
const read = f => fs.readFileSync(path.join(C, f), "utf8");
const site = JSON.parse(read("site.json"));
const forms = Object.fromEntries(fs.readdirSync(path.join(C, "forms")).map(f => [f.replace(/\.json$/, ""), JSON.parse(read("forms/" + f))]));
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function parse(file) {
  const text = fs.readFileSync(file, "utf8");
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta = {};
  if (m) for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = JSON.parse(line.slice(i + 1).trim());
  }
  return { meta, body: m ? text.slice(m[0].length) : text };
}
const news = fs.readdirSync(path.join(C, "news")).filter(f => f.endsWith(".md"))
  .map(f => parse(path.join(C, "news", f))).sort((a, b) => b.meta.date.localeCompare(a.meta.date));
const pages = fs.readdirSync(path.join(C, "pages")).filter(f => f.endsWith(".md")).map(f => parse(path.join(C, "pages", f)));

/* ---------- Markdown with ::: blocks ---------- */
// HTML typed or pasted into a Doc is shown as text, never run as code.
marked.use({ renderer: { html(token) { return esc(token.text ?? token.raw ?? ""); } } });
const md = s => marked.parse(s).replace(/<a href="([^"]*)"([^>]*)>([\s\S]*?)<\/a>\{\.button\}/g, '<a class="button" href="$1"$2>$3</a>');

function render(text) {
  return blocks(text).map(b => {
    if (b.kind === "md") return md(b.text);
    if (b.kind === "section") {
      // A section with a background video: the video fills the band and the section's content sits in a frame over it.
      const bg = blocks(b.text).find(x => x.kind === "background-video");
      if (!bg) return `<section${b.arg ? ` id="${esc(b.arg)}"` : ""}>\n${render(b.text)}\n</section>`;
      const v = "/video/" + videoName(bg.arg);
      return `<section${b.arg ? ` id="${esc(b.arg)}"` : ""} class="has-video" style="background-image:url('${v}.jpg')">
  <video class="bg-video" autoplay muted loop playsinline preload="auto" poster="${v}.jpg" aria-hidden="true">
    <source src="${v}-720.mp4" type="video/mp4" media="(max-width: 900px)">
    <source src="${v}-1080.mp4" type="video/mp4">
  </video>
  <div class="frame">\n${render(b.text)}\n</div>
</section>`;
    }
    if (b.kind === "background-video") return "";
    if (b.kind === "faq") {
      const qs = b.text.split(/^### /m).filter(s => s.trim()).map(s => { const [q, ...a] = s.split("\n"); return { q: q.trim(), a: a.join("\n") }; });
      return `<div class="faq">${qs.map(x => `<details><summary>${esc(x.q)}</summary>${md(x.a)}</details>`).join("\n")}</div>`;
    }
    if (b.kind === "marquee") {
      const items = b.text.split("\n").map(l => l.replace(/^-\s*/, "").trim()).filter(Boolean);
      return `<p class="marquee">${items.map(esc).join(" · ")}</p>`;
    }
    if (b.kind === "form") return formHTML(b.arg);
    if (b.kind === "embed") return `<div class="embed"><iframe src="${esc(b.arg)}" loading="lazy" title="Embedded content"></iframe><p><a href="${esc(b.arg)}">Open in a new page</a></p></div>`;
    if (b.kind === "news-list") return `<ul class="news-list">${news.map(n => `<li>${n.meta.image ? `<img src="${esc(n.meta.image)}" alt="" loading="lazy">` : ""}<div><time datetime="${n.meta.date}">${fmtDate(n.meta.date)}</time><h2><a href="${esc(n.meta.path)}">${esc(n.meta.title)}</a></h2><p>${esc(n.meta.excerpt)}</p></div></li>`).join("\n")}</ul>`;
    return `<!-- unknown block: ${esc(b.kind)} -->`;
  }).join("\n");
}

const fmtDate = d => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

// The forms send to drive-kit/forms.gs (address.js FORMS), which keeps entries in a private Sheet,
// emails about contact entries and adds people who ask to the Brevo list. With JavaScript the form
// answers in place; without it the browser posts to the script and lands on its thank-you page.
// The "website" field is a trap for spam robots: hidden from people, so a filled-in one is turned away.
function formHTML(key) {
  const f = forms[key];
  if (!f) return `<!-- unknown form: ${esc(key)} -->`;
  const field = x => {
    const id = `${key}-${x.name}`, req = x.required ? " required" : "", ac = x.autocomplete ? ` autocomplete="${x.autocomplete}"` : "";
    if (x.type === "checkbox") return `<label class="check"><input type="checkbox" id="${id}" name="${x.name}" value="yes"> ${esc(x.title)}</label>`;
    const label = `<label for="${id}">${esc(x.title)}${x.required ? ' <span class="req">(required)</span>' : ""}</label>`;
    const input = x.type === "textarea" ? `<textarea id="${id}" name="${x.name}"${req}></textarea>`
      : `<input id="${id}" name="${x.name}" type="${x.type === "email" ? "email" : "text"}"${ac}${req}>`;
    return `<div class="field${x.half ? " half" : ""}">${label}${input}</div>`;
  };
  if (!FORMS) return `<form class="form" onsubmit="return false">${f.heading ? `<p>${esc(f.heading)}</p>` : ""}${f.fields.map(field).join("")}<button type="submit">${esc(f.submit || "Submit")}</button><p class="note">Form not connected yet.</p></form>`;
  return `<form class="form" method="post" action="${esc(FORMS)}" data-thanks="${esc(f.thanks || "Thank you!")}">
  ${f.heading ? `<p>${esc(f.heading)}</p>` : ""}<input type="hidden" name="_form" value="${esc(key)}"><input type="hidden" name="_page" value=""><input type="hidden" name="_t" value="">
  <div class="trap" aria-hidden="true"><label>Leave this empty <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
  <div class="fields">${f.fields.map(field).join("")}</div>
  <button type="submit">${esc(f.submit || "Submit")}</button>
  <p class="form-msg" role="status" aria-live="polite"></p>
</form>`;
}

/* ---------- layout ---------- */
const HEADER = headerHTML(site);
const layout = fs.readFileSync(path.join(ROOT, "src", "layout.html"), "utf8");
function page(meta, main) {
  const f = site.footer;
  const footer = f.columns.map(c => `<div><h2>${esc(c.heading)}</h2><ul>${c.links.map(l => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join("")}</ul></div>`).join("")
    + (f.newsletter ? `<div>${formHTML("newsletter")}</div>` : "");
  // Filled in with functions, so a "$" in page text is never read as a replacement pattern.
  const fill = { title: esc(meta.path === "/" ? site.name : `${meta.title} · ${site.name}`), description: esc(meta.description || ""),
    canonical: esc(site.origin + meta.path), header: HEADER, main, footer };
  return layout.replace(/\{\{(\w+)\}\}/g, (m, k) => k in fill ? fill[k] : m);
}
function write(p, html) {
  const dir = path.join(OUT, decodeURI(p));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
}

/* ---------- build ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
// The homepage is the redesigned one (scripts/pages/home.js, from the design canvas). The other pages
// still use src/layout.html until they're redesigned too.
// The other pages and news posts use the same design lines (scripts/pages/page.js).
const ctx = { news, forms };
for (const p of pages) write(p.meta.path, p.meta.path === "/" ? homePage(site) : designedPage(site, p.meta, p.body, ctx));
for (const n of news) write(n.meta.path, articlePage(site, n));

// Old Squarespace addresses forward to their new pages.
const redirects = JSON.parse(read("redirects.json"));
const pagePaths = new Set([...pages, ...news].map(p => p.meta.path.replace(/\/$/, "") || "/"));
for (const [from, to] of Object.entries(redirects)) {
  // A redirect from a page's own address (with or without the final /) would replace the page.
  if (pagePaths.has(from.replace(/\/$/, "") || "/")) { console.warn(`redirect ${from} skipped: that address is a page`); continue; }
  write(from, `<!doctype html><meta charset="utf-8"><title>Moved</title><link rel="canonical" href="${esc(to)}"><meta http-equiv="refresh" content="0; url=${esc(to)}"><p>This page moved to <a href="${esc(to)}">${esc(to)}</a>.</p>`);
}

for (const d of ["media", "files", "video", "img"]) if (fs.existsSync(path.join(C, d))) fs.cpSync(path.join(C, d), path.join(OUT, d), { recursive: true, filter: f => !path.basename(f).startsWith(".") });
// The shared brand kit (styles, fonts, logos, script) at /brand/v1/, and the homepage's own styles.
buildBrand(OUT);
// Browsers ask for /favicon.ico on their own; the 32px PNG answers.
fs.copyFileSync(path.join(ROOT, "brand", "favicon-32.png"), path.join(OUT, "favicon.ico"));
for (const f of ["home.css", "page.css"]) fs.copyFileSync(path.join(ROOT, "src", f), path.join(OUT, f));
// The redesign's top bar and footer for the list sites (list.nonfictionhotlist.com), which copy them and the
// brand kit in when they build (the list repo's scripts/fetch-brand.js). Links point at the website; the
// logo comes from the list site's own copy of the kit at /brand/v1/.
const { barHTML, footerHTML } = require("./lib/chrome");
fs.mkdirSync(path.join(OUT, "shared"), { recursive: true });
fs.writeFileSync(path.join(OUT, "shared", "bar.html"), barHTML(site));
fs.writeFileSync(path.join(OUT, "shared", "footer.html"), footerHTML(site));
const kitFiles = [];
(function walk(d, rel) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p, rel + f + "/") : kitFiles.push(rel + f); } })(path.join(OUT, "brand", "v1"), "");
fs.writeFileSync(path.join(OUT, "brand", "v1", "files.json"), JSON.stringify(kitFiles.sort(), null, 1) + "\n");
// The first top bar (before the redesign), still read by list builds that haven't moved to the brand kit.
fs.mkdirSync(path.join(OUT, "shared"), { recursive: true });
fs.writeFileSync(path.join(OUT, "shared", "header.html"), HEADER);
fs.writeFileSync(path.join(OUT, "404.html"), notFoundPage(site));
const urls = [...pages, ...news].map(p => p.meta.path);
fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${site.origin}${encodeURI(u)}</loc></url>`).join("\n")}\n</urlset>\n`);
console.log(`site built: ${pages.length} pages, ${news.length} news posts, ${Object.keys(redirects).length} redirects`);
