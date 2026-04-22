(function () {
  var STORAGE = "channa:site";
  var defaults = { fontPreset: "inter", theme: "system" };

  var fontMap = {
    inter: { body: "'Inter', system-ui, -apple-system, sans-serif", head: "'Lora', Georgia, serif" },
    dm: { body: "'DM Sans', system-ui, sans-serif", head: "'DM Sans', system-ui, sans-serif" },
    source: { body: "'Source Sans 3', system-ui, sans-serif", head: "'Source Serif 4', Georgia, serif" },
    lora: { body: "'Inter', system-ui, sans-serif", head: "'Lora', Georgia, serif" },
    georgia: { body: "Georgia, 'Times New Roman', serif", head: "Georgia, 'Times New Roman', serif" },
    system: { body: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif", head: "Georgia, serif" }
  };

  function read() {
    try {
      var raw = localStorage.getItem(STORAGE);
      if (!raw) return defaults;
      var o = JSON.parse(raw);
      var theme = o.theme;
      if (theme !== "light" && theme !== "dark" && theme !== "system") theme = defaults.theme;
      return { fontPreset: o.fontPreset || defaults.fontPreset, theme: theme };
    } catch (e) {
      return defaults;
    }
  }

  function effectiveTheme() {
    var t = read().theme;
    if (t === "dark") return "dark";
    if (t === "light") return "light";
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch (e) {
      return "light";
    }
  }

  function apply() {
    var preset = read().fontPreset || "inter";
    var m = fontMap[preset] || fontMap.inter;
    var el = document.documentElement;
    el.style.setProperty("--font-body", m.body);
    el.style.setProperty("--font-heading", m.head);
    var eff = effectiveTheme();
    el.setAttribute("data-theme", eff);
    el.style.colorScheme = eff;
  }

  function saveTheme(theme) {
    if (theme !== "light" && theme !== "dark" && theme !== "system") return;
    try {
      var o = JSON.parse(localStorage.getItem(STORAGE) || "{}");
      o.theme = theme;
      localStorage.setItem(STORAGE, JSON.stringify(o));
    } catch (e) {
      localStorage.setItem(STORAGE, JSON.stringify({ theme: theme }));
    }
    apply();
    syncThemeSelects();
  }

  function syncThemeSelects() {
    var v = read().theme;
    var sel = document.getElementById("site-theme");
    if (sel) sel.value = v;
    var adm = document.getElementById("admin-site-theme");
    if (adm) adm.value = v;
  }

  function onThemeSelectChange(e) {
    saveTheme(e.target.value);
  }

  function initThemeControl() {
    var ul = document.querySelector(".header .nav-links");
    if (!ul || document.getElementById("site-theme")) return;
    var li = document.createElement("li");
    li.className = "nav-theme-item";
    var sel = document.createElement("select");
    sel.id = "site-theme";
    sel.className = "site-theme-select";
    sel.setAttribute("aria-label", "Color theme");
    sel.title = "Theme: light, dark, or system";
    [["light", "Light"], ["dark", "Dark"], ["system", "System"]].forEach(function (pair) {
      var opt = document.createElement("option");
      opt.value = pair[0];
      opt.textContent = pair[1];
      sel.appendChild(opt);
    });
    sel.value = read().theme;
    sel.addEventListener("change", onThemeSelectChange);
    li.appendChild(sel);
    var lastLi = ul.querySelector("li:last-child");
    if (lastLi) ul.insertBefore(li, lastLi);
    else ul.appendChild(li);
  }

  var mql = null;
  function bindSystemThemeListener() {
    if (!window.matchMedia) return;
    if (mql) return;
    mql = window.matchMedia("(prefers-color-scheme: dark)");
    try {
      mql.addEventListener("change", function () {
        if (read().theme === "system") apply();
      });
    } catch (e) {
      mql.addListener(function () {
        if (read().theme === "system") apply();
      });
    }
  }

  window.channaApplySiteSettings = apply;
  window.channaSaveSiteTheme = saveTheme;
  window.channaReadSiteSettings = read;

  function boot() {
    apply();
    initThemeControl();
    bindSystemThemeListener();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
