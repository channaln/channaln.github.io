/**
 * Topics: letters and numbers only, single spaces (no _ or special chars)
 */
function sanitizeTopicString(input) {
  if (!input || typeof input !== "string") return "";
  return input
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

if (typeof window !== "undefined") {
  window.sanitizeTopicString = sanitizeTopicString;
  window.sanitizeTopicList = sanitizeTopicList;
}
