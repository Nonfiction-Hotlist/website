// Reads the website's Drive kit (the Site sheet, every page and news Doc, the Media folder) and writes
// content/. Nothing an editor does can break the site: a Doc that breaks a rule keeps its previous
// text, and every problem is listed in content/sync-problems.txt (and in the workflow summary).
//
//   node scripts/kit/pull-drive.js                 read from Google (the kit is shared by link)
//   node scripts/kit/pull-drive.js --from-dir DIR  read a saved copy (tests)
//   add --dry-run to print what would change without writing
const fs = require("fs");
const path = require("path");
const { fromExport, toMarkdown, check, MARKER } = require("./convert");
const { C, parse, format, read, pageFile, newsFile, rowsToSite } = require("./site-files");

const args = process.argv.slice(2);
const fromDir = args.includes("--from-dir") ? args[args.indexOf("--from-dir") + 1] : null;
const dryRun = args.includes("--dry-run");
const DRIVE = path.join(C, "drive.json");
const PROBLEMS = path.join(C, "sync-problems.txt");
const MEDIA_INDEX = path.join(C, "drive-media.json");   // which Drive file each image came from
const problems = [];
const warn = (where, msg) => problems.push(`${where}: ${msg}`);

async function get(url, file, binary) {
  if (fromDir) {
    const f = path.join(fromDir, file);
    if (!fs.existsSync(f)) throw new Error(`missing ${file}`);
    return binary ? fs.readFileSync(f) : fs.readFileSync(f, "utf8");
  }
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      const type = res.headers.get("content-type") || "";
      if (res.ok && !type.includes("text/html")) return binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
      if (type.includes("text/html")) throw new Error("Google returned a sign-in page. Is the NFH Website folder shared as 'anyone with the link can view'?");
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
}
const sheetCsv = (id, gid) => get(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`, `${id}__${gid}.csv`);
const docMd = id => get(`https://docs.google.com/document/d/${id}/export?format=md`, `${id}.md`);
const fileBytes = id => get(`https://drive.google.com/uc?export=download&id=${id}`, `media__${id}`, true);

function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const clean = s => String(s == null ? "" : s).replace(/\r/g, "").replace(/ /g, " ").trim();
// Rows under a tab's header row (the 4th row), up to the first empty one... but empty rows in the
// middle are allowed, so every non-empty row is kept.
const body = (rows, first) => {
  const h = rows.findIndex(r => clean(r[0]) === first);
  if (h < 0) throw new Error(`header row "${first}" not found`);
  return rows.slice(h + 1).map(r => r.map(clean)).filter(r => r.some(Boolean));
};
const docId = url => (String(url).match(/\/d\/([\w-]{20,})/) || [])[1] || "";
// Image file names on the site: lower case, letters, numbers, dots and dashes.
const siteName = n => n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

(async () => {
  if (!fs.existsSync(DRIVE) && !fromDir) { console.log("Drive kit not connected yet (no content/drive.json). Nothing to pull."); return; }
  const drive = fromDir ? { manifestId: "manifest" } : JSON.parse(fs.readFileSync(DRIVE, "utf8"));
  const site = JSON.parse(fs.readFileSync(path.join(C, "site.json"), "utf8"));
  const manifest = parseCsv(await sheetCsv(drive.manifestId, 0)).slice(1).filter(r => clean(r[0]))
    .map(r => ({ kind: clean(r[0]), key: clean(r[1]), fileId: clean(r[3]), tabs: JSON.parse(clean(r[4]) || "{}"), updated: clean(r[6]) }));
  const S = manifest.find(m => m.kind === "site");
  if (!S) throw new Error("the manifest lists no Site sheet");
  const tab = async name => body(parseCsv(await sheetCsv(S.fileId, S.tabs[name])), { Pages: "Title", News: "Title", Menu: "Label", Footer: "Column", Settings: "Setting" }[name]);
  const mediaRows = manifest.filter(m => m.kind === "media");
  const mediaNames = mediaRows.map(m => m.key);
  const toSite = siteName;

  const changed = [], writes = [], removes = [];
  const fromDoc = async (where, id) => {
    const model = fromExport(await docMd(id)).map(p => ({ ...p, runs: p.runs.map(r => r.href && r.href.startsWith(site.origin + "/") ? { ...r, href: r.href.slice(site.origin.length) } : r) }));
    const issues = check(model, mediaNames);
    if (issues.length) { issues.forEach(i => warn(where, i + "; kept the previous text")); return null; }
    // Images are named on the site the way they're saved there.
    return toMarkdown(model.map(p => {
      const m = p.style === "MARKER" && p.runs[0].t.match(/^\[image:\s*(.+?)\]$/);
      return m ? { ...p, runs: [{ t: `[image: ${toSite(m[1])}]` }] } : p;
    }));
  };

  // Pages
  const oldPages = Object.fromEntries(read("pages").map(p => [p.file, p]));
  const seenPages = new Set();
  for (const [title, address, description, doc] of await tab("Pages")) {
    const where = `Pages tab, "${title || address}"`;
    if (!title || !address) { warn(where, "needs a Title and an Address"); continue; }
    if (!/^\/([a-z0-9-]+\/)*$/.test(address)) { warn(where, `address "${address}" should look like /about/ (lower case, starting and ending with /)`); continue; }
    const id = docId(doc);
    if (!id) continue;                                  // the kit makes its Doc within 10 minutes
    const file = pageFile(address);
    seenPages.add(file);
    const prev = oldPages[file];
    const text = await fromDoc(`Page "${title}"`, id);
    const next = format({ title, path: address, description, source: prev && prev.meta.source }, text ?? (prev ? prev.body : ""));
    if (!prev || format(prev.meta, prev.body) !== next) { writes.push([path.join(C, "pages", file + ".md"), next]); changed.push(title); }
  }
  for (const f of Object.keys(oldPages)) if (!seenPages.has(f)) warn(`Page "${oldPages[f].meta.title}"`, "is not in the Pages tab; kept it on the site");

  // News
  const oldNews = read("news");
  const seenNews = new Set();
  for (const [title, date, address, image, excerpt, doc] of await tab("News")) {
    const where = `News tab, "${title || address}"`;
    if (!title || !address || !date) { warn(where, "needs a Title, Date and Address"); continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { warn(where, `date "${date}" should look like 2026-05-28`); continue; }
    if (!/^\/news\/[a-z0-9-]+\/$/.test(address)) { warn(where, `address "${address}" should look like /news/indiewire/`); continue; }
    if (image && !mediaNames.includes(image)) { warn(where, `listing image "${image}" is not in the Media folder`); continue; }
    const id = docId(doc);
    if (!id) continue;
    const file = newsFile(date, address);
    seenNews.add(file);
    const prev = oldNews.find(n => n.meta.path === address);
    if (prev && prev.file !== file) removes.push(path.join(C, "news", prev.file + ".md"));   // date changed
    const text = await fromDoc(`News "${title}"`, id);
    const next = format({ title, date, path: address, image: image ? "/media/" + toSite(image) : "", excerpt, source: prev && prev.meta.source }, text ?? (prev ? prev.body : ""));
    if (!prev || prev.file !== file || format(prev.meta, prev.body) !== next) { writes.push([path.join(C, "news", file + ".md"), next]); changed.push(title); }
  }
  for (const n of oldNews) if (!seenNews.has(n.file) && !removes.includes(path.join(C, "news", n.file + ".md"))) warn(`News "${n.meta.title}"`, "is not in the News tab; kept it on the site");

  // Menu, footer, settings
  try {
    const nextSite = rowsToSite({ menu: await tab("Menu"), footer: await tab("Footer"), settings: await tab("Settings") }, site);
    const a = JSON.stringify(nextSite, null, 2) + "\n";
    if (a !== JSON.stringify(site, null, 2) + "\n") { writes.push([path.join(C, "site.json"), a]); changed.push("Menu, footer or settings"); }
  } catch (e) { warn("Menu, Footer or Settings tab", `${e.message}; kept the previous ones`); }

  // Images: fetch the ones that are new or changed since the last sync.
  const index = fs.existsSync(MEDIA_INDEX) ? JSON.parse(fs.readFileSync(MEDIA_INDEX, "utf8")) : {};
  const nextIndex = {};
  for (const m of mediaRows) {
    const name = toSite(m.key), had = index[name];
    nextIndex[name] = { id: m.fileId, updated: m.updated };
    const onDisk = fs.existsSync(path.join(C, "media", name));
    // An image already on the site that the kit copied in is taken as it is (same picture).
    if (onDisk && (!had || (had.id === m.fileId && had.updated === m.updated))) continue;
    if (fromDir) { changed.push(`image ${name}`); continue; }
    try { writes.push([path.join(C, "media", name), await fileBytes(m.fileId)]); changed.push(`image ${name}`); }
    catch (e) { warn(`Image "${m.key}"`, e.message); delete nextIndex[name]; }
  }
  if (JSON.stringify(nextIndex) !== JSON.stringify(index)) writes.push([MEDIA_INDEX, JSON.stringify(nextIndex, null, 1) + "\n"]);

  console.log(changed.length ? `Changed: ${changed.join("; ")}` : "No changes in Drive.");
  if (problems.length) console.log(`\nProblems (${problems.length}):\n- ` + problems.join("\n- "));
  // Tests: a kit freshly built from the repo must read back with nothing changed and no problems.
  if (args.includes("--expect-no-changes") && (changed.length || problems.length)) {
    for (const [f, data] of writes) {
      if (typeof data !== "string" || !fs.existsSync(f)) continue;
      const a = fs.readFileSync(f, "utf8").split("\n"), b = data.split("\n"), i = a.findIndex((l, k) => l !== b[k]);
      if (i > -1) console.error(`${path.relative(C, f)}, line ${i + 1}:\n  repo:  ${a[i]}\n  drive: ${b[i]}`);
    }
    console.error("Expected no changes."); process.exit(1);
  }
  if (dryRun) return;
  for (const f of removes) fs.rmSync(f, { force: true });
  for (const [f, data] of writes) fs.writeFileSync(f, data);
  const listed = problems.length ? problems.join("\n") + "\n" : "";
  const before = fs.existsSync(PROBLEMS) ? fs.readFileSync(PROBLEMS, "utf8") : "";
  if (listed !== before) fs.writeFileSync(PROBLEMS, listed);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT,
    `changed=${changed.length ? "true" : "false"}\nproblems_changed=${listed !== before ? "true" : "false"}\nproblems=${problems.length}\nsummary=${(changed.join("; ") || "skipped edits list").slice(0, 300)}\n`);
})().catch(e => { console.error(`Could not read the Drive kit: ${e.message}`); process.exit(1); });
