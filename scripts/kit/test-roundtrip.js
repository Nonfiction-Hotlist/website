// For every page and news post: Markdown -> Doc paragraphs -> Google-style Markdown export -> Markdown.
// Passes when a second trip changes nothing, and the result renders to the same text and links.
// Run: node scripts/kit/test-roundtrip.js
const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const { toModel, fromExport, toMarkdown, exportLike, check } = require("./convert");
const blocks = require("../lib/blocks");

const C = path.resolve(__dirname, "..", "..", "content");
const files = ["pages", "news"].flatMap(d => fs.readdirSync(path.join(C, d)).map(f => path.join(C, d, f)));
const body = f => fs.readFileSync(f, "utf8").replace(/^---\n[\s\S]*?\n---\n?/, "");
const media = fs.readdirSync(path.join(C, "media"));

// What a reader would get: visible text, link targets and images, with ::: blocks flattened.
// Section labels aren't text a reader sees, so they are left out.
const flatten = md => blocks(md).map(b => b.kind === "md" ? b.text : `${b.kind === "section" ? "" : b.kind + " " + b.arg}\n\n${flatten(b.text)}`).join("\n\n");
function seen(md) {
  const flat = flatten(md);
  const html = marked.parse(flat.replace(/\{\.button\}/g, ""));
  return {
    text: html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, m => ({ "&amp;": "&", "&quot;": '"', "&#39;": "'", "&lt;": "<", "&gt;": ">" }[m] || m))
      .replace(/^\s*\d+\.\s/gm, "").replace(/\s+/g, " ").trim(),
    links: [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]),
    images: [...html.matchAll(/src="([^"]+)"/g)].map(m => m[1])
  };
}

let failed = 0;
for (const f of files) {
  const original = body(f);
  const once = toMarkdown(fromExport(exportLike(toModel(original))));
  const twice = toMarkdown(fromExport(exportLike(toModel(once))));
  const name = path.relative(C, f);
  const fail = msg => { failed++; console.log(`FAIL ${name}: ${msg}`); };
  if (once !== twice) {
    const a = once.split("\n"), b = twice.split("\n"), i = a.findIndex((l, k) => l !== b[k]);
    fail(`changes on a second trip, line ${i + 1}:\n  ${a[i]}\n  ${b[i]}`);
    continue;
  }
  const A = seen(original), B = seen(once);
  if (A.text !== B.text) {
    let i = 0; while (A.text[i] === B.text[i]) i++;
    fail(`text differs at "${A.text.slice(Math.max(0, i - 40), i + 40)}"\n  vs "${B.text.slice(Math.max(0, i - 40), i + 40)}"`);
  }
  if (JSON.stringify(A.links) !== JSON.stringify(B.links)) fail(`links differ: ${A.links.filter(l => !B.links.includes(l)).concat(B.links.filter(l => !A.links.includes(l))).join(", ")}`);
  if (JSON.stringify(A.images) !== JSON.stringify(B.images)) fail("images differ");
  const videos = fs.existsSync(path.join(C, "video")) ? fs.readdirSync(path.join(C, "video")).filter(f => f.endsWith("-1080.mp4")).map(f => f.replace(/-1080\.mp4$/, "")) : [];
  const issues = check(toModel(original), media, videos);
  if (issues.length) fail(issues.join("; "));
}
// Real exports saved from the kit's Docs (drive-kit/test/google-exports/<dir>__<file>.md) must read
// back to exactly the repo's page. This is what caught Google's one-paragraph-per-line format.
const origin = JSON.parse(fs.readFileSync(path.join(C, "site.json"), "utf8")).origin;
const G = path.resolve(__dirname, "..", "..", "drive-kit", "test", "google-exports");
for (const f of fs.existsSync(G) ? fs.readdirSync(G) : []) {
  const [dir, file] = f.replace(/\.md$/, "").split("__");
  const model = fromExport(fs.readFileSync(path.join(G, f), "utf8"))
    .map(p => ({ ...p, runs: p.runs.map(r => r.href && r.href.startsWith(origin + "/") ? { ...r, href: r.href.slice(origin.length) } : r) }));
  const got = toMarkdown(model), want = body(path.join(C, dir, file + ".md")).replace(/^\n+/, "");
  if (got !== want) { failed++; const a = want.split("\n"), b = got.split("\n"), i = a.findIndex((l, k) => l !== b[k]); console.log(`FAIL Google export ${f}, line ${i + 1}:\n  repo:   ${a[i]}\n  export: ${b[i]}`); }
}
console.log(`${files.length} files${fs.existsSync(G) ? ` and ${fs.readdirSync(G).length} Google exports` : ""}, ${failed ? failed + " failed" : "all round-trip cleanly"}`);
process.exit(failed ? 1 : 0);
