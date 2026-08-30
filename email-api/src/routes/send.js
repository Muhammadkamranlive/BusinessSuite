const express = require("express");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");
const { sendMail } = require("../mailer");
const { getByKey, getById } = require("../templates/store");
const { renderTemplate } = require("../templates/render");

const router = express.Router();

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/csv",
  "text/plain"
]);

const EXT_MIME = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".txt": "text/plain"
};

const MAX_ATTACHMENTS = 8;
const MAX_ATTACHMENT_BYTES = 7 * 1024 * 1024; // ~7MB decoded per file
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

function appendOutbox(entry) {
  try {
    if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir, { recursive: true });
    const file = path.join(config.dataDir, "outbox.jsonl");
    fs.appendFileSync(file, `${JSON.stringify(entry)}\n`);
  } catch {
    /* ignore outbox write failures */
  }
}

function normalizeAttachments(raw) {
  if (!raw) return { ok: true, attachments: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "attachments must be an array." };
  if (raw.length > MAX_ATTACHMENTS) {
    return { ok: false, error: `Maximum ${MAX_ATTACHMENTS} attachments allowed.` };
  }

  let total = 0;
  const attachments = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: "Each attachment must be an object." };
    }
    const filename = String(item.filename || item.name || "").trim();
    if (!filename) return { ok: false, error: "Attachment filename is required." };

    const ext = path.extname(filename).toLowerCase();
    let contentType = String(item.contentType || item.type || EXT_MIME[ext] || "").toLowerCase();
    if (!contentType) contentType = "application/octet-stream";
    if (!ALLOWED_MIME.has(contentType) && !EXT_MIME[ext]) {
      return {
        ok: false,
        error: `File type not allowed for “${filename}”. Use PDF, images, DOC/DOCX, XLS/XLSX, or CSV.`
      };
    }

    let content = String(item.content || item.data || "");
    // Accept data-URL or raw base64
    const dataUrl = content.match(/^data:[^;]+;base64,(.+)$/);
    if (dataUrl) content = dataUrl[1];
    content = content.replace(/\s+/g, "");
    if (!content) return { ok: false, error: `Attachment “${filename}” has empty content.` };

    const bytes = Math.floor((content.length * 3) / 4);
    if (bytes > MAX_ATTACHMENT_BYTES) {
      return { ok: false, error: `“${filename}” exceeds 7MB limit.` };
    }
    total += bytes;
    if (total > MAX_TOTAL_BYTES) {
      return { ok: false, error: "Total attachments exceed 10MB." };
    }

    attachments.push({
      filename,
      content,
      encoding: "base64",
      contentType: contentType || EXT_MIME[ext] || "application/octet-stream"
    });
  }

  return { ok: true, attachments };
}

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const to = body.to;
    if (!to || (Array.isArray(to) && !to.length)) {
      return res.status(400).json({ ok: false, error: "Field 'to' is required." });
    }

    let subject = body.subject || "";
    let html = body.html || "";
    let text = body.text || "";
    let templateKey = body.templateKey || null;

    // Apply template first, then allow body overrides (compose edit-after-template)
    if (body.templateKey || body.templateId) {
      const tpl = body.templateId ? getById(body.templateId) : getByKey(body.templateKey);
      if (!tpl) return res.status(404).json({ ok: false, error: "Email template not found." });
      if (!tpl.is_active) return res.status(400).json({ ok: false, error: `Template "${tpl.key}" is inactive.` });
      templateKey = tpl.key;
      const vars = body.variables && typeof body.variables === "object" ? body.variables : {};
      if (!body.subject) subject = renderTemplate(tpl.subject, vars);
      if (!body.html && !body.text) {
        html = renderTemplate(tpl.html, vars);
        text = renderTemplate(tpl.text, vars);
      } else {
        // Still render if composer sent raw template with {{vars}} left in
        if (body.html) html = renderTemplate(body.html, vars);
        if (body.text) text = renderTemplate(body.text, vars);
        if (body.subject) subject = renderTemplate(body.subject, vars);
      }
    } else if (body.variables && typeof body.variables === "object") {
      subject = renderTemplate(subject, body.variables);
      html = renderTemplate(html, body.variables);
      text = renderTemplate(text, body.variables);
    }

    if (!subject) return res.status(400).json({ ok: false, error: "Subject is required (or use a template)." });
    if (!html && !text) return res.status(400).json({ ok: false, error: "html or text body is required." });

    const normalized = normalizeAttachments(body.attachments);
    if (!normalized.ok) return res.status(400).json({ ok: false, error: normalized.error });

    const result = await sendMail({
      to,
      cc: body.cc,
      bcc: body.bcc,
      subject,
      html,
      text,
      replyTo: body.replyTo,
      attachments: normalized.attachments
    });

    const log = {
      id: uuidv4(),
      at: new Date().toISOString(),
      tenantId: body.tenantId || null,
      templateKey,
      to,
      subject,
      dryRun: Boolean(result.dryRun),
      messageId: result.messageId,
      attachmentCount: normalized.attachments.length,
      meta: body.meta || null
    };
    appendOutbox(log);

    res.json({ ok: true, result, log });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "Send failed" });
  }
});

module.exports = router;
