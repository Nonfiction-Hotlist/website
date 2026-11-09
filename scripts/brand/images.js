// Makes the web sizes of the homepage photos in content/img/ from the full-size originals.
// The originals stay outside the repo (the "Media For Website" and 2025 project asset folders, and the
// design canvas's uploads); only the web sizes are committed. Needs ffmpeg. Run: npm run images [name ...]
//
// Each entry: source file, optional crop (w:h:x:y in source pixels), and the widths to make.
// The build finds every <name>-<width>.jpg and writes a srcset, so phones get the small file.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const NFH = path.join(os.homedir(), "Documents/Nonfiction Hotlist");
const MEDIA = `${NFH}/Media For Website`;
const ASSETS = `${NFH}/NFH 2025 SELECTED PROJECT ASSETS`;
const CANVAS = process.env.CANVAS_ASSETS || path.join(__dirname, "../../.canvas-assets");
const OUT = path.join(__dirname, "../../content/img");

const IMAGES = {
  // Homepage
  "hero-still": { src: `${CANVAS}/f6d003d518ecc70dd091f84149bb39f3.jpg`, widths: [800, 1512] },
  "about-firehouse": { src: `${MEDIA}/Tribeca Selects/IMG_6649.jpeg`, widths: [800, 1200, 1800] },
  "values-group": { src: `${CANVAS}/b85fb0b0e405aacd67a4eff5d50ff9af.jpg`, widths: [800, 1200, 1800] },
  "talent-pair": { src: `${MEDIA}/Tribeca Selects/IMG_6642.jpeg`, widths: [600, 1000] },
  // What we do: a photo on each card (shown on hover, and always on phones)
  "wwd-curate": { src: `${MEDIA}/Tribeca Selects/IMG_6703.jpeg`, widths: [600, 1000] },
  "wwd-partners": { src: `${MEDIA}/Yahoo Selects/edits-552.jpg`, widths: [600, 1000] },
  "wwd-content": { src: `${MEDIA}/Yahoo Selects/edits-640.jpg`, widths: [600, 1000] },
  "wwd-community": { src: `${MEDIA}/Tribeca Selects/IMG_6655.jpeg`, widths: [600, 1000] },
  // Page banners (photo under the green overlay)
  "banner-news": { src: `${MEDIA}/Tribeca Selects/IMG_6597.jpeg`, widths: [1000, 1800] },
  "banner-terms": { src: `${MEDIA}/Tribeca Selects/IMG_6631.jpeg`, widths: [1000, 1800] },
  "banner-privacy": { src: `${MEDIA}/Tribeca Selects/IMG_6609.jpeg`, widths: [1000, 1800] },
  "banner-agreement": { src: `${MEDIA}/Tribeca Selects/IMG_6623.jpeg`, widths: [1000, 1800] },
  "banner-404": { src: `${MEDIA}/Tribeca Selects/IMG_6634.jpeg`, widths: [1000, 1800] },
  "yahoo-stage": { src: `${MEDIA}/Yahoo Selects/edits-659.jpg`, widths: [600, 1000, 1400] },
  "retreat-campus": { src: `${CANVAS}/232aea101705a4d53c71489dcfe13774.jpg`, widths: [600, 1000, 1200] },
  "events-crowd": { src: `${MEDIA}/Tribeca Selects/IMG_6568.jpeg`, widths: [600, 1000, 1400] },
  "yahoo-wall": { src: `${MEDIA}/Yahoo Selects/wall3.jpg`, widths: [1000, 1600, 2400] },
  "yahoo-wall-2": { src: `${MEDIA}/Yahoo Selects/wall2.jpg`, widths: [1000, 1600, 2400] },
  // 2025 list posters
  "poster-city-forest": { src: `${CANVAS}/003435caac0af0394f71a9072bcf0e9b.jpg`, widths: [400, 700] },
  "poster-earth-michael": { src: `${CANVAS}/41a3acd2ad39d9f0923ba2fffde5e5b5.jpg`, widths: [400, 700] },
  "poster-manhood": { src: `${CANVAS}/8f00011d91ac6a2e67d427e380774609.jpg`, widths: [400, 700] },
  "poster-heaven": { src: `${CANVAS}/c11114f5b4f7445c85ce4a9c0c426eee.jpg`, widths: [350] }, // low resolution: replace when the original turns up
  // Storytellers (the featured photo next to each quote)
  "story-tyfl": { src: `${MEDIA}/Yahoo Selects/edits-612.jpg`, widths: [600, 1000, 1400] },
  "story-making-the-line": { src: `${ASSETS}/Zilla Barbosa_/Making The Line_NFHL.png`, crop: "1190:744:266:0", widths: [600, 1000] },
  "story-god-of-sight": { src: `${ASSETS}/Cole  Sax_/God of Sight Key Art.png`, crop: "1846:1154:517:0", widths: [600, 1000] },
  "story-amos": { src: `${ASSETS}/Dempsey Rice_/Animatd Mind Oliver with Patient.png`, widths: [600, 1000] },
  "story-daddy": { src: `${ASSETS}/Hannah Myers_/DADDY_still_nonfiction hotlist_2.jpg`, widths: [600, 1000] }
};

// The Yahoo x NFH films (content/yahoo-films.json).
const YAHOO = `${MEDIA}/Yahoo films (from Squarespace)`;
for (const c of JSON.parse(fs.readFileSync(path.join(__dirname, "../../content/yahoo-films.json"), "utf8")).categories)
  for (const f of c.films) IMAGES[f.still] = { src: `${YAHOO}/${f.source}`, widths: [600, 1000] };

if (require.main === module) {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv.slice(2);
  for (const [name, im] of Object.entries(IMAGES)) {
    if (only.length && !only.includes(name)) continue;
    if (!fs.existsSync(im.src)) { console.warn(`skipped ${name}: ${im.src} not found`); continue; }
    for (const w of im.widths) {
      const vf = [im.crop ? `crop=${im.crop}` : null, `scale=${w}:-2:flags=lanczos`].filter(Boolean).join(",");
      execFileSync("ffmpeg", ["-v", "error", "-y", "-i", im.src, "-vf", vf, "-q:v", "4", "-map_metadata", "-1", path.join(OUT, `${name}-${w}.jpg`)]);
    }
    console.log(`${name}: ${im.widths.join(", ")}`);
  }
}
module.exports = { IMAGES };
