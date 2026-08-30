/** Map ERP modules → preferred email template categories. */
export function templateCategoriesForModule(module?: string): string[] {
  switch (module) {
    case "hrm":
      return ["hrm", "generic", "custom"];
    case "sales":
      return ["sales", "generic", "custom"];
    case "crm":
      return ["crm", "generic", "custom"];
    case "settings":
    case "dashboard":
      return ["administration", "generic", "custom"];
    case "purchases":
      return ["purchases", "generic", "custom"];
    case "finance":
      return ["finance", "sales", "generic", "custom"];
    case "projects":
      return ["projects", "generic", "custom"];
    case "healthcare":
      return ["healthcare", "hrm", "generic", "custom"];
    case "documents":
      return ["documents", "generic", "custom"];
    case "inventory":
    case "operations":
    case "reports":
    default:
      return ["generic", "custom", "administration", "hrm", "sales"];
  }
}

export function sortTemplatesForModule<T extends { category: string; name: string; key: string }>(
  templates: T[],
  module?: string
): T[] {
  const preferred = templateCategoriesForModule(module);
  const rank = (cat: string) => {
    const i = preferred.indexOf((cat || "").toLowerCase());
    return i >= 0 ? i : 100;
  };
  return [...templates].sort((a, b) => {
    const ra = rank(a.category);
    const rb = rank(b.category);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}

export function plainTextFromHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function htmlFromPlainText(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px;line-height:1.6;color:#425466">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0a2540">${paragraphs}</div>`;
}

export function splitRecipients(value: string): string[] {
  return value
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
