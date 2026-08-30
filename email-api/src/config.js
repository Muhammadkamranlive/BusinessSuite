const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

/** Google App Passwords are shown as "xxxx xxxx xxxx xxxx" — SMTP wants 16 chars without spaces. */
function normalizeAppPassword(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");
}

module.exports = {
  port: Number(process.env.PORT || 8787),
  apiKey: process.env.EMAIL_API_KEY || "",
  dryRun: String(process.env.EMAIL_DRY_RUN || "false").toLowerCase() === "true",
  gmailUser: String(process.env.GMAIL_USER || "")
    .trim()
    .replace(/^["']|["']$/g, ""),
  gmailAppPassword: normalizeAppPassword(process.env.GMAIL_APP_PASSWORD),
  mailFromName: process.env.MAIL_FROM_NAME || "BusinessSuite ERP",
  mailFrom: String(process.env.MAIL_FROM || process.env.GMAIL_USER || "")
    .trim()
    .replace(/^["']|["']$/g, ""),
  dataDir: process.env.EMAIL_DATA_DIR || path.join(__dirname, "..", "data")
};
