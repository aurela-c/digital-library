/**
 * Root Jest orchestrator — UNIT TESTS ONLY.
 *
 * Runs every per-service unit suite as a separate Jest "project" so
 * each service keeps its own scoped coverage, env, and mock setup,
 * while `npm test` at the repository root reports unified coverage
 * across all four services in a single run.
 *
 * Integration / E2E / security / load tests live under
 * `microservices/tests/` and are intentionally NOT included here.
 * Run them via `npm run test:integration` or `npm run test:load`.
 *
 * NOTE: this file is intentionally CommonJS — the repo root has no
 * `"type": "module"` in package.json, so Node interprets `.js`
 * config files as CommonJS. Per-service jest configs ARE ESM
 * because each service package.json sets `"type": "module"`.
 */
module.exports = {
  projects: [
    "<rootDir>/microservices/auth-service",
    "<rootDir>/microservices/book-service",
    "<rootDir>/microservices/borrow-service",
    "<rootDir>/microservices/user-service",
  ],
  // Aggregate coverage across projects. Terminal-only — no HTML / LCOV
  // dashboards are written. The two `text` reporters print the same
  // per-file table + percentage summary you see at the end of every run.
  collectCoverage: true,
  coverageDirectory: "<rootDir>/coverage/unit",
  coverageReporters: ["text", "text-summary"],
  // Per-project coverageThreshold is enforced inside each project
  // config; the root run additionally enforces a global floor so a
  // regression in any single service is impossible to hide behind
  // higher numbers elsewhere.
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
  verbose: false,
};
