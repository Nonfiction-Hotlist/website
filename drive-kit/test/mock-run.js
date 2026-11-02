// Runs drive-kit/setup-website.gs against a stand-in for Google's Drive, Docs and Sheets, then writes
// what each Doc and Sheet would export (Markdown / CSV) so scripts/kit/pull-drive.js can read it back.
// It catches logic errors and drift between the kit and the sync; it doesn't prove every Google call
// is valid (the real run does that).
//   node drive-kit/test/mock-run.js OUT_DIR [--slow-clock] [--new-page "Title=/address/"]
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { exportLike } = require("../../scripts/kit/convert");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

let n = 0;
const newId = kind => `${kind}${String(++n).padStart(24, "0")}`;     // as long as a real Drive ID
const files = {};                 // id -> { kind, name, ... }
const props = {};
const triggers = [];
const calls = { fetch: 0, pauses: 0 };
const chain = t => new Proxy(t, { get: (o, k) => (k in o ? o[k] : (k === "then" ? undefined : () => chain(o))) });

/* ---------- Drive ---------- */
function Folder(name) {
  const id = newId("folder"), kids = {}, own = [];
  const api = chain({
    getId: () => id, getName: () => name,
    getFoldersByName: x => { const f = kids[x]; return { hasNext: () => !!f, next: () => f }; },
    createFolder: x => (kids[x] = Folder(x)),
    getFilesByName: x => ({ hasNext: () => own.some(f => f.name === x) }),
    createFile: blob => { const fid = newId("file"); const f = { kind: "file", name: blob.name, mime: blob.mime, id: fid }; files[fid] = f; own.push(f); return chain({ getId: () => fid }); },
    getFiles: () => { let i = 0; return { hasNext: () => i < own.length, next: () => { const f = own[i++]; return chain({ getName: () => f.name, getId: () => f.id, getMimeType: () => f.mime, getLastUpdated: () => new Date("2026-11-02T12:00:00Z") }); } }; },
    addEditor: () => api, setSharing: () => api
  });
  files[id] = { kind: "folder", api, own };
  return api;
}
const parent = Folder("Nonfiction Hotlist CD");

/* ---------- Docs: each paragraph keeps its text and, per character, bold / italic / link ---------- */
function Doc(title) {
  const id = newId("doc");
  const paras = [{ text: "", style: "NORMAL", chars: [] }];
  files[id] = { kind: "doc", name: title, paras };
  const P = p => {
    const span = (a, b, fn) => { for (let i = a; i <= b; i++) fn(p.chars[i] = p.chars[i] || {}); };
    const text = chain({
      setBold: (a, b, v) => { if (typeof a === "boolean") return text; span(a, b, c => c.b = v); return text; },
      setItalic: (a, b, v) => { if (typeof a === "boolean") return text; span(a, b, c => c.i = v); return text; },
      setLinkUrl: (a, b, v) => { if (a === null || typeof a === "string") return text; span(a, b, c => c.href = v); return text; },
      getText: () => p.text
    });
    const api = chain({
      setHeading: h => { p.style = h; return api; }, setGlyphType: () => api, editAsText: () => text, asText: () => text,
      setText: t => { p.text = t; }, removeFromParent: () => { paras.splice(paras.indexOf(p), 1); }
    });
    return api;
  };
  const add = (t, list) => { const p = { text: t, style: "NORMAL", list, chars: [] }; paras.push(p); return P(p); };
  const body = chain({
    clear: () => { paras.length = 0; paras.push({ text: "", style: "NORMAL", chars: [] }); return body; },
    appendParagraph: t => add(t, false), appendListItem: t => add(t, true),
    getParagraphs: () => paras.map(P), getNumChildren: () => paras.length, getChild: i => P(paras[i])
  });
  return chain({ getId: () => id, getBody: () => body, saveAndClose: () => {} });
}

/* ---------- Sheets ---------- */
function Sheet(ss, name) {
  const sh = { name, id: ss.sheets.length ? 1000 + (++n) : 0, cells: {}, maxRows: 1000, maxCols: 26 };
  const api = chain({
    setName: x => { sh.name = x; return api; }, getName: () => sh.name, getSheetId: () => sh.id,
    getMaxRows: () => sh.maxRows, getMaxColumns: () => sh.maxCols, clear: () => { sh.cells = {}; return api; },
    deleteRows: (a, k) => { sh.maxRows -= k; return api; }, insertRowsAfter: (a, k) => { sh.maxRows += k; return api; },
    deleteColumns: (a, k) => { sh.maxCols -= k; return api; },
    getRange: (r, c, nr = 1, nc = 1) => {
      if (r + nr - 1 > sh.maxRows || c + nc - 1 > sh.maxCols) throw new Error(`range outside ${sh.name}: ${r},${c},${nr},${nc}`);
      const range = chain({
        setValues: v => { if (v.length !== nr || v.some(x => x.length !== nc)) throw new Error(`setValues ${v.length}x${v[0].length} into ${nr}x${nc} on ${sh.name}`); v.forEach((row, i) => row.forEach((x, j) => sh.cells[`${r + i},${c + j}`] = x)); return range; },
        setValue: v => { sh.cells[`${r},${c}`] = v; return range; },
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => sh.cells[`${r + i},${c + j}`] ?? "")),
        merge: () => { if (nr * nc < 2) throw new Error("merge of one cell"); return range; },
        protect: () => chain({})
      });
      return range;
    }
  });
  sh.api = api;
  return sh;
}
function Spreadsheet(name) {
  const id = newId("sheet"), ss = { kind: "sheet", name, sheets: [] };
  ss.sheets.push(Sheet(ss, "Sheet1"));
  files[id] = ss;
  return ssApi(id);
}
const ssApi = id => { const ss = files[id]; return chain({ getId: () => id, getSheets: () => ss.sheets.map(s => s.api),
  getSheetByName: x => (ss.sheets.find(s => s.name === x) || {}).api || null, insertSheet: x => { const s = Sheet(ss, x); ss.sheets.push(s); return s.api; } }); };

/* ---------- run ---------- */
const sandbox = {
  Logger: { log: m => console.log("  log:", m) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, deleteProperty: k => delete props[k],
    setProperty: (k, v) => { if (v.length > 9000) throw new Error(`property ${k} is ${v.length} bytes, over Apps Script's 9KB limit`); props[k] = v; } }) },
  UrlFetchApp: { fetch: () => { calls.fetch++; return { getBlob: () => { const b = { mime: "image/jpeg", setName: x => { b.name = x; return b; } }; return b; } }; } },
  DriveApp: { getFolderById: id => id === "1BH_oJuusE9zGYzuzgA5ilhYbjJzXJRGx" ? parent : files[id].api,
    getFileById: () => chain({}), Access: {}, Permission: {} },
  DocumentApp: { create: Doc, ParagraphHeading: { HEADING1: "H1", HEADING2: "H2", HEADING3: "H3", HEADING4: "H4", NORMAL: "NORMAL" }, GlyphType: { BULLET: "BULLET" } },
  SpreadsheetApp: chain({ create: Spreadsheet, openById: ssApi, flush: () => {} }),
  ScriptApp: {
    newTrigger: fn => chain({ create: () => { if (fn === "continueKit") calls.pauses++; triggers.push(fn); } }),
    getProjectTriggers: () => triggers.map(fn => ({ getHandlerFunction: () => fn })),
    deleteTrigger: t => { const i = triggers.indexOf(t.getHandlerFunction()); if (i > -1) triggers.splice(i, 1); }
  }
};
if (process.argv.includes("--slow-clock")) { let t = 0; sandbox.Date = Object.assign(function (...a) { return new Date(...a); }, { now: () => (t += 20000) }); }
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "drive-kit", "setup-website.gs"), "utf8"), sandbox);
let runs = 0;
do { const before = calls.pauses; runs++; vm.runInContext(runs === 1 ? "buildKit()" : "continueKit()", sandbox); if (calls.pauses === before) break; } while (runs < 100);
if (!triggers.includes("refreshKit")) throw new Error("buildKit did not finish: no refreshKit trigger");

// --new-page "Title=/address/": an editor adds a Pages row; refreshKit must give it a Doc.
const ni = process.argv.indexOf("--new-page");
if (ni > -1) {
  const [title, address] = process.argv[ni + 1].split("=");
  const site = Object.values(files).find(f => f.kind === "sheet" && f.name === "Site");
  const pagesTab = site.sheets.find(s => s.name === "Pages");
  let r = 5; while (pagesTab.cells[`${r},1`]) r++;
  pagesTab.cells[`${r},1`] = title; pagesTab.cells[`${r},2`] = address;
  vm.runInContext("refreshKit()", sandbox);
  if (!String(pagesTab.cells[`${r},4`] || "").includes("/document/d/")) throw new Error("refreshKit made no Doc for the new page");
}

/* ---------- export the way Google does ---------- */
const csvCell = v => { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
const STYLE = { H1: "H1", H2: "H2", H3: "H3", H4: "H4" };
for (const [id, f] of Object.entries(files)) {
  if (f.kind === "sheet") for (const s of f.sheets) {
    const rows = [];
    for (let r = 1; r <= Math.min(s.maxRows, 200); r++) { const row = []; for (let c = 1; c <= s.maxCols; c++) row.push(csvCell(s.cells[`${r},${c}`])); rows.push(row.join(",")); }
    fs.writeFileSync(path.join(OUT, `${f.name === "Site manifest (do not edit)" ? "manifest" : id}__${s.id}.csv`), rows.join("\n"));
  }
  if (f.kind === "doc") {
    const model = f.paras.filter(p => p.text).map(p => {
      const runs = [];
      for (let i = 0; i < p.text.length; i++) {
        const a = p.chars[i] || {}, last = runs[runs.length - 1];
        if (last && !!last.b === !!a.b && !!last.i === !!a.i && (last.href || "") === (a.href || "")) last.t += p.text[i];
        else runs.push({ t: p.text[i], ...(a.b && { b: true }), ...(a.i && { i: true }), ...(a.href && { href: a.href }) });
      }
      return { style: p.list ? "BULLET" : STYLE[p.style] || "P", runs };
    });
    fs.writeFileSync(path.join(OUT, `${id}.md`), exportLike(model));
  }
}
const count = k => Object.values(files).filter(f => f.kind === k).length;
console.log(`mock run: ${runs} run(s), ${calls.pauses} pause(s), ${count("doc")} docs, ${count("sheet")} sheets, ${calls.fetch} images fetched, state ${props.kit.length} bytes`);
