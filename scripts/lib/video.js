// Makes the web versions of a video, the way the site serves them (content/video/):
//   <name>-1080.mp4   1920x1080, for wider screens
//   <name>-720.mp4    1280x720, for phones and tablets
//   <name>.jpg        the first frame, shown while the video loads and to visitors who prefer less motion
// H.264 (plays everywhere), no sound (background videos are muted), a keyframe every 2 seconds, and
// "faststart" so playback begins before the whole file has arrived. Needs ffmpeg (FFMPEG=/path, or on PATH).
//
//   node scripts/lib/video.js INPUT.mp4 NAME     (writes into content/video/)
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const FFMPEG = process.env.FFMPEG || "ffmpeg";
const OUT = path.resolve(__dirname, "..", "..", "content", "video");
const MAX_SECONDS = 60;          // background videos loop; anything longer belongs on Vimeo or YouTube
const MAX_MB = 20;               // per web version

// Site file names: lower case, words joined by dashes. "Nonfiction Hotlist..mp4" -> "nonfiction-hotlist"
const videoName = file => path.basename(String(file), path.extname(String(file))).normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "video";

const hasFfmpeg = () => { try { execFileSync(FFMPEG, ["-version"], { stdio: "ignore" }); return true; } catch (e) { return false; } };

// ffmpeg prints a file's details, including "Duration: 00:00:30.53", on stderr.
function durationOf(input) {
  const r = spawnSync(FFMPEG, ["-i", input], { encoding: "utf8" });
  const m = String(r.stderr || "").match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
}

// Returns { files, problems }. Nothing is written if the video breaks a rule.
function encode(input, name, outDir = OUT) {
  const problems = [];
  const secs = durationOf(input);
  if (!secs) return { files: [], problems: ["couldn't read the video"] };
  if (secs > MAX_SECONDS) return { files: [], problems: [`is ${Math.round(secs)} seconds; background videos can be up to ${MAX_SECONDS}. Longer videos belong on Vimeo or YouTube, placed with [embed: link]`] };
  fs.mkdirSync(outDir, { recursive: true });
  const tmp = path.join(outDir, `.${name}-encoding`);
  fs.mkdirSync(tmp, { recursive: true });
  const run = args => execFileSync(FFMPEG, ["-v", "error", "-y", "-i", input, ...args], { stdio: ["ignore", "ignore", "pipe"] });
  const versions = [["1080", 1920, 1080, 28], ["720", 1280, 720, 27]];
  try {
    for (const [label, w, h, crf] of versions) {
      // Scale to cover the frame, then crop to exactly 16:9, so any shape of export works.
      run(["-an", "-vf", `scale=${w}:${h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${w}:${h}`, "-c:v", "libx264", "-preset", "slow",
        "-crf", String(crf), "-profile:v", "high", "-pix_fmt", "yuv420p", "-g", "48", "-movflags", "+faststart", path.join(tmp, `${name}-${label}.mp4`)]);
      const mb = fs.statSync(path.join(tmp, `${name}-${label}.mp4`)).size / 1e6;
      if (mb > MAX_MB) problems.push(`the ${label}p version is ${mb.toFixed(1)} MB, over ${MAX_MB} MB; export a shorter or simpler clip`);
    }
    run(["-frames:v", "1", "-vf", "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720", "-q:v", "3", path.join(tmp, `${name}.jpg`)]);
    if (problems.length) return { files: [], problems };
    const files = fs.readdirSync(tmp).map(f => { fs.renameSync(path.join(tmp, f), path.join(outDir, f)); return path.join(outDir, f); });
    return { files, problems };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

module.exports = { encode, videoName, hasFfmpeg, MAX_SECONDS };

if (require.main === module) {
  const [input, name] = process.argv.slice(2);
  if (!input) { console.error("usage: node scripts/lib/video.js INPUT NAME"); process.exit(1); }
  const r = encode(input, name || videoName(input));
  if (r.problems.length) { console.error(r.problems.join("\n")); process.exit(1); }
  r.files.forEach(f => console.log(`${path.relative(process.cwd(), f)}  ${(fs.statSync(f).size / 1e6).toFixed(1)} MB`));
}
