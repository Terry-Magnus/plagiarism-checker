const sanitizeHtml = require("sanitize-html");

function sanitizeInput(input) {
  if (typeof input !== "string") return input;

  const stripped = sanitizeHtml(String(input), {
    allowedTags: [], // Strip all HTML tags
    allowedAttributes: {}, // No attributes allowed
  });

  return stripped.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

module.exports = { sanitizeInput };
