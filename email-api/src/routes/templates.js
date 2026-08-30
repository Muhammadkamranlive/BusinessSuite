const express = require("express");
const {
  listTemplates,
  getById,
  getByKey,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  resetSystemTemplates
} = require("../templates/store");
const { renderTemplate } = require("../templates/render");

const router = express.Router();

router.get("/", (req, res) => {
  const activeOnly = req.query.activeOnly === "true";
  res.json({ ok: true, templates: listTemplates({ activeOnly }) });
});

router.get("/key/:key", (req, res) => {
  const row = getByKey(req.params.key);
  if (!row) return res.status(404).json({ ok: false, error: "Template not found" });
  return res.json({ ok: true, template: row });
});

router.get("/:id", (req, res) => {
  const row = getById(req.params.id);
  if (!row) return res.status(404).json({ ok: false, error: "Template not found" });
  return res.json({ ok: true, template: row });
});

router.post("/", (req, res) => {
  try {
    const template = createTemplate(req.body || {});
    res.status(201).json({ ok: true, template });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : "Create failed" });
  }
});

router.put("/:id", (req, res) => {
  try {
    const template = updateTemplate(req.params.id, req.body || {});
    res.json({ ok: true, template });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : "Update failed" });
  }
});

router.delete("/:id", (req, res) => {
  try {
    deleteTemplate(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : "Delete failed" });
  }
});

router.post("/reset-system", (_req, res) => {
  const templates = resetSystemTemplates();
  res.json({ ok: true, templates });
});

router.post("/preview", (req, res) => {
  const { templateKey, templateId, subject, html, text, variables } = req.body || {};
  let tpl = null;
  if (templateId) tpl = getById(templateId);
  else if (templateKey) tpl = getByKey(templateKey);
  const srcSubject = subject ?? tpl?.subject ?? "";
  const srcHtml = html ?? tpl?.html ?? "";
  const srcText = text ?? tpl?.text ?? "";
  const vars = variables && typeof variables === "object" ? variables : {};
  res.json({
    ok: true,
    preview: {
      subject: renderTemplate(srcSubject, vars),
      html: renderTemplate(srcHtml, vars),
      text: renderTemplate(srcText, vars)
    }
  });
});

module.exports = router;
