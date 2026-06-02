import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { setupAuthMocks, makeUser } from "./_setupAuthMocks.js";

describe("authService.requestReset", () => {
  beforeEach(() => jest.resetModules());

  it("rejects an invalid email payload", async () => {
    const { authService } = await setupAuthMocks();
    await expect(authService.requestReset({})).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      authService.requestReset({ email: 123 })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("returns the generic 'if exists' response for unknown emails — no user enumeration", async () => {
    const { authService, userRepository, email, audit } = await setupAuthMocks();
    userRepository.findByEmail.mockResolvedValueOnce(null);

    const out = await authService.requestReset({
      email: "nobody@example.com",
    });

    expect(out.status).toBe(200);
    expect(out.body.message).toMatch(/if an account exists/i);
    // Critically, NO email is sent and NO write happens.
    expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(audit.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PASSWORD_RESET_REQUEST_UNKNOWN" })
    );
  });

  it("persists a reset token + expiry and sends the reset email for known emails", async () => {
    const { authService, userRepository, email, audit } = await setupAuthMocks();
    const user = makeUser({
      id: 13,
      email: "exists@example.com",
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
    userRepository.findByEmail.mockResolvedValueOnce(user);

    const out = await authService.requestReset({
      email: "  EXISTS@example.com  ",
    });

    expect(userRepository.findByEmail).toHaveBeenCalledWith("exists@example.com");
    expect(user.resetPasswordToken).toEqual(expect.any(String));
    expect(user.resetPasswordToken.length).toBeGreaterThan(20);
    expect(user.resetPasswordExpires).toBeInstanceOf(Date);
    expect(user.resetPasswordExpires.getTime()).toBeGreaterThan(Date.now());
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(email.sendPasswordResetEmail).toHaveBeenCalledWith(
      "exists@example.com",
      expect.stringContaining("/auth/reset-password?token="),
      expect.any(Number)
    );
    expect(out.status).toBe(200);
    expect(audit.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PASSWORD_RESET_REQUEST", userId: 13 })
    );
  });

  it("swallows email-send failures so the response stays generic (no enumeration via SMTP errors)", async () => {
    const { authService, userRepository, email } = await setupAuthMocks();
    userRepository.findByEmail.mockResolvedValueOnce(makeUser());
    email.sendPasswordResetEmail.mockRejectedValueOnce(new Error("SMTP down"));

    const out = await authService.requestReset({ email: "alice@example.com" });
    expect(out.status).toBe(200);
  });
});

describe("authService.resetPassword", () => {
  beforeEach(() => jest.resetModules());

  it("rejects missing tokens (TOKEN_MISSING)", async () => {
    const { authService } = await setupAuthMocks();
    await expect(
      authService.resetPassword("", { password: "longenough1" })
    ).rejects.toMatchObject({ status: 400, code: "TOKEN_MISSING" });
  });

  it("rejects weak passwords (PASSWORD_WEAK)", async () => {
    const { authService } = await setupAuthMocks();
    await expect(
      authService.resetPassword("any-token", { password: "short" })
    ).rejects.toMatchObject({ status: 400, code: "PASSWORD_WEAK" });
  });

  it("rejects unknown reset tokens (RESET_TOKEN_INVALID)", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByResetToken.mockResolvedValueOnce(null);

    await expect(
      authService.resetPassword("missing-token", { password: "newvalidpw1" })
    ).rejects.toMatchObject({ status: 400, code: "RESET_TOKEN_INVALID" });
  });

  it("rejects expired reset tokens (RESET_TOKEN_INVALID)", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    const user = makeUser({
      resetPasswordToken: "still-here",
      resetPasswordExpires: new Date(Date.now() - 60_000),
    });
    userRepository.findByResetToken.mockResolvedValueOnce(user);

    await expect(
      authService.resetPassword("still-here", { password: "newvalidpw1" })
    ).rejects.toMatchObject({ status: 400, code: "RESET_TOKEN_INVALID" });
  });

  it("rotates the password hash and clears the reset state on success (accepts both `password` and `newPassword` field names)", async () => {
    const { authService, userRepository, bcrypt, audit } = await setupAuthMocks();
    const user = makeUser({
      password: "hashed:old",
      resetPasswordToken: "valid-token",
      resetPasswordExpires: new Date(Date.now() + 60_000),
    });
    userRepository.findByResetToken.mockResolvedValueOnce(user);

    const out = await authService.resetPassword("valid-token", {
      newPassword: "brandnewpw1",
    });

    expect(bcrypt.hash).toHaveBeenCalledWith("brandnewpw1", 10);
    expect(user.password).toBe("hashed:brandnewpw1");
    expect(user.resetPasswordToken).toBeNull();
    expect(user.resetPasswordExpires).toBeNull();
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(out.status).toBe(200);
    expect(audit.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PASSWORD_RESET_COMPLETE" })
    );
  });
});
