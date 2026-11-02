// Generates drive-kit/setup-website.gs: the Apps Script that builds the website's Drive kit, carrying
// every page, news post, the menu, footer and settings, and where each image can be fetched from.
// Run: npm run kit
const fs = require("fs");
const path = require("path");
const { toModel } = require("./convert");
const { read, siteToRows } = require("./site-files");

const ROOT = path.resolve(__dirname, "..", "..");
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "site.json"), "utf8"));
const sources = JSON.parse(fs.readFileSync(path.join(ROOT, "capture", "sources.json"), "utf8"));

// Links in a Doc are full addresses; the sync turns this site's own back into /paths.
const absolute = model => model.map(p => ({ ...p, runs: p.runs.map(r => r.href && r.href.startsWith("/") ? { ...r, href: site.origin + r.href } : r) }));

const pages = read("pages").map(p => ({ file: p.file, title: p.meta.title, path: p.meta.path, description: p.meta.description || "", doc: absolute(toModel(p.body)) }));
const news = read("news").map(n => ({ file: n.file, title: n.meta.title, date: n.meta.date, path: n.meta.path,
  image: (n.meta.image || "").replace(/^\/media\//, ""), excerpt: n.meta.excerpt || "", doc: absolute(toModel(n.body)) }));
const media = fs.readdirSync(path.join(ROOT, "content", "media")).map(name => {
  const url = sources["media/" + name];
  if (!url) throw new Error(`no source recorded for media/${name} (capture/sources.json)`);
  return { name, url: url.includes("?") ? url : url + "?format=2500w" };
});

const KIT = {
  folderName: "NFH Website",
  parentFolderId: "1BH_oJuusE9zGYzuzgA5ilhYbjJzXJRGx",     // Nonfiction Hotlist CD
  editors: "coreteam@nonfictionhotlist.com",
  siteUrl: site.origin,
  repoUrl: "https://github.com/Nonfiction-Hotlist/website",
  site: siteToRows(site),
  pages, news, media
};
const tpl = fs.readFileSync(path.join(ROOT, "drive-kit", "setup.template.gs"), "utf8");
fs.writeFileSync(path.join(ROOT, "drive-kit", "setup-website.gs"), tpl.replace("__KIT__", JSON.stringify(KIT, null, 1)));
console.log(`drive-kit/setup-website.gs written: ${pages.length} pages, ${news.length} news posts, ${media.length} images`);
