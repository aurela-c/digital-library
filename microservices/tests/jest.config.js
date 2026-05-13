/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  roots: ["<rootDir>/integration"],
  testMatch: ["**/*.test.js"],
  testTimeout: 45000,
  verbose: true,
  transform: {},
  moduleNameMapper: {},
};