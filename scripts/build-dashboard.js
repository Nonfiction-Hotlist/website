// Writes site/dashboard/index.html: the website's team dashboard. Unlisted (nothing links to it, search
// engines are told to skip it). One-click links to every page's and post's Google Doc, the Site sheet's
// tabs and the kit's folders; when each page last changed; edits the sync skipped; recent changes.
// Run: npm run build (after scripts/build.js)
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { read } = require("./kit/site-files");

const ROOT = path.resolve(__dirname, "..");
const C = path.join(ROOT, "content");
const site = JSON.parse(fs.readFileSync(path.join(C, "site.json"), "utf8"));
const drive = fs.existsSync(path.join(C, "drive.json")) ? JSON.parse(fs.readFileSync(path.join(C, "drive.json"), "utf8")) : {};
const problems = fs.existsSync(path.join(C, "sync-problems.txt")) ? fs.readFileSync(path.join(C, "sync-problems.txt"), "utf8").split("\n").filter(Boolean) : [];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const git = (...a) => { try { return execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim(); } catch (e) { return ""; } };
const changedAt = f => git("log", "-1", "--format=%cI", "--", f);
const ago = iso => {
  if (!iso) return "–";
  const d = (Date.now() - new Date(iso)) / 864e5;
  return d < 1 / 24 ? "just now" : d < 1 ? `${Math.round(d * 24)} h ago` : d < 1.5 ? "1 day ago" : d < 60 ? `${Math.round(d)} days ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const doc = id => id ? `https://docs.google.com/document/d/${id}/edit` : "";
const folder = id => id ? `https://drive.google.com/drive/folders/${id}` : "";
const sheet = gid => drive.site ? `https://docs.google.com/spreadsheets/d/${drive.site.sheet}/edit#gid=${gid ?? 0}` : "";
const PREVIEW = require("./lib/address").PUBLIC;

const pages = read("pages").map(p => ({ ...p, docId: (drive.pages || {})[p.file], changed: changedAt(`content/pages/${p.file}.md`) }))
  .sort((a, b) => a.meta.path.localeCompare(b.meta.path));
const news = read("news").map(n => ({ ...n, docId: (drive.news || {})[n.file], changed: changedAt(`content/news/${n.file}.md`) }))
  .sort((a, b) => b.meta.date.localeCompare(a.meta.date));
const log = git("log", "-15", "--format=%cI\t%s", "--", "content").split("\n").filter(Boolean).map(l => { const [d, s] = l.split("\t"); return { d, s }; });
const lastDrive = (log.find(l => l.s.startsWith("Update from Google Drive")) || {}).d;
const videos = fs.existsSync(path.join(C, "video")) ? fs.readdirSync(path.join(C, "video")).filter(f => f.endsWith("-1080.mp4")).length : 0;
const pageProblems = title => problems.filter(p => p.includes(`"${title}"`));

const link = (href, label, cls = "") => href ? `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${label}</a>` : `<span class="none">–</span>`;
const quick = [
  ["Pages tab", sheet(drive.site && drive.site.tabs.Pages)], ["News tab", sheet(drive.site && drive.site.tabs.News)],
  ["Menu", sheet(drive.site && drive.site.tabs.Menu)], ["Footer", sheet(drive.site && drive.site.tabs.Footer)],
  ["Settings", sheet(drive.site && drive.site.tabs.Settings)], ["Pages folder", folder((drive.folders || {}).pages)],
  ["News folder", folder((drive.folders || {}).news)], ["Media folder", folder((drive.folders || {}).media)], ["Editors' guide", doc(drive.guide)]
].filter(([, u]) => u);

// One card per page or post: its preview (opens the live page), title, address, when it changed, and Edit.
const preview = (dir, file) => fs.existsSync(path.join(ROOT, "site", "dashboard", "previews", `${dir}-${file}.jpg`)) ? `previews/${dir}-${file}.jpg` : "";
const card = (dir, p, extra) => {
  const issues = pageProblems(p.meta.title), img = preview(dir, p.file), live = PREVIEW + p.meta.path;
  return `<li class="card${issues.length ? " warn" : ""}">
    <a class="shot" href="${esc(live)}" target="_blank" rel="noopener" aria-label="Open ${esc(p.meta.title)}">${img ? `<img src="${img}" alt="" loading="lazy">` : `<span>${esc(p.meta.title)}</span>`}</a>
    <div class="body">
      <h3>${esc(p.meta.title)}</h3>
      <a class="addr" href="${esc(live)}" target="_blank" rel="noopener"><code>${esc(p.meta.path)}</code></a>
      <div class="meta">${extra}<span>Changed ${ago(p.changed)}</span></div>
      ${issues.map(i => `<div class="issue">${esc(i.replace(/^[^:]+:\s*/, ""))}</div>`).join("")}
      <div class="acts">${link(doc(p.docId), "Edit", "pill solid")}<a class="pill" href="${esc(live)}" target="_blank" rel="noopener">View</a></div>
    </div>
  </li>`;
};

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="referrer" content="no-referrer">
<title>Website · Team dashboard · Nonfiction Hotlist</title>
<link rel="stylesheet" href="/brand/v1/nfh.css">
<link rel="icon" href="/brand/v1/favicon.svg" type="image/svg+xml">
<style>
  /* The site's look (brand kit): white ground, a green title band, stat tiles with a tracked label and a
     League Spartan number, 14px corners, tables with lowercase column labels and hairlines between rows. */
  :root { --line: var(--rule); --muted: #4d5a50; --warn: #8a5a00; --warn-line: #fcb100; }
  body { font: 15px/1.5 var(--font-body); }
  .wrap { max-width: var(--max); margin: 0 auto; padding: 0 var(--gutter); }
  header { background: var(--gradient-green-text); color: var(--white); }
  header .wrap { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; padding-block: clamp(32px, 4vw, 56px) 28px; flex-wrap: wrap; }
  .mark { font: 700 clamp(36px, 4.4vw, 64px)/.92 var(--font-display); letter-spacing: -0.03em; text-transform: lowercase; }
  .mark small { display: block; font: 700 14px/18px var(--font-display); letter-spacing: .12em; text-transform: lowercase; color: var(--mint); margin-top: 12px; }
  .hlinks { display: flex; gap: 10px; flex-wrap: wrap; }
  .pill { display: inline-flex; align-items: center; min-height: 40px; padding: 0 16px; border-radius: var(--radius-sm); border: 2px solid var(--forest); color: var(--forest); background: transparent;
    font: 700 15px/1 var(--font-display); text-transform: lowercase; text-decoration: none; white-space: nowrap; }
  .pill:hover { background: var(--forest); color: var(--white); }
  .pill.solid { background: var(--forest); color: var(--white); }
  .pill.solid:hover { background: var(--pine-deep); border-color: var(--pine-deep); }
  header .pill { color: var(--white); border-color: var(--white); }
  header .pill:hover { background: var(--white); color: var(--forest); }
  header .pill.solid { background: var(--white); color: var(--forest); border-color: var(--white); }
  .tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 32px 0 24px; }
  .tile { background: var(--white); border: 1px solid var(--rule); border-radius: var(--radius-md); padding: 18px 20px; }
  .tile.hero { background: var(--gradient-green-text); border-color: transparent; color: var(--white); }
  .tile .k { font: 700 14px/18px var(--font-display); letter-spacing: .12em; text-transform: lowercase; color: var(--forest); }
  .tile.hero .k, .tile.hero .s { color: var(--mint); }
  .tile .v { font: 700 44px/1 var(--font-display); letter-spacing: -0.02em; margin-top: 10px; }
  .tile .v.small { font-size: 22px; line-height: 1.15; letter-spacing: -0.01em; }
  .tile .s { color: var(--muted); font-size: 13px; line-height: 19px; margin-top: 6px; }
  .tile.warn { border: 2px solid var(--warn-line); }
  .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--green); margin-right: 8px; vertical-align: 2px; }
  .dot.warn { background: var(--warn-line); }
  .quick { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 32px; }
  .lbl { font: 700 14px/18px var(--font-display); letter-spacing: .12em; text-transform: lowercase; color: var(--forest); margin-right: 6px; }
  .chip { display: inline-flex; align-items: center; min-height: 36px; padding: 0 16px; border-radius: var(--radius-pill); border: 1.5px solid var(--forest); color: var(--forest);
    font: 700 15px/1 var(--font-display); text-transform: lowercase; text-decoration: none; }
  .chip:hover { background: var(--forest); color: var(--white); }
  h2 { font: 700 clamp(30px, 3vw, 44px)/.95 var(--font-display); letter-spacing: -0.02em; text-transform: lowercase; color: var(--forest); margin: 48px 0 16px; }
  h2 small { font: 400 15px var(--font-body); letter-spacing: 0; text-transform: none; color: var(--muted); margin-left: 10px; }
  .table { overflow-x: auto; background: var(--white); }
  table { width: 100%; border-collapse: collapse; min-width: 640px; }
  th { text-align: left; font: 700 14px/18px var(--font-display); letter-spacing: .06em; text-transform: lowercase; color: var(--forest); padding: 10px 14px; border-bottom: 1px solid var(--rule); }
  td { padding: 12px 14px; border-bottom: 1px solid var(--rule); vertical-align: top; }
  tr:last-child td { border-bottom: 0; }
  tr.warn td { box-shadow: inset 3px 0 0 var(--warn-line); }
  code { font-size: 13px; }
  .when { color: var(--muted); white-space: nowrap; }
  .act { text-align: right; }
  .none { color: var(--muted); }
  .issue { color: var(--warn); font-size: 13px; margin-top: 4px; }
  .cards { list-style: none; padding: 0; margin: 0; display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
  .card { background: var(--white); border: 1px solid var(--rule); border-radius: var(--radius-md); overflow: hidden; display: flex; flex-direction: column; padding: 10px; }
  .card.warn { border: 2px solid var(--warn-line); }
  .shot { display: block; aspect-ratio: 16 / 10; background: var(--gradient-forest); overflow: hidden; border-radius: 8px; }
  .shot img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; transition: transform .25s; }
  .shot:hover img { transform: scale(1.03); }
  .shot span { display: grid; place-items: center; height: 100%; color: var(--white); font: 700 20px/1 var(--font-display); text-transform: lowercase; padding: 12px; text-align: center; }
  .card .body { padding: 14px 8px 6px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
  .card h3 { font: 700 22px/1.05 var(--font-display); letter-spacing: -0.01em; text-transform: lowercase; margin: 0; }
  .addr { text-decoration: none; color: var(--muted); }
  .addr:hover { text-decoration: underline; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 12px; color: var(--muted); font-size: 13px; }
  .flag { color: var(--warn); }
  .acts { display: flex; gap: 8px; margin-top: auto; padding-top: 12px; }
  /* News: its own black band */
  .newsband { background: var(--black); color: var(--white); padding: clamp(48px, 6vw, 80px) 0; margin-top: 56px; }
  .bandhead { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 24px; }
  .newsband h2 { margin: 0; color: var(--white); }
  .newsband h2 small { color: #cfcfcf; }
  .newsband .bandhead .acts { margin: 0; padding: 0; }
  .newsband .card { background: var(--black); border-color: #333333; color: var(--white); }
  .newsband .addr, .newsband .meta { color: #cfcfcf; }
  .newsband .pill { color: var(--white); border-color: var(--white); }
  .newsband .pill:hover { background: var(--white); color: var(--black); }
  .newsband .pill.solid { background: var(--white); color: var(--black); border-color: var(--white); }
  .newsband .card.warn { border-color: var(--warn-line); }
  .changes { list-style: none; padding: 0; margin: 0; }
  .changes li { display: flex; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--rule); }
  .changes li:last-child { border-bottom: 0; }
  .changes time { font: 700 14px/22px var(--font-display); letter-spacing: .06em; text-transform: lowercase; color: var(--forest); white-space: nowrap; min-width: 110px; }
  footer { color: var(--muted); font-size: 13px; padding: 40px 0 56px; }
  @media (max-width: 860px) { .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 640px) { code { word-break: break-all; } .tile .v.small { font-size: 17px; word-break: break-word; } .tile .v { font-size: 34px; } }
</style>
</head>
<body>
<header><div class="wrap">
  <div class="mark">website<small>team dashboard · nonfiction hotlist.</small></div>
  <nav class="hlinks">
    <a class="pill" href="https://list.nonfictionhotlist.com/dashboard/" target="_blank" rel="noopener">Hotlist dashboards</a>
    ${drive.folders ? `<a class="pill" href="${esc(folder(drive.folders.root))}" target="_blank" rel="noopener">Drive folder</a>` : ""}
    <a class="pill solid" href="${PREVIEW}/" target="_blank" rel="noopener">Open site</a>
  </nav>
</div></header>
<main class="wrap">
  <section class="tiles">
    <div class="tile hero"><div class="k">Pages</div><div class="v">${pages.length}</div><div class="s">plus ${news.length} news posts</div></div>
    <div class="tile${problems.length ? " warn" : ""}"><div class="k">Sync</div>
      <div class="v small"><span class="dot${problems.length ? " warn" : ""}"></span>${problems.length ? `${problems.length} edit${problems.length > 1 ? "s" : ""} skipped` : "All edits live"}</div>
      <div class="s">${drive.manifestId ? `Last change from Drive ${ago(lastDrive)}` : "Drive kit not connected"}</div></div>
    <div class="tile"><div class="k">Media</div><div class="v">${fs.readdirSync(path.join(C, "media")).length}</div><div class="s">images${videos ? `, plus ${videos} video${videos > 1 ? "s" : ""}` : ""} in the Media folder</div></div>
    <div class="tile"><div class="k">Address</div><div class="v small">${PREVIEW.replace("https://", "")}</div><div class="s">preview until the switch from Squarespace</div></div>
  </section>
  ${quick.length ? `<nav class="quick" aria-label="Site sheet and folders"><span class="lbl">Edit</span>${quick.map(([l, u]) => `<a class="chip" href="${esc(u)}" target="_blank" rel="noopener">${esc(l)}</a>`).join("")}</nav>` : ""}

  ${problems.length ? `<h2>Edits skipped <small>the site kept the previous text; fix these in Drive</small></h2><ul class="changes">${problems.map(p => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}

  <h2>Pages <small>add a page with a new row in the Pages tab</small></h2>
  <ul class="cards">${pages.map(p => card("pages", p, p.meta.description ? "" : '<span class="flag">No description</span>')).join("")}</ul>

</main>

<section class="newsband" aria-label="News">
  <div class="wrap">
    <div class="bandhead">
      <h2>News <small>${news.length} posts, newest first</small></h2>
      <div class="acts">${link(sheet(drive.site && drive.site.tabs.News), "Add a post", "pill solid")}${link(folder((drive.folders || {}).news), "News folder", "pill")}</div>
    </div>
    <ul class="cards">${news.map(n => card("news", n, `<span>${esc(n.meta.date)}</span>`)).join("")}</ul>
  </div>
</section>

<main class="wrap">
  <h2>Recent changes</h2>
  <ul class="changes">${log.map(l => `<li><time>${ago(l.d)}</time><span>${esc(l.s)}</span></li>`).join("") || "<li>None yet.</li>"}</ul>
  <footer>Built ${new Date().toUTCString()}. Rebuilt every time the site publishes.</footer>
</main>
</body>
</html>
`;
fs.mkdirSync(path.join(ROOT, "site", "dashboard"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "site", "dashboard", "index.html"), html);
console.log(`dashboard written: ${pages.length} pages, ${news.length} news posts, ${problems.length} skipped edits`);
