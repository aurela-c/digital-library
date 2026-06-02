/**
 * Unit-test config for auth-service.
 *
 * - Runs ONLY tests under __tests__/unit (no integration/E2E here).
 * - Coverage scoped to actual business logic: services/ + shared roles.
 *   Infrastructure (index.js, routes/, grpc/, middleware/, config/,
 *   models/, hash.js, utils/printRoutes.js) is excluded — those are
 *   covered by the existing integration suite under microservices/tests.
 */
export default {
  displayName: "auth-service",
  rootDir: ".",
  testEnvironment: "node",
  testMatch: ["<rootDir>/__tests__/unit/**/*.test.js"],
  setupFiles: ["<rootDir>/__tests__/jest.setup.js"],
  // ESM-native — no transform, no babel.
  transform: {},
  moduleFileExtensions: ["js", "json", "mjs"],
  clearMocks: true,
  resetModules: true,
  // Scope coverage to business logic only.
  // NOTE: `shared/constants/roles.js` lives OUTSIDE this project's
  // rootDir, so Jest cannot instrument it as part of auth-service
  // coverage even though our roles.test.js does exercise it.
  // We keep the roles unit tests here (cheapest place to put them)
  // and assert ≥80% on what we CAN measure: `services/authService.js`.
  collectCoverageFrom: ["services/**/*.js"],
  coveragePathIgnorePatterns: ["/node_modules/", "/__tests__/"],
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "text-summary"],
  coverageThreshold: {
    "services/authService.js": {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
};
