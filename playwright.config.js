// @ts-check
const { defineConfig, devices } = require("@playwright/test");

// Port the app server is started on for the test run.
const PORT = process.env.HTTP_PORT || 8090;
const BASE_URL = `http://localhost:${PORT}`;

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30000,
  expect: { timeout: 10000 },

  // The server keeps per-session state in memory and tests coordinate several
  // WebSocket clients per session, so run them serially for determinism.
  fullyParallel: false,
  workers: 1,

  reporter: "list",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },

  // Start the real app server for the whole run.
  webServer: {
    command: `HTTP_PORT=${PORT} node src/server.js`,
    url: `${BASE_URL}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 20000,
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
