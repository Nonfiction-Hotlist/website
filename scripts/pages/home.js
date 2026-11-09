// The homepage, built to match the design canvas (NFH Homepage Mockup, project/Main.dc.html) section
// by section. Shared pieces (bar, menu, footer, buttons, cards, grounds) come from the brand kit; the
// arrangement of this page is in src/home.css. Copy is the canvas's, as approved in the build brief.
const fs = require("fs");
const path = require("path");
const { barHTML, footerHTML, ARROW, esc } = require("../lib/chrome");
const { img, srcset } = require("../lib/img");
const { FORMS } = require("../lib/address");
const { analyticsHTML } = require("../lib/analytics");

const C = path.join(__dirname, "../../content");
const LIST_2025 = "https://list.nonfictionhotlist.com/2025/";

const btn = (cls, href, label, arrow = false) => `<a class="nfh-btn ${cls}" href="${esc(href)}">${esc(label)}${arrow ? ARROW : ""}</a>`;

function hero() {
  return `<section id="top" class="hero nfh-ground-photo nfh-dark" aria-label="Introduction">
  <video class="nfh-ground-photo__media" data-nfh-bg autoplay muted loop playsinline preload="metadata" poster="/img/hero-still-1512.jpg" aria-hidden="true">
    <source src="/video/nonfiction-hotlist-720.mp4" type="video/mp4" media="(max-width: 900px)">
    <source src="/video/nonfiction-hotlist-1080.mp4" type="video/mp4">
  </video>
  <div class="hero__frame">
    <a href="#hotlist" class="nfh-badge" aria-label="The 2026 hotlist, coming soon">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <defs><path id="ringpath" d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0"/></defs>
        <circle cx="100" cy="100" r="100" fill="#fcb100"/>
        <g class="ring"><text style="font: 700 15.5px 'League Spartan', sans-serif; letter-spacing: 1.2px; fill: #1a2821;"><textPath href="#ringpath" textLength="472" lengthAdjust="spacing">the 2026 hotlist • the 2026 hotlist • the 2026 hotlist •</textPath></text></g>
        <text x="100" y="97" style="font: 700 32px 'League Spartan', sans-serif; letter-spacing: -0.5px; fill: #1a2821; text-anchor: middle;">coming</text>
        <text x="100" y="128" style="font: 700 32px 'League Spartan', sans-serif; letter-spacing: -0.5px; fill: #1a2821; text-anchor: middle;">soon</text>
      </svg>
    </a>
    <h1 class="nfh-h nfh-h--hero">nonfiction<br>hotlist.</h1>
    <div class="hero__row">
      <p class="hero__line">The Nonfiction Hotlist is a discovery platform for exceptional nonfiction storytelling.</p>
      <div class="nfh-btns">${btn("nfh-btn--light", "#hotlist", "see the hotlist", true)}${btn("nfh-btn--ghost", "#partner", "partner with us")}</div>
    </div>
  </div>
</section>`;
}

const momentum = () => `<section class="momentum nfh-ground-white" data-nfh-catch>
  <div class="nfh-wrap momentum__in">
    <h2 class="nfh-h nfh-h--xxl nfh-h--forest">we make momentum.</h2>
    <div class="momentum__copy">
      <p class="nfh-lead">Over the last two years, 2,377 projects have come through our open calls.</p>
      <p class="nfh-copy momentum__note">Getting selected is just the start. Then come the screenings, the press and a community that helps get a project to its next stage.</p>
    </div>
  </div>
</section>`;

const hotlist2026 = () => `<section id="hotlist" class="edition edition--2026 nfh-ground-black nfh-dark">
  <div class="nfh-year edition__year" aria-hidden="true">2026</div>
  <div class="nfh-wrap edition__in">
    <div class="edition__title">
      <h2 class="nfh-h nfh-h--xl">the 2026 hotlist <span class="edition__accent">is almost here.</span></h2>
    </div>
    <div class="edition__row">
      <p class="nfh-lead edition__lead">Our second list of works in progress, chosen from this year's open call.</p>
      <p class="nfh-copy edition__note">Every project on it gets a showcase page, a feature in our newsletter and introductions to the people who can help it most.</p>
      <div class="nfh-btns">${btn("nfh-btn--white", "#subscribe", "get notified")}${btn("nfh-btn--ghost", "#list2025", "see the 2025 list")}</div>
    </div>
  </div>
</section>`;

const about = () => `<section id="about" class="split">
  <div class="split__panel nfh-ground-green nfh-ground-green--text nfh-dark">
    <h2 class="nfh-h nfh-h--m">about</h2>
    <p class="split__big">The Hotlist is run by people who make nonfiction: producers, directors and programmers whose work has run on Netflix, PBS, Hulu and ESPN Films.</p>
    <p class="split__small">We back makers at every career stage, and we work alongside longstanding industry organizations pushing for change.</p>
    <a class="split__link" href="/contributors/">meet our contributors</a>
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
          <h3 class="nfh-h nfh-h--card">${title}</h3>
          <p>${text}</p>
          <a class="nfh-btn nfh-btn--light nfh-btn--sm nfh-card__go" href="${esc(href)}">${esc(more)}${ARROW}</a>
        </div>
      </div>`;
  return `<section class="wwd nfh-ground-white">
  <div class="nfh-wrap nfh-section wwd__in">
    <div class="nfh-head">
      <div class="nfh-head__title">
        <h2 class="nfh-h nfh-h--l">what we do</h2>
      </div>
      <div class="wwd__formats">
        <p class="wwd__tagline">produced or unproduced, at any stage, in any format.</p>
        <ul class="nfh-chips" aria-label="Formats"><li class="nfh-chip">features</li><li class="nfh-chip">shorts</li><li class="nfh-chip">series</li><li class="nfh-chip">podcasts</li><li class="nfh-chip">reality</li></ul>
      </div>
    </div>
    <div class="nfh-cards">
      ${card("01", "curate projects", "Working industry reviewers read every submission. More than 4,800 reviews so far.", "how curation works", "/the-2026-hotlist/", "wwd-curate", "Filmmakers on stage at Nonfiction Hotlist Live")}
      ${card("02", "discover talent", "Point brands and studios to rising voices and veteran makers worth knowing.", "meet the talent", "/contributors/", "talent-pair", "Two filmmakers on stage at Nonfiction Hotlist Live")}
      ${card("03", "build partnerships", "Bring funders, brands and industry organizations to the table for the work.", "partner with us", "#partner", "wwd-partners", "Filmmakers on stage at the Yahoo x Nonfiction Hotlist screening")}
      ${card("04", "connect content", "Match finished films with distribution, like our 20-film run with Yahoo.", "see the yahoo films", "/yahoo/", "wwd-content", "Screens listing the Yahoo x Nonfiction Hotlist short films")}
      ${card("05", "engage communities", "Fill rooms and inboxes, with live events and a newsletter read by 6,000+ people.", "upcoming events", "/news/", "wwd-community", "A full theater at a Nonfiction Hotlist screening")}
    </div>
  </div>
</section>`;
}

const values = () => `<section class="values nfh-ground-photo nfh-dark">
  ${img("values-group", { cls: "nfh-ground-photo__media", alt: "", sizes: "100vw" })}
  <div class="nfh-wrap values__in">
    <div class="values__title">
      <h2 class="nfh-h nfh-h--values">everyone is invited.</h2>
    </div>
    <ol class="values__list">
      <li><span class="values__num">01</span><span><strong>generosity.</strong> We lead with respect and take the time to build real relationships.</span></li>
      <li><span class="values__num">02</span><span><strong>convene, don't gatekeep.</strong> Makers, funders and viewers meet the work and each other directly.</span></li>
      <li><span class="values__num">03</span><span><strong>build with a village.</strong> The best work is made by more people than any one team.</span></li>
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
        <span class="nfh-pill">${pill}</span>
        <h3 class="nfh-h nfh-h--item">${title}</h3>
        <p class="nfh-copy">${text}</p>
        <a class="nfh-link" href="${esc(href)}">${link}</a>
      </article>`;
  return `<section id="programs" class="programs nfh-ground-white">
  <div class="nfh-wrap nfh-section programs__in">
    <div class="nfh-head">
      <h2 class="nfh-h nfh-h--programs nfh-h--forest programs__title">here's what we're building right now.</h2>
      <a id="partner" class="nfh-btn nfh-btn--forest" href="#subscribe">we're inviting you in</a>
    </div>
    <div class="programs__grid">
      ${item("yahoo", "yahoo-stage", "Yahoo x Nonfiction Hotlist screening on stage", "2026 partnership", "yahoo x nonfiction hotlist", "Yahoo Media Group asked us to find documentary shorts for global distribution. We ran an international call, read nearly 1,000 films and picked 20.", "watch the films", "/yahoo/")}
      ${item("", "retreat-campus", "Atlantic Center for the Arts campus on an ecological preserve", "feb 7 to 27, 2027", "the retreat", "Three weeks with the Atlantic Center for the Arts on an ecological preserve in New Smyrna Beach, Florida: time, mentorship and housing, away from the noise.", "about the retreat", "mailto:info@nonfictionhotlist.com?subject=The%20retreat", "center 60%")}
      ${item("", "events-crowd", "A crowded Nonfiction Hotlist event", "docnyc, sundance, hiff", "events", "DOCNYC at DCTV, Solidarity House at Sundance, and HIFF with Switchboard. Come say hello.", "upcoming events", "/news/")}
    </div>
  </div>
</section>`;
}

function list2025() {
  const poster = (name, title, alt) => `<a class="poster" href="${LIST_2025}">${img(name, { alt, sizes: "(max-width: 760px) 50vw, 260px" })}<span class="poster__title nfh-title">${title}</span></a>`;
  return `<section id="list2025" class="edition edition--2025 nfh-ground-black nfh-dark">
  <div class="nfh-year nfh-year--2025 edition__year" aria-hidden="true">2025</div>
  <div class="nfh-wrap edition__in edition__in--2025">
    <div class="nfh-head">
      <div class="nfh-head__title">
        <h2 class="nfh-h nfh-h--l">the 2025 list</h2>
      </div>
      <div class="edition__aside">
        <p class="edition__aside-text">23 projects in our first year. See where they are now.</p>
        ${btn("nfh-btn--white", LIST_2025, "read the list", true)}
      </div>
    </div>
    <div class="posters">
      ${poster("poster-city-forest", "A City in the Forest", "Poster for A City in the Forest")}
      ${poster("poster-earth-michael", "Earth to Michael", "Still from Earth to Michael")}
      ${poster("poster-manhood", "Manhood", "Still from Manhood")}
      ${poster("poster-heaven", "When We All Get to Heaven", "Poster for When We All Get to Heaven")}
      <a class="poster poster--more" href="${LIST_2025}"><span class="poster__tile"><span class="poster__count">+19</span><span class="poster__more">more projects</span></span><span class="poster__title">See all 23</span></a>
    </div>
  </div>
</section>`;
}

function subscribe() {
  // Sends to the forms script as the newsletter form: saved in the private sign-ups Sheet and added to
  // the Brevo list. "I'm a" goes along as "role".
  const action = FORMS ? ` method="post" action="${esc(FORMS)}" data-nfh-form data-thanks="You're on the list. Thank you."` : ` data-nfh-form-off onsubmit="return false"`;
  return `<section id="subscribe" class="split split--subscribe">
  <div class="split__panel nfh-ground-green nfh-ground-green--text nfh-dark">
    <h2 class="nfh-h nfh-h--m">subscribe</h2>
    <p class="split__big split__big--narrow">See the list before anyone else, hear about open calls early and get on the guest list.</p>
  </div>
  <form class="nfh-form split__form" aria-label="Newsletter signup"${action}>
    <input type="hidden" name="_form" value="newsletter"><input type="hidden" name="_page" value=""><input type="hidden" name="_t" value="">
    <div class="nfh-form__trap" aria-hidden="true"><label>Leave this empty <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
    <div class="nfh-form__row">
      <div class="nfh-field"><label for="fn">First name</label><input class="nfh-input" id="fn" name="first" type="text" autocomplete="given-name"></div>
      <div class="nfh-field"><label for="ln">Last name</label><input class="nfh-input" id="ln" name="last" type="text" autocomplete="family-name"></div>
    </div>
    <div class="nfh-field"><label for="em">Email</label><input class="nfh-input" id="em" name="email" type="email" autocomplete="email" required></div>
    <div class="nfh-field"><label for="role">I'm a</label><select class="nfh-input" id="role" name="role">
      <option>Filmmaker or creator</option>
      <option>Industry, buyer or programmer</option>
      <option>Brand or funder</option>
      <option>Fan of nonfiction</option>
    </select></div>
    <button type="submit" class="nfh-btn nfh-btn--black nfh-btn--big">sign me up</button>
    <p class="nfh-form__msg" role="status" aria-live="polite">${FORMS ? "" : "Form not connected yet."}</p>
  </form>
</section>`;
}

function homePage(site, { noindex = true, canonical } = {}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>nonfiction hotlist.</title>
<meta name="description" content="The Nonfiction Hotlist is a discovery platform for exceptional nonfiction storytelling.">
${noindex ? '<meta name="robots" content="noindex">\n' : ""}<link rel="canonical" href="${esc(canonical || site.origin + "/")}">
<link rel="preload" href="/brand/v1/fonts/LeagueSpartan-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/brand/v1/fonts/RobotoSerif-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/brand/v1/nfh.css">
<link rel="icon" href="/brand/v1/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/brand/v1/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/brand/v1/apple-touch-icon.png">
<link rel="stylesheet" href="/home.css">
<meta property="og:title" content="nonfiction hotlist.">
<meta property="og:description" content="The Nonfiction Hotlist is a discovery platform for exceptional nonfiction storytelling.">
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
