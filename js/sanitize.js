/**
 * Topics: single words or short labels; hyphens, underscores, colons, and slashes
 * become spaces, then extra spaces are collapsed. No - _ : in output.
 */
function sanitizeTopicString(input) {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/[-_:./\\]+/g, " ")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeTopicList(topics) {
  if (Array.isArray(topics)) {
    return topics.map(sanitizeTopicString).filter(Boolean);
  }
  if (typeof topics === "string") {
    return topics.split(/[\s,·]+/).map(sanitizeTopicString).filter(Boolean);
  }
  return [];
}

/**
 * Public-facing post title: same family as the Elytron / index cards —
 * one em dash, no underscores, no colons (colon becomes em dash for subtitle).
 */
function formatBlogTitle(input) {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/_/g, " ")
    .replace(/:\s*/g, " — ")
    .replace(/\s*-\s+/g, " — ")
    .replace(/—+/g, "—")
    .replace(/ +/g, " ")
    .replace(/ — /g, " — ")
    .replace(/^—\s*|\s*—$/g, "")
    .trim();
}

if (typeof window !== "undefined") {
  window.sanitizeTopicString = sanitizeTopicString;
  window.sanitizeTopicList = sanitizeTopicList;
  window.formatBlogTitle = formatBlogTitle;
}
