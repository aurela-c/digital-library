import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import jwt from "jsonwebtoken";
import { setupAuthMocks, makeUser } from "./_setupAuthMocks.js";

const signRefresh = (claims, opts = {}) =>
  jwt.sign(claims, process.env.REFRESH_SECRET, { expiresIn: "7d", ...opts });

describe("authService.refresh", () => {
  beforeEach(() => jest.resetModules());

  it("rejects when no token is supplied", async () => {
    const { authService } = await setupAuthMocks();
    await expect(authService.refresh({})).rejects.toMatchObject({
      status: 401,
      code: "NO_REFRESH_TOKEN",
    });
  });

  it("rejects garbage / malformed tokens with REFRESH_INVALID", async () => {
    const { authService } = await setupAuthMocks();
    await expect(
      authService.refresh({ token: "not.a.jwt" })
    ).rejects.toMatchObject({ status: 403, code: "REFRESH_INVALID" });
  });

  it("rejects a token signed with the wrong secret", async () => {
    const { authService } = await setupAuthMocks();
    const bad = jwt.sign({ sub: "1", typ: "refresh" }, "wrong-secret");
    await expect(
      authService.refresh({ token: bad })
    ).rejects.toMatchObject({ status: 403, code: "REFRESH_INVALID" });
  });

  it("rejects an access-token masquerading as a refresh token (wrong typ)", async () => {
    const { authService } = await setupAuthMocks();
    const accessShaped = signRefresh({ sub: "1", typ: "access" });
    await expect(
      authService.refresh({ token: accessShaped })
    ).rejects.toMatchObject({ status: 403, code: "REFRESH_INVALID" });
  });

  it("rejects when the user from the token no longer exists", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByPk.mockResolvedValueOnce(null);
    const token = signRefresh({ sub: "999", typ: "refresh" });
    await expect(
      authService.refresh({ token })
    ).rejects.toMatchObject({ status: 403, code: "REFRESH_INVALID" });
  });

  it("blocks BANNED accounts at refresh time (single-TTL lock-out)", async () => {
    const { authService, userRepository, audit } = await setupAuthMocks();
    userRepository.findByPk.mockResolvedValueOnce(
      makeUser({ id: 5, accountStatus: "BANNED" })
    );
    const token = signRefresh({ sub: "5", typ: "refresh" });

    await expect(
      authService.refresh({ token })
    ).rejects.toMatchObject({ status: 403, code: "ACCOUNT_BANNED" });
    expect(audit.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REFRESH_DENIED_BANNED" })
    );
  });

  it("blocks INACTIVE accounts at refresh time", async () => {
    const { authService, userRepository, audit } = await setupAuthMocks();
    userRepository.findByPk.mockResolvedValueOnce(
      makeUser({ id: 6, accountStatus: "INACTIVE" })
    );
    const token = signRefresh({ sub: "6", typ: "refresh" });

    await expect(
      authService.refresh({ token })
    ).rejects.toMatchObject({ status: 403, code: "ACCOUNT_INACTIVE" });
    expect(audit.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REFRESH_DENIED_INACTIVE" })
    );
  });

  it("issues a NEW access + refresh pair when the token is valid and the user is active", async () => {
    const { authService, userRepository, audit } = await setupAuthMocks();
    const user = makeUser({
      id: 9,
      email: "x@y.com",
      accountStatus: "ACTIVE",
    });
    userRepository.findByPk.mockResolvedValueOnce(user);
    const oldRefresh = signRefresh({ sub: "9", typ: "refresh" });

    const out = await authService.refresh({ token: oldRefresh });
    expect(out.status).toBe(200);
    expect(out.body.accessToken).toEqual(expect.any(String));
    expect(out.body.refreshToken).toEqual(expect.any(String));
    // The new refresh token is distinct from the one supplied (new jti).
    expect(out.body.refreshToken).not.toBe(oldRefresh);

    const decodedAccess = jwt.verify(
      out.body.accessToken,
      process.env.ACCESS_SECRET
    );
    expect(decodedAccess).toMatchObject({ sub: "9", typ: "access" });
    expect(audit.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "TOKEN_REFRESH", userId: 9 })
    );
  });
});
