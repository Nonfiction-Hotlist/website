// Converts page text between the repo's Markdown and the Drive kit's Google Docs.
//
// The common form is a list of paragraphs:
//   { style: "H1".."H4" | "P" | "BULLET" | "MARKER", runs: [{ t, b?, i?, href? }] }
// MARKER paragraphs are the bracket lines editors see in a Doc for things Markdown can't show in a Doc:
//   [section about]   [faq] ... [end faq]   [button: Label | /path/]   [image: photo.jpg]
//   [marquee: Shorts · Podcasts]   [form: contact]   [embed: https://...]   [news list]
//   [background video: name.mp4]   (a video playing behind its section, from the Media folder)
//
//   toModel(markdown)        repo Markdown -> paragraphs   (the setup script writes these into Docs)
//   fromExport(markdown)     a Doc's Markdown export (File > Download > Markdown) -> paragraphs
//   toMarkdown(paragraphs)   paragraphs -> repo Markdown
//   exportLike(paragraphs)   paragraphs -> Markdown the way Google exports a Doc (tests only)
const { marked } = require("marked");
const blocks = require("../lib/blocks");
const { videoName } = require("../lib/video");

const MARKER = /^\[(section|faq|end faq|marquee|form|embed|news list|button|image|background video)(?:(?::\s*|\s+)(.*?))?\]$/;
const plain = runs => runs.map(r => r.t).join("");
const P = (style, runs) => ({ style, runs: tidy(runs) });
const M = text => ({ style: "MARKER", runs: [{ t: text }] });

// Joins neighbouring runs with the same formatting and trims the paragraph's ends.
function tidy(runs) {
  const out = [];
  for (const r of runs) {
    if (!r.t) continue;
    const last = out[out.length - 1];
    if (last && !!last.b === !!r.b && !!last.i === !!r.i && (last.href || "") === (r.href || "")) last.t += r.t;
    else out.push({ ...r });
  }
  if (out.length) { out[0].t = out[0].t.replace(/^\s+/, ""); out[out.length - 1].t = out[out.length - 1].t.replace(/\s+$/, ""); }
  return out.filter(r => r.t);
}

// marked's inline tokens -> runs
function runs(tokens, f = {}) {
  const out = [];
  for (const t of tokens || []) {
    if (t.type === "strong") out.push(...runs(t.tokens, { ...f, b: true }));
    else if (t.type === "em") out.push(...runs(t.tokens, { ...f, i: true }));
    else if (t.type === "link") out.push(...runs(t.tokens, { ...f, href: t.href }));
    else if (t.type === "br") out.push({ ...f, t: " " });
    else if (t.type === "codespan") out.push({ ...f, t: t.text });
    else if (t.type === "text" && t.tokens) out.push(...runs(t.tokens, f));
    else if (t.type === "image") out.push({ ...f, t: `[image: ${t.href.replace(/^\/media\//, "")}]`, image: t.href });
    else out.push({ ...f, t: unescapeHtml(t.text ?? t.raw ?? "") });
  }
  return out.map(r => { const o = { t: r.t }; if (r.b) o.b = true; if (r.i) o.i = true; if (r.href) o.href = r.href; return o; });
}
const unescapeHtml = s => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// Markdown (no ::: blocks) -> paragraphs. Bracket lines become MARKERs.
function mdToModel(md) {
  const out = [];
  for (const t of marked.lexer(md)) {
    if (t.type === "heading") out.push(P("H" + Math.min(t.depth, 4), runs(t.tokens)));
    else if (t.type === "paragraph") {
      const raw = t.text.trim();
      const imgs = [...raw.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)];
      const button = raw.match(/^\[([^\]]+)\]\(([^)\s]+)\)\{\.button\}$/);
      if (imgs.length && !raw.replace(/!\[[^\]]*\]\([^)\s]+\)/g, "").trim()) imgs.forEach(m => out.push(M(`[image: ${m[1].replace(/^\/media\//, "")}]`)));
      else if (button) out.push(M(`[button: ${button[1]} | ${button[2]}]`));
      else {
        const r = tidy(runs(t.tokens));
        const text = plain(r).trim();
        if (MARKER.test(text) && r.length === 1) out.push(M(text));
        else if (r.length) out.push(P("P", r));
      }
    } else if (t.type === "list") {
      t.items.forEach((it, n) => {
        const r = runs(it.tokens.flatMap(x => x.type === "paragraph" || x.type === "text" ? (x.tokens || [{ type: "text", text: x.text }]) : []));
        // Numbered lists keep their numbers as typed text: a Doc would renumber them from 1.
        if (t.ordered) out.push(P("P", [{ t: `${(Number(t.start) || 1) + n}. ` }, ...r]));
        else out.push(P("BULLET", r));
      });
    } else if (t.type === "blockquote") out.push(...mdToModel(t.text));
  }
  return out.filter(p => p.runs.length);
}

function toModel(md, top = true) {
  const out = [];
  let afterSection = false;
  for (const b of blocks(md)) {
    // In a Doc a section runs until the next [section], so page content that sat after a section,
    // outside it, starts a section of its own.
    if (top && afterSection && b.kind !== "section") { out.push(M("[section]")); afterSection = false; }
    if (b.kind === "section") afterSection = true;
    if (b.kind === "md") out.push(...mdToModel(b.text));
    else if (b.kind === "section") { out.push(M(`[section${b.arg ? " " + b.arg : ""}]`)); out.push(...toModel(b.text, false)); }
    else if (b.kind === "faq") {
      out.push(M("[faq]"));
      for (const qa of b.text.split(/^### /m).filter(s => s.trim())) {
        const [q, ...a] = qa.split("\n");
        out.push(P("H3", [{ t: q.trim() }]), ...mdToModel(a.join("\n")));
      }
      out.push(M("[end faq]"));
    }
    else if (b.kind === "marquee") out.push(M(`[marquee: ${b.text.split("\n").map(l => l.replace(/^-\s*/, "").trim()).filter(Boolean).join(" · ")}]`));
    else if (b.kind === "form") out.push(M(`[form: ${b.arg}]`));
    else if (b.kind === "embed") out.push(M(`[embed: ${b.arg}]`));
    else if (b.kind === "news-list") out.push(M("[news list]"));
    else if (b.kind === "background-video") out.push(M(`[background video: ${b.arg}]`));
  }
  return out;
}

// Google's export (File > Download > Markdown), as seen on the kit's own Docs: one paragraph per line
// (often ending in two spaces), headings with blank lines around them, "* " bullets, **bold**, *italic*,
// [text](link), backslash escapes like \!, and monospaced text (the bracket lines) in `backticks`.
function fromExport(md) {
  const out = [];
  for (const raw of md.replace(/\r/g, "").split("\n")) {
    const line = raw.replace(/\s+$/, "").replace(/\\$/, "");
    if (!line.trim()) continue;
    const code = line.trim().match(/^`+\s*([\s\S]*?)\s*`+$/);
    // Google escapes more punctuation than Markdown needs (https\://); any escaped punctuation is literal.
    const u = (code ? code[1] : line.trim()).replace(/\\([!-\/:-@\[-`{-~])/g, "$1");
    if (MARKER.test(u)) { out.push(M(u)); continue; }
    out.push(...mdToModel(line.replace(/^(\s*)\* /, "$1- ")));
  }
  return out;
}

/* ---------- paragraphs -> Markdown ---------- */
const escText = s => s.replace(/([\\`*_\[\]])/g, "\\$1");
function inline(rs, esc = escText) {
  let s = "";
  for (let k = 0; k < rs.length; ) {
    const href = rs[k].href || "";
    let group = [];
    while (k < rs.length && (rs[k].href || "") === href) group.push(rs[k++]);
    let txt = group.map(r => {
      const m = r.t.match(/^(\s*)([\s\S]*?)(\s*)$/);
      let core = esc(m[2]);
      if (!core) return r.t;
      if (r.i) core = `*${core}*`;
      if (r.b) core = `**${core}**`;
      return m[1] + core + m[3];
    }).join("");
    s += href ? `[${txt}](${href})` : txt;
  }
  return s;
}
function paraMd(p, esc) {
  const text = inline(p.runs, esc);
  if (p.style === "BULLET") return "- " + text;
  if (/^H\d$/.test(p.style)) return "#".repeat(+p.style[1]) + " " + text;
  // A paragraph that starts like a list or heading keeps reading as text.
  return text.replace(/^(\d+)\. /, "$1\\. ").replace(/^([-+#>]) /, "\\$1 ");
}

function toMarkdown(model) {
  const out = [];
  let inSection = false, inFaq = false;
  const close = () => { if (inFaq) { out.push(":::"); inFaq = false; } if (inSection) { out.push(":::"); inSection = false; } };
  for (const p of model) {
    if (p.style !== "MARKER") { out.push(paraMd(p)); continue; }
    const m = plain(p.runs).match(MARKER);
    const [kind, arg = ""] = [m[1], (m[2] || "").trim()];
    if (kind === "section") { close(); out.push(`::: section${arg ? " " + arg : ""}`); inSection = true; }
    else if (kind === "faq") { out.push("::: faq"); inFaq = true; }
    else if (kind === "end faq") { if (inFaq) { out.push(":::"); inFaq = false; } }
    else if (kind === "button") { const [label, href] = arg.split("|").map(s => s.trim()); out.push(`[${label}](${href}){.button}`); }
    else if (kind === "image") out.push(`![](/media/${arg})`);
    else if (kind === "marquee") out.push("::: marquee\n" + arg.split("·").map(s => "- " + s.trim()).filter(s => s !== "- ").join("\n") + "\n:::");
    else if (kind === "form") out.push(`::: form ${arg}\n:::`);
    else if (kind === "embed") out.push(`::: embed ${arg}\n:::`);
    else if (kind === "news list") out.push("::: news-list\n:::");
    else if (kind === "background video") out.push(`::: background-video ${arg}\n:::`);
  }
  close();
  // ::: lines are kept tight; everything else is separated by a blank line.
  return out.join("\n\n").replace(/\n\n:::/g, "\n:::").replace(/(^|\n)(::: [^\n]*)\n\n/g, "$1$2\n") + "\n";
}

// The way Google exports a Doc as Markdown (tests stand in for Google with this): see fromExport.
const escGoogle = s => s.replace(/([\\`*_\[\]#+\-.!])/g, "\\$1");
function exportLike(model) {
  const out = [];
  model.forEach((p, k) => {
    const heading = /^H\d$/.test(p.style);
    const line = p.style === "MARKER" ? "`" + plain(p.runs) + "`"
      : p.style === "BULLET" ? "* " + inline(p.runs, escGoogle)
      : heading ? "#".repeat(+p.style[1]) + " " + inline(p.runs, escGoogle)
      : inline(p.runs, escGoogle);
    if (heading) out.push("", line, "");
    else out.push(line + (k < model.length - 1 && !/^H\d$/.test(model[k + 1].style) ? "  " : ""));
  });
  return out.join("\n").replace(/^\n+/, "") + "\n";
}

// Problems an editor could cause in a Doc, for the sync to report.
function check(model, mediaNames, videoNames) {
  const issues = [];
  let faq = false;
  for (const p of model) {
    if (p.style !== "MARKER") continue;
    const m = plain(p.runs).match(MARKER), arg = (m[2] || "").trim();
    if (m[1] === "faq") { if (faq) issues.push("[faq] opened twice without [end faq]"); faq = true; }
    if (m[1] === "end faq") { if (!faq) issues.push("[end faq] without [faq]"); faq = false; }
    if (m[1] === "button" && !/^[^|]+\|\s*(\/|https?:\/\/|mailto:)\S*$/.test(arg)) issues.push(`button needs "Label | link": [button: ${arg}]`);
    if (m[1] === "image" && mediaNames && !mediaNames.includes(arg)) issues.push(`image not in the Media folder: ${arg}`);
    if (m[1] === "embed" && !/^https:\/\//.test(arg)) issues.push(`embed needs a full https:// link: ${arg}`);
    if (m[1] === "background video" && videoNames && !videoNames.includes(videoName(arg))) issues.push(`video not in the Media folder: ${arg}`);
  }
  if (faq) issues.push("[faq] without [end faq]");
  for (const p of model) {
    // A bracket line that isn't a building block (a typo like [imgae: x.jpg]) would show as text.
    const t = plain(p.runs).trim();
    if (p.style !== "MARKER" && /^\[[a-z][a-z ]{1,24}(:[^\]]*)?\]$/i.test(t)) issues.push(`"${t}" isn't a building block; see the guide for the ones there are`);
    // Links go to web pages or email; anything else (javascript:, file:) is refused.
    for (const r of p.runs) if (r.href && !/^(https?:\/\/|mailto:|\/|#)/i.test(r.href)) issues.push(`link "${r.t}" goes to "${r.href}"; links must start with https://, mailto: or /`);
  }
  return issues;
}

module.exports = { toModel, fromExport, toMarkdown, exportLike, check, MARKER };
