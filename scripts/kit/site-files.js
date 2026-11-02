// Reading and writing the content files, and the menu/footer/settings as Site sheet rows.
// Shared by the kit generator and the Drive sync.
const fs = require("fs");
const path = require("path");

const C = path.resolve(__dirname, "..", "..", "content");

// Front matter is "key: JSON value" lines between --- lines.
function parse(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta = {};
  if (m) for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = JSON.parse(line.slice(i + 1).trim());
  }
  return { meta, body: (m ? text.slice(m[0].length) : text).replace(/^\n+/, "") };
}
function format(meta, body) {
  const lines = Object.entries(meta).filter(([, v]) => v !== "" && v != null).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join("\n")}\n---\n\n${body}`;
}
const read = dir => fs.readdirSync(path.join(C, dir)).filter(f => f.endsWith(".md"))
  .map(f => ({ file: f.replace(/\.md$/, ""), ...parse(fs.readFileSync(path.join(C, dir, f), "utf8")) }));

// File names from web addresses: /yahooxnfh/submit/ -> yahooxnfh-submit, / -> index.
const pageFile = address => address.replace(/^\/+|\/+$/g, "").replace(/\//g, "-") || "index";
const newsFile = (date, address) => `${date}-${address.replace(/^\/+|\/+$/g, "").replace(/^news\//, "").replace(/\//g, "-")}`;

const SETTINGS = [["Site name", "name"], ["Contact email", "email"], ["Menu button label", "navButton.label"], ["Menu button link", "navButton.href"], ["Newsletter sign-up in footer", "footer.newsletter"]];
const get = (o, k) => k.split(".").reduce((x, p) => x && x[p], o);

function siteToRows(site) {
  const menu = [];
  for (const i of site.nav) {
    if (i.children) { menu.push([i.label, "", ""]); i.children.forEach(c => menu.push([c.label, c.href, i.label])); }
    else menu.push([i.label, i.href, ""]);
  }
  const footer = site.footer.columns.flatMap(c => c.links.map(l => [c.heading, l.label, l.href]));
  const settings = SETTINGS.map(([label, key]) => { const v = get(site, key); return [label, typeof v === "boolean" ? (v ? "yes" : "no") : v || ""]; });
  return { menu, footer, settings };
}

function rowsToSite(rows, prev) {
  const nav = [];
  for (const [label, href, under] of rows.menu) {
    if (!label) continue;
    if (under) { const parent = nav.find(n => n.label === under && n.children); if (parent) parent.children.push({ label, href }); else nav.push({ label, href }); }
    else if (!href) nav.push({ label, children: [] });
    else nav.push({ label, href });
  }
  const columns = [];
  for (const [heading, label, href] of rows.footer) {
    if (!heading || !label) continue;
    let col = columns.find(c => c.heading === heading);
    if (!col) columns.push(col = { heading, links: [] });
    col.links.push({ label, href });
  }
  const s = Object.fromEntries(rows.settings.map(([k, v]) => [k, v]));
  return {
    name: s["Site name"] || prev.name, origin: prev.origin, email: s["Contact email"] || prev.email, nav,
    navButton: s["Menu button label"] ? { label: s["Menu button label"], href: s["Menu button link"] || "/" } : null,
    footer: { columns, newsletter: /^(yes|y|true|on)$/i.test(s["Newsletter sign-up in footer"] || "") }
  };
}

module.exports = { C, parse, format, read, pageFile, newsFile, siteToRows, rowsToSite };
