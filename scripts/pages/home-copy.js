// The homepage's words, from the "Home Page" Doc in the Drive kit (content/pages/index.md).
// The Doc has one heading per homepage section and lines like "Headline: we make momentum.".
// The layout, photos and links stay in code (home.js); only the words come from the Doc.
//
// read(md) returns { copy, issues }. The sync (pull-drive.js) runs it on every new version of the Doc
// and keeps the previous text if there are issues, so a broken edit never reaches the site.
// Storyteller quotes are not in the Doc; they're in content/testimonials.json.

// Plain text from a line of Markdown: links keep their words, bold and italics marks go.
const plain = s => s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*\*|__/g, "").replace(/(^|[^\w])[*_]([^*_]+)[*_](?=$|[^\w])/g, "$1$2").replace(/\\([\\`*_\[\]#+\-.!])/g, "$1").trim();
const norm = s => plain(s).toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
const parts = s => s.split(/\s+·\s+|\s*·\s*/).map(x => x.trim()).filter(Boolean);

// Each section: its fields (label: max characters, or [count, max] for "a · b" lists) and, for
// sections with numbered items, the items' heading and fields.
const SPEC = {
  "hero": { fields: { "headline": 30, "line": 160, "buttons": [2, 24], "rotating badge": [2, 18] } },
  "we make momentum": { fields: { "headline": 40, "first line": 160, "second line": 240 } },
  "the 2026 hotlist": { fields: { "headline": 50, "first line": 160, "second line": 240, "buttons": [2, 24] } },
  "about": { fields: { "headline": 24, "first paragraph": 260, "second paragraph": 240, "link": 40 } },
  "what we do": { fields: { "headline": 24, "line": 80, "formats": [[1, 8], 16] },
    items: { count: 5, title: 28, fields: { "text": 140, "button": 28 } } },
  "our values": { fields: { "headline": 40 }, values: 3 },
  "programs": { fields: { "headline": 60, "button": 30 },
    items: { count: 3, title: 40, fields: { "tag": 30, "text": 260, "link": 30 } } },
  "the 2025 list": { fields: { "headline": 30, "line": 120, "button": 24, "posters": [4, 40], "last tile": [2, 24] } },
  "subscribe": { fields: { "headline": 24, "line": 160, "form fields": [4, 24], "i'm a choices": [[1, 8], 40], "button": 24, "after signing up": 80 } },
};
// Sections in the Doc that aren't read: the intro, and the storytellers note.
const SKIP = ["homepage text", "hear from our storytellers"];

function read(md) {
  const issues = [];
  const body = md.replace(/^---\n[\s\S]*?\n---\n/, "");
  // Split into sections (#) and items (##), collecting "Label: text" lines.
  const found = {};
  let sec = null, item = null;
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    let m;
    if ((m = line.match(/^#\s+(.+)/))) {
      const name = norm(m[1]);
      item = null;
      if (SKIP.includes(name)) { sec = null; continue; }
      if (!SPEC[name]) { issues.push(`"${plain(m[1])}" isn't a homepage section; the headings must stay as they are`); sec = null; continue; }
      sec = found[name] = { fields: {}, items: [], values: [] };
      continue;
    }
    if (!sec) continue;
    if ((m = line.match(/^##\s+(.+)/))) {
      item = { title: plain(m[1]).replace(/^\d+\s+/, ""), fields: {} };
      sec.items.push(item);
      continue;
    }
    // A label line: **Label:** text (the colon may sit inside or outside the bold).
    m = line.match(/^\*\*(.+?):\*\*\s*(.*)$/) || line.match(/^\*\*(.+?)\*\*:\s*(.*)$/);
    if (!m) continue;                                  // other paragraphs are notes for editors
    const label = norm(m[1]), value = plain(m[2]);
    const name = Object.keys(found).find(k => found[k] === sec);
    const v = name === "our values" && label.match(/^\d+\s+(.+)$/);
    if (v) { sec.values.push([plain(m[1]).replace(/^\d+\s+/, ""), value]); continue; }
    (item ? item.fields : sec.fields)[label] = value;
  }

  const copy = {};
  const check = (where, spec, fields) => {
    const out = {};
    for (const [label, rule] of Object.entries(spec)) {
      const v = fields[label];
      const Label = label[0].toUpperCase() + label.slice(1);
      if (!v) { issues.push(`${where}: "${Label}" is missing or empty`); continue; }
      if (typeof rule === "number") {
        if (v.length > rule) issues.push(`${where}: "${Label}" is ${v.length} characters; keep it to ${rule}`);
        out[label] = v;
      } else {
        const [count, max] = rule, list = parts(v);
        const [lo, hi] = Array.isArray(count) ? count : [count, count];
        if (list.length < lo || list.length > hi)
          issues.push(`${where}: "${Label}" needs ${lo === hi ? lo : `${lo} to ${hi}`} parts separated by · (it has ${list.length})`);
        list.filter(x => x.length > max).forEach(x => issues.push(`${where}: "${x}" in "${Label}" is ${x.length} characters; keep it to ${max}`));
        out[label] = list;
      }
    }
    for (const label of Object.keys(fields)) if (!(label in spec)) issues.push(`${where}: "${label}" isn't a field here; check the spelling`);
    return out;
  };

  for (const [name, spec] of Object.entries(SPEC)) {
    const where = `"${name[0].toUpperCase() + name.slice(1)}" section`;
    const sec = found[name];
    if (!sec) { issues.push(`the ${where} is missing`); continue; }
    const c = copy[name] = check(where, spec.fields, sec.fields);
    if (spec.items) {
      const { count, title, fields } = spec.items;
      if (sec.items.length !== count) issues.push(`${where} needs ${count} parts (## headings), one per box on the page; it has ${sec.items.length}`);
      c.items = sec.items.map((it, k) => {
        const w = `${where}, "${it.title}"`;
        if (!it.title) issues.push(`${where}: part ${k + 1} needs a heading`);
        else if (it.title.length > title) issues.push(`${w}: the heading is ${it.title.length} characters; keep it to ${title}`);
        return { title: it.title, ...check(w, fields, it.fields) };
      });
    }
    if (spec.values) {
      if (sec.values.length !== spec.values) issues.push(`${where} needs ${spec.values} values, each like "01 generosity.: text"; it has ${sec.values.length}`);
      sec.values.forEach(([t, text]) => {
        if (t.length > 40) issues.push(`${where}: "${t}" is ${t.length} characters; keep it to 40`);
        if (!text) issues.push(`${where}: "${t}" needs its text`);
        else if (text.length > 140) issues.push(`${where}: the text for "${t}" is ${text.length} characters; keep it to 140`);
      });
      c.values = sec.values;
    }
  }
  return { copy, issues };
}

module.exports = { read };
