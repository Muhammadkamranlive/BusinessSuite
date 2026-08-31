/**
 * Firebase Functions entry — deploy Express as an HTTPS function.
 *
 * From email-api/:
 *   npm install
 *   firebase login
 *   firebase deploy --only functions
 *
 * The deployed URL becomes EMAIL_API_URL in the Next.js app.
 */
const { onRequest } = require("firebase-functions/v2/https");
const { createApp } = require("./express-app");

const app = createApp();

exports.emailApi = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "256MiB"
  },
  app
);
