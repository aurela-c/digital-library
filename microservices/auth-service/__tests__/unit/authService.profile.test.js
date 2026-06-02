import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { setupAuthMocks, makeUser } from "./_setupAuthMocks.js";

describe("authService.updateProfile", () => {
  beforeEach(() => jest.resetModules());

  it("requires authentication", async () => {
    const { authService } = await setupAuthMocks();
    await expect(
      authService.updateProfile(null, { username: "x" })
    ).rejects.toMatchObject({ status: 401 });
  });

  it("404s when the user no longer exists", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByPk.mockResolvedValueOnce(null);
    await expect(
      authService.updateProfile(1, { username: "x" })
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects usernames outside the 2-50 char window", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByPk.mockResolvedValue(makeUser());

    await expect(
      authService.updateProfile(1, { username: "a" })
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      authService.updateProfile(1, { username: "x".repeat(51) })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("trims usernames and persists them", async () => {
    const { authService, userRepository, audit } = await setupAuthMocks();
    const user = makeUser({ username: "old" });
    userRepository.findByPk.mockResolvedValueOnce(user);

    const result = await authService.updateProfile(1, {
      username: "   Alice Smith   ",
    });

    expect(user.username).toBe("Alice Smith");
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(result.body.success).toBe(true);
    expect(result.body.user).toMatchObject({ username: "Alice Smith" });
    expect(audit.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PROFILE_UPDATED" })
    );
  });

  it("clears profileImage when an empty value is supplied", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    const user = makeUser({ profileImage: "data:image/png;base64,abcd" });
    userRepository.findByPk.mockResolvedValueOnce(user);

    await authService.updateProfile(1, { profileImage: "" });
    expect(user.profileImage).toBeNull();
  });

  it("rejects oversize profile images (>100KB) with 413", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByPk.mockResolvedValueOnce(makeUser());

    await expect(
      authService.updateProfile(1, { profileImage: "x".repeat(100_001) })
    ).rejects.toMatchObject({ status: 413 });
  });

  it("accepts profileImage strings up to the soft cap", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    const user = makeUser();
    userRepository.findByPk.mockResolvedValueOnce(user);
    const small = "x".repeat(1000);

    const result = await authService.updateProfile(1, { profileImage: small });
    expect(user.profileImage).toBe(small);
    expect(result.body.user.profileImage).toBe(small);
  });
});

describe("authService.getUserById", () => {
  beforeEach(() => jest.resetModules());

  it("allows the owner to fetch their own record", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByPk.mockResolvedValueOnce(makeUser({ id: 12 }));

    const out = await authService.getUserById(
      { id: 12, role: "ROLE_USER" },
      12
    );
    expect(out.status).toBe(200);
    expect(out.body.id).toBe(12);
  });

  it("allows any admin to fetch any record", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByPk.mockResolvedValueOnce(makeUser({ id: 999 }));

    const out = await authService.getUserById(
      { id: 1, role: "ROLE_ADMIN" },
      999
    );
    expect(out.body.id).toBe(999);
  });

  it("forbids one regular user from fetching another", async () => {
    const { authService } = await setupAuthMocks();
    await expect(
      authService.getUserById({ id: 1, role: "ROLE_USER" }, 2)
    ).rejects.toMatchObject({ status: 403 });
  });

  it("404s when the user does not exist", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByPk.mockResolvedValueOnce(null);
    await expect(
      authService.getUserById({ id: 1, role: "ROLE_ADMIN" }, 7)
    ).rejects.toMatchObject({ status: 404 });
  });
});
