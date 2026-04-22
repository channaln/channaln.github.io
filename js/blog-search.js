/**
 * Filters .blog-list entries by title, tag, and excerpt (client-side).
 * Runs after posts-loader adds dynamic items from localStorage.
 */
(function () {
  function norm(s) {
    return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function rowText(li) {
    var title = li.querySelector(".bl-title");
    var tag = li.querySelector(".bl-tag");
    var ex = li.querySelector(".bl-excerpt");
    return norm(
      (title && title.textContent) + " " + (tag && tag.textContent) + " " + (ex && ex.textContent)
    );
  }

  function runFilter(input, list) {
    var q = norm(input.value);
    var items = list.querySelectorAll(":scope > li");
    var n = 0;
    for (var i = 0; i < items.length; i++) {
      var li = items[i];
      if (!q) {
        li.hidden = false;
        n++;
        continue;
      }
      var ok = rowText(li).indexOf(q) !== -1;
      li.hidden = !ok;
      if (ok) n++;
    }
    var empty = document.getElementById("blog-search-empty");
    if (empty) {
      if (n === 0 && q) {
        empty.removeAttribute("hidden");
        empty.setAttribute("aria-hidden", "false");
      } else {
        empty.setAttribute("hidden", "");
        empty.setAttribute("aria-hidden", "true");
      }
    }
  }

  function init() {
    var list = document.querySelector("ul.blog-list");
    var input = document.getElementById("blog-search");
    if (!list || !input) return;

    var t = 0;
    function schedule() {
      clearTimeout(t);
      t = setTimeout(function () {
        runFilter(input, list);
      }, 50);
    }

    input.addEventListener("input", schedule);
    input.addEventListener("search", schedule);
    list.addEventListener("postsListUpdated", schedule);

    runFilter(input, list);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
