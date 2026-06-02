import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import jwt from "jsonwebtoken";
import { setupAuthMocks, makeUser } from "./_setupAuthMocks.js";

const signVerify = (claims, opts = {}) =>
  jwt.sign(
    { typ: "verify", ...claims },
    process.env.ACCESS_SECRET,
    { expiresIn: "24h", ...opts }
  );

describe("authService.verifyEmail", () => {
  beforeEach(() => jest.resetModules());

  it("rejects missing / non-string tokens (TOKEN_MISSING)", async () => {
    const { authService } = await setupAuthMocks();
    await expect(
      authService.verifyEmail("")
    ).rejects.toMatchObject({ status: 400, code: "TOKEN_MISSING" });
    await expect(
      authService.verifyEmail(undefined)
    ).rejects.toMatchObject({ status: 400, code: "TOKEN_MISSING" });
  });

  it("verifies a pending user, clears the token, and auto-logs them in", async () => {
    const { authService, userRepository, audit } = await setupAuthMocks();
    const token = signVerify({ sub: "44", email: "v@example.com" });
    const pending = makeUser({
      id: 44,
      email: "v@example.com",
      isVerified: false,
      verificationToken: token,
    });
    userRepository.findByVerificationToken.mockResolvedValueOnce(pending);

    const out = await authService.verifyEmail(token);

    expect(pending.isVerified).toBe(true);
    expect(pending.verificationToken).toBeNull();
    expect(pending.save).toHaveBeenCalledTimes(1);
    expect(out.status).toBe(200);
    expect(out.body.accessToken).toEqual(expect.any(String));
    expect(out.body.refreshToken).toEqual(expect.any(String));
    expect(out.body.user.id).toBe(44);
    expect(audit.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "EMAIL_VERIFIED" })
    );
  });

  it("is idempotent — clicking an already-verified link still returns auto-login credentials", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    const token = signVerify({ sub: "55" });
    const already = makeUser({ id: 55, isVerified: true });
    // The repo still has the row (token not yet cleared elsewhere).
    userRepository.findByVerificationToken.mockResolvedValueOnce(already);

    const out = await authService.verifyEmail(token);

    expect(out.body.message).toMatch(/already verified/i);
    expect(out.body.accessToken).toEqual(expect.any(String));
    // We must NOT clobber the row again with a save() — it's idempotent.
    expect(already.save).not.toHaveBeenCalled();
  });

  it("falls back to the JWT to recover the user when the token has already been cleared from the DB", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByVerificationToken.mockResolvedValueOnce(null);
    const token = signVerify({ sub: "77", email: "x@example.com" });
    userRepository.findByPk.mockResolvedValueOnce(
      makeUser({ id: 77, isVerified: true })
    );

    const out = await authService.verifyEmail(token);
    expect(out.body.message).toMatch(/already verified/i);
    expect(out.body.accessToken).toEqual(expect.any(String));
  });

  it("rejects expired tokens with TOKEN_EXPIRED for users still pending verification", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    const expired = signVerify({ sub: "88" }, { expiresIn: -10 });
    userRepository.findByVerificationToken.mockResolvedValueOnce(
      makeUser({ id: 88, isVerified: false, verificationToken: expired })
    );

    await expect(
      authService.verifyEmail(expired)
    ).rejects.toMatchObject({ status: 400, code: "TOKEN_EXPIRED" });
  });

  it("rejects tokens whose payload doesn't match the DB row (sub mismatch)", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    const token = signVerify({ sub: "11" });
    userRepository.findByVerificationToken.mockResolvedValueOnce(
      makeUser({ id: 99, isVerified: false, verificationToken: token })
    );

    await expect(
      authService.verifyEmail(token)
    ).rejects.toMatchObject({ status: 400, code: "TOKEN_EXPIRED" });
  });

  it("returns TOKEN_INVALID when there is no DB row and the JWT cannot be decoded", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByVerificationToken.mockResolvedValueOnce(null);

    await expect(
      authService.verifyEmail("garbage")
    ).rejects.toMatchObject({ status: 400, code: "TOKEN_INVALID" });
  });
});
