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
    renderList();
    updateStorageHint();
    if (state.posts.length) selectPost(state.posts[0].id);
    else newPost();
  }
})();
