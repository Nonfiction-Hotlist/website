/* Nonfiction Hotlist shared behavior: the menu, the rotating storytellers, the forms and background
   videos. Every part looks for its own markup and does nothing if the page doesn't have it. */
(function () {
  "use strict";

  /* ---------- menu ---------- */
  // The button opens a small panel under it. Escape, a click outside or a second press closes it and
  // returns focus to the button. One submenu is open at a time.
  document.querySelectorAll("[data-nfh-menu-button]").forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute("aria-controls"));
    if (!panel) return;
    function set(open, focusButton) {
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      panel.hidden = !open;
      if (open) { var first = panel.querySelector("button, a"); if (first) first.focus(); }
      else if (focusButton) btn.focus();
    }
    btn.addEventListener("click", function () { set(btn.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) set(false, true);
    });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) set(false);
    });
    // Following a link to a section of this page closes the menu.
    panel.addEventListener("click", function (e) { var a = e.target.closest("a"); if (a && a.hash && a.pathname === location.pathname) set(false); });
    panel.querySelectorAll("[data-nfh-sub]").forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        var open = toggle.getAttribute("aria-expanded") !== "true";
        panel.querySelectorAll("[data-nfh-sub]").forEach(function (t) {
          t.setAttribute("aria-expanded", "false");
          document.getElementById(t.getAttribute("aria-controls")).hidden = true;
        });
        toggle.setAttribute("aria-expanded", String(open));
        document.getElementById(toggle.getAttribute("aria-controls")).hidden = !open;
      });
    });
    // Mark the link for the page you're on.
    var here = location.href.split("#")[0];
    panel.querySelectorAll("a[href]").forEach(function (a) {
      if (a.href.split("#")[0] === here && a.getAttribute("href").indexOf("#") < 0) a.setAttribute("aria-current", "page");
    });
  });

  /* ---------- the bar catching on a section (homepage) ---------- */
  // The bar scrolls away with the hero; when the section marked data-nfh-catch reaches the top of the
  // window, the bar drops in and stays. A spacer holds its place so the page doesn't jump.
  (function () {
    var bar = document.querySelector(".nfh-bar"), mark = document.querySelector("[data-nfh-catch]");
    if (!bar || !mark) return;
    bar.classList.add("nfh-bar--catch");
    var spacer = document.createElement("div");
    bar.parentNode.insertBefore(spacer, bar);
    var stuck = false, ticking = false;
    function update() {
      ticking = false;
      var want = mark.getBoundingClientRect().top <= 0;
      if (want === stuck) return;
      stuck = want;
      spacer.style.height = stuck ? bar.offsetHeight + "px" : "";
      bar.classList.toggle("is-stuck", stuck);
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  })();

  /* ---------- storytellers ---------- */
  // The quotes are in a JSON block next to the markup. Previous and next move the featured quote; the
  // three cards show the quotes after it. The page is built showing the canvas's starting point.
  document.querySelectorAll("[data-nfh-stories]").forEach(function (root) {
    var data = JSON.parse(root.querySelector("script[type='application/json']").textContent);
    var i = Number(root.getAttribute("data-start")) || 0, n = data.items.length;
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var byline = function (q) { return esc(q.by) + (q.title ? ", <em class=\"nfh-title\">" + esc(q.title) + "</em>" : ""); };
    function photo(q, cls) {
      if (!q.photo) return "<div class=\"" + cls + " is-empty\" role=\"img\" aria-label=\"" + esc(q.title || q.by) + "\"><span class=\"nfh-title\">" + esc(q.title || "") + "</span></div>";
      return "<div class=\"" + cls + (q.fit === "contain" ? " is-contain" : "") + "\"><img src=\"" + esc(q.photo.src) + "\" srcset=\"" + esc(q.photo.srcset) + "\" sizes=\"(max-width: 760px) 100vw, 460px\" alt=\"" + esc(q.alt || "") + "\" loading=\"lazy\"></div>";
    }
    function thumb(q) {
      return q.thumb ? "<img src=\"" + esc(q.thumb) + "\" alt=\"\" loading=\"lazy\">" : "<span class=\"is-empty\" aria-hidden=\"true\"></span>";
    }
    function render() {
      var q = data.items[i];
      root.querySelector("[data-count]").textContent = (i + 1) + " of " + n;
      root.querySelector("[data-feature]").innerHTML = photo(q, "nfh-story__photo") +
        "<div class=\"nfh-story__text\">" + root.querySelector("[data-quote-mark]").outerHTML +
        "<blockquote class=\"nfh-story__quote\">" + esc(q.feature) + "</blockquote><figcaption class=\"nfh-story__by\">" + byline(q) + "</figcaption></div>";
      var cards = [];
      for (var k = 1; k <= 3; k++) {
        var c = data.items[(i + k) % n];
        cards.push("<figure class=\"nfh-story-card\">" + thumb(c) + "<div><blockquote>“" + esc(c.short) + "”</blockquote><figcaption>" + byline(c) + "</figcaption></div></figure>");
      }
      root.querySelector("[data-cards]").innerHTML = cards.join("");
    }
    root.querySelector("[data-prev]").addEventListener("click", function () { i = (i - 1 + n) % n; render(); });
    root.querySelector("[data-next]").addEventListener("click", function () { i = (i + 1) % n; render(); });
  });

  /* ---------- forms ---------- */
  // Forms send their fields to the forms script (drive-kit/forms.gs in the website repo) and show its
  // reply in place. Without JavaScript the browser posts to the script and lands on its thank-you page.
  document.querySelectorAll("form[data-nfh-form]").forEach(function (form) {
    if (form.elements._t) form.elements._t.value = Date.now();
    if (form.elements._page) form.elements._page.value = location.href;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = form.querySelector(".nfh-form__msg"), btn = form.querySelector("button[type=submit]"), data = { _js: 1 };
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      btn.disabled = true; msg.className = "nfh-form__msg"; msg.textContent = "Sending…";
      fetch(form.action, { method: "POST", body: JSON.stringify(data) })
        .then(function (r) { return r.json(); })
        .then(function (r) {
          if (r.ok) { form.classList.add("sent"); msg.textContent = form.getAttribute("data-thanks"); }
          else { msg.className = "nfh-form__msg error"; msg.textContent = r.error || "Something went wrong. Please try again."; btn.disabled = false; }
        })
        .catch(function () { msg.className = "nfh-form__msg error"; msg.textContent = "Couldn't send. Please try again, or email info@nonfictionhotlist.com."; btn.disabled = false; });
    });
  });

  /* ---------- badge ---------- */
  // One loop draws the whole badge each frame: the ring's spin, the tilt and the shadow. Everything eases
  // toward where the pointer says it should be, so it never jumps. The badge tips as if pressed down
  // under the pointer, lifting the far side and casting a shadow away from it. Off for reduced motion.
  var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  document.querySelectorAll(".nfh-badge").forEach(function (b) {
    var svg = b.querySelector(".nfh-badge__disc") || b.querySelector("svg"), ring = b.querySelector(".ring");
    if (calm || !svg || !ring) return;
    b.classList.add("is-live");
    var MAX = 20, SLOW = 360 / 28, FAST = 360 / 9;
    var cur = { rx: 0, ry: 0, up: 0, spd: SLOW }, aim = { rx: 0, ry: 0, up: 0, spd: SLOW };
    var angle = 0, last = 0, seen = true, running = false;
    function frame(now) {
      var dt = Math.min(0.05, last ? (now - last) / 1000 : 0); last = now;
      var k = 1 - Math.exp(-dt * 7);                 // easing: about a third of a second to settle
      ["rx", "ry", "up"].forEach(function (p) { cur[p] += (aim[p] - cur[p]) * k; });
      cur.spd += (aim.spd - cur.spd) * (1 - Math.exp(-dt * 2.5));   // spin speeds up and slows gently
      angle = (angle + cur.spd * dt) % 360;
      ring.style.transform = "rotate(" + angle.toFixed(2) + "deg)";   // turns about the centre set in the CSS
      var u = cur.up;
      svg.style.transform = "perspective(560px) rotateX(" + cur.rx.toFixed(2) + "deg) rotateY(" + cur.ry.toFixed(2) + "deg)";
      svg.style.filter = u < 0.01 ? "" : "drop-shadow(" + (-cur.ry * 0.6).toFixed(1) + "px " + (6 + 12 * u + cur.rx * 0.4).toFixed(1) + "px " + (8 + 16 * u).toFixed(1) + "px rgba(10,20,15," + (0.42 * u).toFixed(3) + "))";
      if (seen) requestAnimationFrame(frame); else { running = false; last = 0; }
    }
    function start() { if (!running) { running = true; requestAnimationFrame(frame); } }
    function point(e) {
      var r = b.getBoundingClientRect();
      var dx = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width / 2)));
      var dy = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height / 2)));
      aim.rx = -dy * MAX; aim.ry = dx * MAX; aim.up = 1; aim.spd = FAST;
    }
    if (fine) {
      b.addEventListener("pointerenter", point);
      b.addEventListener("pointermove", point);
      b.addEventListener("pointerleave", function () { aim.rx = 0; aim.ry = 0; aim.up = 0; aim.spd = SLOW; });
    }
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) {
      seen = e[0].isIntersecting; if (seen) start();
    }).observe(b);
    b.addEventListener("focus", function () { aim.spd = FAST; });
    b.addEventListener("blur", function () { aim.spd = SLOW; });
    start();
  });

  /* ---------- trial: studio lines and parallax ---------- */
  // Only on pages whose body has class nfh-studio. Each section casts a shadow up onto the one above
  // it, as if it were sliding over the top: as its edge rises up the screen the shadow grows longer
  // and darker, and it keeps stretching until the section above has gone. Scrolling back up reverses
  // it. Inside, a few layers move at slightly different speeds: the big outlined years drift deepest,
  // photos a little, headlines barely. The intro's words rise a touch slower than the page as it
  // scrolls away.
  if (document.body.classList.contains("nfh-studio")) {
    // The window's height, held steady while a phone's address bar slides in and out as you scroll
    // (which would otherwise nudge everything); it updates when the window really changes size.
    var VH = window.innerHeight, VW = window.innerWidth;
    window.addEventListener("resize", function () {
      if (window.innerWidth !== VW || Math.abs(window.innerHeight - VH) > 160) { VW = window.innerWidth; VH = window.innerHeight; }
    });
    var calm2 = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var secs2 = [].slice.call(document.querySelectorAll("main > section"));
    var lined = secs2.slice(1);
    // The shadow lives at the bottom of the section above each line, so it covers that section.
    // White sections take no shadow.
    var washes = lined.map(function (sec, i) {
      if (secs2[i].classList.contains("nfh-ground-white")) return null;
      var w = document.createElement("div");
      w.className = "nfh-wash"; w.setAttribute("aria-hidden", "true");
      secs2[i].appendChild(w);
      return w;
    });
    var barEl = document.querySelector(".nfh-bar");
    // [element, measured against, speed]. Positive speed moves with the scroll, negative against it.
    var layers = [];
    var add = function (sel, speed) { document.querySelectorAll(sel).forEach(function (el) { layers.push([el, el.closest("section") || el.parentNode, speed]); }); };
    if (!calm2) {
      add("main > section + section .nfh-year", -0.16);
      add("main > section + section .nfh-ground-photo__media, .split__photo img, .program__photo img", 0.07);
      add("main > section + section h2.nfh-h", -0.035);
    }
    var hero2 = secs2[0], heroIn = hero2 && hero2.querySelector(".hero__frame");
    var tick2 = false, drawDot = null, knockDown = function () { return false; };
    var draw2 = function () {
      tick2 = false;
      var vh = VH;
      // From when a section's edge is low on the screen until it reaches the bar, the shadow it casts
      // on the section above only grows: longer (up to most of a screen) and darker.
      var barH = barEl ? Math.max(0, barEl.getBoundingClientRect().bottom) : 0;
      lined.forEach(function (sec, i) {
        if (!washes[i]) return;
        var top = sec.getBoundingClientRect().top, start = vh * 0.92;
        var p = Math.max(0, Math.min(1, (start - top) / Math.max(1, start - barH)));
        var e = 1 - Math.pow(1 - p, 1.6);
        var reach = Math.min(secs2[i].offsetHeight, vh * 0.85);
        washes[i].style.height = (reach * (0.15 + 0.85 * e)).toFixed(1) + "px";
        washes[i].style.opacity = Math.min(1, e * 1.15).toFixed(3);
        washes[i].style.visibility = p > 0 && top > -50 ? "visible" : "hidden";
      });
      layers.forEach(function (L) {
        var r = L[1].getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var flat = L[0].tagName === "H2" || L[0].classList.contains("nfh-year");
        var off = (r.top + r.height / 2 - vh / 2) * L[2];
        // A photo is drawn 12% larger than its frame; it never drifts further than that spare 6% allows.
        if (!flat) { var room = L[0].offsetHeight * 0.05; off = Math.max(-room, Math.min(room, off)); }
        L[0].style.transform = "translate3d(0," + off.toFixed(1) + "px,0)" + (flat ? "" : " scale(1.12)");
      });
      if (heroIn && !calm2) {
        var y = Math.max(0, -hero2.getBoundingClientRect().top);
        heroIn.style.transform = "translate3d(0," + (y * 0.18).toFixed(1) + "px,0)";
        heroIn.style.opacity = Math.max(0, 1 - y / (vh * 0.9)).toFixed(3);
      }
      if (drawDot) drawDot();   // the travelling period, placed after everything it follows has moved
    };
    var ask2 = function () { if (!tick2) { tick2 = true; requestAnimationFrame(draw2); } };
    window.addEventListener("scroll", ask2, { passive: true });
    window.addEventListener("resize", ask2);
    window.addEventListener("load", ask2);
    draw2();

    /* ---------- the travelling period ---------- */
    // One dot stands in for the full stop at the end of each headline. It sits exactly where each
    // period would be, holds there, and as you scroll travels on to the next one, with its own move
    // for every leg. Its colour comes from the section it's over: crossing a section line, the part of
    // the dot past the line takes the next section's colour, with a crisp edge (no fading). Scrolling
    // back up plays it all in reverse. Text, photos and cards sit above it (it slips behind them)
    // except on legs marked front. Off for reduced motion: the periods stay as type.
    (function () {
      var root = getComputedStyle(document.documentElement);
      var tok = function (n, f) { return (root.getPropertyValue(n) || "").trim() || f; };
      var GLOW = tok("--green-glow", "#5c965e"), WHITE = tok("--white", "#ffffff"), SPARK = tok("--spark", "#fcb100");
      var $ = function (sel) { return document.querySelector(sel); };
      var all = function (sel) { return [].slice.call(document.querySelectorAll(sel)); };

      // Wrap each headline's final "." in a span (adding one where the headline has none), with a
      // zero-size marker on its baseline so the dot can find exactly where the period sits.
      var stop = function (sel, addOne) {
        var h = $(sel); if (!h) return null;
        var walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT), t, last = null;
        while ((t = walker.nextNode())) if (t.nodeValue.trim()) last = t;
        if (!last) return null;
        var span = document.createElement("span");
        span.className = "nfh-stop"; span.innerHTML = '.<i class="nfh-stop__base"></i>';
        if (/\.\s*$/.test(last.nodeValue)) last.nodeValue = last.nodeValue.replace(/\.\s*$/, "");
        else if (!addOne) return null;
        last.parentNode.insertBefore(span, last.nextSibling);
        return { el: span, text: last, color: getComputedStyle(span.parentNode).color };
      };
      var T = {
        hero: stop(".hero h1"), momentum: stop(".momentum h2"), y2026: stop(".edition--2026 h2"),
        about: stop("#about h2", true), wwd: stop(".wwd h2", true), values: stop(".values h2"),
        programs: stop(".programs h2"), y2025: stop(".edition--2025 h2", true), subscribe: stop("#subscribe h2", true)
      };
      if (calm2) return;      // the periods stay as ordinary type
      document.body.classList.add("nfh-dotted");
      var dot = document.createElement("div");
      dot.className = "nfh-dot"; dot.setAttribute("aria-hidden", "true");
      // The burst disc of the "almost here" move lives inside the momentum section, so the black 2026
      // section slides over it as you scroll on.
      // Three bursts, one after another, each over the last: green, then gold, then white.
      var momSec = $(".momentum");
      var BURSTS = [{ c: GLOW, from: 0, to: 0.46, cx: 0.58 }, { c: SPARK, from: 0.27, to: 0.73, cx: 0.42 }, { c: WHITE, from: 0.54, to: 1, cx: 0.52 }].map(function (b) {
        var el = document.createElement("div");
        el.className = "nfh-burst"; el.setAttribute("aria-hidden", "true"); el.style.background = b.c;
        b.el = el; return b;
      });
      // First in the section, in order, so each paints over the one before and all sit under the words.
      if (momSec) BURSTS.slice().reverse().forEach(function (b) { momSec.insertBefore(b.el, momSec.firstChild); });
      document.body.appendChild(dot);

      // The dot's colour in each section: the colour of that section's headline period, except "what
      // we do" (brand green) and the storytellers (white while it's the arrow button, gold once it
      // slides out from behind it).
      var secs = all("main > section, .nfh-footer");
      var colorOf = secs.map(function (sec) {
        if (sec.classList.contains("wwd")) return GLOW;
        if (sec.classList.contains("stories")) return "stories";
        if (sec.classList.contains("nfh-footer")) return WHITE;
        for (var k in T) if (T[k] && sec.contains(T[k].el)) return T[k].color;
        return WHITE;
      });

      // Where a headline's period sits on screen: the "." glyph's box, measured from the font.
      var cv = document.createElement("canvas").getContext("2d");
      var period = function (S) {
        var cs = getComputedStyle(S.el), base = S.el.lastChild.getBoundingClientRect(), r = S.el.getBoundingClientRect();
        cv.font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
        var m = cv.measureText(".");
        var w = m.actualBoundingBoxRight + m.actualBoundingBoxLeft, h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
        return { x: r.left + (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2, y: base.top - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2, d: (w + h) / 2 };
      };
      // The box of the last letter before a period (the "d" of "invited").
      var lastLetter = function (S) {
        var n = S.text, k = n.nodeValue.replace(/\s+$/, "").length, rg = document.createRange();
        rg.setStart(n, Math.max(0, k - 1)); rg.setEnd(n, k); return rg.getBoundingClientRect();
      };
      var rect = function (el) { return el.getBoundingClientRect(); };
      var vw = function () { return document.documentElement.clientWidth; };
      var lastD = 18;   // waypoints between periods keep the size of the period before them

      // The route. Each stop: where the dot is (on screen, now); its anchor on the page and when it
      // arrives ("at": when the anchor is that far down the window) and leaves ("off"); "front" to pass
      // over things instead of behind; "go", how it travels on to the next stop.
      var R = [], add = function (o) { R.push(o); return o; };
      var P = function (key, o) { if (!T[key]) return; o.pos = function () { var p = period(T[key]); lastD = p.d; return p; }; o.anchor = function () { return T[key].el; }; o.text = true; return add(o); };
      var at = function (el, fn, o) { o.pos = fn; o.anchor = function () { return el; }; return add(o); };

      P("hero", { at: -9, off: 0.3, go: "drop", keepSize: true });
      P("momentum", { go: "burst", min: 0 });
      P("y2026", { go: "drop", min: 0.34 });
      // about: a little squiggling flight down to the last format chip, then it pinballs right to left
      // across the chips and swings up into "what we do."
      var photo = $("#about .split__photo"), aboutSec = $("#about"), chips = all(".wwd .nfh-chip");
      P("about", { go: "pinball", front: true });
      // what we do: swells to five times its size, then falls under its own weight, still big, behind
      // the cards and into the edge of the values photo; then it rolls out from behind the "d" of
      // "invited" into place.
      var cards = all(".wwd .nfh-card"), card4 = cards[2] || cards[cards.length - 1], valuesSec = $(".values");
      P("wwd", { go: "tumble", at: 0.66, off: 0.56, hold: 0.15, min: 0.6 });
      if (T.values) {
        at(valuesSec, function () { var p = period(T.values), l = lastLetter(T.values); return { x: l.left + l.width / 2, y: p.y, d: p.d }; }, { at: 0.6, off: 0.6, min: 0.7, go: "rollout" });
        P("values", { front: true, at: 0.62, off: 0.5, hold: 0.12, min: 0.12, go: "loop" });
      }
      // A loop-the-loop on the way to the white "next" button in the storytellers, which it becomes (same
      // centre, same size, just behind it); then it slides straight down out from behind it as a gold
      // disc and flies on.
      var next = $(".stories__btn--next");
      if (next) at(next, function () { var r = rect(next); return { x: r.left + r.width / 2, y: r.top + r.height / 2, d: r.width, button: true }; }, { at: 0.48, off: 0.3, min: 0.2, hold: 0.15, go: "slideout" });
      P("programs", { go: "fly", bend: -1 });                      // behind the program photos
      var readBtn = $("#list2025 .edition__aside .nfh-btn");
      if (readBtn) {
        // Slides over to "read the list", knocks on it twice, then drops down to "subscribe."
        P("y2025", { go: "line", off: 0.5 });
        // It knocks on the button's left side, or on its top where the button sits against the page edge.
        knockDown = function () { return rect(readBtn).left <= lastD + 16; };
        var knock = function () {
          var r = rect(readBtn);
          return !knockDown() ? { x: r.left - lastD / 2 - 1, y: r.top + r.height / 2, d: lastD } : { x: r.left + 28, y: r.top - lastD / 2 - 1, d: lastD, down: true };
        };
        at(readBtn, knock, { at: 0.55, off: 0.55, min: 0.1, go: "knock" });
        at(readBtn, knock, { at: 0.45, off: 0.45, min: 0.16, go: "bounce" });
      } else P("y2025", { go: "bounce" });
      P("subscribe", { at: 0.62, off: 99, go: null });

      var lerp = function (a, b, t) { return a + (b - a) * t; };
      var clamp01 = function (t) { return Math.max(0, Math.min(1, t)); };
      var smooth = function (t) { return t * t * (3 - 2 * t); };
      var part = function (t, a, b) { return clamp01((t - a) / (b - a)); };
      var bounceOut = function (t) {
        var n = 7.5625, d = 2.75;
        if (t < 1 / d) return n * t * t;
        if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
        if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
        return n * (t -= 2.625 / d) * t + 0.984375;
      };
      var along = function (pts, t) {
        var len = [], tot = 0, i;
        for (i = 1; i < pts.length; i++) { var l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); len.push(l); tot += l; }
        var g = t * tot;
        for (i = 1; i < pts.length; i++) { if (g <= len[i - 1] || i === pts.length - 1) { var f = len[i - 1] ? Math.min(1, g / len[i - 1]) : 1; return { x: lerp(pts[i - 1].x, pts[i].x, f), y: lerp(pts[i - 1].y, pts[i].y, f) }; } g -= len[i - 1]; }
        return pts[pts.length - 1];
      };
      var bez = function (a, b, c, d, t) { var u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };

      // How the dot gets from A to B over t (0 to 1). Each returns x, y and optionally d (size; else
      // it eases from A's to B's), clipBelow / clipLeft (screen lines it's hidden past), back/front.
      var MOVES = {
        drop: function (A, B, t, L) {
          var p = { x: lerp(A.x, B.x, smooth(t)), y: lerp(A.y, B.y, t * t) };
          if (L.keepSize) p.d = t < 0.85 ? A.d : lerp(A.d, B.d, smooth((t - 0.85) / 0.15));   // its own size until it lands
          return p;
        },
        // Bursts: a disc in the "almost here" green pops out of the period and grows until it nearly
        // fills the momentum section (and stays there, under the black section that follows), while a
        // normal-size dot drops out of it, on top, into place.
        burst: function (A, B, t) {
          var p = t < 0.5 ? { x: A.x, y: A.y } : (function () { var u = part(t, 0.5, 1); return { x: lerp(A.x, B.x, smooth(u)), y: lerp(A.y, B.y, u * u) }; })();
          p.front = true;
          return p;
        },
        // A rollercoaster loop, upside down: it dives into a tall, teardrop-shaped loop below its path,
        // slows as it rounds the bottom, and comes out the other side; then it eases in behind the
        // button, growing to its size.
        loop: function (A, B, t) {
          // Forward travel nearly pauses while it goes round, so the loop is a real loop.
          var s0 = 0.22, s1 = 0.78, m = 0.4;
          var v = t < s0 ? m * smooth(t / s0) : t < s1 ? m + 0.08 * (t - s0) / (s1 - s0) : lerp(m + 0.08, 1, smooth((t - s1) / (1 - s1)));
          var x = lerp(A.x, B.x, v), y = lerp(A.y, B.y, v), s = part(t, s0, s1), Rx = Math.min(70, vw() * 0.09), Ry = Rx * 1.6;
          if (s > 0 && s < 1) { var a = 2 * Math.PI * (s + Math.sin(2 * Math.PI * s) / (2 * Math.PI) * 0.6); x += Rx * Math.sin(a); y += Ry * (1 - Math.cos(a)) * (0.75 + 0.25 * Math.cos(a / 2) * Math.cos(a / 2)); }
          return { x: x, y: y, d: lerp(A.d, B.d, Math.pow(t, 3)), back: t > 0.85, free: s > 0 && s < 1 };
        },
        line: function (A, B, t) { var u = smooth(t); return { x: lerp(A.x, B.x, u), y: lerp(A.y, B.y, u) }; },
        // A swooping flight: a curve that bows out to one side of the straight line.
        fly: function (A, B, t, L) {
          var u = smooth(t), dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, k = Math.min(260, len * 0.45) * (L.bend || 1);
          var nx = -dy / len * k, ny = dx / len * k;
          return { x: bez(A.x, A.x + dx * 0.2 + nx, A.x + dx * 0.75 + nx * 0.6, B.x, u), y: bez(A.y, A.y + dy * 0.2 + ny, A.y + dy * 0.75 + ny * 0.6, B.y, u) };
        },
        hops: function (A, B, t, L) { var n = L.hops || 3; return { x: lerp(A.x, B.x, t), y: lerp(A.y, B.y, t) - Math.abs(Math.sin(Math.PI * n * t)) * (L.hop || 60) }; },
        bounce: function (A, B, t) { return { x: lerp(A.x, B.x, smooth(Math.min(1, t * 1.4))), y: lerp(A.y, B.y, bounceOut(t)) }; },
        seam: function (A, B, t, L) {
          var pts = [A].concat(L.via(A, B)), u = smooth(t);
          if (u < 0.6) return along(pts, u / 0.6);
          var v = (u - 0.6) / 0.4, s = pts[pts.length - 1];       // off the end of the seam, a hop out to the chips
          return { x: lerp(s.x, B.x, v), y: lerp(s.y, B.y, v) - Math.sin(Math.PI * v) * 90 };
        },
        // Across to the seam between panel and photo, down the seam, a hop out to the last format chip,
        // pinballing right to left across the chips, then a swing up into "what we do."
        pinball: function (A, B, t) {
          var p = rect(photo), a = rect(aboutSec), sx = p.left > 10 ? p.left : vw() - 32, r = A.d / 2;
          var tops = chips.map(function (c) { var q = rect(c); return { x: q.left + q.width / 2, y: q.top - r }; }).reverse();
          var first = tops.length ? tops[0] : B;
          if ((t < 0.48 || !tops.length) && vw() < 700) {          // phones: no room for loops, a simple arc
            var w1 = tops.length ? part(t, 0, 0.48) : t, e1 = smooth(w1);
            return { x: lerp(A.x, first.x, e1), y: lerp(A.y, first.y, e1) - Math.sin(Math.PI * e1) * 60 };
          }
          if (t < 0.48 || !tops.length) {
            // Two cursive loops on the way down to "reality", curling up above its path, like a
            // handwritten "ll" (the coaster loop later dives below instead).
            var w = tops.length ? part(t, 0, 0.48) : t, dx = first.x - A.x, dy = first.y - A.y, len = Math.hypot(dx, dy) || 1;
            var ux = dx / len, uy = dy / len, nx = uy, ny = -ux;          // along the path, and across it
            if (ny > 0) { nx = -nx; ny = -ny; }                             // "across" always points up the screen
            // Forward travel slows while it goes round each loop, so the loops close.
            var R = Math.max(44, Math.min(130, len * 0.13)), a = 2 * Math.PI * 2 * w;
            var v = w - Math.sin(4 * Math.PI * w) / (4 * Math.PI) * 0.97;
            var al = -R * Math.sin(a) * 0.8, ac = R * (1 - Math.cos(a));
            var bx = lerp(A.x, first.x, v), by = lerp(A.y, first.y, v);
            return { x: bx + ux * al + nx * ac, y: by + uy * al + ny * ac, free: true };
          }
          if (t < 0.84) {
            var h = part(t, 0.48, 0.84) * (tops.length - 1), k = Math.min(tops.length - 2, Math.floor(h)), f = h - k;
            if (tops.length < 2) return tops[0];
            return { x: lerp(tops[k].x, tops[k + 1].x, f), y: lerp(tops[k].y, tops[k + 1].y, f) - Math.sin(Math.PI * f) * 46 };
          }
          var e = smooth(part(t, 0.84, 1)), L0 = tops[tops.length - 1];
          return { x: lerp(L0.x, B.x, e), y: lerp(L0.y, B.y, e) - Math.sin(Math.PI * e) * 120 };
        },
        // Swells to five times its size, sitting on the baseline; hangs there a moment; then drops
        // straight down under its own weight, still big, behind the cards and into the values photo's
        // edge, where it disappears.
        tumble: function (A, B, t) {
          var D = A.d * 5, base = A.y + A.d / 2, vt = rect(valuesSec).top;
          // If the headline has scrolled up near the bar, it swells and falls from just below the bar.
          var floorTop = (barEl ? Math.max(0, barEl.getBoundingClientRect().bottom) : 0) + 12;
          base = Math.max(base, floorTop + D);
          if (t < 0.3) { var g = smooth(t / 0.3), d1 = lerp(A.d, D, g); return { x: A.x, y: base - d1 / 2, d: d1 }; }
          if (t < 0.4) { var sag = Math.sin(Math.PI * part(t, 0.3, 0.4)) * 4; return { x: A.x, y: base - D / 2 + sag, d: D }; }
          if (t < 0.92) { var f = part(t, 0.4, 0.92); return { x: A.x, y: lerp(base - D / 2, vt + D * 0.6, f * f), d: D, clipBelow: vt, back: true, free: true }; }
          return { x: B.x, y: B.y, hidden: true };
        },
        rollout: function (A, B, t) { var u = smooth(t), l = lastLetter(T.values); return { x: lerp(A.x, B.x, u), y: lerp(A.y, B.y, u), clipLeft: l.right - 1, front: true }; },
        slideout: function (A, B, t, L) {
          var s = A.d * 1.25;
          if (t < 0.3) { var u = smooth(t / 0.3); return { x: A.x, y: A.y + s * u, d: A.d, gold: true, back: true }; }  // straight down from behind the button
          var v = (t - 0.3) / 0.7, S2 = { x: A.x, y: A.y + s };
          var p = MOVES.fly(S2, B, v, { bend: -1 }); p.d = lerp(A.d, B.d, smooth(v)); p.gold = true; return p;
        },
        knock: function (A, B, t) { var k = Math.abs(Math.sin(Math.PI * 2 * t)) * 16; return A.down ? { x: A.x, y: A.y - k, nudge: k } : { x: A.x - k, y: A.y, nudge: k }; }
      };

      var draw = function () {
        var vh = VH, sy = window.scrollY || window.pageYOffset;
        var prevOff = -Infinity, legs = R.map(function (L) {
          var y = rect(L.anchor()).top + sy;
          var a = L.at === -9 ? -Infinity : y - vh * (L.at == null ? 0.72 : L.at);
          a = Math.max(a, prevOff + vh * (L.min || 0.15));
          // A period always holds its place for at least a quarter of a screen of scrolling.
          var o = Math.max(a + vh * (L.hold != null ? L.hold : L.text && L.off !== 99 ? 0.25 : 0), y - vh * (L.off == null ? 0.34 : L.off));
          prevOff = o; return { at: a, off: o };
        });
        var i = 0;
        while (i < R.length - 1 && sy >= legs[i].off) i++;
        var p, front, gold = false, goNow = null;
        if (i === 0 || sy >= legs[i].at) { p = R[i].pos(); front = R[i].front; }
        else {
          var j = i - 1, t = clamp01((sy - legs[j].off) / Math.max(1, legs[i].at - legs[j].off));
          var A = R[j].pos(), B = R[i].pos();
          goNow = R[j].go;
          p = MOVES[R[j].go || "line"](A, B, t, R[j]);
          if (p.d == null) p.d = lerp(A.d, B.d, smooth(t));
          gold = !!p.gold;
          front = p.front || (!p.back && (R[j].go === "hops" || (t < 0.5 ? R[j].front : R[i].front)));
          // While travelling (and visible) it stays on screen, below the bar.
          if (!p.hidden && !p.free && p.clipBelow == null && p.clipLeft == null && R[j].go !== "knock") {
            var top0 = (barEl ? Math.max(0, barEl.getBoundingClientRect().bottom) : 0) + p.d / 2 + 12;
            p.y = Math.max(top0, Math.min(vh - p.d / 2 - 12, p.y));
            p.x = Math.max(p.d / 2 + 8, Math.min(vw() - p.d / 2 - 8, p.x));
          }
        }
        var d = Math.max(2, p.d), x0 = p.x - d / 2, y0 = p.y - d / 2, y1 = y0 + d;
        // Colour by section, split crisply at any section line it's crossing.
        var stops = [], cur = null;
        secs.forEach(function (sec, k) {
          var r = rect(sec);
          if (r.bottom <= y0 || r.top >= y1) return;
          var c = colorOf[k] === "stories" ? (gold ? SPARK : WHITE) : colorOf[k];
          stops.push(c + " " + Math.max(0, r.top - y0).toFixed(1) + "px " + Math.min(d, r.bottom - y0).toFixed(1) + "px");
          cur = c;
        });
        // Hidden past a line: below the values photo's edge as it falls in, left of the "d" as it rolls out.
        var cb = p.clipBelow != null ? Math.max(0, y1 - p.clipBelow) : 0, cl = p.clipLeft != null ? Math.max(0, p.clipLeft - x0) : 0;
        dot.style.visibility = p.hidden || cb >= d || cl >= d ? "hidden" : "visible";
        dot.style.clipPath = cb || cl ? "inset(0 0 " + cb.toFixed(1) + "px " + cl.toFixed(1) + "px)" : "";
        dot.style.width = dot.style.height = d.toFixed(2) + "px";
        // Placed on the page (not the screen), so scrolling carries it in step with the text it sits in.
        dot.style.transform = "translate3d(" + x0.toFixed(2) + "px," + (y0 + sy).toFixed(2) + "px,0)";
        dot.style.background = stops.length > 1 ? "linear-gradient(to bottom, " + stops.join(", ") + ")" : (cur || WHITE);
        dot.classList.toggle("is-front", !!front);
        // The bursts start while the period is still sitting in "momentum." and run into the first part
        // of the trip to "here."; each then stays put inside the section.
        var bi = R.findIndex(function (L) { return L.go === "burst"; });
        if (momSec && bi >= 0 && bi + 1 < legs.length) {
          var b0 = lerp(legs[bi].at, legs[bi].off, 0.25), b1 = lerp(legs[bi].off, legs[bi + 1].at, 0.6);
          var bt = clamp01((sy - b0) / Math.max(1, b1 - b0));
          var mr = rect(momSec), o = period(T.momentum), big = Math.hypot(mr.width, mr.height) * 1.1;
          var back = function (x) { var c = 1.4, k = x - 1; return 1 + (c + 1) * k * k * k + c * k * k; };   // overshoots a touch, then settles
          BURSTS.forEach(function (b) {
            var g = part(bt, b.from, b.to), el = b.el;
            if (g <= 0) { el.style.visibility = "hidden"; return; }
            var hd = Math.max(o.d, big * Math.min(1.04, back(g)));
            var hx = lerp(o.x, mr.left + mr.width * b.cx, smooth(g)) - mr.left, hy = lerp(o.y, mr.bottom, smooth(g)) - mr.top;
            el.style.visibility = "visible";
            el.style.width = el.style.height = hd.toFixed(1) + "px";
            el.style.transform = "translate3d(" + (hx - hd / 2).toFixed(1) + "px," + (hy - hd / 2).toFixed(1) + "px,0)";
          });
        }
        // The format chips dip a little each time the dot lands on one.
        chips.forEach(function (c) {
          var n = 0;
          if (goNow === "pinball") {
            var r = c.getBoundingClientRect(), gap = r.top - (p.y + d / 2);
            if (p.x > r.left && p.x < r.right && gap > -6 && gap < 8) n = (1 - Math.max(0, gap) / 8) * 4;
          }
          c.style.transform = n ? "translateY(" + n.toFixed(2) + "px)" : "";
        });
        // "read the list" gives a little each time it's knocked.
        if (readBtn) {
          var n = p.nudge != null ? Math.max(0, 1 - p.nudge / 6) * 5 : 0, dn = knockDown();
          readBtn.style.transform = n ? (dn ? "translateY(" : "translateX(") + n.toFixed(2) + "px)" : "";
        }
      };
      drawDot = draw;
      // Scrolling redraws it in the same frame as the parallax (draw2 calls it), so it can't lag a
      // frame behind a moving headline.
      var tick = false;
      var ask = function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; draw(); }); } };
      window.addEventListener("resize", ask);
      window.addEventListener("load", ask);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(ask);
      draw();
    })();
  }

  /* ---------- background video ---------- */
  // Plays only while on screen, and not at all for visitors whose device asks for less motion
  // (they see the still).
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("video[data-nfh-bg]").forEach(function (v) {
    if (still) { v.pause(); v.removeAttribute("autoplay"); v.preload = "none"; return; }
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (e) { e[0].isIntersecting ? v.play().catch(function () {}) : v.pause(); }).observe(v);
  });
})();
