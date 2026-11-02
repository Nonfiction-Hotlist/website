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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@500;600;700&family=Inter:wght@400;500;600&display=swap">
<style>
  :root { --forest: #2e4a3b; --deep: #22382c; --sage: #9aab8c; --soft: #c6d0bb; --cream: #ebe6d7; --paper: #f5f2ea; --card: #fffdf8;
    --ink: #1d2b23; --muted: #66705f; --line: #e2ddd0; --ok: #3f6b4f; --warn: #a8701c; --warn-bg: #f7ead2;
    --display: "League Spartan", "Avenir Next", "Helvetica Neue", Arial, sans-serif; --ui: "Inter", system-ui, -apple-system, sans-serif; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 14px/1.45 var(--ui); }
  a { color: inherit; }
  .wrap { max-width: 1120px; margin: 0 auto; padding: 0 20px; }
  header { background: var(--deep); color: var(--cream); }
  header .wrap { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-block: 14px; flex-wrap: wrap; }
  .mark { font: 700 18px var(--display); }
  .mark span { font-weight: 500; color: var(--sage); margin-left: 6px; }
  .mark small { display: block; font: 500 11px var(--ui); text-transform: uppercase; letter-spacing: .12em; color: var(--soft); margin-top: 2px; }
  .hlinks { display: flex; gap: 8px; flex-wrap: wrap; }
  .pill { display: inline-flex; padding: 6px 13px; border-radius: 999px; border: 1px solid var(--line); font: 600 13px var(--ui); text-decoration: none; white-space: nowrap; background: var(--card); }
  .pill:hover { border-color: var(--sage); }
  header .pill { background: transparent; color: var(--cream); border-color: rgba(235,230,215,.25); }
  header .pill.solid { background: var(--cream); color: var(--ink); border-color: var(--cream); }
  .tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 22px 0 18px; }
  .tile { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 14px 16px; }
  .tile.hero { background: var(--forest); border-color: var(--forest); color: var(--cream); }
  .tile .k { font: 600 11px var(--ui); text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
  .tile.hero .k, .tile.hero .s { color: var(--soft); }
  .tile .v { font: 700 30px/1.1 var(--display); margin-top: 8px; }
  .tile .v.small { font-size: 18px; line-height: 1.25; }
  .tile .s { color: var(--muted); font-size: 12px; margin-top: 4px; }
  .tile.warn { background: var(--warn-bg); border-color: #ecd7ae; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--ok); margin-right: 7px; vertical-align: 2px; }
  .dot.warn { background: var(--warn); }
  .quick { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 26px; }
  .lbl { font: 600 11px var(--ui); text-transform: uppercase; letter-spacing: .1em; color: var(--muted); margin-right: 4px; }
  .chip { padding: 6px 12px; border-radius: 6px; background: var(--card); border: 1px solid var(--line); text-decoration: none; font-weight: 500; font-size: 13px; }
  .chip:hover { border-color: var(--sage); background: #fff; }
  h2 { font: 700 20px var(--display); margin: 28px 0 10px; }
  h2 small { font: 400 13px var(--ui); color: var(--muted); margin-left: 8px; }
  .table { overflow-x: auto; background: var(--card); border: 1px solid var(--line); border-radius: 8px; }
  table { width: 100%; border-collapse: collapse; min-width: 640px; }
  th { text-align: left; font: 600 11px var(--ui); text-transform: uppercase; letter-spacing: .08em; color: var(--muted); padding: 10px 14px; border-bottom: 1px solid var(--line); }
  td { padding: 10px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
  tr:last-child td { border-bottom: 0; }
  tr.warn td { background: var(--warn-bg); }
  code { font-size: 12.5px; }
  .when { color: var(--muted); white-space: nowrap; }
  .act { text-align: right; }
  .none { color: var(--muted); }
  .issue { color: var(--warn); font-size: 12.5px; margin-top: 3px; }
  .cards { list-style: none; padding: 0; margin: 0; display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
  .card.warn { border-color: #ecd7ae; background: var(--warn-bg); }
  .shot { display: block; aspect-ratio: 16 / 10; background: var(--forest); overflow: hidden; border-bottom: 1px solid var(--line); }
  .shot img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; transition: transform .25s; }
  .shot:hover img { transform: scale(1.03); }
  .shot span { display: grid; place-items: center; height: 100%; color: var(--cream); font: 700 18px var(--display); padding: 12px; text-align: center; }
  .card .body { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
  .card h3 { font: 700 16px/1.2 var(--display); margin: 0; }
  .addr { text-decoration: none; color: var(--muted); }
  .addr:hover { text-decoration: underline; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 12px; color: var(--muted); font-size: 12.5px; }
  .flag { color: var(--warn); }
  .acts { display: flex; gap: 8px; margin-top: auto; padding-top: 10px; }
  .pill.solid { background: var(--forest); color: var(--cream); border-color: var(--forest); }
  .pill.solid:hover { background: var(--deep); }
  /* News: its own black band, with dark cards */
  .newsband { background: #0f0f0f; color: #fff; padding: 34px 0 42px; margin-top: 34px; }
  .bandhead { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 16px; }
  .newsband h2 { margin: 0; color: #fff; font-size: 26px; }
  .newsband h2 small { color: rgba(255,255,255,.6); }
  .newsband .bandhead .acts { margin: 0; padding: 0; }
  .newsband .card { background: #1b1b1b; border-color: #2c2c2c; color: #fff; }
  .newsband .shot { border-bottom-color: #2c2c2c; }
  .newsband .addr, .newsband .meta { color: rgba(255,255,255,.62); }
  .newsband .pill { background: transparent; color: #fff; border-color: rgba(255,255,255,.25); }
  .newsband .pill:hover { border-color: #fff; }
  .newsband .pill.solid { background: #fff; color: #0f0f0f; border-color: #fff; }
  .newsband .card.warn { background: #2a2210; border-color: #6b5420; }
  .changes { list-style: none; padding: 0; margin: 0; background: var(--card); border: 1px solid var(--line); border-radius: 8px; }
  .changes li { display: flex; gap: 14px; padding: 9px 14px; border-bottom: 1px solid var(--line); }
  .changes li:last-child { border-bottom: 0; }
  .changes time { color: var(--muted); white-space: nowrap; min-width: 92px; }
  footer { color: var(--muted); font-size: 12px; padding: 28px 0 40px; }
  @media (max-width: 860px) { .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 640px) {
    code { word-break: break-all; }
    .tile .v.small { font-size: 15px; word-break: break-word; }
  }
  @media (max-width: 420px) { .wrap { padding: 0 16px; } .tile .v { font-size: 24px; } }
</style>
</head>
<body>
<header><div class="wrap">
  <div class="mark">nonfiction hotlist.<span>website</span><small>Team dashboard</small></div>
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
