// Visit counting with GoatCounter (no cookies, no personal data), the same account as the Hotlist lists.
// Website pages count under /site/ ("/site/news/") so they never mix with the lists' paths (2025 counts
// without a prefix). A browser with localStorage "skipgc" set (the dashboards' "don't count me" switch)
// is skipped. Dashboards don't load this.
const GOATCOUNTER = "https://nonfictionhotlist.goatcounter.com/count";
const analyticsHTML = `<script>
  window.goatcounter = { path: function (p) { return "/site" + p; } };
  try { if (localStorage.getItem("skipgc") === "t") window.goatcounter.no_onload = true; } catch (e) {}
</script>
<script data-goatcounter="${GOATCOUNTER}" async src="https://gc.zgo.at/count.js"></script>`;
module.exports = { analyticsHTML };
