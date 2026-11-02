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

function formHTML(key) {
  const f = forms[key];
  if (!f) return `<!-- unknown form: ${esc(key)} -->`;
  const field = (x, i) => {
    const id = `${key}-${i}`, req = x.required ? " required" : "";
    const label = `<label for="${id}">${esc(x.title)}${x.required ? " (required)" : ""}</label>`;
    if (x.type === "textarea") return `${label}<textarea id="${id}" name="${esc(x.title)}"${req}></textarea>`;
    return `${label}<input id="${id}" name="${esc(x.title)}" type="${x.type === "email" ? "email" : "text"}"${req}>`;
  };
  // Not connected to anything yet: where submissions go is decided with the hosting.
  return `<form class="form" data-form="${esc(key)}" onsubmit="return false">
  ${f.heading ? `<p>${esc(f.heading)}</p>` : ""}${f.fields.map(field).join("\n  ")}
  <button type="submit">${esc(f.submit || "Submit")}</button>
  <p class="note">Form not connected yet.</p>
</form>`;
}

/* ---------- layout ---------- */
// A menu heading with items under it opens on tap or click (<details>), so it works on phones without script.
function navHTML(items) {
  return `<ul>${items.map(i => i.children
    ? `<li><details><summary>${esc(i.label)}</summary><ul>${i.children.map(c => `<li><a href="${esc(c.href)}">${esc(c.label)}</a></li>`).join("")}</ul></details></li>`
    : `<li><a href="${esc(i.href)}">${esc(i.label)}</a></li>`).join("")}</ul>`;
}
const layout = fs.readFileSync(path.join(ROOT, "src", "layout.html"), "utf8");
function page(meta, main) {
  const f = site.footer;
  const footer = f.columns.map(c => `<div><h2>${esc(c.heading)}</h2><ul>${c.links.map(l => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join("")}</ul></div>`).join("")
    + (f.newsletter ? `<div>${formHTML("newsletter")}</div>` : "");
  return layout
    .replace("{{title}}", esc(meta.path === "/" ? site.name : `${meta.title} · ${site.name}`))
    .replace("{{description}}", esc(meta.description || ""))
    .replace("{{canonical}}", esc(site.origin + meta.path))
    .replace("{{site}}", esc(site.name))
    .replace("{{nav}}", navHTML(site.nav) + (site.navButton ? `<a class="button" style="margin:0;padding:8px 18px" href="${esc(site.navButton.href)}">${esc(site.navButton.label)}</a>` : ""))
    .replace("{{main}}", main)
    .replace("{{footer}}", footer);
}
function write(p, html) {
  const dir = path.join(OUT, decodeURI(p));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
}

/* ---------- build ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
for (const p of pages) write(p.meta.path, page(p.meta, render(p.body)));
for (const n of news) write(n.meta.path, page(n.meta, `<article><p><a href="/news/">News</a></p><h1>${esc(n.meta.title)}</h1><time datetime="${n.meta.date}">${fmtDate(n.meta.date)}</time>\n${render(n.body)}</article>`));

// Old Squarespace addresses forward to their new pages.
const redirects = JSON.parse(read("redirects.json"));
const pagePaths = new Set([...pages, ...news].map(p => p.meta.path.replace(/\/$/, "") || "/"));
for (const [from, to] of Object.entries(redirects)) {
  // A redirect from a page's own address (with or without the final /) would replace the page.
  if (pagePaths.has(from.replace(/\/$/, "") || "/")) { console.warn(`redirect ${from} skipped: that address is a page`); continue; }
  write(from, `<!doctype html><meta charset="utf-8"><title>Moved</title><link rel="canonical" href="${esc(to)}"><meta http-equiv="refresh" content="0; url=${esc(to)}"><p>This page moved to <a href="${esc(to)}">${esc(to)}</a>.</p>`);
}

for (const d of ["media", "files", "video"]) if (fs.existsSync(path.join(C, d))) fs.cpSync(path.join(C, d), path.join(OUT, d), { recursive: true, filter: f => !path.basename(f).startsWith(".") });
fs.writeFileSync(path.join(OUT, "404.html"), page({ title: "Page not found", path: "/404" }, `<h1>Page not found</h1><p><a href="/">Go to the home page</a></p>`));
const urls = [...pages, ...news].map(p => p.meta.path);
fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${site.origin}${encodeURI(u)}</loc></url>`).join("\n")}\n</urlset>\n`);
console.log(`site built: ${pages.length} pages, ${news.length} news posts, ${Object.keys(redirects).length} redirects`);
