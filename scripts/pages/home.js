// The homepage, built to match the design canvas (NFH Homepage Mockup, project/Main.dc.html) section
// by section. Shared pieces (bar, menu, footer, buttons, cards, grounds) come from the brand kit; the
// arrangement of this page is in src/home.css. The words come from the "Home Page" Doc (home-copy.js).
const fs = require("fs");
const path = require("path");
const { barHTML, footerHTML, ARROW, esc } = require("../lib/chrome");
const { img, srcset } = require("../lib/img");
const { FORMS } = require("../lib/address");
const { analyticsHTML } = require("../lib/analytics");

const { read } = require("./home-copy");

const C = path.join(__dirname, "../../content");
const LIST_2025 = "https://list.nonfictionhotlist.com/2025/";

// The words come from the "Home Page" Doc (content/pages/index.md); see home-copy.js.
// The sync only saves versions that pass its checks, so problems here mean a hand edit to index.md.
let T;
function words() {
  const r = read(fs.readFileSync(path.join(C, "pages", "index.md"), "utf8"));
  if (r.issues.length) throw new Error("Home Page text: " + r.issues.join("; "));
  return r.copy;
}

const btn = (cls, href, label, arrow = false) => `<a class="nfh-btn ${cls}" href="${esc(href)}">${esc(label)}${arrow ? ARROW : ""}</a>`;
// A headline's last word goes on its own line ("nonfiction<br>hotlist.").
const twoLines = s => { const k = s.lastIndexOf(" "); return k < 0 ? esc(s) : `${esc(s.slice(0, k))}<br>${esc(s.slice(k + 1))}`; };

function badge([ring, center]) {
  const words = center.split(/\s+/);
  const lines = words.length > 1 ? [words[0], words.slice(1).join(" ")] : words;
  const ys = lines.length > 1 ? [97, 128] : [112];
  const style = "font: 700 32px 'League Spartan', sans-serif; letter-spacing: -0.5px; fill: #1a2821; text-anchor: middle;";
  return `<a href="#hotlist" class="nfh-badge" aria-label="${esc(`${ring}, ${center}`)}">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <defs><path id="ringpath" d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0"/></defs>
        <circle cx="100" cy="100" r="100" fill="#fcb100"/>
        <g class="ring"><text style="font: 700 15.5px 'League Spartan', sans-serif; letter-spacing: 1.2px; fill: #1a2821;"><textPath href="#ringpath" textLength="472" lengthAdjust="spacing">${esc(Array(3).fill(ring + " •").join(" "))}</textPath></text></g>
        ${lines.map((l, k) => `<text x="100" y="${ys[k]}" style="${style}">${esc(l)}</text>`).join("\n        ")}
      </svg>
    </a>`;
}

function hero() {
  const h = T["hero"];
  return `<section id="top" class="hero nfh-ground-photo nfh-dark" aria-label="Introduction">
  <video class="nfh-ground-photo__media" data-nfh-bg autoplay muted loop playsinline preload="metadata" poster="/img/hero-still-1512.jpg" aria-hidden="true">
    <source src="/video/nonfiction-hotlist-720.mp4" type="video/mp4" media="(max-width: 900px)">
    <source src="/video/nonfiction-hotlist-1080.mp4" type="video/mp4">
  </video>
  <div class="hero__frame">
    ${badge(h["rotating badge"])}
    <h1 class="nfh-h nfh-h--hero">${twoLines(h.headline)}</h1>
    <div class="hero__row">
      <p class="hero__line">${esc(h.line)}</p>
      <div class="nfh-btns">${btn("nfh-btn--light", "#hotlist", h.buttons[0], true)}${btn("nfh-btn--ghost", "#partner", h.buttons[1])}</div>
    </div>
  </div>
</section>`;
}

function momentum() {
  const m = T["we make momentum"];
  return `<section class="momentum nfh-ground-white" data-nfh-catch>
  <div class="nfh-wrap momentum__in">
    <h2 class="nfh-h nfh-h--xxl nfh-h--forest">${esc(m.headline)}</h2>
    <div class="momentum__copy">
      <p class="nfh-lead">${esc(m["first line"])}</p>
      <p class="nfh-copy momentum__note">${esc(m["second line"])}</p>
    </div>
  </div>
</section>`;
}

function hotlist2026() {
  const e = T["the 2026 hotlist"];
  // The words after "hotlist" take the accent color ("the 2026 hotlist <is almost here.>").
  const k = e.headline.toLowerCase().indexOf("hotlist ");
  const head = k < 0 ? esc(e.headline)
    : `${esc(e.headline.slice(0, k + 7))} <span class="edition__accent">${esc(e.headline.slice(k + 8))}</span>`;
  return `<section id="hotlist" class="edition edition--2026 nfh-ground-black nfh-dark">
  <div class="nfh-year edition__year" aria-hidden="true">2026</div>
  <div class="nfh-wrap edition__in">
    <div class="edition__title">
      <h2 class="nfh-h nfh-h--xl">${head}</h2>
    </div>
    <div class="edition__row">
      <p class="nfh-lead edition__lead">${esc(e["first line"])}</p>
      <p class="nfh-copy edition__note">${esc(e["second line"])}</p>
      <div class="nfh-btns">${btn("nfh-btn--white", "#subscribe", e.buttons[0])}${btn("nfh-btn--ghost", "#list2025", e.buttons[1])}</div>
    </div>
  </div>
</section>`;
}

const about = (a = T["about"]) => `<section id="about" class="split">
  <div class="split__panel nfh-ground-green nfh-ground-green--text nfh-dark">
    <h2 class="nfh-h nfh-h--m">${esc(a.headline)}</h2>
    <p class="split__big">${esc(a["first paragraph"])}</p>
    <p class="split__small">${esc(a["second paragraph"])}</p>
    <a class="split__link" href="/contributors/">${esc(a.link)}</a>
  </div>
  <div class="split__photo">${img("about-firehouse", { alt: "Filmmakers on stage at Nonfiction Hotlist Live at DCTV Firehouse", sizes: "(max-width: 1040px) 100vw, 50vw" })}</div>
</section>`;

function whatWeDo() {
  // Each card has its photo at the top. On hover (or keyboard focus) it fills green and its button shows;
  // on phones the button always shows. The whole card is the link.
  const card = (n, title, text, more, href, photo, alt) => `<div class="nfh-card nfh-card--photo">
        ${img(photo, { alt, sizes: "(max-width: 760px) 100vw, 300px" })}
        <div class="nfh-card__body">
          <span class="nfh-card__num">${n}</span>
          <h3 class="nfh-h nfh-h--card">${esc(title)}</h3>
          <p>${esc(text)}</p>
          <a class="nfh-btn nfh-btn--light nfh-btn--sm nfh-card__go" href="${esc(href)}">${esc(more)}${ARROW}</a>
        </div>
      </div>`;
  const w = T["what we do"];
  // Links and photos by position: the Doc's five parts fill these five boxes in order.
  const boxes = [
    ["/the-2026-hotlist/", "wwd-curate", "Filmmakers on stage at Nonfiction Hotlist Live"],
    ["/contributors/", "talent-pair", "Two filmmakers on stage at Nonfiction Hotlist Live"],
    ["#partner", "wwd-partners", "Filmmakers on stage at the Yahoo x Nonfiction Hotlist screening"],
    ["/yahoo/", "wwd-content", "Screens listing the Yahoo x Nonfiction Hotlist short films"],
    ["/news/", "wwd-community", "A full theater at a Nonfiction Hotlist screening"],
  ];
  return `<section class="wwd nfh-ground-white">
  <div class="nfh-wrap nfh-section wwd__in">
    <div class="nfh-head">
      <div class="nfh-head__title">
        <h2 class="nfh-h nfh-h--l">${esc(w.headline)}</h2>
      </div>
      <div class="wwd__formats">
        <p class="wwd__tagline">${esc(w.line)}</p>
        <ul class="nfh-chips" aria-label="Formats">${w.formats.map(f => `<li class="nfh-chip">${esc(f)}</li>`).join("")}</ul>
      </div>
    </div>
    <div class="nfh-cards">
      ${w.items.map((it, k) => card(String(k + 1).padStart(2, "0"), it.title, it.text, it.button, ...boxes[k])).join("\n      ")}
    </div>
  </div>
</section>`;
}

const values = (v = T["our values"]) => `<section class="values nfh-ground-photo nfh-dark">
  ${img("values-group", { cls: "nfh-ground-photo__media", alt: "", sizes: "100vw" })}
  <div class="nfh-wrap values__in">
    <div class="values__title">
      <h2 class="nfh-h nfh-h--values">${esc(v.headline)}</h2>
    </div>
    <ol class="values__list">
      ${v.values.map(([t, text], k) => `<li><span class="values__num">${String(k + 1).padStart(2, "0")}</span><span><strong>${esc(t)}</strong> ${esc(text)}</span></li>`).join("\n      ")}
    </ol>
  </div>
</section>`;

const QUOTE_MARK = `<svg data-quote-mark class="nfh-story__mark" aria-hidden="true" width="56" height="42" viewBox="0 0 96 72" fill="#5c965e"><path d="M0 72V44C0 18 14 3 38 0l4 10C28 14 21 23 20 36h20v36H0zm54 0V44C54 18 68 3 92 0l4 10C82 14 75 23 74 36h20v36H54z"/></svg>`;

function storytellers() {
  const t = JSON.parse(fs.readFileSync(path.join(C, "testimonials.json"), "utf8"));
  const items = t.items.map(q => ({
    by: q.by, title: q.title, feature: q.feature, short: q.short, alt: q.alt, fit: q.fit,
    photo: q.photo ? srcset(q.photo) : null, thumb: q.thumb ? srcset(q.thumb).small : null
  }));
  const n = items.length, i = t.start - 1;
  const byline = q => `${esc(q.by)}${q.title ? `, <em class="nfh-title">${esc(q.title)}</em>` : ""}`;
  const q = items[i];
  const photo = q.photo
    ? `<div class="nfh-story__photo${q.fit === "contain" ? " is-contain" : ""}"><img src="${q.photo.src}" srcset="${q.photo.srcset}" sizes="(max-width: 760px) 100vw, 460px" alt="${esc(q.alt || "")}" loading="lazy"></div>`
    : `<div class="nfh-story__photo is-empty" role="img" aria-label="${esc(q.title)}"><span class="nfh-title">${esc(q.title)}</span></div>`;
  const cards = [1, 2, 3].map(k => items[(i + k) % n]).map(c => `<figure class="nfh-story-card">${c.thumb ? `<img src="${c.thumb}" alt="" loading="lazy">` : `<span class="is-empty" aria-hidden="true"></span>`}<div><blockquote>“${esc(c.short)}”</blockquote><figcaption>${byline(c)}</figcaption></div></figure>`).join("");
  // "<" is escaped in the JSON so a quote can never close the script tag.
  const json = JSON.stringify({ items }).replace(/</g, "\\u003c");
  return `<section class="stories nfh-ground-forest nfh-dark" data-nfh-stories data-start="${i}" aria-labelledby="stories-label">
  <div class="nfh-wrap stories__in">
    <div class="stories__head">
      <h2 id="stories-label" class="nfh-label nfh-label--sage">hear from our storytellers</h2>
      <div class="stories__nav">
        <span class="nfh-label nfh-label--sage stories__count" data-count aria-live="polite">${i + 1} of ${n}</span>
        <button type="button" class="stories__btn stories__btn--prev" data-prev aria-label="Previous stories"><svg aria-hidden="true" width="22" height="11" viewBox="0 0 26 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M25 6.5c-7-1-15-.6-23-.4"/><path d="M7 1.5L2 6.1l5 4.4"/></svg></button>
        <button type="button" class="stories__btn stories__btn--next" data-next aria-label="Next stories"><svg aria-hidden="true" width="22" height="11" viewBox="0 0 26 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6.5c7-1 15-.6 23-.4"/><path d="M19 1.5l5 4.6-5 4.4"/></svg></button>
      </div>
    </div>
    <figure class="nfh-story" data-feature aria-live="polite">${photo}<div class="nfh-story__text">${QUOTE_MARK}<blockquote class="nfh-story__quote">${esc(q.feature)}</blockquote><figcaption class="nfh-story__by">${byline(q)}</figcaption></div></figure>
    <div class="stories__cards" data-cards>${cards}</div>
    <script type="application/json">${json}</script>
  </div>
</section>`;
}

function programs() {
  const item = (id, image, alt, pill, title, text, link, href, pos = "") => `<article class="program"${id ? ` id="${id}"` : ""}>
        <div class="nfh-frame program__photo"${pos ? ` style="--pos: ${pos}"` : ""}>${img(image, { alt, sizes: "(max-width: 760px) 100vw, 33vw" })}</div>
        <span class="nfh-pill">${esc(pill)}</span>
        <h3 class="nfh-h nfh-h--item">${esc(title)}</h3>
        <p class="nfh-copy">${esc(text)}</p>
        <a class="nfh-link" href="${esc(href)}">${esc(link)}</a>
      </article>`;
  const P = T["programs"];
  // Anchors, photos and links by position: the Doc's three parts fill these in order.
  const slots = [
    ["yahoo", "yahoo-stage", "Yahoo x Nonfiction Hotlist screening on stage", "/yahoo/", ""],
    ["", "retreat-campus", "Atlantic Center for the Arts campus on an ecological preserve", "mailto:info@nonfictionhotlist.com?subject=The%20retreat", "center 60%"],
    ["", "events-crowd", "A crowded Nonfiction Hotlist event", "/news/", ""],
  ];
  return `<section id="programs" class="programs nfh-ground-white">
  <div class="nfh-wrap nfh-section programs__in">
    <div class="nfh-head">
      <h2 class="nfh-h nfh-h--programs nfh-h--forest programs__title">${esc(P.headline)}</h2>
      <a id="partner" class="nfh-btn nfh-btn--forest" href="#subscribe">${esc(P.button)}</a>
    </div>
    <div class="programs__grid">
      ${P.items.map((it, k) => { const [id, image, alt, href, pos] = slots[k]; return item(id, image, alt, it.tag, it.title, it.text, it.link, href, pos); }).join("\n      ")}
    </div>
  </div>
</section>`;
}

// "+19 more projects": the number is set large, the words under it.
const moreTile = s => { const m = s.match(/^(\S+)\s+(.*)$/); return m ? `<span class="poster__count">${esc(m[1])}</span><span class="poster__more">${esc(m[2])}</span>` : `<span class="poster__more">${esc(s)}</span>`; };

function list2025() {
  const L = T["the 2025 list"];
  const poster = (name, title, alt) => `<a class="poster" href="${LIST_2025}">${img(name, { alt, sizes: "(max-width: 760px) 50vw, 260px" })}<span class="poster__title nfh-title">${esc(title)}</span></a>`;
  // Photos by position; the Doc names the four titles in the same order.
  const shots = [["poster-city-forest", "Poster for"], ["poster-earth-michael", "Still from"], ["poster-manhood", "Still from"], ["poster-heaven", "Poster for"]];
  return `<section id="list2025" class="edition edition--2025 nfh-ground-black nfh-dark">
  <div class="nfh-year nfh-year--2025 edition__year" aria-hidden="true">2025</div>
  <div class="nfh-wrap edition__in edition__in--2025">
    <div class="nfh-head">
      <div class="nfh-head__title">
        <h2 class="nfh-h nfh-h--l">${esc(L.headline)}</h2>
      </div>
      <div class="edition__aside">
        <p class="edition__aside-text">${esc(L.line)}</p>
        ${btn("nfh-btn--white", LIST_2025, L.button, true)}
      </div>
    </div>
    <div class="posters">
      ${L.posters.map((t, k) => poster(shots[k][0], t, `${shots[k][1]} ${t}`)).join("\n      ")}
      <a class="poster poster--more" href="${LIST_2025}"><span class="poster__tile">${moreTile(L["last tile"][0])}</span><span class="poster__title">${esc(L["last tile"][1])}</span></a>
    </div>
  </div>
</section>`;
}

function subscribe() {
  // Sends to the forms script as the newsletter form: saved in the private sign-ups Sheet and added to
  // the Brevo list. "I'm a" goes along as "role".
  const S = T["subscribe"], [fFirst, fLast, fEmail, fRole] = S["form fields"];
  const action = FORMS ? ` method="post" action="${esc(FORMS)}" data-nfh-form data-thanks="${esc(S["after signing up"])}"` : ` data-nfh-form-off onsubmit="return false"`;
  return `<section id="subscribe" class="split split--subscribe">
  <div class="split__panel nfh-ground-green nfh-ground-green--text nfh-dark">
    <h2 class="nfh-h nfh-h--m">${esc(S.headline)}</h2>
    <p class="split__big split__big--narrow">${esc(S.line)}</p>
  </div>
  <form class="nfh-form split__form" aria-label="Newsletter signup"${action}>
    <input type="hidden" name="_form" value="newsletter"><input type="hidden" name="_page" value=""><input type="hidden" name="_t" value="">
    <div class="nfh-form__trap" aria-hidden="true"><label>Leave this empty <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
    <div class="nfh-form__row">
      <div class="nfh-field"><label for="fn">${esc(fFirst)}</label><input class="nfh-input" id="fn" name="first" type="text" autocomplete="given-name"></div>
      <div class="nfh-field"><label for="ln">${esc(fLast)}</label><input class="nfh-input" id="ln" name="last" type="text" autocomplete="family-name"></div>
    </div>
    <div class="nfh-field"><label for="em">${esc(fEmail)}</label><input class="nfh-input" id="em" name="email" type="email" autocomplete="email" required></div>
    <div class="nfh-field"><label for="role">${esc(fRole)}</label><select class="nfh-input" id="role" name="role">
      ${S["i'm a choices"].map(c => `<option>${esc(c)}</option>`).join("\n      ")}
    </select></div>
    <button type="submit" class="nfh-btn nfh-btn--black nfh-btn--big">${esc(S.button)}</button>
    <p class="nfh-form__msg" role="status" aria-live="polite">${FORMS ? "" : "Form not connected yet."}</p>
  </form>
</section>`;
}

function homePage(site, { noindex = true, canonical } = {}) {
  T = words();
  const description = esc(T["hero"].line);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>nonfiction hotlist.</title>
<meta name="description" content="${description}">
${noindex ? '<meta name="robots" content="noindex">\n' : ""}<link rel="canonical" href="${esc(canonical || site.origin + "/")}">
<link rel="preload" href="/brand/v1/fonts/LeagueSpartan-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/brand/v1/fonts/RobotoSerif-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/brand/v1/nfh.css">
<link rel="icon" href="/brand/v1/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/brand/v1/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/brand/v1/apple-touch-icon.png">
<link rel="stylesheet" href="/home.css">
<meta property="og:title" content="nonfiction hotlist.">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${esc(site.origin)}/img/hero-still-1512.jpg">
<script src="/brand/v1/nfh.js" defer></script>
${analyticsHTML}
</head>
<body>
<a class="nfh-skip" href="#main">Skip to content</a>
${barHTML(site, { origin: "" })}
<main id="main">
${[hero(), momentum(), hotlist2026(), about(), whatWeDo(), values(), storytellers(), programs(), list2025(), subscribe()].join("\n\n")}
</main>
${footerHTML(site, { origin: "" })}
</body>
</html>
`;
}

module.exports = { homePage };
