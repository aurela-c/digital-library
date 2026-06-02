const { defineConfig } = require("cypress");

/**
 * Cypress configuration for the Digital Library end-to-end suite.
 *
 * Targets the LIVE Docker Compose stack:
 *   - frontend (nginx-fronted React SPA)   http://[::1]
 *   - api-gateway                           http://[::1]:4000
 *
 * NOTE on `[::1]` vs `localhost`:
 * On Windows hosts that *also* run other web servers on :80 / :4000
 * (XAMPP Apache, a standalone nginx, IIS, etc.), `localhost` may
 * resolve to IPv4 first and silently land on the *wrong* server.
 * Docker Desktop binds its published ports on both IPv4 and IPv6, so
 * pointing the suite at the IPv6 loopback (`[::1]`) guarantees we hit
 * the Docker-published port unambiguously. Override per environment if
 * your machine is clean.
 *
 * Override per environment / CI with the standard Cypress env vars, e.g.:
 *
 *   CYPRESS_BASE_URL=http://localhost:5173 \
 *   CYPRESS_apiUrl=http://localhost:4000   \
 *   CYPRESS_userEmail=aurelacocaj1@gmail.com \
 *   CYPRESS_userPassword=ela12345 \
 *   CYPRESS_adminEmail=admin@library.com \
 *   CYPRESS_adminPassword=admin123 \
 *   npx cypress run
 */
module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost",
    specPattern: "e2e/**/*.cy.js",
    supportFile: "support/e2e.js",
    fixturesFolder: "fixtures",
    screenshotsFolder: "reports/screenshots",
    videosFolder: "reports/videos",
    downloadsFolder: "reports/downloads",
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 800,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    pageLoadTimeout: 30000,
    retries: { runMode: 1, openMode: 0 },

    reporter: "cypress-mochawesome-reporter",
    reporterOptions: {
      reportDir: "reports/html",
      charts: true,
      embeddedScreenshots: true,
      inlineAssets: true,
      reportFilename: "digital-library-e2e",
      reportPageTitle: "Digital Library — E2E",
      saveAllAttempts: false,
    },

    env: {
      apiUrl: "http://localhost:4000",
      userEmail: "aurelacocaj1@gmail.com",
      userPassword: "ela12345",
      adminEmail: "admin@library.com",
      adminPassword: "admin123",
    },

    setupNodeEvents(on, config) {
      // Wire up the mochawesome reporter plugin (auto-generates the HTML
      // report after the run completes).
      require("cypress-mochawesome-reporter/plugin")(on);
      return config;
    },
  },
});
