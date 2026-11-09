// Every page except the homepage, in the redesign. Pages still come from content/pages/*.md and
// content/news/*.md (which the Drive kit keeps in sync), so editors keep working in their Docs; this
// file decides how each ::: section looks, following the homepage's design lines:
//
//   first section        the page's hero: black ground (or a photo under the green overlay when the
//                        section opens with a photo), small label, big lowercase headline, intro, buttons.
//                        Hotlist edition pages get the outlined year; a marquee becomes the spark tag.
//   faq                  label/headline on the left, questions on the right (follow-on FAQ sections
//                        without a heading join the one before)
//   names                a section of only person links (Contributors) becomes a grid of name cards
//   images               two or more photos become a grid of 14px frames
//   marquee alone        a row of format chips
//   button, not first    a call-to-action band on the green (purple on Yahoo pages)
//   embed, news-list     the submission apps in a frame; news as cards
//   anything else        headline on the left, reading text on the right
//
// Per-page settings (label over the headline, edition year, Yahoo theme, legal reading layout) are in
// PAGES below. Yahoo x NFH pages use the purple from the Yahoo artwork on the current site.
const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const blocks = require("../lib/blocks");
const { barHTML, footerHTML, ARROW, esc } = require("../lib/chrome");
const { FORMS } = require("../lib/address");

const PAGES = {
  "/the-2026-hotlist/": { year: "2026" },
  "/submit2026/": { year: "2026", title: "submit to the 2026 hotlist" },
  "/contributors/": {},
  "/news/": { photo: "banner-news" },
  "/yahoo/": { theme: "yahoo", films: true },
  "/yahooxnfh1/": { theme: "yahoo" },
  "/yahooxnfh/submit/": { theme: "yahoo" },
  "/yahooxnfh/reviewer/": { theme: "yahoo" },
  "/terms-of-use/": { legal: true, photo: "banner-terms" },
  "/privacy-policy/": { legal: true, photo: "banner-privacy" },
  "/submission-agreement/": { legal: true, photo: "banner-agreement" }
};
// Images that are logos or lockups (shown on black, never cropped); everything else is a photo.
const isGraphic = src => /\.png$/i.test(src) || /logo|yahoo-options/i.test(src);
// The site's own wordmark as an image: the page's headline already says it.
const isOwnWordmark = src => /website-logo/i.test(src);

/* ---------- Markdown ---------- */
marked.use({ renderer: { html(token) { return esc(token.text ?? token.raw ?? ""); } } });
const toks = (list, links) => Object.assign(list.slice(), { links: links || {} });
const parse = (list, links, btn = "nfh-btn--forest") => marked.parser(toks(list, links))
  .replace(/<a href="([^"]*)"([^>]*)>([\s\S]*?)<\/a>\{\.button\}/g, `<a class="nfh-btn ${btn}" href="$1"$2>$3</a>`)
  .replace(/<img /g, '<img loading="lazy" decoding="async" ');
const textOf = t => (t.text || "").replace(/\\(.)/g, "$1");

// Looks inside one ::: section: its heading, photos, buttons, person links, prose and special blocks.
function analyze(text) {
  const p = { heading: null, headingDepth: 0, images: [], buttons: [], names: [], prose: [], links: {}, faq: [], marquee: [], embed: null, newsList: false, form: null, other: [] };
  for (const b of blocks(text)) {
    if (b.kind === "faq") p.faq.push(...b.text.split(/^### /m).filter(s => s.trim()).map(s => { const [q, ...a] = s.split("\n"); return { q: q.trim(), a: a.join("\n") }; }));
    else if (b.kind === "marquee") p.marquee.push(...b.text.split("\n").map(l => l.replace(/^-\s*/, "").trim()).filter(Boolean));
    else if (b.kind === "embed") p.embed = b.arg;
    else if (b.kind === "news-list") p.newsList = true;
    else if (b.kind === "form") p.form = b.arg;
    else if (b.kind === "md") {
      const list = marked.lexer(b.text);
      Object.assign(p.links, list.links);
      for (const t of list) {
        if (t.type === "space") continue;
        if (t.type === "heading" && !p.heading && t.depth <= 3) { p.heading = textOf(t); p.headingDepth = t.depth; continue; }
        if (t.type === "paragraph") {
          const kids = t.tokens.filter(k => !(k.type === "text" && !k.text.trim()));
          if (kids.length && kids.every(k => k.type === "image")) { kids.forEach(k => p.images.push({ src: k.href, alt: k.text })); continue; }
          if (/\{\.button\}\s*$/.test(t.raw) && kids[0] && kids[0].type === "link") { p.buttons.push({ href: kids[0].href, label: textOf(kids[0]) }); continue; }
          if (kids.length === 1 && kids[0].type === "link" && !/^mailto:/.test(kids[0].href)) { p.names.push({ href: kids[0].href, label: textOf(kids[0]) }); continue; }
        }
        p.prose.push(t);
      }
    } else p.other.push(b);
  }
  return p;
}

/* ---------- pieces ---------- */
// A page banner: a photo from content/img under the green overlay, the headline on it.
function photoBanner(name, body, cls = "") {
  const { img } = require("../lib/img");
  return `<section class="pg-hero pg-hero--banner nfh-ground-photo nfh-dark${cls}">
  ${img(name, { cls: "nfh-ground-photo__media", alt: "", sizes: "100vw", lazy: false })}
  <div class="nfh-wrap pg-hero__in">${body}</div>
</section>`;
}
const btns = (list, cls) => list.length ? `<div class="nfh-btns">${list.map(b => `<a class="nfh-btn ${cls}" href="${esc(b.href)}">${esc(b.label)}${/^https?:/.test(b.href) || /submit/i.test(b.href) ? ARROW : ""}</a>`).join("")}</div>` : "";
const frame = (im, cls = "") => `<figure class="nfh-frame pg-photo ${cls}"><img src="${esc(im.src)}" alt="${esc(im.alt || "")}" loading="lazy" decoding="async"></figure>`;
// Names stay as editors typed them; the display face lowercases them, as the voice guide asks.
const hostOf = href => { try { const h = new URL(href).hostname.replace(/^www\./, ""); return /linkedin/.test(h) ? "linkedin" : h; } catch { return ""; } };

function hero(p, meta, cfg, used) {
  const photo = p.images.find(im => !isGraphic(im.src));
  const graphics = p.images.filter(im => isGraphic(im.src) && !isOwnWordmark(im.src));
  graphics.forEach(g => used.add(g.src));
  const title = cfg.title || p.heading || meta.title;
  const h1Visible = !(graphics.length && !p.heading); // a lockup with no heading is the headline itself
  const tag = p.marquee.length ? `<p class="nfh-tag pg-hero__tag">${p.marquee.map(esc).join(" · ")}</p>` : "";
  const intro = parse(p.prose, p.links, "nfh-btn--light");
  const head = `${tag}
      <h1 class="nfh-h pg-hero__h${h1Visible ? "" : " nfh-sr"}">${esc(title)}</h1>`;
  const body = `${graphics.map(g => `<img class="pg-hero__lockup" src="${esc(g.src)}" alt="${esc(g.alt || meta.title)}">`).join("")}
      ${head}
      ${intro ? `<div class="pg-hero__intro">${intro}</div>` : ""}
      ${btns(p.buttons, cfg.theme === "yahoo" ? "nfh-btn--light" : "nfh-btn--white")}`;
  if (photo) {
    used.add(photo.src);
    return `<section class="pg-hero pg-hero--photo nfh-ground-photo nfh-dark">
  <img class="nfh-ground-photo__media" src="${esc(photo.src)}" alt="">
  <div class="nfh-wrap pg-hero__in">${body}</div>
</section>`;
  }
  // A banner photo set for the page (News, legal pages) under the green overlay.
  if (cfg.photo) return photoBanner(cfg.photo, body);
  return `<section class="pg-hero nfh-ground-black nfh-dark${cfg.year ? " edition" : ""}">
  ${cfg.year ? `<div class="nfh-year pg-hero__year" aria-hidden="true">${esc(cfg.year)}</div>` : ""}
  <div class="nfh-wrap pg-hero__in">${body}</div>
</section>`;
}

const headCol = (p, cls = "nfh-h--l") => p.heading ? `<h2 class="nfh-h ${cls} nfh-h--forest pg-h">${esc(p.heading)}</h2>` : "";

function faqSection(p) {
  // "questions" over the headline, when the items are questions and the headline doesn't already say so.
  const label = "";
  const items = p.faq.map(x => `<details class="pg-faq__item"><summary><span>${esc(x.q)}</span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M2 9h14"/><path class="v" d="M9 2v14"/></svg></summary><div class="pg-faq__a">${parse(marked.lexer(x.a), {})}</div></details>`).join("\n");
  return `<section class="pg-section pg-white">
  <div class="nfh-wrap pg-cols">
    <div class="pg-cols__side">${label}${headCol(p, "nfh-h--m")}${parse(p.prose, p.links)}</div>
    <div class="pg-faq">${items}</div>
  </div>
</section>`;
}

function namesSection(p) {
  const cards = p.names.map(n => `<a class="pg-name" href="${esc(n.href)}"><span class="pg-name__n">${esc(n.label)}</span><span class="pg-name__site">${esc(hostOf(n.href))} →</span></a>`).join("\n");
  return `<section class="pg-section pg-white">
  <div class="nfh-wrap pg-stack">
    <div class="nfh-head"><div class="nfh-head__title"><p class="nfh-label nfh-label--forest">${p.names.length} contributors</p>${p.heading ? `<h2 class="nfh-h nfh-h--l">${esc(p.heading)}</h2>` : ""}</div></div>
    <div class="pg-names">${cards}</div>
    ${parse(p.prose, p.links)}
  </div>
</section>`;
}

function gallerySection(p, used) {
  const ims = p.images.filter(im => !used.has(im.src));
  return `<section class="pg-section pg-white">
  <div class="nfh-wrap pg-stack">
    ${p.heading ? `<h2 class="nfh-h nfh-h--xl nfh-h--forest pg-gallery__h">${esc(p.heading)}</h2>` : ""}
    <div class="pg-gallery pg-gallery--${Math.min(ims.length, 4)}">${ims.map(im => frame(im)).join("")}</div>
    ${p.prose.length ? `<div class="pg-prose">${parse(p.prose, p.links)}</div>` : ""}
  </div>
</section>`;
}

function chipsSection(p) {
  return `<section class="pg-section pg-white pg-chips">
  <div class="nfh-wrap"><ul class="nfh-chips pg-chips__list" aria-label="Formats">${p.marquee.map(m => `<li class="nfh-chip">${esc(m)}</li>`).join("")}</ul></div>
</section>`;
}

function ctaSection(p) {
  return `<section class="pg-section pg-cta nfh-ground-green nfh-ground-green--text nfh-dark">
  <div class="nfh-wrap pg-cta__in">
    <div class="pg-cta__text">${p.heading ? `<h2 class="nfh-h nfh-h--l">${esc(p.heading)}</h2>` : ""}${parse(p.prose, p.links, "nfh-btn--light")}</div>
    ${btns(p.buttons, "nfh-btn--light")}
  </div>
</section>`;
}

function embedSection(p) {
  return `<section class="pg-section pg-white">
  <div class="nfh-wrap pg-stack">
    ${p.heading ? `<h2 class="nfh-h nfh-h--m nfh-h--forest">${esc(p.heading)}</h2>` : ""}
    ${p.prose.length ? `<div class="pg-prose">${parse(p.prose, p.links)}</div>` : ""}
    <div class="nfh-frame pg-embed"><iframe src="${esc(p.embed)}" title="${esc(p.heading || "Submission form")}" loading="lazy"></iframe></div>
    <p class="pg-embed__out"><a href="${esc(p.embed)}">Open the form in its own page</a></p>
  </div>
</section>`;
}

function newsSection(news) {
  const fmt = d => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).toLowerCase();
  return `<section class="pg-section pg-white">
  <div class="nfh-wrap pg-news">${news.map(n => `<a class="pg-news__card" href="${esc(n.meta.path)}">
      <span class="nfh-frame pg-news__img">${n.meta.image ? `<img src="${esc(n.meta.image)}" alt="" loading="lazy" decoding="async">` : ""}</span>
      <time class="nfh-label nfh-label--forest" datetime="${n.meta.date}">${fmt(n.meta.date)}</time>
      <h2 class="nfh-h nfh-h--card">${esc(n.meta.title)}</h2>
      <p>${esc(n.meta.excerpt)}</p>
    </a>`).join("\n    ")}</div>
</section>`;
}

function formSection(p, forms) {
  const f = forms[p.form];
  if (!f) return "";
  const key = p.form;
  const field = x => {
    const id = `${key}-${x.name}`, req = x.required ? " required" : "", ac = x.autocomplete ? ` autocomplete="${x.autocomplete}"` : "";
    if (x.type === "checkbox") return `<label class="pg-check"><input type="checkbox" id="${id}" name="${x.name}" value="yes"> ${esc(x.title)}</label>`;
    const input = x.type === "textarea" ? `<textarea class="nfh-input pg-textarea" id="${id}" name="${x.name}"${req}></textarea>`
      : `<input class="nfh-input" id="${id}" name="${x.name}" type="${x.type === "email" ? "email" : "text"}"${ac}${req}>`;
    return `<div class="nfh-field"><label for="${id}">${esc(x.title)}${x.required ? " (required)" : ""}</label>${input}</div>`;
  };
  return `<section class="pg-section pg-white">
  <div class="nfh-wrap pg-cols">
    <div class="pg-cols__side">${headCol(p, "nfh-h--m")}${parse(p.prose, p.links)}</div>
    <form class="nfh-form" method="post" action="${esc(FORMS)}" data-nfh-form data-thanks="${esc(f.thanks || "Thank you!")}">
      <input type="hidden" name="_form" value="${esc(key)}"><input type="hidden" name="_page" value=""><input type="hidden" name="_t" value="">
      <div class="nfh-form__trap" aria-hidden="true"><label>Leave this empty <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
      ${f.fields.map(field).join("\n      ")}
      <button type="submit" class="nfh-btn nfh-btn--black nfh-btn--big">${esc((f.submit || "send").toLowerCase())}</button>
      <p class="nfh-form__msg" role="status" aria-live="polite"></p>
    </form>
  </div>
</section>`;
}

function proseSection(p, used, cfg) {
  const photos = p.images.filter(im => !used.has(im.src));
  const body = parse(p.prose, p.links);
  if (!p.heading && !body.trim() && !photos.length && !p.buttons.length) return "";
  if (cfg.legal) return `<section class="pg-section pg-white"><div class="nfh-wrap"><div class="pg-prose pg-prose--doc">${p.heading ? `<h2>${esc(p.heading)}</h2>` : ""}${body}</div></div></section>`;
  return `<section class="pg-section pg-white">
  <div class="nfh-wrap pg-cols">
    <div class="pg-cols__side">${headCol(p)}</div>
    <div class="pg-prose">${body}${photos.map(im => frame(im)).join("")}${btns(p.buttons, "nfh-btn--forest")}</div>
  </div>
</section>`;
}

/* ---------- the Yahoo x NFH hero ---------- */
// The stage photo from the Yahoo x NFH screening night under a black-to-purple overlay (dark where the text
// sits, the purple light and green frame showing through on the right), the lockup, a big headline, the
// intro from the page's Doc, three numbers, and a slow strip of the 20 film stills that link to each film.
function yahooHero(p, meta, used) {
  const { img, srcset } = require("../lib/img");
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "../../content/yahoo-films.json"), "utf8"));
  const films = data.categories.flatMap(c => c.films);
  const lockup = p.images.find(im => isGraphic(im.src));
  if (lockup) used.add(lockup.src);
  const watch = "https://www.yahoo.com/nonfictionhotlist/";
  const still = f => `<a class="yh-still" href="${esc(f.link)}" tabindex="-1"><img src="${srcset(f.still).small}" alt="" loading="lazy" decoding="async"><span>${esc(f.title)}</span></a>`;
  const strip = films.map(still).join("");
  return `<section class="yh nfh-dark" aria-label="Yahoo x Nonfiction Hotlist">
  ${img("yahoo-wall", { cls: "yh__bg", alt: "", sizes: "100vw", lazy: false })}
  <div class="nfh-wrap yh__in">
    ${lockup ? `<img class="yh__lockup" src="${esc(lockup.src)}" alt="Yahoo x Nonfiction Hotlist">` : ""}
    <h1 class="nfh-h yh__h">${films.length} short documentaries, streaming on <span>yahoo.</span></h1>
    <div class="yh__row">
      <div class="yh__intro">${parse(p.prose, p.links, "nfh-btn--light")}</div>
      <div class="nfh-btns"><a class="nfh-btn yh__watch" href="${watch}">watch the films${ARROW}</a><a class="nfh-btn nfh-btn--ghost" href="#the-films">see the list</a></div>
    </div>
    <dl class="yh__stats">
      <div><dt>submissions read</dt><dd>~1,000</dd></div>
      <div><dt>categories</dt><dd>${data.categories.length}</dd></div>
      <div><dt>open call</dt><dd>international</dd></div>
    </dl>
  </div>
  <div class="yh__strip" aria-hidden="true"><div class="yh__track">${strip}${strip}</div></div>
</section>`;
}

/* ---------- the Yahoo x NFH films (content/yahoo-films.json) ---------- */
// A jump row of the five categories, then one section per category (alternating white and black),
// each a grid of film cards: still, italic title, logline, and a link to watch on Yahoo. The category
// colors are the ones from the bands on the Squarespace page; black text on each is 5:1 or better.
function filmsSection() {
  const { img } = require("../lib/img");
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "../../content/yahoo-films.json"), "utf8"));
  const slug = s => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const total = data.categories.reduce((n, c) => n + c.films.length, 0);
  const jump = `<section id="the-films" class="pg-section pg-white yf-intro">
  <div class="nfh-wrap pg-stack">
    <div class="nfh-head">
      <div class="nfh-head__title"><h2 class="nfh-h nfh-h--xl nfh-h--forest">the films</h2></div>
    </div>
    <ul class="yf-jump" aria-label="Categories">${data.categories.map(c => `<li><a class="yf-cat" style="--cat: ${c.color}" href="#${slug(c.name)}">${esc(c.name)} <span>${c.films.length}</span></a></li>`).join("")}</ul>
  </div>
</section>`;
  const cats = data.categories.map((c, i) => {
    const dark = i % 2 === 0;
    return `<section id="${slug(c.name)}" class="pg-section yf-section ${dark ? "nfh-ground-black nfh-dark" : "pg-white"}" style="--cat: ${c.color}">
  <div class="nfh-wrap pg-stack">
    <div class="nfh-head"><div class="nfh-head__title"><p class="yf-cat yf-cat--tag">${c.films.length} film${c.films.length === 1 ? "" : "s"}</p><h2 class="nfh-h nfh-h--l">${esc(c.name)}</h2></div></div>
    <div class="yf-grid">${c.films.map(f => `<a class="yf-card" href="${esc(f.link)}">
        ${img(f.still, { alt: `Still from ${f.title}`, sizes: "(max-width: 760px) 100vw, 420px", cls: "yf-card__img" })}
        <span class="yf-card__body"><span class="yf-card__title nfh-title">${esc(f.title)}</span><span class="yf-card__line">${esc(f.logline)}</span><span class="yf-card__watch">watch on yahoo →</span></span>
      </a>`).join("\n      ")}</div>
  </div>
</section>`;
  }).join("\n\n");
  return jump + "\n\n" + cats;
}

/* ---------- page ---------- */
function renderBody(text, meta, cfg, ctx) {
  const sections = blocks(text).filter(b => b.kind === "section" || b.text.trim()).map(b => b.kind === "section" ? b.text : `::: section\n${b.text}\n:::`)
    .map(t => blocks(t).length === 1 && blocks(t)[0].kind === "section" ? blocks(t)[0].text : t);
  const used = new Set(), out = [];
  let lastFaq = null;
  sections.forEach((t, i) => {
    const p = analyze(t);
    if (i === 0) { out.push(cfg.films ? yahooHero(p, meta, used) : hero(p, meta, cfg, used)); return; }
    // A section that only repeats an image already shown (the Yahoo lockup at the foot of the page) is dropped.
    if (!p.heading && !p.prose.length && !p.buttons.length && !p.faq.length && !p.embed && !p.newsList && !p.marquee.length && !p.names.length && p.images.every(im => used.has(im.src))) return;
    if (p.faq.length) {
      if (lastFaq && !p.heading && !p.prose.length) { lastFaq.faq.push(...p.faq); return; }
      lastFaq = p; out.push(() => faqSection(p)); return;
    }
    lastFaq = null;
    if (p.embed) out.push(embedSection(p));
    else if (p.newsList) out.push(newsSection(ctx.news));
    else if (p.form) out.push(formSection(p, ctx.forms));
    else if (p.names.length >= 6) out.push(namesSection(p));
    else if (p.marquee.length && !p.heading && !p.prose.length) out.push(chipsSection(p));
    else if (p.images.filter(im => !used.has(im.src)).length >= 2) out.push(gallerySection(p, used));
    else if (p.buttons.length && !cfg.legal) out.push(ctaSection(p));
    else out.push(proseSection(p, used, cfg));
  });
  if (cfg.films) out.splice(1, 0, filmsSection()); // right after the hero, before the watch band
  return out.map(x => typeof x === "function" ? x() : x).join("\n\n");
}

function articleBody(n) {
  const fmt = new Date(n.meta.date + "T12:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).toLowerCase();
  const list = marked.lexer(n.body);
  return `${photoBanner("banner-news", `<p class="nfh-label pg-hero__label"><a href="/news/">news</a> · <time datetime="${n.meta.date}">${fmt}</time></p>
    <h1 class="nfh-h pg-hero__h">${esc(n.meta.title)}</h1>`)}
<section class="pg-section pg-white">
  <div class="nfh-wrap"><article class="pg-prose pg-prose--doc pg-article">${parse(list, list.links)
    .replace(/<p><img ([^>]*)><\/p>/g, '<figure class="nfh-frame pg-photo"><img $1></figure>')}
    <p><a class="nfh-link" href="/news/">all news</a></p></article></div>
</section>`;
}

function shell(site, meta, main, cfg, { noindex = true } = {}) {
  const title = meta.path === "/" ? site.name : `${meta.title} · ${site.name}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(meta.description || meta.excerpt || "")}">
${noindex ? '<meta name="robots" content="noindex">\n' : ""}<link rel="canonical" href="${esc(site.origin + meta.path)}">
<link rel="preload" href="/brand/v1/fonts/LeagueSpartan-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/brand/v1/fonts/RobotoSerif-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/brand/v1/nfh.css">
<link rel="icon" href="/brand/v1/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/brand/v1/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/brand/v1/apple-touch-icon.png">
<link rel="stylesheet" href="/page.css">
<script src="/brand/v1/nfh.js" defer></script>
</head>
<body${cfg.theme ? ` class="nfh-theme-${cfg.theme}"` : ""}>
<a class="nfh-skip" href="#main">Skip to content</a>
${barHTML(site, { origin: "" })}
<main id="main">
${main}
</main>
${footerHTML(site, { origin: "" })}
</body>
</html>
`;
}

function designedPage(site, meta, body, ctx) {
  const cfg = PAGES[meta.path] || {};
  return shell(site, meta, renderBody(body, meta, cfg, ctx), cfg);
}
function articlePage(site, n) {
  return shell(site, n.meta, articleBody(n), {});
}
function notFoundPage(site) {
  return shell(site, { title: "Page not found", path: "/404" }, photoBanner("banner-404", `<h1 class="nfh-h pg-hero__h">this page isn't here.</h1>
  <div class="pg-hero__intro"><p>It may have moved when the site was rebuilt.</p></div>
  <div class="nfh-btns"><a class="nfh-btn nfh-btn--white" href="/">go to the home page${ARROW}</a></div>`), {});
}

module.exports = { designedPage, articlePage, notFoundPage, PAGES };
