/* Pre-paint theme flag. This tiny localStorage key is the only non-Dexie
   store in the app (css-first paint, no flash). Kept external so the
   production Content-Security-Policy can use script-src 'self'. */
(function () {
  try {
    var pref = localStorage.getItem("pavecon-theme") || "auto"; /* auto | light | dark */
    var dark =
      pref === "dark" ||
      (pref === "auto" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    var el = document.documentElement;
    if (dark) {
      el.classList.add("dark");
      el.dataset.theme = "dark";
    } else {
      el.dataset.theme = "light";
    }
  } catch (e) {
    /* private mode: keep light */
  }
})();
