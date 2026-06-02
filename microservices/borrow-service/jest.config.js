export default {
  displayName: "borrow-service",
  rootDir: ".",
  testEnvironment: "node",
  testMatch: ["<rootDir>/__tests__/unit/**/*.test.js"],
  transform: {},
  moduleFileExtensions: ["js", "json", "mjs"],
  clearMocks: true,
  resetModules: true,
  collectCoverageFrom: ["controllers/borrowController.js"],
  coveragePathIgnorePatterns: ["/node_modules/", "/__tests__/"],
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "text-summary"],
  coverageThreshold: {
    "controllers/borrowController.js": {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
};
