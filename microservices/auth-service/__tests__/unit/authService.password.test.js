import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { setupAuthMocks, makeUser } from "./_setupAuthMocks.js";

describe("authService.changePassword", () => {
  beforeEach(() => jest.resetModules());

  it("requires authentication", async () => {
    const { authService } = await setupAuthMocks();
    await expect(
      authService.changePassword(null, {
        currentPassword: "old",
        newPassword: "newvalid1",
      })
    ).rejects.toMatchObject({ status: 401 });
  });

  it("requires both passwords to be supplied", async () => {
    const { authService } = await setupAuthMocks();
    await expect(
      authService.changePassword(1, { currentPassword: "old" })
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      authService.changePassword(1, { newPassword: "newvalid1" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects new passwords shorter than 8 chars (PASSWORD_WEAK)", async () => {
    const { authService } = await setupAuthMocks();
    await expect(
      authService.changePassword(1, {
        currentPassword: "old",
        newPassword: "short",
      })
    ).rejects.toMatchObject({ status: 400, code: "PASSWORD_WEAK" });
  });

  it("rejects when the new password matches the current one", async () => {
    const { authService } = await setupAuthMocks();
    await expect(
      authService.changePassword(1, {
        currentPassword: "samesame1",
        newPassword: "samesame1",
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("404s when the user is gone", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByPk.mockResolvedValueOnce(null);
    await expect(
      authService.changePassword(1, {
        currentPassword: "currentpw",
        newPassword: "newvalidpw",
      })
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects an incorrect current password with CURRENT_PASSWORD_INVALID", async () => {
    const { authService, userRepository, audit } = await setupAuthMocks();
    userRepository.findByPk.mockResolvedValueOnce(
      makeUser({ password: "hashed:correct-current" })
    );
    await expect(
      authService.changePassword(1, {
        currentPassword: "wrong-current",
        newPassword: "brandnewpw1",
      })
    ).rejects.toMatchObject({ status: 400, code: "CURRENT_PASSWORD_INVALID" });
    expect(audit.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PASSWORD_CHANGE_FAILED" })
    );
  });

  it("hashes and persists the new password on success", async () => {
    const { authService, userRepository, bcrypt, audit } =
      await setupAuthMocks();
    const user = makeUser({ password: "hashed:current-pw" });
    userRepository.findByPk.mockResolvedValueOnce(user);

    const out = await authService.changePassword(1, {
      currentPassword: "current-pw",
      newPassword: "brandnewpw1",
    });

    expect(bcrypt.compare).toHaveBeenCalledWith("current-pw", "hashed:current-pw");
    expect(bcrypt.hash).toHaveBeenCalledWith("brandnewpw1", 10);
    expect(user.password).toBe("hashed:brandnewpw1");
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(out.status).toBe(200);
    expect(audit.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PASSWORD_CHANGED" })
    );
  });
});

describe("authService.deleteAccount", () => {
  beforeEach(() => jest.resetModules());

  it("requires authentication", async () => {
    const { authService } = await setupAuthMocks();
    await expect(
      authService.deleteAccount(null, { password: "x" })
    ).rejects.toMatchObject({ status: 401 });
  });

  it("requires a password in the request body (PASSWORD_REQUIRED)", async () => {
    const { authService } = await setupAuthMocks();
    await expect(
      authService.deleteAccount(1, {})
    ).rejects.toMatchObject({ status: 400, code: "PASSWORD_REQUIRED" });
  });

  it("404s when the user does not exist", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByPk.mockResolvedValueOnce(null);
    await expect(
      authService.deleteAccount(1, { password: "pw" })
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects an incorrect password without destroying the row", async () => {
    const { authService, userRepository, audit } = await setupAuthMocks();
    const user = makeUser({ password: "hashed:right" });
    userRepository.findByPk.mockResolvedValueOnce(user);

    await expect(
      authService.deleteAccount(1, { password: "wrong" })
    ).rejects.toMatchObject({ status: 400, code: "PASSWORD_INVALID" });
    expect(user.destroy).not.toHaveBeenCalled();
    expect(audit.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ACCOUNT_DELETE_FAILED" })
    );
  });

  it("destroys the user record on correct password and emits an audit event with a snapshot", async () => {
    const { authService, userRepository, audit } = await setupAuthMocks();
    const user = makeUser({
      id: 31,
      email: "del@example.com",
      password: "hashed:right",
    });
    userRepository.findByPk.mockResolvedValueOnce(user);

    const out = await authService.deleteAccount(31, { password: "right" });

    expect(user.destroy).toHaveBeenCalledTimes(1);
    expect(audit.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ACCOUNT_DELETED",
        userId: 31,
        email: "del@example.com",
      })
    );
    expect(out.status).toBe(200);
    expect(out.body.success).toBe(true);
  });
});
