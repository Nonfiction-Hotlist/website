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
