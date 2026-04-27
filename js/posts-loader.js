/**
 * Merges posts from localStorage (author drafts / preview) into home + blog list.
 * Storage: localStorage "channa:posts" — JSON array of { title, slug, excerpt, readMin, date, topics[], draft?, href? }
 * Posts with draft: true are omitted from home + blog list (still in admin / post-view preview).
 */
(function () {
  var STORAGE = "channa:posts";

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadPosts() {
    try {
      var raw = localStorage.getItem(STORAGE);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function isListedPost(post) {
    return post.draft !== true;
  }

  function topicTags(post) {
    var list = typeof window.sanitizeTopicList === "function" ? window.sanitizeTopicList(post.topics) : [];
    if (list.length) {
      return list
        .map(function (t) {
          return '<span class="story-tag">' + esc(t) + "</span>";
        })
        .join("");
    }
    if (post.tagLine && typeof window.sanitizeTopicString === "function") {
      var s = window.sanitizeTopicString(post.tagLine);
      if (s) return '<span class="story-tag">' + esc(s) + "</span>";
    }
    return "";
  }

  function hrefFor(post) {
    if (post.href) return post.href;
    if (post.file) {
      if (post.file.indexOf("blog/") === 0) return post.file;
      return "blog/" + post.file;
    }
    if (post.slug) return "post-view.html?slug=" + encodeURIComponent(post.slug);
    return "#";
  }

  function displayTitle(t) {
    if (!t) return "";
    if (typeof window.formatBlogTitle === "function") return window.formatBlogTitle(t);
    return t;
  }

  function homeFeedItem(post) {
    var href = hrefFor(post);
    var r = post.readMin != null ? post.readMin : 5;
    var title = displayTitle(post.title);
    return (
      '<li><a class="home-feed-item" href="' + esc(href) + '">' +
      '<span class="home-feed-item-title">' + esc(title) + '</span>' +
      '<span class="home-feed-item-meta">' + esc(post.date || '') + ' · ' + esc(String(r)) + ' min read</span>' +
      '</a></li>'
    );
  }

  function topicLinePlain(post) {
    var list = typeof window.sanitizeTopicList === "function" ? window.sanitizeTopicList(post.topics) : [];
    if (list.length) return list.join(" · ");
    if (post.tagLine && typeof window.sanitizeTopicString === "function") {
      return window.sanitizeTopicString(post.tagLine) || "Article";
    }
    return "Article";
  }

  function blogListItem(post) {
    var href = hrefFor(post);
    var blTag = topicLinePlain(post);
    var title = displayTitle(post.title);
    return (
      "<li><a href=\"" + esc(href) + '">' +
      '<div class="bl-date-col"><div class="bl-date">' + esc(post.date || "") + '</div><div class="bl-date">' + esc(String(post.readMin != null ? post.readMin : 5)) + " min</div></div>" +
      "<div><p class=\"bl-tag\">" + esc(blTag) + "</p>" +
      "<h2 class=\"bl-title\">" + esc(title) + "</h2>" +
      '<p class="bl-excerpt">' + esc(post.excerpt || "") + "</p></div></a></li>"
    );
  }

  function runHome() {
    var el = document.querySelector(".home-feed-list");
    if (!el) return;
    var extra = loadPosts().filter(isListedPost);
    for (var i = extra.length - 1; i >= 0; i--) {
      el.insertAdjacentHTML("afterbegin", homeFeedItem(extra[i]));
    }
  }

  function runBlogList() {
    var ul = document.querySelector(".blog-list");
    if (!ul) return;
    var extra = loadPosts().filter(isListedPost);
    for (var i = extra.length - 1; i >= 0; i--) {
      ul.insertAdjacentHTML("afterbegin", blogListItem(extra[i]));
    }
    try {
      ul.dispatchEvent(new CustomEvent("postsListUpdated", { bubbles: true }));
    } catch (e) {}
  }

  function run() {
    runHome();
    runBlogList();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
