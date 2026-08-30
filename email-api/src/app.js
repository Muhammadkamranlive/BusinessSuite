const express = require("express");
const cors = require("cors");
const config = require("./config");
const { verifyTransport } = require("./mailer");
const templatesRouter = require("./routes/templates");
const sendRouter = require("./routes/send");

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "12mb" }));

  app.use((req, res, next) => {
    if (!config.apiKey) return next();
    const header = req.header("x-email-api-key") || "";
    const bearer = (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    if (header === config.apiKey || bearer === config.apiKey) return next();
    if (req.path === "/health") return next();
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  });

  app.get("/health", async (_req, res) => {
    try {
      const mail = await verifyTransport();
      res.json({
        ok: true,
        service: "businesssuite-email-api",
        dryRun: config.dryRun,
        mail
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : "Health check failed"
      });
    }
  });

  app.use("/templates", templatesRouter);
  app.use("/send", sendRouter);

  app.use((err, _req, res, _next) => {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "Server error" });
  });

  return app;
}

module.exports = { createApp };
