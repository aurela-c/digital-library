/**
 * Centralised mock wiring for authService unit tests.
 *
 * Every spec file calls `await setupAuthMocks()` BEFORE importing
 * `authService`. This installs ESM mocks for the userRepository,
 * bcrypt, emailService, and the audit logger using
 * `jest.unstable_mockModule`, then dynamically imports authService
 * so it picks up the mocked dependencies.
 *
 * Returns the freshly imported `authService` plus references to each
 * mock so individual tests can assert on calls and stub return values.
 */
import { jest } from "@jest/globals";

export async function setupAuthMocks({ skipVerify = false } = {}) {
  process.env.AUTH_SKIP_EMAIL_VERIFY = skipVerify ? "true" : "false";

  // Fully spy-able userRepository (mocked Sequelize).
  const userRepository = {
    findByEmail: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    findByVerificationToken: jest.fn(),
    findByResetToken: jest.fn(),
  };

  // Mock bcrypt — unit tests should not pay the cost of real hashing
  // and should be 100% deterministic.
  const bcryptMock = {
    hash: jest.fn(async (raw) => `hashed:${raw}`),
    compare: jest.fn(async (raw, hashed) => hashed === `hashed:${raw}`),
  };

  const emailMock = {
    sendVerificationEmail: jest.fn(async () => undefined),
    sendPasswordResetEmail: jest.fn(async () => undefined),
  };

  const auditMock = { auditLog: jest.fn() };

  jest.unstable_mockModule(
    "../../repositories/userRepository.js",
    () => ({ userRepository })
  );
  jest.unstable_mockModule(
    "../../utils/emailService.js",
    () => emailMock
  );
  jest.unstable_mockModule(
    "../../utils/auditLog.js",
    () => auditMock
  );
  jest.unstable_mockModule("bcrypt", () => ({ default: bcryptMock, ...bcryptMock }));

  const { authService } = await import("../../services/authService.js");

  return {
    authService,
    userRepository,
    bcrypt: bcryptMock,
    email: emailMock,
    audit: auditMock,
  };
}

/** Build a fake Sequelize User row with stubbed save/destroy. */
export const makeUser = (overrides = {}) => {
  const user = {
    id: 1,
    username: "alice",
    email: "alice@example.com",
    password: "hashed:correct-horse-battery",
    role: "ROLE_USER",
    isVerified: true,
    verificationToken: null,
    accountStatus: "ACTIVE",
    profileImage: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    ...overrides,
  };
  user.save = jest.fn(async () => user);
  user.destroy = jest.fn(async () => undefined);
  return user;
};
