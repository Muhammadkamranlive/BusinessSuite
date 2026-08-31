const express = require("express");

/** Vercel serverless entry — must default-export the Express app */
module.exports = require("./express-app").createApp();
