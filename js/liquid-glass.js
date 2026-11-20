/* liquid-glass.js — cursor light, gentle tilt, header state and scroll reveal for liquid-glass.css */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;

  // Specular light follows the pointer across every glass surface
  if (fine) {
    document.addEventListener("pointermove", function (e) {
      document.querySelectorAll(".lg .glass-panel, .lg .lg-glass").forEach(function (el) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--lg-x", (e.clientX - r.left) + "px");
        el.style.setProperty("--lg-y", (e.clientY - r.top) + "px");
      });
    }, { passive: true });
  }

  // Slight 3D tilt on the main hero card
  var tilt = document.querySelector("[data-lg-tilt]");
  if (tilt && fine && !reduce) {
    var stack = tilt.parentElement;
    stack.addEventListener("pointermove", function (e) {
      var r = stack.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = "rotateX(" + (-y * 5).toFixed(2) + "deg) rotateY(" + (x * 6).toFixed(2) + "deg)";
    });
    stack.addEventListener("pointerleave", function () { tilt.style.transform = ""; });
  }

  // Reading progress bar on article pages
  var bar = null;
  if (document.querySelector(".post-content")) {
    bar = document.createElement("div");
    bar.className = "lg-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
  }

  // Header gains a deeper shadow once the page scrolls
  var header = document.querySelector(".header");
  function onScroll() {
    if (header) header.classList.toggle("lg-scrolled", window.scrollY > 12);
    if (bar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ")";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Reveal glass blocks as they scroll into view
  var items = document.querySelectorAll(".lg-reveal");
  if (!("IntersectionObserver" in window) || reduce) {
    items.forEach(function (el) { el.classList.add("lg-in"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("lg-in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  items.forEach(function (el) { io.observe(el); });
})();
