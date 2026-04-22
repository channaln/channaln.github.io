/**
 * Merges posts from localStorage (author drafts / preview) into home + blog list.
 * Storage: localStorage "channa:posts" — JSON array of { title, slug, excerpt, readMin, date, topics[], href? }
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

  function homeStoryCard(post) {
    var href = hrefFor(post);
    var r = post.readMin != null ? post.readMin : 5;
    var tags = topicTags(post);
    var title = displayTitle(post.title);
    return (
      '<a class="story-card story-from-admin" href="' + esc(href) + '">' +
      '<div class="story-meta">' +
      '<img class="story-avatar" src="images/profile.jpg" alt="Channa">' +
      '<span class="story-author">Channa Sandaruwan</span>' +
      '<span class="story-sep">·</span>' +
      '<span class="story-date">' + esc(post.date || "") + "</span>" +
      '<span class="story-sep">·</span>' +
      '<span class="story-date">' + esc(String(r)) + " min read</span>" +
      "</div>" +
      '<div class="story-body"><div class="story-content">' +
      "<div class=\"story-title\">" + esc(title) + "</div>" +
      '<div class="story-excerpt">' + esc(post.excerpt || "") + "</div>" +
      (tags ? '<div class="story-footer">' + tags + "</div>" : "") +
      "</div></div></a>"
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
    var el = document.querySelector(".stories");
    if (!el) return;
    var extra = loadPosts();
    for (var i = extra.length - 1; i >= 0; i--) {
      el.insertAdjacentHTML("afterbegin", homeStoryCard(extra[i]));
    }
  }

  function runBlogList() {
    var ul = document.querySelector(".blog-list");
    if (!ul) return;
    var extra = loadPosts();
    for (var i = extra.length - 1; i >= 0; i--) {
      ul.insertAdjacentHTML("afterbegin", blogListItem(extra[i]));
    }
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
