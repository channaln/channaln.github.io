/**
 * Add expand (fullscreen) to .post-content .code-block; opens a blurred overlay with the full code.
 */
(function () {
  "use strict";

  var overlay;
  var contentSlot;
  var lastFocus;

  function buildOverlay() {
    if (overlay) return overlay;
    var root = document.createElement("div");
    root.id = "code-expand-root";
    root.className = "code-expand-overlay";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Expanded code");
    root.hidden = true;
    root.innerHTML =
      '<div class="code-expand-backdrop" data-code-expand-close aria-hidden="true"></div>' +
      '<div class="code-expand-panel">' +
      '<div class="code-expand-toolbar">' +
      '<button type="button" class="code-expand-close" data-code-expand-close aria-label="Close expanded code">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
      "<line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/></svg></button></div>" +
      '<div class="code-expand-body"></div></div>';
    document.body.appendChild(root);
    overlay = root;
    contentSlot = root.querySelector(".code-expand-body");
    var closeEls = root.querySelectorAll("[data-code-expand-close]");
    for (var i = 0; i < closeEls.length; i++) {
      closeEls[i].addEventListener("click", function (e) {
        e.preventDefault();
        close();
      });
    }
    return root;
  }

  function open(preEl) {
    var root = buildOverlay();
    if (!contentSlot) return;
    lastFocus = document.activeElement;
    contentSlot.textContent = "";
    var pre = preEl.cloneNode(true);
    pre.removeAttribute("style");
    contentSlot.appendChild(pre);
    root.hidden = false;
    document.body.classList.add("code-expand-open");
    var closeBtn = root.querySelector(".code-expand-close");
    if (closeBtn) {
      setTimeout(function () {
        closeBtn.focus();
      }, 0);
    }
  }

  function close() {
    if (!overlay) return;
    overlay.hidden = true;
    if (contentSlot) contentSlot.textContent = "";
    document.body.classList.remove("code-expand-open");
    if (lastFocus && typeof lastFocus.focus === "function") {
      try {
        lastFocus.focus();
      } catch (e) {}
    }
  }

  function onKeydown(e) {
    if (e.key === "Escape" && !overlay.hidden) {
      e.preventDefault();
      close();
    }
  }

  function enhanceBlock(block) {
    if (block.getAttribute("data-code-expand") === "1") return;
    var pre = block.querySelector("pre");
    if (!pre) return;
    block.setAttribute("data-code-expand", "1");
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

  document.addEventListener("keydown", onKeydown);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
