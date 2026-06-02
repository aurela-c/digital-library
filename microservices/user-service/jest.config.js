export default {
  displayName: "user-service",
  rootDir: ".",
  testEnvironment: "node",
  testMatch: ["<rootDir>/__tests__/unit/**/*.test.js"],
  transform: {},
  moduleFileExtensions: ["js", "json", "mjs"],
  clearMocks: true,
  resetModules: true,
  collectCoverageFrom: [
    "controllers/userController.js",
    "controllers/supportController.js",
  ],
  coveragePathIgnorePatterns: ["/node_modules/", "/__tests__/"],
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "text-summary"],
  coverageThreshold: {
    "controllers/userController.js": {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
    "controllers/supportController.js": {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
};
