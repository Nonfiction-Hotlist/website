// Locks a page behind a password: the whole page is encrypted (AES-GCM, key from the password with
// PBKDF2-SHA256) and replaced by a small password screen that decrypts it in the browser. Without the
// password the published file holds nothing readable. Used for the team dashboards.
//
// The password comes from the DASHBOARD_PASSWORD environment variable (a GitHub secret in the Publish
// workflow), never from the code: the repos are public. Without it (local builds) the page is left as is.
// The list repo has a copy of this file (scripts/lock.js); keep the two the same.
const crypto = require("crypto");

const ITER = 200000;

function lockPage(html, title = "Team dashboard") {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return html;
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(password, salt, ITER, 32, "sha256");
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([c.update(html, "utf8"), c.final(), c.getAuthTag()]);
  const b64 = b => b.toString("base64");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>${title} · Nonfiction Hotlist</title>
<link rel="icon" href="/brand/v1/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/brand/v1/nfh.css">
<style>
  body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: var(--gradient-green-text, #3a5a40); color: #fff; }
  form { width: min(380px, calc(100vw - 32px)); display: flex; flex-direction: column; gap: 14px; }
  h1 { margin: 0 0 6px; font: 700 44px/.95 var(--font-display, sans-serif); letter-spacing: -0.03em; text-transform: lowercase; }
  label { font: 700 14px/18px var(--font-display, sans-serif); letter-spacing: .12em; text-transform: lowercase; color: var(--mint, #c9e3ca); }
  input { min-height: 48px; padding: 0 18px; border: 0; border-radius: 9999px; font: 16px var(--font-body, serif); background: #fff; color: #000; caret-color: #000; }
  button { min-height: 48px; border: 0; border-radius: 6px; background: #fff; color: var(--forest, #3a5a40); font: 700 18px var(--font-display, sans-serif); text-transform: lowercase; cursor: pointer; }
  p { margin: 0; min-height: 22px; font-size: 15px; }
</style>
</head>
<body>
<form id="f">
  <h1>${title.toLowerCase()}</h1>
  <label for="pw">password</label>
  <input id="pw" type="password" autocomplete="current-password" required autofocus>
  <button type="submit">open</button>
  <p id="m" role="status" aria-live="polite"></p>
</form>
<script>
(function () {
  var D = { salt: "${b64(salt)}", iv: "${b64(iv)}", data: "${b64(data)}", iter: ${ITER} };
  var bytes = function (s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); };
  function open(pw, quiet) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveKey"])
      .then(function (k) { return crypto.subtle.deriveKey({ name: "PBKDF2", salt: bytes(D.salt), iterations: D.iter, hash: "SHA-256" }, k, { name: "AES-GCM", length: 256 }, false, ["decrypt"]); })
      .then(function (key) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(D.iv) }, key, bytes(D.data)); })
      .then(function (buf) {
        try { localStorage.setItem("nfhDashPass", pw); } catch (e) {}
        document.open(); document.write(new TextDecoder().decode(buf)); document.close();
      })
      .catch(function () { if (!quiet) document.getElementById("m").textContent = "That password didn't work."; try { if (quiet) localStorage.removeItem("nfhDashPass"); } catch (e) {} });
  }
  var saved = null; try { saved = localStorage.getItem("nfhDashPass"); } catch (e) {}
  if (saved) open(saved, true);
  document.getElementById("f").addEventListener("submit", function (e) { e.preventDefault(); document.getElementById("m").textContent = "Opening…"; open(document.getElementById("pw").value); });
})();
</script>
</body>
</html>
`;
}

module.exports = { lockPage };
