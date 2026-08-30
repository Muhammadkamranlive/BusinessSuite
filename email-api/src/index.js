const { createApp } = require("./app");
const config = require("./config");

const app = createApp();

if (require.main === module) {
  const host = process.env.HOST || "0.0.0.0";
  app.listen(config.port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`[email-api] listening on http://${host}:${config.port} (dryRun=${config.dryRun})`);
  });
}

module.exports = app;
