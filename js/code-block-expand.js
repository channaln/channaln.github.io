/**
 * Code blocks in .post-content: expand to a blurred overlay with zoom-in animation.
 */
(function () {
  "use strict";

  var root;
  var contentSlot;
  var lastFocus;
  var afterCloseTimer;

  function raf2(fn) {
    requestAnimationFrame(function () {
      requestAnimationFrame(fn);
    });
  }

  function buildOverlay() {
    if (root) return root;
    var el = document.createElement("div");
    el.id = "code-expand-root";
    el.className = "code-expand-overlay";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Expanded code");
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="code-expand-backdrop" data-code-expand-close tabindex="-1" aria-hidden="true"></div>' +
      '<div class="code-expand-panel">' +
      '<div class="code-expand-toolbar">' +
      '<button type="button" class="code-expand-close" data-code-expand-close aria-label="Close expanded code">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
      "<line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/>" +
      "</svg></button></div>" +
      "<div class=\"code-expand-body\"></div></div>";

    document.body.appendChild(el);
    root = el;
    contentSlot = el.querySelector(".code-expand-body");

    var closers = el.querySelectorAll("[data-code-expand-close]");
    for (var i = 0; i < closers.length; i++) {
      closers[i].addEventListener("click", onCloseClick, false);
    }
    return el;
  }

  function isOpen() {
    return root && root.classList.contains("is-open");
  }

  function onCloseClick(e) {
    e.preventDefault();
    e.stopPropagation();
    close();
  }

  function open(preEl) {
    if (!preEl) return;
    var el = buildOverlay();
    if (!contentSlot) return;
    if (afterCloseTimer) {
      clearTimeout(afterCloseTimer);
      afterCloseTimer = null;
    }

    lastFocus = document.activeElement;
    contentSlot.textContent = "";
    var pre = preEl.cloneNode(true);
    pre.removeAttribute("style");
    contentSlot.appendChild(pre);

    el.setAttribute("aria-hidden", "false");
    el.classList.remove("is-open");
    el.style.visibility = "visible";

    raf2(function () {
      if (!el.parentNode) return;
      el.classList.add("is-open");
      document.body.classList.add("code-expand-open");
      var btn = el.querySelector(".code-expand-close");
      if (btn) {
        try {
          btn.focus();
        } catch (err) {}
      }
    });
  }

  function close() {
    if (!root || !isOpen()) return;
    root.classList.remove("is-open");
    document.body.classList.remove("code-expand-open");
    root.setAttribute("aria-hidden", "true");
    if (afterCloseTimer) {
      clearTimeout(afterCloseTimer);
    }
    var ms = 400;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ms = 0;
    }
    afterCloseTimer = setTimeout(function () {
      afterCloseTimer = null;
      if (contentSlot) {
        contentSlot.textContent = "";
      }
      if (root) {
        root.style.visibility = "hidden";
      }
      if (lastFocus && typeof lastFocus.focus === "function") {
        try {
          lastFocus.focus();
        } catch (e) {}
      }
    }, ms);
  }

  function onKeydown(e) {
    if (e.key !== "Escape" || !root) return;
    if (!isOpen()) return;
    e.preventDefault();
    e.stopPropagation();
    close();
  }

  function enhanceBlock(block) {
    if (block.getAttribute("data-code-expand") === "1") return;
    var pre = block.querySelector("pre");
    if (!pre) return;
    block.setAttribute("data-code-expand", "1");
    block.classList.add("code-block--with-expand");
    var header = document.createElement("div");
    header.className = "code-block-header";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-block-expand";
    btn.setAttribute("aria-label", "Expand code block");
    btn.innerHTML =
      '<svg class="code-block-expand-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      "<polyline points=\"15 3 21 3 21 9\"/>" +
      "<polyline points=\"9 21 3 21 3 15\"/>" +
      "<line x1=\"21\" y1=\"3\" x2=\"14\" y2=\"10\"/>" +
      "<line x1=\"3\" y1=\"21\" x2=\"10\" y2=\"14\"/>" +
      "</svg>";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      open(pre);
    });
    header.appendChild(btn);
    block.insertBefore(header, pre);
  }

  function init() {
    var list = document.querySelectorAll(".post-content .code-block");
    for (var i = 0; i < list.length; i++) {
      enhanceBlock(list[i]);
    }
  }

  document.addEventListener("keydown", onKeydown, true);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.channaInitCodeExpand = init;
})();
