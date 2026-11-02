// Splits page Markdown into plain Markdown and ::: blocks (which can nest).
//   ::: section about        ->  { kind: "section", arg: "about", text: "...inside..." }
// Shared by the build and the Drive kit.
module.exports = function blocks(text) {
  const lines = text.split("\n"), out = [];
  let buf = [];
  const flush = () => { if (buf.join("").trim()) out.push({ kind: "md", text: buf.join("\n") }); buf = []; };
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^:::\s*([\w-]+)\s*(.*)$/);
    if (!open) { buf.push(lines[i]); continue; }
    flush();
    let depth = 1, j = i + 1;
    for (; j < lines.length; j++) {
      if (/^:::\s*[\w-]+/.test(lines[j])) depth++;
      else if (/^:::\s*$/.test(lines[j]) && --depth === 0) break;
    }
    out.push({ kind: open[1], arg: open[2].trim(), text: lines.slice(i + 1, j).join("\n") });
    i = j;
  }
  flush();
  return out;
};
