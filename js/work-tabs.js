(function () {
  var tabs;
  var panels;

  function selectTab(name) {
    if (!name || !/^(stack|experience|certs)$/.test(name)) return;
    tabs = tabs || document.querySelectorAll(".work-tab");
    panels = panels || document.querySelectorAll(".work-tab-panel");
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-tab") === name;
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    panels.forEach(function (p) {
      p.hidden = p.id !== "panel-" + name;
    });
  }

  function init() {
    tabs = document.querySelectorAll(".work-tab");
    panels = document.querySelectorAll(".work-tab-panel");
    if (!tabs.length) return;

    tabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var n = btn.getAttribute("data-tab");
        if (n) {
          selectTab(n);
          if (history.replaceState) {
            history.replaceState(null, "", "#work-" + n);
          }
        }
      });
    });

    document.querySelectorAll("a[data-work-tab]").forEach(function (a) {
      a.addEventListener("click", function () {
        var t = a.getAttribute("data-work-tab");
        if (t) selectTab(t);
      });
    });

    var h = (location.hash || "").replace(/^#/, "");
    var m = h.match(/^work-(stack|experience|certs)$/);
    if (m) {
      selectTab(m[1]);
    } else {
      var first = document.querySelector('.work-tab[aria-selected="true"]');
      if (first) selectTab(first.getAttribute("data-tab") || "stack");
      else selectTab("stack");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
