/* Sync first paint with saved theme (include in <head> before CSS). */
(function () {
  function effective() {
    try {
      var raw = localStorage.getItem("channa:site");
      var o = raw ? JSON.parse(raw) : {};
      var t = o.theme || "system";
      if (t === "dark") return "dark";
      if (t === "light") return "light";
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
      return "light";
    } catch (e) {
      return "light";
    }
  }
  var e = effective();
  document.documentElement.setAttribute("data-theme", e);
  document.documentElement.style.colorScheme = e;
})();
