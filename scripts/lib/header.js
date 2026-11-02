// The top bar shared by the website and the Hotlist list pages: one implementation, built here from the
// Site sheet's Menu tab (content/site.json) and published at /shared/header.html. The list site copies it
// in when it builds, so editing the Menu tab changes the bar everywhere.
//
// Links are full addresses (PUBLIC + path), so the bar works on list.nonfictionhotlist.com too. Styles are
// scoped to .nfh-bar so they can't touch the page they're dropped into. On phones the menu folds behind
// a Menu button. The item for the page you're on is marked (aria-current).
const PUBLIC = require("./address").PUBLIC;

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const abs = href => /^(https?:|mailto:)/.test(href) ? href : PUBLIC + (href.startsWith("/") ? href : "/" + href);

function headerHTML(site) {
  const items = site.nav.map(i => i.children
    ? `<li class="has-sub"><button type="button" class="sub-toggle" aria-expanded="false">${esc(i.label)}</button><ul>${i.children.map(c => `<li><a href="${esc(abs(c.href))}">${esc(c.label)}</a></li>`).join("")}</ul></li>`
    : `<li><a href="${esc(abs(i.href))}">${esc(i.label)}</a></li>`).join("");
  const button = site.navButton ? `<a class="nfh-cta" href="${esc(abs(site.navButton.href))}">${esc(site.navButton.label)}</a>` : "";
  return `<!-- nfh-bar: built by the website repo (scripts/lib/header.js) from the Site sheet's Menu tab. -->
<style>
.nfh-bar { --nb-deep: #22382c; --nb-sage: #9aab8c; --nb-soft: #c6d0bb; --nb-cream: #ebe6d7; --nb-ink: #1d2b23; --nb-line: rgba(255,255,255,.18);
  background: var(--nb-deep); color: #fff; border-bottom: 1px solid var(--nb-line); position: relative; z-index: 20;
  padding: 0 max(20px, env(safe-area-inset-left, 0px));
  font-family: "League Spartan", "Futura", "Avenir Next", "Helvetica Neue", Arial, sans-serif; font-size: 16px; line-height: 1.2; }
.nfh-bar * { box-sizing: border-box; }
.nfh-bar a { color: inherit; text-decoration: none; }
.nfh-bar a:hover, .nfh-bar .sub-toggle:hover { color: var(--nb-soft); }
.nfh-bar .nb-in { max-width: 1180px; margin: 0 auto; padding: 14px 0; display: flex; align-items: center; gap: 12px 28px; }
.nfh-bar .nb-mark { font-weight: 700; font-size: 1.25rem; letter-spacing: -0.01em; margin-right: auto; white-space: nowrap; }
.nfh-bar nav { display: flex; align-items: center; gap: 22px; }
.nfh-bar ul { list-style: none; margin: 0; padding: 0; }
.nfh-bar nav > ul { display: flex; align-items: center; gap: 22px; }
.nfh-bar li { position: relative; }
.nfh-bar nav > ul > li > a, .nfh-bar .sub-toggle { font: inherit; font-weight: 600; color: inherit; background: none; border: 0; padding: 4px 0; cursor: pointer; }
.nfh-bar .sub-toggle::after { content: " \\25BE"; font-size: .8em; color: rgba(255,255,255,.7); }
.nfh-bar .has-sub > ul { display: none; position: absolute; top: calc(100% + 10px); left: -14px; min-width: 200px; padding: 8px 14px;
  background: var(--nb-deep); border: 1px solid var(--nb-line); border-radius: 8px; }
.nfh-bar .has-sub.open > ul { display: block; }
.nfh-bar .has-sub > ul a { display: block; padding: 6px 0; font-weight: 500; }
.nfh-bar [aria-current="page"] { color: var(--nb-sage); }
.nfh-bar .nfh-cta { background: var(--nb-cream); color: var(--nb-ink); border-radius: 999px; padding: 9px 18px; font-weight: 600; white-space: nowrap; }
.nfh-bar .nfh-cta:hover { background: var(--nb-soft); color: var(--nb-ink); }
.nfh-bar .nb-menu { display: none; font: inherit; font-weight: 600; color: #fff; background: none; border: 1px solid var(--nb-line); border-radius: 999px; padding: 7px 14px; cursor: pointer; }
@media (max-width: 760px) {
  .nfh-bar .nb-in { flex-wrap: wrap; padding-block: 12px; }
  .nfh-bar .nb-menu { display: inline-block; }
  .nfh-bar nav { display: none; width: 100%; flex-direction: column; align-items: flex-start; gap: 14px; padding: 8px 0 6px; }
  .nfh-bar.open nav { display: flex; }
  .nfh-bar nav > ul { flex-direction: column; align-items: flex-start; gap: 12px; }
  .nfh-bar .has-sub > ul { display: block; position: static; border: 0; background: none; padding: 6px 0 0 14px; min-width: 0; }
  .nfh-bar .sub-toggle { cursor: default; }
  .nfh-bar .sub-toggle::after { content: ""; }
}
</style>
<header class="nfh-bar">
  <div class="nb-in">
    <a class="nb-mark" href="${esc(PUBLIC)}/">${esc(site.name)}</a>
    <button type="button" class="nb-menu" aria-expanded="false" aria-controls="nfh-nav">Menu</button>
    <nav id="nfh-nav" aria-label="Main"><ul>${items}</ul>${button}</nav>
  </div>
</header>
<script>
(function () {
  var bar = document.currentScript.previousElementSibling, here = location.href.split("#")[0];
  bar.querySelectorAll("a[href]").forEach(function (a) {
    var h = a.href.split("#")[0];
    if (a.getAttribute("href").indexOf("#") < 0 && h.length > 1 && (here === h || (h.slice(-1) === "/" && h !== ${JSON.stringify(PUBLIC + "/")} && here.indexOf(h) === 0))) a.setAttribute("aria-current", "page");
  });
  var menu = bar.querySelector(".nb-menu");
  menu.addEventListener("click", function () { var o = bar.classList.toggle("open"); menu.setAttribute("aria-expanded", o); });
  bar.querySelectorAll(".sub-toggle").forEach(function (b) {
    b.addEventListener("click", function (e) {
      var li = b.parentNode, o = !li.classList.contains("open");
      bar.querySelectorAll(".has-sub.open").forEach(function (x) { x.classList.remove("open"); x.firstChild.setAttribute("aria-expanded", "false"); });
      if (o) { li.classList.add("open"); b.setAttribute("aria-expanded", "true"); }
      e.stopPropagation();
    });
  });
  document.addEventListener("click", function () { bar.querySelectorAll(".has-sub.open").forEach(function (x) { x.classList.remove("open"); x.firstChild.setAttribute("aria-expanded", "false"); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") document.dispatchEvent(new Event("click")); });
})();
</script>
`;
}

module.exports = { headerHTML, PUBLIC };
