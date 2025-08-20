const sanitizeHtml = require("sanitize-html");

function sanitizeInput(input) {
  if (typeof input !== "string") return input;
  return sanitizeHtml(input, {
    allowedTags: [], // Strip all HTML tags
    allowedAttributes: {}, // No attributes allowed
  });
}

module.exports = { sanitizeInput };
