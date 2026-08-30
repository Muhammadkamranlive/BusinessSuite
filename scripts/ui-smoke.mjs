/**
 * Headless Chrome crawl of every public + authenticated ERP page.
 * Uses Chrome DevTools Protocol (no extra npm packages).
 * Usage: node scripts/ui-smoke.mjs [baseUrl]
 */
import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const EMAIL = "admin@demo.com";
const PASSWORD = "Demo@12345";
const DEBUG_PORT = 9333;

const PUBLIC = [
  "/",
  "/login",
  "/signup",
  "/pricing",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/cookies",
  "/security",
  "/blog",
  "/blog/replace-spreadsheets-with-erp",
  "/blog/enterprise-access-control-erp",
  "/blog/inventory-purchasing-sales-cadence",
  "/product/crm",
  "/product/sales",
  "/product/purchases",
  "/product/inventory",
  "/product/hrm",
  "/product/finance",
  "/product/documents",
  "/product/projects",
  "/product/reports",
  "/product/administration",
  "/site/company",
  "/site/legal",
  "/site/resources",
  "/site/company/about",
  "/site/legal/privacy",
  "/site/resources/getting-started"
];

function collectAppRoutes(dir, prefix = "") {
  const routes = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith("_") || name === "api") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name.startsWith("[")) continue;
      routes.push(...collectAppRoutes(full, `${prefix}/${name}`));
    } else if (name === "page.tsx") {
      routes.push(prefix || "/");
    }
  }
  return routes;
}

const appRoutes = collectAppRoutes(join(process.cwd(), "app"));
const extraAuth = ["/crm/leads/new", "/sales/invoices/new", "/hrm/forms/new", "/activate", "/billing"];
const routes = [...new Set([...PUBLIC, ...appRoutes, ...extraAuth])].sort((a, b) => a.localeCompare(b));

const IGNORE_CONSOLE = [
  /Download the React DevTools/i,
  /favicon/i,
  /stripe/i,
  /supabase/i,
  /Failed to load resource/i,
  /net::ERR_/i,
  /ResizeObserver/i,
  /hydration/i
];

function isIgnorable(text) {
  return IGNORE_CONSOLE.some((re) => re.test(text));
}

function looksLikeError(text) {
  return /Unhandled Runtime Error|Application error|Parsing CSS|Unexpected token|TypeError|ReferenceError|is not defined|Cannot read prop|Hydration failed|Checking demo session/i.test(
    text
  );
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve);
      this.ws.addEventListener("error", reject);
    });
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
        return;
      }
      if (msg.method) this.events.push(msg);
    });
  }

  async send(method, params = {}) {
    const id = ++this.id;
    const payload = { id, method, params };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  drain(filter) {
    const kept = [];
    const matched = [];
    for (const ev of this.events) {
      if (filter(ev)) matched.push(ev);
      else kept.push(ev);
    }
    this.events = kept;
    return matched;
  }

  close() {
    this.ws.close();
  }
}

const HEALTH_JS = `(() => {
  const body = document.body?.innerText || "";
  const html = document.documentElement?.innerHTML || "";
  const overlay = Boolean(
    document.querySelector("nextjs-portal")?.shadowRoot?.textContent?.match(
      /Unhandled Runtime Error|Parsing CSS|Application error/i
    )
  );
  const runtime =
    /Unhandled Runtime Error|Application error: a client-side exception|Parsing CSS source code failed/i.test(
      body
    );
  const stuckSession = /Checking demo session/i.test(body) && body.length < 400;
  const notFound = /This page could not be found/i.test(body) && body.length < 800;
  const hasNav = Boolean(document.querySelector('nav[aria-label="Breadcrumb"]'));
  const hasMain = Boolean(document.querySelector("main, .bs-page, form, table, .bs-card"));
  const addButtons = [...document.querySelectorAll("button, a.bs-btn")]
    .map((el) => (el.textContent || "").trim())
    .filter((t) => /^(Add |New |Create |Invite |Record |Log )/i.test(t) || t === "Add" || t === "New")
    .filter((t) => !/extra field|Add field$/i.test(t))
    .slice(0, 6);
  const title =
    document.querySelector("h1")?.textContent?.trim() ||
    document.querySelector("h2")?.textContent?.trim() ||
    "";
  const hrefs = [...document.querySelectorAll("a")]
    .map((a) => a.getAttribute("href") || "")
    .filter(Boolean)
    .slice(0, 80);
  return {
    title,
    href: location.pathname + location.search,
    bodyLen: body.length,
    overlay,
    stuckSession,
    runtime,
    notFound,
    hasNav,
    hasMain,
    addButtons,
    hrefs,
    snippet: body.replace(/\\s+/g, " ").slice(0, 240)
  };
})()`;

const CLICK_ADD_JS = `(() => {
  const els = [...document.querySelectorAll("button, a.bs-btn")];
  const el = els.find((node) => {
    const t = (node.textContent || "").trim();
    return /^(Add |New |Create |Invite |Record |Log )/i.test(t) || t === "Add" || t === "New";
  });
  if (!el || /extra field|Add field$/i.test((el.textContent || "").trim())) return { clicked: false };
  el.click();
  return { clicked: (el.textContent || "").trim() };
})()`;

const FORM_OPEN_JS = `Boolean(document.querySelector("form"))`;

async function evalJson(cdp, expression, awaitPromise = false) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "evaluate failed");
  }
  return result.result.value;
}

const failures = [];
const warnings = [];
const passed = [];

function collectPageErrors(cdp) {
  const errors = [];
  const leftover = [];
  for (const ev of cdp.events) {
    if (ev.method === "Runtime.exceptionThrown") {
      const desc =
        ev.params.exceptionDetails?.exception?.description ||
        ev.params.exceptionDetails?.text ||
        "exception";
      if (!isIgnorable(desc)) errors.push(desc);
    } else if (ev.method === "Runtime.consoleAPICalled" && ev.params.type === "error") {
      const text = (ev.params.args || [])
        .map((a) => a.value || a.description || "")
        .join(" ");
      if (text && !isIgnorable(text)) errors.push(text);
    } else leftover.push(ev);
  }
  cdp.events = leftover;
  return errors;
}

async function visit(cdp, path, { expectAuth = false, interact = false } = {}) {
  cdp.events = [];
  try {
    await cdp.send("Page.navigate", { url: `${BASE}${path}` });
    await wait(500);
    try {
      await evalJson(
        cdp,
        `new Promise((resolve) => {
          const start = Date.now();
          const tick = () => {
            const t = document.body?.innerText || "";
            if (!/Checking demo session/i.test(t) || t.length > 500 || Date.now() - start > 7000) resolve(true);
            else setTimeout(tick, 150);
          };
          tick();
        })`,
        true
      );
    } catch {
      /* health check below */
    }
    await wait(250);
  } catch (err) {
    failures.push({ path, kind: "navigation", detail: String(err) });
    return;
  }

  let health;
  try {
    health = await evalJson(cdp, HEALTH_JS);
  } catch (err) {
    failures.push({ path, kind: "evaluate", detail: String(err) });
    return;
  }

  const pageErrors = collectPageErrors(cdp);
  if (health.overlay || health.runtime) failures.push({ path, kind: "runtime-overlay", detail: health.snippet });
  if (health.stuckSession) failures.push({ path, kind: "stuck-session", detail: "Never left demo session check" });
  if (health.notFound && expectAuth) failures.push({ path, kind: "not-found", detail: health.snippet });
  if (health.bodyLen < 80) failures.push({ path, kind: "blank", detail: `body length ${health.bodyLen}` });
  if (pageErrors.length) {
    const serious = pageErrors.filter(looksLikeError);
    if (serious.length) failures.push({ path, kind: "js-error", detail: serious.slice(0, 3).join(" | ") });
    else warnings.push({ path, kind: "console", detail: pageErrors.slice(0, 2).join(" | ") });
  }
  if (expectAuth && !health.hasNav && !health.stuckSession && path !== "/activate" && path !== "/billing") {
    warnings.push({ path, kind: "no-breadcrumbs", detail: health.title || health.snippet });
  }
  if (expectAuth && !health.hasMain) warnings.push({ path, kind: "no-main", detail: health.snippet });

  if (interact && health.addButtons.length) {
    const before = health.href;
    const add = await evalJson(cdp, CLICK_ADD_JS);
    if (add.clicked) {
      await wait(500);
      const after = await evalJson(cdp, "location.pathname + location.search");
      const formOpen = await evalJson(cdp, FORM_OPEN_JS);
      if (!formOpen && after === before) {
        warnings.push({ path, kind: "add-no-form", detail: `clicked "${add.clicked}" but no form` });
      }
    }
  }

  if (!failures.some((f) => f.path === path)) passed.push(path);
  return health;
}

const profile = mkdtempSync(join(tmpdir(), "bs-smoke-"));
const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-dev-shm-usage",
    "about:blank"
  ],
  { stdio: "ignore" }
);

let cdp;
try {
  let version;
  for (let i = 0; i < 40; i++) {
    try {
      version = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      break;
    } catch {
      await wait(150);
    }
  }
  if (!version?.webSocketDebuggerUrl) throw new Error("Chrome DevTools did not start");

  const pages = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const pageTarget = (pages || []).find((p) => p.type === "page" && p.webSocketDebuggerUrl) || pages?.[0];
  if (!pageTarget?.webSocketDebuggerUrl) throw new Error("No Chrome page target");
  cdp = new Cdp(pageTarget.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");

  console.log(`Crawling ${routes.length} routes at ${BASE}\n`);

  for (const path of PUBLIC) {
    process.stdout.write(`  public  ${path}\n`);
    await visit(cdp, path);
  }

  process.stdout.write("  login   /login\n");
  await visit(cdp, "/login");
  await evalJson(
    cdp,
    `(() => {
      const email = document.querySelector('input[type="email"], input[name="email"]');
      const pass = document.querySelector('input[type="password"]');
      if (!email || !pass) return false;
      const set = (el, v) => {
        const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        proto.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      set(email, ${JSON.stringify(EMAIL)});
      set(pass, ${JSON.stringify(PASSWORD)});
      const form = email.closest("form");
      if (form) form.requestSubmit();
      else document.querySelector('button[type="submit"]')?.click();
      return true;
    })()`
  );
  await wait(2000);
  let loc = await evalJson(cdp, "location.pathname");
  if (!["/dashboard", "/activate"].includes(loc)) {
    await evalJson(
      cdp,
      `(() => {
        localStorage.setItem("businesssuite:user", ${JSON.stringify(EMAIL)});
        localStorage.setItem("businesssuite:tenant", "alpha");
        document.cookie = "businesssuite_session=" + encodeURIComponent(${JSON.stringify(EMAIL)}) + "; path=/; max-age=86400; SameSite=Lax";
        location.href = ${JSON.stringify(BASE + "/dashboard")};
        return true;
      })()`
    );
    await wait(1500);
    loc = await evalJson(cdp, "location.pathname");
  }
  if (loc === "/activate") warnings.push({ path: "/login", kind: "redirect", detail: "Logged in user sent to /activate" });
  else if (loc !== "/dashboard") failures.push({ path: "/login", kind: "login-failed", detail: loc });

  const authRoutes = routes.filter((r) => !PUBLIC.includes(r) && r !== "/login" && r !== "/signup");
  for (const path of authRoutes) {
    process.stdout.write(`  auth    ${path}\n`);
    await visit(cdp, path, { expectAuth: true, interact: true });
  }

  process.stdout.write("  crud    /crm/leads create\n");
  await visit(cdp, "/crm/leads", { expectAuth: true });
  const opened = await evalJson(
    cdp,
    `(() => {
      const btn = [...document.querySelectorAll("button")].find((b) => /New Lead/i.test(b.textContent || ""));
      btn?.click();
      return Boolean(btn);
    })()`
  );
  await wait(400);
  if (!opened) {
    failures.push({ path: "/crm/leads", kind: "crud", detail: "New Lead button not found" });
  } else {
    const filled = await evalJson(
      cdp,
      `(() => {
        const set = (el, v) => {
          const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          proto.call(el, v);
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        };
        const byLabel = (name) =>
          [...document.querySelectorAll("label")].find((l) => (l.querySelector("span")?.textContent || "").trim() === name)?.querySelector("input");
        const company = byLabel("Company Name");
        const contact = byLabel("Contact Name");
        const email = byLabel("Email");
        if (!company || !contact || !email) return { ok: false, reason: "missing fields" };
        set(company, "Smoke Test Co");
        set(contact, "Smoke Contact");
        set(email, "smoke@test.example");
        document.querySelector('form button[type="submit"]')?.click();
        return { ok: true };
      })()`
    );
    if (!filled?.ok) {
      failures.push({ path: "/crm/leads", kind: "crud", detail: filled?.reason || "Could not fill create form" });
    } else {
      await wait(400);
      const confirmed = await evalJson(
        cdp,
        `(() => {
          const btn = [...document.querySelectorAll("button")].find((b) => (b.textContent || "").trim() === "Save");
          btn?.click();
          return Boolean(btn);
        })()`
      );
      await wait(700);
      const found = await evalJson(cdp, `document.body.innerText.includes("Smoke Test Co")`);
      if (!confirmed) failures.push({ path: "/crm/leads", kind: "crud", detail: "Save confirm dialog did not appear" });
      else if (!found) failures.push({ path: "/crm/leads", kind: "crud", detail: "Created lead did not appear in the list" });
    }
  }

  const detailSources = ["/crm/leads", "/crm/customers", "/hrm/employees", "/hrm/forms"];
  for (const src of detailSources) {
    const health = await visit(cdp, src, { expectAuth: true });
    const href = (health?.hrefs || []).find((h) => h.startsWith(`${src}/`) && !h.endsWith("/new") && h.split("/").length >= 4);
    if (href) {
      process.stdout.write(`  detail  ${href}\n`);
      await visit(cdp, href, { expectAuth: true });
    } else {
      warnings.push({ path: src, kind: "no-detail-link", detail: "List had no record links" });
    }
  }
} finally {
  try {
    cdp?.close();
  } catch {
    /* ignore */
  }
  chrome.kill("SIGKILL");
  rmSync(profile, { recursive: true, force: true });
}

const uniqFail = [];
const seen = new Set();
for (const f of failures) {
  const k = `${f.path}|${f.kind}|${f.detail}`;
  if (seen.has(k)) continue;
  seen.add(k);
  uniqFail.push(f);
}

console.log("\n========== UI SMOKE RESULT ==========");
console.log(`Passed: ${passed.length}`);
console.log(`Failures: ${uniqFail.length}`);
console.log(`Warnings: ${warnings.length}`);
if (uniqFail.length) {
  console.log("\nFAILURES:");
  for (const f of uniqFail) console.log(`  [${f.kind}] ${f.path}\n    ${f.detail}`);
}
if (warnings.length) {
  console.log("\nWARNINGS:");
  for (const w of warnings) console.log(`  [${w.kind}] ${w.path}\n    ${w.detail}`);
}

process.exit(uniqFail.length ? 1 : 0);
