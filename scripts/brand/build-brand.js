// Builds the shared brand kit that every Nonfiction Hotlist page uses: this website, the list sites at
// list.nonfictionhotlist.com and the dashboards. Source files are in brand/; the result is published at
// /brand/v1/ on the website:
//
//   tokens.css   colors, gradients, type, spacing, radius and layout as CSS variables. Made from
//                brand/tokens.json (exported from the design system) plus the extra values the build
//                brief adds (light greens for labels on dark grounds, the photo overlay, layout sizes).
//   nfh.css      tokens + base + components in one file: the only stylesheet a page needs.
//   nfh.js       the menu, the rotating storytellers and the forms.
//   fonts/ logos/ marks/
//
// Other sites copy /brand/v1/ in when they build (see the list repo's scripts/fetch-brand.js), so a
// change here reaches them on their next build, after their own checks. A change that would break
// pages already using v1 goes in a new folder (v2) instead.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(ROOT, "brand");
const VERSION = "v1";

function tokensCSS() {
  const t = JSON.parse(fs.readFileSync(path.join(SRC, "tokens.json"), "utf8"));
  const lines = [];
  const add = (name, value, note) => lines.push(`  --${name}: ${value};${note ? ` /* ${note} */` : ""}`);
  // Palette and roles. Roles with a light and a dark value use the light one: the brand's grounds are
  // set per section (white, black, green, forest), not by a site-wide dark mode.
  for (const c of t.color.tokens) add(c.name, typeof c.value === "string" ? c.value : c.value.light);
  for (const g of t.gradient.tokens) add(g.name, g.value);
  add("font-display", t.type.families.display);
  add("font-body", t.type.families.body);
  for (const s of t.spacing.tokens) add(s.name, s.value);
  for (const r of t.radius.tokens) add(r.name, r.value);
  return `/* Generated from brand/tokens.json by scripts/brand/build-brand.js. Edit the design system, not this file. */
:root {
${lines.join("\n")}

  /* From the build brief (site-wide design principles) */
  --green-label: #8fbf90;   /* labels on black */
  --sage: #c9d6cb;          /* labels and quiet text on forest */
  --mint: #c9e3ca;          /* small numbers on the green photo overlay */
  --rule-dark: #3f5a4b;     /* card borders and the footer rule on dark grounds */
  --muted-on-black: #cfcfcf;
  /* Green ground for panels with white reading text: flat green to forest, both palette colors.
     White text measures 5:1 or better on it (gradient-green's light corner is 3.5:1). Chosen 5 Nov 2026. */
  --gradient-green-text: linear-gradient(135deg, #588257 0%, #3a5a40 100%);
  --photo-overlay: linear-gradient(135deg, rgba(92,150,94,.88) 0%, rgba(69,104,77,.92) 60%, rgba(26,40,33,.95) 100%);
  --max: 1440px;
  --gutter: clamp(16px, 5vw, 64px);
  --section-pad: clamp(64px, 8vw, 128px);
  --focus-light: var(--forest);   /* focus ring on white and paper (spark is 1.8:1 there) */
  --focus-dark: var(--spark);     /* focus ring on black, green and forest */
}
`;
}

// Fonts are self-hosted (no requests to Google from our pages). Roboto Serif is the variable version,
// as on the design canvas: its optical-size axis tightens the letters at reading sizes, which is what
// sets the canvas's line breaks. Latin-ext files download only when a page uses those characters.
function fontFaces() {
  const LATIN = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
  const EXT = "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF";
  const face = (family, file, weight, style, range) => `@font-face { font-family: "${family}"; src: url("fonts/${file}") format("woff2"); font-weight: ${weight}; font-style: ${style}; font-display: swap;${range ? ` unicode-range: ${range};` : ""} }`;
  return [
    face("League Spartan", "LeagueSpartan-Bold.woff2", 700, "normal"),
    face("Roboto Serif", "RobotoSerif-var.woff2", "100 900", "normal", LATIN),
    face("Roboto Serif", "RobotoSerif-var-ext.woff2", "100 900", "normal", EXT),
    face("Roboto Serif", "RobotoSerif-var-Italic.woff2", "100 900", "italic", LATIN),
    face("Roboto Serif", "RobotoSerif-var-Italic-ext.woff2", "100 900", "italic", EXT)
  ].join("\n") + "\n";
}

// Writes the kit into <outDir>/brand/v1/. Returns the folder.
function buildBrand(outDir) {
  const dest = path.join(outDir, "brand", VERSION);
  fs.mkdirSync(dest, { recursive: true });
  const tokens = tokensCSS();
  fs.writeFileSync(path.join(dest, "tokens.css"), tokens);
  const css = [tokens, fontFaces(), fs.readFileSync(path.join(SRC, "base.css"), "utf8"), fs.readFileSync(path.join(SRC, "components.css"), "utf8")].join("\n");
  fs.writeFileSync(path.join(dest, "nfh.css"), css);
  fs.copyFileSync(path.join(SRC, "nfh.js"), path.join(dest, "nfh.js"));
  for (const d of ["fonts", "logos", "marks"]) fs.cpSync(path.join(SRC, d), path.join(dest, d), { recursive: true });
  // Icons: the nfh. disc mark in the signature green (#588257), a 32px PNG and the 180px app icon (white mark on green).
  for (const f of ["favicon.svg", "favicon-32.png", "apple-touch-icon.png"]) fs.copyFileSync(path.join(SRC, f), path.join(dest, f));
  fs.copyFileSync(path.join(SRC, "tokens.json"), path.join(dest, "tokens.json"));
  return dest;
}

if (require.main === module) console.log("brand kit written to " + buildBrand(path.join(ROOT, "site")));
module.exports = { buildBrand, VERSION };
