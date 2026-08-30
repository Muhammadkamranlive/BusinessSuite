const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");
const { DEFAULT_TEMPLATES } = require("./seed");
const { extractVariables } = require("./render");

function ensureDataDir() {
  if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir, { recursive: true });
}

function templatesPath() {
  return path.join(config.dataDir, "templates.json");
}

function now() {
  return new Date().toISOString();
}

function normalize(row) {
  const html = row.html || "";
  const text = row.text || "";
  const subject = row.subject || "";
  return {
    id: row.id || uuidv4(),
    key: String(row.key || "").trim(),
    name: String(row.name || "").trim(),
    category: row.category || "general",
    description: row.description || "",
    subject,
    html,
    text,
    variables: Array.isArray(row.variables) && row.variables.length
      ? row.variables
      : extractVariables(`${subject}\n${html}\n${text}`),
    is_system: Boolean(row.is_system),
    is_active: row.is_active !== false,
    created_at: row.created_at || now(),
    updated_at: row.updated_at || now()
  };
}

function readAll() {
  ensureDataDir();
  const file = templatesPath();
  if (!fs.existsSync(file)) {
    const seeded = DEFAULT_TEMPLATES.map((t) =>
      normalize({ ...t, id: `tpl-${t.key.replace(/\./g, "-")}`, created_at: now(), updated_at: now() })
    );
    fs.writeFileSync(file, JSON.stringify(seeded, null, 2));
    return seeded;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    const rows = Array.isArray(parsed) ? parsed.map(normalize) : [];
    // Merge any newly added system templates without wiping custom edits
    const keys = new Set(rows.map((r) => r.key));
    let changed = false;
    for (const t of DEFAULT_TEMPLATES) {
      if (keys.has(t.key)) continue;
      rows.push(
        normalize({
          ...t,
          id: `tpl-${t.key.replace(/\./g, "-")}`,
          created_at: now(),
          updated_at: now()
        })
      );
      changed = true;
    }
    if (changed) writeAll(rows);
    return rows;
  } catch {
    return [];
  }
}

function writeAll(rows) {
  ensureDataDir();
  fs.writeFileSync(templatesPath(), JSON.stringify(rows, null, 2));
}

function listTemplates({ activeOnly = false } = {}) {
  let rows = readAll().sort((a, b) => a.name.localeCompare(b.name));
  if (activeOnly) rows = rows.filter((r) => r.is_active);
  return rows;
}

function getById(id) {
  return readAll().find((r) => r.id === id) || null;
}

function getByKey(key) {
  return readAll().find((r) => r.key === key) || null;
}

function createTemplate(input) {
  const rows = readAll();
  const key = String(input.key || "").trim();
  if (!key) throw new Error("Template key is required.");
  if (rows.some((r) => r.key === key)) throw new Error(`Template key "${key}" already exists.`);
  const row = normalize({
    ...input,
    id: uuidv4(),
    key,
    is_system: false,
    created_at: now(),
    updated_at: now()
  });
  rows.push(row);
  writeAll(rows);
  return row;
}

function updateTemplate(id, patch) {
  const rows = readAll();
  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) throw new Error("Template not found.");
  const existing = rows[index];
  if (patch.key && patch.key !== existing.key && rows.some((r) => r.key === patch.key)) {
    throw new Error(`Template key "${patch.key}" already exists.`);
  }
  const next = normalize({
    ...existing,
    ...patch,
    id: existing.id,
    key: existing.is_system ? existing.key : patch.key || existing.key,
    is_system: existing.is_system,
    created_at: existing.created_at,
    updated_at: now()
  });
  rows[index] = next;
  writeAll(rows);
  return next;
}

function deleteTemplate(id) {
  const rows = readAll();
  const row = rows.find((r) => r.id === id);
  if (!row) throw new Error("Template not found.");
  if (row.is_system) throw new Error("System templates cannot be deleted. Deactivate them instead.");
  writeAll(rows.filter((r) => r.id !== id));
  return true;
}

function resetSystemTemplates() {
  const rows = readAll();
  const custom = rows.filter((r) => !r.is_system);
  const seeded = DEFAULT_TEMPLATES.map((t) => {
    const existing = rows.find((r) => r.key === t.key && r.is_system);
    return normalize({
      ...t,
      id: existing?.id || `tpl-${t.key.replace(/\./g, "-")}`,
      created_at: existing?.created_at || now(),
      updated_at: now()
    });
  });
  writeAll([...seeded, ...custom]);
  return seeded;
}

module.exports = {
  listTemplates,
  getById,
  getByKey,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  resetSystemTemplates
};
