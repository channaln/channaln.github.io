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

  var THEME_ICONS = {
    light:
      '<svg class="site-theme-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    dark:
      '<svg class="site-theme-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    system:
      '<svg class="site-theme-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
  };
  var THEME_ORDER = ["light", "dark", "system"];
  var THEME_ARIA = {
    light: "Color theme: light. Click to switch to dark, then system.",
    dark: "Color theme: dark. Click to switch to system, then light.",
    system: "Color theme: use system. Click to switch to light, then dark."
  };

  function nextThemePref(current) {
    var i = THEME_ORDER.indexOf(current);
    if (i < 0) return "dark";
    return THEME_ORDER[(i + 1) % THEME_ORDER.length];
  }

  function setThemeButtonIcon(btn) {
    var v = read().theme;
    if (!btn) return;
    btn.innerHTML = THEME_ICONS[v] || THEME_ICONS.system;
    btn.setAttribute("data-theme-pref", v);
    btn.setAttribute("aria-label", THEME_ARIA[v] || THEME_ARIA.system);
    btn.setAttribute("title", THEME_ARIA[v] || THEME_ARIA.system);
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
    setThemeButtonIcon(document.getElementById("site-theme"));
    var adm = document.getElementById("admin-site-theme");
    if (adm) adm.value = read().theme;
  }

  function onThemeButtonClick() {
    saveTheme(nextThemePref(read().theme));
  }

  function initThemeControl() {
    var ul = document.querySelector(".header .nav-links");
    if (!ul || document.getElementById("site-theme")) return;
    var li = document.createElement("li");
    li.className = "nav-theme-item";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "site-theme";
    btn.className = "site-theme-icon-btn";
    setThemeButtonIcon(btn);
    btn.addEventListener("click", onThemeButtonClick);
    li.appendChild(btn);
    ul.appendChild(li);
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

  var HAMBURGER_SVG = '<svg class="nav-menu-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>';
  var CLOSE_SVG = '<svg class="nav-menu-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';

  function initMobileNav() {
    var container = document.querySelector('.header .container');
    if (!container || document.getElementById('nav-menu-btn')) return;

    var header = document.querySelector('.header');
    var navList = container.querySelector('.nav-links');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'nav-menu-btn';
    btn.className = 'nav-menu-btn';
    btn.setAttribute('aria-label', 'Open navigation');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = HAMBURGER_SVG;

    function closeMenu() {
      header.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Open navigation');
      btn.innerHTML = HAMBURGER_SVG;
      document.body.style.overflow = '';
    }

    btn.addEventListener('click', function () {
      var isOpen = header.classList.toggle('nav-open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      btn.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
      btn.innerHTML = isOpen ? CLOSE_SVG : HAMBURGER_SVG;
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    if (navList) {
      navList.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') closeMenu();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('nav-open')) {
        closeMenu();
        btn.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (header.classList.contains('nav-open') && !header.contains(e.target)) {
        closeMenu();
      }
    });

    container.appendChild(btn);
  }

  window.channaApplySiteSettings = apply;
  window.channaSaveSiteTheme = saveTheme;
  window.channaReadSiteSettings = read;

  function boot() {
    apply();
    initThemeControl();
    initMobileNav();
    bindSystemThemeListener();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
