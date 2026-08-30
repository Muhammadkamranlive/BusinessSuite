const nodemailer = require("nodemailer");
const config = require("./config");

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.gmailUser || !config.gmailAppPassword) {
    throw new Error(
      "Gmail is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD (Google App Password) in email-api/.env"
    );
  }
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: config.gmailUser,
      pass: config.gmailAppPassword
    }
  });
  return transporter;
}

function explainGmailAuthError(err) {
  const raw = err instanceof Error ? err.message : String(err);
  if (/535|BadCredentials|Invalid login/i.test(raw)) {
    return [
      "Gmail rejected the sender login (not the recipient).",
      "GMAIL_USER must be the Google account that created the App Password.",
      "Use a Google App Password (16 letters), not your normal Gmail password.",
      "Create one at: Google Account → Security → 2-Step Verification → App passwords",
      "Then update email-api/.env and restart: npm run email:dev",
      "Details: " + raw.split("\n")[0]
    ].join(" ");
  }
  return raw;
}

/**
 * @param {object} opts
 * @param {Array<{ filename: string, content: string, encoding?: string, contentType?: string }>} [opts.attachments]
 */
async function sendMail({ to, cc, bcc, subject, html, text, replyTo, attachments }) {
  const from = `"${config.mailFromName}" <${config.mailFrom || config.gmailUser}>`;
  const payload = {
    from,
    to: Array.isArray(to) ? to.join(", ") : to,
    cc: cc ? (Array.isArray(cc) ? cc.join(", ") : cc) : undefined,
    bcc: bcc ? (Array.isArray(bcc) ? bcc.join(", ") : bcc) : undefined,
    subject,
    html,
    text,
    replyTo,
    attachments: Array.isArray(attachments) && attachments.length ? attachments : undefined
  };

  if (config.dryRun) {
    return {
      dryRun: true,
      messageId: `dry-run-${Date.now()}`,
      accepted: [payload.to],
      preview: {
        subject,
        to: payload.to,
        attachmentCount: payload.attachments?.length || 0
      }
    };
  }

  try {
    const info = await getTransporter().sendMail(payload);
    return {
      dryRun: false,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response
    };
  } catch (err) {
    throw new Error(explainGmailAuthError(err));
  }
}

async function verifyTransport() {
  if (config.dryRun) return { ok: true, dryRun: true };
  if (!config.gmailUser || !config.gmailAppPassword) {
    return { ok: false, error: "Missing GMAIL_USER / GMAIL_APP_PASSWORD" };
  }
  try {
    await getTransporter().verify();
    return { ok: true, dryRun: false, user: config.gmailUser };
  } catch (err) {
    return { ok: false, dryRun: false, error: explainGmailAuthError(err) };
  }
}

module.exports = { sendMail, verifyTransport };
