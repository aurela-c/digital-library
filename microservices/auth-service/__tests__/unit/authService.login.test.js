import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import jwt from "jsonwebtoken";
import { setupAuthMocks, makeUser } from "./_setupAuthMocks.js";

describe("authService.login", () => {
  beforeEach(() => jest.resetModules());

  it("rejects when email or password is missing", async () => {
    const { authService } = await setupAuthMocks();

    await expect(authService.login({})).rejects.toMatchObject({ status: 400 });
    await expect(
      authService.login({ email: "a@b.com" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects when no user matches the email (invalid credentials)", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByEmail.mockResolvedValueOnce(null);

    await expect(
      authService.login({ email: "missing@example.com", password: "x" })
    ).rejects.toMatchObject({ status: 400, message: "Invalid credentials" });
  });

  it("rejects when the password does not match the stored hash", async () => {
    const { authService, userRepository, audit } = await setupAuthMocks();
    userRepository.findByEmail.mockResolvedValueOnce(
      makeUser({ password: "hashed:correct" })
    );

    await expect(
      authService.login({ email: "alice@example.com", password: "wrong" })
    ).rejects.toMatchObject({ status: 400 });
    expect(audit.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LOGIN_FAILED" })
    );
  });

  it("rejects unverified users with status 403 / EMAIL_NOT_VERIFIED", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByEmail.mockResolvedValueOnce(
      makeUser({ isVerified: false })
    );

    await expect(
      authService.login({
        email: "alice@example.com",
        password: "correct-horse-battery",
      })
    ).rejects.toMatchObject({ status: 403, code: "EMAIL_NOT_VERIFIED" });
  });

  it("blocks BANNED accounts", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByEmail.mockResolvedValueOnce(
      makeUser({ accountStatus: "BANNED" })
    );

    await expect(
      authService.login({
        email: "alice@example.com",
        password: "correct-horse-battery",
      })
    ).rejects.toMatchObject({ status: 403, message: "Account suspended" });
  });

  it("blocks INACTIVE accounts", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByEmail.mockResolvedValueOnce(
      makeUser({ accountStatus: "INACTIVE" })
    );

    await expect(
      authService.login({
        email: "alice@example.com",
        password: "correct-horse-battery",
      })
    ).rejects.toMatchObject({ status: 403, message: "Account inactive" });
  });

  it("returns access + refresh tokens and a public user payload on success", async () => {
    const { authService, userRepository, audit } = await setupAuthMocks();
    userRepository.findByEmail.mockResolvedValueOnce(
      makeUser({ id: 7, email: "alice@example.com", role: "ROLE_USER" })
    );

    const result = await authService.login({
      email: "alice@example.com",
      password: "correct-horse-battery",
    });

    expect(result.status).toBe(200);
    expect(result.body.accessToken).toEqual(expect.any(String));
    expect(result.body.refreshToken).toEqual(expect.any(String));
    expect(result.body.user).toMatchObject({
      id: 7,
      email: "alice@example.com",
      role: "ROLE_USER",
    });
    // The user payload must NEVER include the password hash.
    expect(result.body.user).not.toHaveProperty("password");

    // Tokens must be real, decodable JWTs with the expected claims.
    const accessClaims = jwt.verify(
      result.body.accessToken,
      process.env.ACCESS_SECRET
    );
    expect(accessClaims).toMatchObject({
      sub: "7",
      email: "alice@example.com",
      role: "ROLE_USER",
      typ: "access",
    });
    const refreshClaims = jwt.verify(
      result.body.refreshToken,
      process.env.REFRESH_SECRET
    );
    expect(refreshClaims).toMatchObject({ sub: "7", typ: "refresh" });
    expect(refreshClaims.jti).toEqual(expect.any(String));

    expect(audit.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LOGIN_OK", userId: 7 })
    );
  });

  it("normalises legacy role strings (e.g. 'admin') to canonical ROLE_ADMIN in the payload", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByEmail.mockResolvedValueOnce(
      makeUser({ role: "admin" })
    );

    const result = await authService.login({
      email: "alice@example.com",
      password: "correct-horse-battery",
    });

    expect(result.body.user.role).toBe("ROLE_ADMIN");
    const access = jwt.verify(
      result.body.accessToken,
      process.env.ACCESS_SECRET
    );
    expect(access.role).toBe("ROLE_ADMIN");
  });
});

describe("authService.logout", () => {
  it("always returns 204 with no body — stateless logout is client-side", async () => {
    const { authService } = await setupAuthMocks();
    expect(await authService.logout()).toEqual({ status: 204, body: null });
  });
});
