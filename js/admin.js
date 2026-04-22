(function () {
  "use strict";

  var STORAGE_POSTS = "channa:posts";
  var STORAGE_SITE = "channa:site";
  var STORAGE_AUTH = "channa:auth";
  var SESSION_MS = 86400000;

  /**
   * SHA-256 hex (64 chars) of your admin password. Generate:
   *   printf '%s' 'YourLongPassword' | shasum -a 256
   * First-time bootstrap credential is documented in ADMIN.md — rotate this hash before treating the site as public.
   */
  var ADMIN_HASH = "5b730bce76764ce56314924b8c298102e11d4826a37b3cb20a7c8f449179a735";

  var state = {
    posts: [],
    currentId: null,
    pendingId: null,
    dirty: false
  };

  var autosaveTimer = null;

  function $(id) {
    return document.getElementById(id);
  }

  function sha256Hex(message) {
    var enc = new TextEncoder();
    return crypto.subtle.digest("SHA-256", enc.encode(message)).then(function (buf) {
      return Array.from(new Uint8Array(buf))
        .map(function (b) {
          return b.toString(16).padStart(2, "0");
        })
        .join("");
    });
  }

  function isAuthed() {
    try {
      var t = parseInt(localStorage.getItem(STORAGE_AUTH) || "0", 10);
      return t > 0 && Date.now() - t < SESSION_MS;
    } catch (e) {
      return false;
    }
  }

  function setAuthed() {
    try {
      localStorage.setItem(STORAGE_AUTH, String(Date.now()));
    } catch (e) {}
  }

  function logout() {
    clearAutosaveTimer();
    try {
      localStorage.removeItem(STORAGE_AUTH);
    } catch (e) {}
    $("login-screen").classList.remove("hidden");
    $("admin-dashboard").classList.add("hidden");
  }

  function loadPosts() {
    try {
      var raw = localStorage.getItem(STORAGE_POSTS);
      if (!raw) return [];
      var a = JSON.parse(raw);
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  function estimateStoredPostsBytes() {
    try {
      return new Blob([JSON.stringify(state.posts)]).size;
    } catch (e) {
      return 0;
    }
  }

  function warnIfLargeImageInsert(dataUrl) {
    if (!dataUrl || String(dataUrl).length < 400000) return;
    var el = $("storage-hint");
    if (el) {
      el.textContent =
        "Large image embedded (~" +
        Math.round(String(dataUrl).length / 1024) +
        " KB). localStorage is ~5 MB total — prefer repo image paths for published posts.";
    }
  }

  function updateStorageHint() {
    var el = $("storage-hint");
    if (!el) return;
    var b = estimateStoredPostsBytes();
    var kb = (b / 1024).toFixed(1);
    el.textContent = "Stored posts ≈ " + kb + " KB (localStorage ~5 MB max). Export JSON as backup.";
    if (b > 4 * 1024 * 1024) {
      el.textContent += " Near limit — remove base64 images or export and trim.";
    }
  }

  function writePostsStorage() {
    try {
      localStorage.setItem(STORAGE_POSTS, JSON.stringify(state.posts));
      updateStorageHint();
    } catch (err) {
      if (err && err.name === "QuotaExceededError") {
        alert(
          "localStorage is full. Export JSON, delete drafts, or replace large base64 images with file URLs."
        );
      }
      throw err;
    }
  }

  function savePosts() {
    writePostsStorage();
    state.dirty = false;
  }

  function upsertPostGathered(g) {
    var idx = state.posts.findIndex(function (x) {
      return x.id === g.id;
    });
    if (idx >= 0) {
      state.posts[idx] = g;
      state.currentId = g.id;
    } else {
      state.posts.push(g);
      state.currentId = g.id;
    }
    state.pendingId = null;
  }

  function tryAutosave() {
    if (!state.dirty) return;
    var g = gatherForm();
    if (!g.title) return;
    upsertPostGathered(g);
    try {
      writePostsStorage();
      state.dirty = false;
      var msg = "Auto-saved " + new Date().toLocaleTimeString();
      $("save-status").textContent = msg;
      setTimeout(function () {
        var el = $("save-status");
        if (el && el.textContent === msg) el.textContent = "";
      }, 2200);
    } catch (err) {
      /* writePostsStorage already alerted on quota */
    }
  }

  function clearAutosaveTimer() {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }

  function scheduleAutosave() {
    if (!isAuthed()) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(tryAutosave, 2800);
  }

  function uid() {
    return "p-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function slugify(s) {
    return String(s || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "post";
  }

  function readingMinutes(html) {
    var text = String(html || "").replace(/<[^>]+>/g, " ");
    var words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 220));
  }

  function gatherForm() {
    var title = $("f-title").value.trim();
    if (title && typeof window.formatBlogTitle === "function") {
      title = window.formatBlogTitle(title);
      $("f-title").value = title;
    }
    var slug = $("f-slug").value.trim() || slugify(title);
    var date = $("f-date").value.trim() || new Date().toLocaleString("en-GB", { month: "short", year: "numeric" });
    var topicsRaw = $("f-topics").value;
    var topicParts = topicsRaw.split(/[,;]+/);
    var topics = typeof window.sanitizeTopicList === "function" ? window.sanitizeTopicList(topicParts) : [];
    $("f-topics").value = topics.join(", ");
    var html = $("f-html").value;
    var readMin = readingMinutes(html);
    $("f-read").textContent = String(readMin);
    return {
      id: state.currentId || state.pendingId || uid(),
      title: title,
      slug: slugify(slug),
      date: date,
      readMin: readMin,
      topics: topics,
      excerpt: $("f-excerpt").value.trim() || textExcerpt(html),
      html: html,
      draft: $("f-draft") ? !!$("f-draft").checked : false
    };
  }

  function textExcerpt(html) {
    var t = String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return t.length > 180 ? t.slice(0, 177) + "…" : t;
  }

  function fillForm(p) {
    $("f-title").value = p.title || "";
    $("f-slug").value = p.slug || "";
    $("f-date").value = p.date || "";
    $("f-topics").value = Array.isArray(p.topics) ? p.topics.join(", ") : "";
    $("f-excerpt").value = p.excerpt || "";
    $("f-html").value = p.html || "";
    $("f-read").textContent = String(p.readMin != null ? p.readMin : readingMinutes(p.html));
    if ($("f-draft")) $("f-draft").checked = p.draft === true;
  }

  function renderList() {
    var ul = $("post-list");
    ul.innerHTML = "";
    state.posts.forEach(function (p) {
      var li = document.createElement("li");
      li.dataset.id = p.id;
      if (p.id === state.currentId) li.classList.add("active");
      li.innerHTML =
        '<span class="pl-title">' + escapeHtml(p.title || "Untitled") + "</span>" +
        (p.draft ? '<span class="pl-draft" title="Hidden from home and blog list">Draft</span>' : "") +
        '<span class="pl-meta">' + escapeHtml(p.date || "") + " · " + escapeHtml(p.slug || "") + "</span>";
      li.addEventListener("click", function () {
        if (state.dirty && !confirm("Discard unsaved changes?")) return;
        selectPost(p.id);
      });
      ul.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function selectPost(id) {
    var p = state.posts.find(function (x) {
      return x.id === id;
    });
    if (!p) return;
    clearAutosaveTimer();
    state.currentId = id;
    state.pendingId = null;
    state.dirty = false;
    fillForm(p);
    renderList();
    $("editor-title").textContent = "Edit post";
  }

  function newPost() {
    if (state.dirty && !confirm("Discard unsaved changes?")) return;
    clearAutosaveTimer();
    state.currentId = null;
    state.pendingId = uid();
    state.dirty = false;
    $("f-title").value = "";
    $("f-slug").value = "";
    $("f-date").value = new Date().toLocaleString("en-GB", { month: "short", year: "numeric" });
    $("f-topics").value = "";
    $("f-excerpt").value = "";
    $("f-html").value = "<p></p>\n";
    $("f-read").textContent = "1";
    if ($("f-draft")) $("f-draft").checked = false;
    $("editor-title").textContent = "New post";
    renderList();
  }

  function saveCurrent() {
    var g = gatherForm();
    if (!g.title) {
      alert("Title is required.");
      return;
    }
    upsertPostGathered(g);
    savePosts();
    renderList();
    var msg = "Saved " + new Date().toLocaleTimeString();
    $("save-status").textContent = msg;
    setTimeout(function () {
      var el = $("save-status");
      if (el && el.textContent === msg) el.textContent = "";
    }, 2500);
  }

  function duplicateCurrent() {
    var g = gatherForm();
    if (!g.title.trim()) {
      alert("Enter a title before duplicating.");
      return;
    }
    var topicsCopy = Array.isArray(g.topics) ? g.topics.slice() : [];
    var copy = {
      id: uid(),
      title: (g.title || "Untitled") + " (copy)",
      slug: slugify((g.slug || "post") + "-copy"),
      date: g.date,
      readMin: g.readMin,
      topics: topicsCopy,
      excerpt: g.excerpt || "",
      html: g.html || "",
      draft: !!g.draft
    };
    state.posts.push(copy);
    savePosts();
    selectPost(copy.id);
    $("save-status").textContent = "Duplicated — editing copy";
    setTimeout(function () {
      var el = $("save-status");
      if (el && el.textContent === "Duplicated — editing copy") el.textContent = "";
    }, 2500);
  }

  function deleteCurrent() {
    if (!state.currentId) {
      if (state.pendingId && confirm("Clear this unsaved draft?")) newPost();
      return;
    }
    if (!confirm("Delete this post from browser storage?")) return;
    state.posts = state.posts.filter(function (x) {
      return x.id !== state.currentId;
    });
    state.currentId = null;
    savePosts();
    renderList();
    newPost();
  }

  function exportJson() {
    var blob = new Blob([JSON.stringify(state.posts, null, 2)], { type: "application/json" });
    downloadBlob(blob, "channa-posts.json");
  }

  function downloadBlob(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 1000);
  }

  function exportHtml() {
    var g = gatherForm();
    if (!g.title) {
      alert("Add a title first.");
      return;
    }
    var topics = typeof window.sanitizeTopicList === "function" ? window.sanitizeTopicList(g.topics) : g.topics || [];
    var topicMeta = topics.join(" · ");
    var body = [
      "<!DOCTYPE html>",
      '<html lang="en">',
      "<head>",
      '  <meta charset="UTF-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1">',
      '  <script src="../js/theme-init.js"><\/script>',
      "  <title>" + escapeHtml(g.title) + " Channa Sandaruwan</title>",
      '  <link rel="stylesheet" href="../css/minimal.css">',
      '  <link rel="stylesheet" href="../css/glass.css">',
      "</head>",
      '<body class="page-root">',
      '  <main><div class="container"><div class="post-wrap">',
      '    <a href="../blog_list.html" class="post-back">← Back to Blog</a>',
      '    <div class="post-header">',
      '      <h1 class="post-title">' + escapeHtml(g.title) + "</h1>",
      '      <p class="post-meta">' + escapeHtml(g.date) + " · Channa Sandaruwan · " + '<span class="post-meta-topic">' + escapeHtml(topicMeta) + "</span></p>",
      "    </div>",
      '    <div class="post-content">' + (g.html || "") + "</div>",
      "  </div></div></main>",
      '  <script src="../js/site-settings.js" defer><\/script>',
      '  <script src="../js/code-block-expand.js" defer><\/script>',
      "</body>",
      "</html>"
    ].join("\n");
    var blob = new Blob([body], { type: "text/html" });
    downloadBlob(blob, (g.slug || "post") + ".html");
  }

  function insertCode() {
    var ta = $("f-html");
    var ins =
      '\n<div class="code-block"><pre><code>// your code\n</code></pre></div>\n';
    insertAtCursor(ta, ins);
  }

  function insertAtCursor(ta, text) {
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    var v = ta.value;
    ta.value = v.slice(0, start) + text + v.slice(end);
    ta.selectionStart = ta.selectionEnd = start + text.length;
    ta.focus();
    state.dirty = true;
    scheduleAutosave();
  }

  function insertImageDataUrl(dataUrl) {
    warnIfLargeImageInsert(dataUrl);
    var safe = String(dataUrl || "").replace(/"/g, "");
    var img =
      '\n<p><img src="' +
      safe +
      '" alt="" style="max-width:100%;height:auto;border-radius:8px"></p>\n';
    insertAtCursor($("f-html"), img);
  }

  function onPickImage(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.type && f.type.indexOf("image") !== 0) return;
    var r = new FileReader();
    r.onload = function () {
      insertImageDataUrl(r.result);
    };
    r.readAsDataURL(f);
    e.target.value = "";
  }

  function onEditorPaste(e) {
    var items = e.clipboardData && e.clipboardData.items;
    if (!items || !items.length) return;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf("image") === 0) {
        e.preventDefault();
        var f = items[i].getAsFile();
        if (!f) return;
        var r = new FileReader();
        r.onload = function () {
          insertImageDataUrl(r.result);
        };
        r.readAsDataURL(f);
        return;
      }
    }
  }

  function onEditorDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  }

  function onEditorDrop(e) {
    e.preventDefault();
    var files = e.dataTransfer && e.dataTransfer.files;
    if (!files || !files.length) return;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (f.type && f.type.indexOf("image") === 0) {
        var r = new FileReader();
        r.onload = function (ev) {
          insertImageDataUrl(ev.target.result);
        };
        r.readAsDataURL(f);
        return;
      }
    }
  }

  function insertImageUrl() {
    var u = prompt("Image URL (https://...)", "https://");
    if (!u) return;
    var img = '\n<p><img src="' + u.replace(/"/g, "") + '" alt="" style="max-width:100%;height:auto;border-radius:8px"></p>\n';
    insertAtCursor($("f-html"), img);
  }

  function preview() {
    var g = gatherForm();
    var list = state.posts.slice();
    var idx = list.findIndex(function (x) {
      return x.id === g.id;
    });
    if (idx >= 0) list[idx] = g;
    else list.push(g);
    try {
      localStorage.setItem(STORAGE_POSTS, JSON.stringify(list));
    } catch (err) {
      alert("Could not save preview: storage may be full.");
      return;
    }
    window.open("post-view.html?slug=" + encodeURIComponent(g.slug), "_blank", "noopener");
  }

  function applyFontFromSelect() {
    var v = $("site-font").value;
    try {
      var o = JSON.parse(localStorage.getItem(STORAGE_SITE) || "{}");
      o.fontPreset = v;
      localStorage.setItem(STORAGE_SITE, JSON.stringify(o));
    } catch (e) {
      localStorage.setItem(STORAGE_SITE, JSON.stringify({ fontPreset: v }));
    }
    if (typeof window.channaApplySiteSettings === "function") window.channaApplySiteSettings();
    alert("Font saved. Reload other open tabs to pick up typography.");
  }

  function syncFontSelect() {
    try {
      var o = JSON.parse(localStorage.getItem(STORAGE_SITE) || "{}");
      if (o.fontPreset) $("site-font").value = o.fontPreset;
    } catch (e) {}
  }

  function syncAdminThemeSelect() {
    var el = $("admin-site-theme");
    if (!el) return;
    try {
      var o = JSON.parse(localStorage.getItem(STORAGE_SITE) || "{}");
      var t = o.theme;
      el.value = t === "light" || t === "dark" || t === "system" ? t : "system";
    } catch (e) {
      el.value = "system";
    }
  }

  function importJson(file) {
    var f = file.target.files && file.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var arr = JSON.parse(r.result);
        if (!Array.isArray(arr)) throw new Error("not array");
        state.posts = arr;
        savePosts();
        renderList();
        newPost();
        alert("Imported " + arr.length + " posts.");
      } catch (err) {
        alert("Invalid JSON.");
      }
    };
    r.readAsText(f);
    file.target.value = "";
  }

  // ── GitHub publishing ───────────────────────────────────────────────────────

  var STORAGE_GH = "channa:github";
  var GH_OWNER   = "channaln";
  var GH_REPO    = "channaln.github.io";
  var GH_BRANCH  = "main";
  var GH_API     = "https://api.github.com";

  function loadPat() {
    try { return JSON.parse(localStorage.getItem(STORAGE_GH) || "{}").pat || ""; } catch (e) { return ""; }
  }

  function savePat(pat) {
    try { localStorage.setItem(STORAGE_GH, JSON.stringify({ pat: pat.trim() })); } catch (e) {}
  }

  function syncPatField() {
    var el = $("gh-pat");
    if (!el) return;
    if (loadPat()) el.placeholder = "Token saved (•••)";
  }

  async function ghApi(method, path, body) {
    var pat = loadPat();
    if (!pat) throw new Error("No GitHub token saved. Enter one in the ‘Publish to GitHub’ section on the left.");
    var opts = {
      method: method,
      headers: {
        "Authorization": "Bearer " + pat,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    };
    if (body) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    var res = await fetch(GH_API + "/repos/" + GH_OWNER + "/" + GH_REPO + path, opts);
    if (res.status === 404) return null;
    if (res.status === 204) return {};
    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      throw new Error("GitHub " + res.status + ": " + (err.message || res.statusText));
    }
    return res.json();
  }

  async function ghGetFile(path) {
    var data = await ghApi("GET", "/contents/" + path);
    if (!data) return null;
    try {
      var decoded = decodeURIComponent(escape(atob(data.content.replace(/[\r\n]/g, ""))));
      return { sha: data.sha, content: decoded };
    } catch (e) {
      return { sha: data.sha, content: atob(data.content.replace(/[\r\n]/g, "")) };
    }
  }

  async function ghPutFile(path, content, message, sha) {
    var encoded;
    try { encoded = btoa(unescape(encodeURIComponent(content))); } catch (e) { encoded = btoa(content); }
    var body = { message: message, content: encoded, branch: GH_BRANCH };
    if (sha) body.sha = sha;
    return ghApi("PUT", "/contents/" + path, body);
  }

  async function ghDeleteFile(path, message, sha) {
    return ghApi("DELETE", "/contents/" + path, { message: message, sha: sha, branch: GH_BRANCH });
  }

  function buildPostHtml(g) {
    var topics  = typeof window.sanitizeTopicList === "function" ? window.sanitizeTopicList(g.topics) : (g.topics || []);
    var topicFirst = topics[0] || "";
    var topicMeta  = topics.join(" · ");
    var slug    = g.slug || "post";
    var excerpt = g.excerpt || textExcerpt(g.html);
    var dateIso;
    try { dateIso = new Date().toISOString().split("T")[0]; } catch (e) { dateIso = ""; }
    var esc = escapeHtml;
    var lines = [
      "<!DOCTYPE html>",
      '<html lang="en">',
      "<head>",
      '  <meta charset="UTF-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1">',
      '  <script src="../js/theme-init.js"><\/script>',
      '  <title>' + esc(g.title) + " — Channa Sandaruwan</title>",
      '  <meta name="description" content="' + esc(excerpt) + '">',
      '  <meta name="author" content="Channa Sandaruwan">',
      '  <meta property="og:type" content="article">',
      '  <meta property="og:url" content="https://channaln.github.io/blog/' + slug + '.html">',
      '  <meta property="og:title" content="' + esc(g.title) + '">',
      '  <meta property="og:description" content="' + esc(excerpt) + '">',
      '  <meta property="og:image" content="https://channaln.github.io/images/profile.jpg">',
      '  <meta property="og:site_name" content="Channa Sandaruwan">',
      '  <meta property="article:author" content="Channa Sandaruwan">',
      '  <meta property="article:published_time" content="' + dateIso + '">',
      '  <meta name="twitter:card" content="summary_large_image">',
      '  <meta name="twitter:title" content="' + esc(g.title) + '">',
      '  <meta name="twitter:description" content="' + esc(excerpt) + '">',
      '  <meta name="twitter:image" content="https://channaln.github.io/images/profile.jpg">',
      '  <link rel="preconnect" href="https://fonts.googleapis.com">',
      '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
      '  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000&family=Inter:wght@300;400;450;500;600;700&family=JetBrains+Mono:wght@400;500&family=Lora:ital,wght@0,500;0,600;0,700&family=Source+Sans+3:ital,wght@0,300..900&family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900&display=swap" rel="stylesheet">',
      '  <link rel="stylesheet" href="../css/minimal.css">',
      '  <link rel="stylesheet" href="../css/glass.css">',
      "</head>",
      '<body class="page-root">',
      "",
      '  <header class="header">',
      '    <div class="container">',
      '      <a href="../index.html" class="logo">channa<span>.dev</span></a>',
      "      <nav>",
      '        <ul class="nav-links">',
      '          <li><a href="../index.html">Home</a></li>',
      '          <li><a href="../experience.html">Experience</a></li>',
      '          <li><a href="../blog_list.html" aria-current="page">Blog</a></li>',
      '          <li><a href="https://www.linkedin.com/in/channas" target="_blank" rel="noopener" class="nav-cta">LinkedIn ↗</a></li>',
      "        </ul>",
      "      </nav>",
      "    </div>",
      "  </header>",
      "",
      '  <main class="page-main">',
      '    <div class="container">',
      '      <div class="post-wrap">',
      '        <a href="../blog_list.html" class="post-back">← Back to Blog</a>',
      '        <div class="post-header">',
      (topicFirst ? '          <p class="post-label">' + esc(topicFirst) + "</p>" : ""),
      '          <h1 class="post-title">' + esc(g.title) + "</h1>",
      '          <p class="post-meta">' + esc(g.date) + " · Channa Sandaruwan" +
        (topicMeta ? " · <span class=\"post-meta-topic\">" + esc(topicMeta) + "</span>" : "") + "</p>",
      "        </div>",
      '        <div class="post-content">',
      (g.html || ""),
      "        </div>",
      "      </div>",
      "    </div>",
      "  </main>",
      "",
      '  <footer class="footer">',
      '    <div class="container">',
      "      <p>&copy; 2025 Channa Sandaruwan · Systems Engineer · Kuwait</p>",
      '      <nav class="footer-links">',
      '        <a href="../index.html">Home</a>',
      '        <a href="../experience.html">Experience</a>',
      '        <a href="https://www.linkedin.com/in/channas" target="_blank" rel="noopener">LinkedIn</a>',
      "      </nav>",
      "    </div>",
      "  </footer>",
      "",
      '  <script src="../js/sanitize.js" defer><\/script>',
      '  <script src="../js/site-settings.js" defer><\/script>',
      '  <script src="../js/code-block-expand.js" defer><\/script>',
      "</body>",
      "</html>"
    ];
    return lines.filter(function (l) { return l !== null && l !== undefined && l !== false; }).join("\n");
  }

  function buildBlogListEntry(g) {
    var topics = typeof window.sanitizeTopicList === "function" ? window.sanitizeTopicList(g.topics) : (g.topics || []);
    var topicFirst = topics[0] || "";
    var slug    = g.slug || "post";
    var excerpt = g.excerpt || textExcerpt(g.html);
    return [
      "        <li>",
      '          <a href="blog/' + slug + '.html">',
      '            <div class="bl-date-col">',
      "              <div class=\"bl-date\">" + escapeHtml(g.date) + "</div>",
      "              <div class=\"bl-date\">" + (g.readMin || 1) + " min read</div>",
      "            </div>",
      "            <div>",
      '              <p class="bl-tag">' + escapeHtml(topicFirst) + "</p>",
      '              <h2 class="bl-title">' + escapeHtml(g.title) + "</h2>",
      '              <p class="bl-excerpt">' + escapeHtml(excerpt) + "</p>",
      "            </div>",
      "          </a>",
      "        </li>"
    ].join("\n");
  }

  function removeBlogListEntry(html, slug) {
    var target = 'href="blog/' + slug + '.html"';
    var parts = html.split(/(?=[ \t]*<li\b)/);
    return parts.filter(function (part) {
      if (part.indexOf("<li") < 0) return true;
      return part.indexOf(target) < 0;
    }).join("");
  }

  async function updateBlogListHtml(g, remove) {
    var file = await ghGetFile("blog_list.html");
    if (!file) throw new Error("Could not fetch blog_list.html from GitHub.");
    var slug = g.slug || "post";
    var alreadyExists = file.content.indexOf('href="blog/' + slug + '.html"') >= 0;
    var html = removeBlogListEntry(file.content, slug);
    if (!remove) {
      html = html.replace('<ul class="blog-list">', '<ul class="blog-list">\n' + buildBlogListEntry(g) + "\n");
    }
    var verb = remove ? "Remove" : (alreadyExists ? "Update" : "Add");
    await ghPutFile("blog_list.html", html, verb + " post in blog list: " + (g.title || slug), file.sha);
  }

  function setGhStatus(msg, isError) {
    var el = $("gh-status");
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? "#f08080" : "#8b91a0";
  }

  async function publishToGitHub() {
    var btn = $("btn-publish-gh");
    if (btn) { btn.disabled = true; btn.textContent = "Publishing…"; }
    setGhStatus("");
    try {
      var g = gatherForm();
      if (!g.title) { alert("Add a title first."); return; }
      upsertPostGathered(g);
      savePosts();
      renderList();
      var postPath = "blog/" + (g.slug || "post") + ".html";
      setGhStatus("Checking for existing file…");
      var existing = await ghGetFile(postPath);
      setGhStatus("Uploading post…");
      await ghPutFile(postPath, buildPostHtml(g),
        (existing ? "Update" : "Add") + " post: " + g.title,
        existing ? existing.sha : undefined);
      setGhStatus("Updating blog list…");
      await updateBlogListHtml(g, false);
      setGhStatus("✓ Published! GitHub Pages will go live in ~30 seconds.");
      $("save-status").textContent = "Published to GitHub ✓";
      setTimeout(function () {
        var el = $("save-status");
        if (el && el.textContent === "Published to GitHub ✓") el.textContent = "";
      }, 5000);
    } catch (err) {
      setGhStatus((err && err.message) || String(err), true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "↑ Publish to GitHub"; }
    }
  }

  async function unpublishFromGitHub() {
    var g = gatherForm();
    var slug = g.slug || "post";
    if (!confirm("Delete blog/" + slug + ".html from GitHub and remove it from the blog list?")) return;
    var btn = $("btn-unpublish-gh");
    if (btn) { btn.disabled = true; btn.textContent = "Unpublishing…"; }
    setGhStatus("");
    try {
      var postPath = "blog/" + slug + ".html";
      setGhStatus("Fetching file…");
      var existing = await ghGetFile(postPath);
      if (existing) {
        setGhStatus("Deleting post file…");
        await ghDeleteFile(postPath, "Remove post: " + (g.title || slug), existing.sha);
      }
      setGhStatus("Updating blog list…");
      await updateBlogListHtml(g, true);
      setGhStatus("Unpublished from GitHub.");
    } catch (err) {
      setGhStatus((err && err.message) || String(err), true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Unpublish from GitHub"; }
    }
  }

  // ── end GitHub publishing ───────────────────────────────────────────────────

  function bind() {
    $("login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var pw = $("login-pass").value;
      $("login-err").textContent = "";
      sha256Hex(pw).then(function (hex) {
        if (hex !== ADMIN_HASH) {
          $("login-err").textContent = "Incorrect password.";
          return;
        }
        setAuthed();
        $("login-screen").classList.add("hidden");
        $("admin-dashboard").classList.remove("hidden");
        state.posts = loadPosts();
        syncFontSelect();
        syncAdminThemeSelect();
        syncPatField();
        renderList();
        updateStorageHint();
        if (state.posts.length) selectPost(state.posts[0].id);
        else newPost();
      });
    });

    $("btn-logout").addEventListener("click", logout);
    $("btn-new").addEventListener("click", newPost);
    $("btn-save").addEventListener("click", saveCurrent);
    $("btn-del").addEventListener("click", deleteCurrent);
    $("btn-code").addEventListener("click", insertCode);
    $("btn-imgurl").addEventListener("click", insertImageUrl);
    $("file-img").addEventListener("change", onPickImage);
    if ($("btn-duplicate")) $("btn-duplicate").addEventListener("click", duplicateCurrent);
    var taHtml = $("f-html");
    taHtml.addEventListener("paste", onEditorPaste);
    taHtml.addEventListener("dragover", onEditorDragOver);
    taHtml.addEventListener("drop", onEditorDrop);
    $("btn-export-json").addEventListener("click", exportJson);
    $("btn-export-html").addEventListener("click", exportHtml);
    $("btn-preview").addEventListener("click", preview);
    $("btn-font").addEventListener("click", applyFontFromSelect);
    $("file-import").addEventListener("change", importJson);
    if ($("admin-site-theme")) {
      $("admin-site-theme").addEventListener("change", function () {
        if (typeof window.channaSaveSiteTheme === "function") {
          window.channaSaveSiteTheme($("admin-site-theme").value);
        }
      });
    }

    ["f-title", "f-slug", "f-date", "f-topics", "f-excerpt", "f-html"].forEach(function (id) {
      $(id).addEventListener("input", function () {
        state.dirty = true;
        scheduleAutosave();
      });
    });
    if ($("f-draft")) {
      $("f-draft").addEventListener("change", function () {
        state.dirty = true;
        scheduleAutosave();
      });
    }

    if ($("btn-save-pat")) {
      $("btn-save-pat").addEventListener("click", function () {
        var val = ($("gh-pat").value || "").trim();
        if (!val) { alert("Enter a token first."); return; }
        savePat(val);
        $("gh-pat").value = "";
        $("gh-pat").placeholder = "Token saved (•••)";
        $("gh-pat-status").textContent = "Token saved.";
        setTimeout(function () { if ($("gh-pat-status")) $("gh-pat-status").textContent = ""; }, 2500);
      });
    }
    if ($("btn-clear-pat")) {
      $("btn-clear-pat").addEventListener("click", function () {
        savePat("");
        $("gh-pat").value = "";
        $("gh-pat").placeholder = "ghp_…";
        $("gh-pat-status").textContent = "Token cleared.";
        setTimeout(function () { if ($("gh-pat-status")) $("gh-pat-status").textContent = ""; }, 2500);
      });
    }
    if ($("btn-publish-gh")) $("btn-publish-gh").addEventListener("click", publishToGitHub);
    if ($("btn-unpublish-gh")) $("btn-unpublish-gh").addEventListener("click", unpublishFromGitHub);
  }

  if (isAuthed()) {
    $("login-screen").classList.add("hidden");
    $("admin-dashboard").classList.remove("hidden");
  }

  bind();

  if (isAuthed()) {
    state.posts = loadPosts();
    syncFontSelect();
    syncAdminThemeSelect();
    syncPatField();
    renderList();
    updateStorageHint();
    if (state.posts.length) selectPost(state.posts[0].id);
    else newPost();
  }
})();
