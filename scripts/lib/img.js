// Finds the web sizes of a photo in content/img/ (<name>-<width>.jpg, made by npm run images) and
// writes an <img> with a srcset, so each screen downloads only the size it needs.
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "../../content/img");
let files = null;

function sizes(name) {
  if (!files) files = fs.existsSync(DIR) ? fs.readdirSync(DIR) : [];
  const out = files.map(f => f.match(/^(.+)-(\d+)\.jpg$/)).filter(m => m && m[1] === name).map(m => ({ w: Number(m[2]), src: `/img/${m[0]}` })).sort((a, b) => a.w - b.w);
  if (!out.length) throw new Error(`no web sizes for image "${name}" in content/img (run npm run images)`);
  return out;
}

// For pages and for JSON handed to the page's script.
function srcset(name) {
  const s = sizes(name);
  return { src: s[s.length - 1].src, srcset: s.map(x => `${x.src} ${x.w}w`).join(", "), small: s[0].src };
}

// <img> markup. sizes: how wide the image shows (the browser picks a file from it).
function img(name, { alt = "", sizes: sz = "100vw", cls = "", lazy = true, attrs = "" } = {}) {
  const s = srcset(name);
  const e = v => String(v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  return `<img${cls ? ` class="${cls}"` : ""} src="${s.src}" srcset="${s.srcset}" sizes="${sz}" alt="${e(alt)}"${lazy ? ' loading="lazy" decoding="async"' : ""}${attrs ? " " + attrs : ""}>`;
}

module.exports = { img, srcset };
