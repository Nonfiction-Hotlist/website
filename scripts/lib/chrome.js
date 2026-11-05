// The top bar (with its menu) and the footer shared by every Nonfiction Hotlist page: this website,
// the list sites and the dashboards. Built from content/site.json (the Site sheet's Menu and Footer
// tabs). Links are full addresses on the website's current address (address.js PUBLIC), so the same
// markup works on list.nonfictionhotlist.com. Styles and behavior come from the brand kit
// (/brand/v1/nfh.css and nfh.js); `brand` is where that kit is served on the page's own site.
const { PUBLIC } = require("./address");

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// origin: "" keeps links relative (pages on the website itself); the list sites use the default.
const absWith = origin => href => /^(https?:|mailto:|#)/.test(href) ? href : origin + (href.startsWith("/") ? href : "/" + href);
const abs = absWith(PUBLIC);
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const ARROW = `<svg aria-hidden="true" viewBox="0 0 26 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6.5c7-1 15-.6 23-.4"/><path d="M19 1.5l5 4.6-5 4.4"/></svg>`;
const CHEVRON = `<span class="chev"><svg aria-hidden="true" width="18" height="12" viewBox="0 0 18 12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3l7 7 7-7"/></svg></span>`;
const BURGER = `<svg class="when-closed" aria-hidden="true" viewBox="0 0 24 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M1 2h22"/><path d="M1 8h22"/><path d="M1 14h22"/></svg>`;
const CLOSE = `<svg class="when-open" aria-hidden="true" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M2 2l14 14"/><path d="M16 2L2 16"/></svg>`;

// openGroup: the submenu shown open when the menu opens (the canvas opens on "the hotlist").
function barHTML(site, { brand = "/brand/v1", openGroup = "the hotlist", origin = PUBLIC } = {}) {
  const abs = absWith(origin), home = (origin || "") + "/";
  const groups = site.nav.map(item => {
    if (!item.children) return `<div class="nfh-menu__group"><a class="nfh-menu__top" href="${esc(abs(item.href))}"><span>${esc(item.label)}</span>${ARROW.replace("<svg", '<svg width="22" height="11"')}</a></div>`;
    const id = "nfh-sub-" + slug(item.label), open = item.label.toLowerCase() === openGroup;
    return `<div class="nfh-menu__group"><button type="button" class="nfh-menu__top" data-nfh-sub aria-expanded="${open}" aria-controls="${id}"><span>${esc(item.label)}</span>${CHEVRON}</button>
      <div class="nfh-menu__sub" id="${id}"${open ? "" : " hidden"}>${item.children.map(c => `<a href="${esc(abs(c.href))}">${esc(c.label)}</a>`).join("")}</div></div>`;
  }).join("\n    ");
  const cta = site.navButton ? `<a class="nfh-btn nfh-btn--ghost nfh-btn--ink nfh-btn--nav nfh-bar__hide-sm" href="${esc(abs(site.navButton.href))}">${esc(site.navButton.label)}</a>` : "";
  return `<header class="nfh-bar">
  <nav class="nfh-bar__in" aria-label="Main">
    <a class="nfh-bar__logo" href="${esc(home)}" aria-label="nonfiction hotlist. home"><img src="${brand}/logos/wordmark-black.svg" alt="nonfiction hotlist." width="223" height="22"></a>
    <div class="nfh-bar__actions">
      ${cta}
      <button type="button" class="nfh-btn nfh-btn--nav nfh-menu-btn" data-nfh-menu-button aria-expanded="false" aria-controls="nfh-menu" aria-label="Open menu"><span class="when-closed nfh-bar__hide-sm">menu</span><span class="when-open nfh-bar__hide-sm">close</span>${BURGER}${CLOSE}</button>
    </div>
    <div class="nfh-menu" id="nfh-menu" hidden>
    ${groups}
    </div>
  </nav>
</header>`;
}

function footerHTML(site, { brand = "/brand/v1", origin = PUBLIC } = {}) {
  const abs = absWith(origin), home = (origin || "") + "/";
  const cols = (site.footer && site.footer.columns) || [];
  const links = cols.flatMap(c => c.links || []);
  const find = re => links.find(l => re.test(l.label));
  const social = links.filter(l => /instagram|linkedin|facebook|youtube|vimeo|tiktok|bluesky|threads/i.test(l.label + l.href));
  const terms = find(/terms/i), privacy = find(/privacy/i);
  const email = site.email;
  const main = [["the hotlist", "/the-2026-hotlist/"], ["yahoo x nfh", "/yahoo/"], ["about", "/#about"], ["news", "/news/"], ["subscribe", "/#subscribe"]];
  return `<footer class="nfh-footer nfh-dark">
  <div class="nfh-footer__in">
    <div class="nfh-footer__top">
      <a class="nfh-footer__logo" href="${esc(home)}" aria-label="nonfiction hotlist. home"><img src="${brand}/logos/wordmark-white.svg" alt="nonfiction hotlist." width="264" height="26"></a>
      <ul class="nfh-footer__links" aria-label="Footer">${main.map(([l, h]) => `<li><a href="${esc(abs(h))}">${esc(l)}</a></li>`).join("")}</ul>
    </div>
    <div class="nfh-footer__bottom">
      <span>${[email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : "", ...social.map(l => `<a href="${esc(l.href)}">${esc(l.label)}</a>`)].filter(Boolean).join(" &#160;·&#160; ")}</span>
      <span>© ${new Date().getFullYear()} Nonfiction Hotlist${terms ? ` &#160;·&#160; <a href="${esc(abs(terms.href))}">Terms of use</a>` : ""}${privacy ? ` &#160;·&#160; <a href="${esc(abs(privacy.href))}">Privacy policy</a>` : ""}</span>
    </div>
  </div>
</footer>`;
}

module.exports = { barHTML, footerHTML, ARROW, esc, abs };
