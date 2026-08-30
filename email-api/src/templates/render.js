/**
 * Simple {{variable}} interpolation for HTML / text templates.
 * Missing keys become empty string.
 */
function renderTemplate(source, vars = {}) {
  if (!source) return "";
  return String(source).replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
    const value = vars[key];
    return value == null ? "" : String(value);
  });
}

function extractVariables(source = "") {
  const found = new Set();
  const re = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;
  let match;
  while ((match = re.exec(source))) found.add(match[1]);
  return [...found];
}

module.exports = { renderTemplate, extractVariables };
