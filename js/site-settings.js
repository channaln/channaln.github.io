(function () {
  var STORAGE = "channa:site";
  var defaults = { fontPreset: "inter" };

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
      return { fontPreset: o.fontPreset || defaults.fontPreset };
    } catch (e) {
      return defaults;
    }
  }

  function apply() {
    var preset = read().fontPreset || "inter";
    var m = fontMap[preset] || fontMap.inter;
    var el = document.documentElement;
    el.style.setProperty("--font-body", m.body);
    el.style.setProperty("--font-heading", m.head);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
