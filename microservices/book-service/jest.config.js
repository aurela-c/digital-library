/**
 * Unit-test config for book-service. Same shape as the other services:
 * ESM-native, mocks-only, coverage scoped to the business-logic
 * controller only.
 */
export default {
  displayName: "book-service",
  rootDir: ".",
  testEnvironment: "node",
  testMatch: ["<rootDir>/__tests__/unit/**/*.test.js"],
  transform: {},
  moduleFileExtensions: ["js", "json", "mjs"],
  clearMocks: true,
  resetModules: true,
  collectCoverageFrom: ["controllers/bookController.js"],
  coveragePathIgnorePatterns: ["/node_modules/", "/__tests__/"],
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "text-summary"],
  coverageThreshold: {
    "controllers/bookController.js": {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
};
