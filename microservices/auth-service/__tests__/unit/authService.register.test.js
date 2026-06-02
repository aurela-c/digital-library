import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { setupAuthMocks, makeUser } from "./_setupAuthMocks.js";

describe("authService.register", () => {
  beforeEach(() => jest.resetModules());

  const baseInput = {
    name: "Bob",
    email: "bob@example.com",
    password: "p@ssw0rd!",
  };

  it("rejects when required fields are missing", async () => {
    const { authService } = await setupAuthMocks();

    await expect(authService.register({})).rejects.toMatchObject({
      status: 400,
      message: "All fields are required",
    });
    await expect(
      authService.register({ name: "x", email: "a@b.com" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects when the email is already registered", async () => {
    const { authService, userRepository } = await setupAuthMocks();
    userRepository.findByEmail.mockResolvedValueOnce(makeUser());

    await expect(authService.register(baseInput)).rejects.toMatchObject({
      status: 400,
      message: "Email already exists",
    });
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("hashes the password, persists the new user, and sends a verification email by default", async () => {
    const { authService, userRepository, bcrypt, email, audit } =
      await setupAuthMocks();

    userRepository.findByEmail.mockResolvedValueOnce(null);
    const created = makeUser({
      id: 42,
      username: baseInput.name,
      email: baseInput.email,
      isVerified: false,
      verificationToken: null,
    });
    userRepository.create.mockResolvedValueOnce(created);

    const result = await authService.register(baseInput);

    expect(bcrypt.hash).toHaveBeenCalledWith(baseInput.password, 10);
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: baseInput.name,
        email: baseInput.email,
        password: `hashed:${baseInput.password}`,
        role: "ROLE_USER",
        isVerified: false,
        accountStatus: "ACTIVE",
      })
    );
    // verification token signed and persisted via save()
    expect(created.save).toHaveBeenCalledTimes(1);
    expect(created.verificationToken).toEqual(expect.any(String));
    expect(email.sendVerificationEmail).toHaveBeenCalledWith(
      baseInput.email,
      expect.stringContaining("/verify-email?token=")
    );
    expect(audit.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REGISTER", email: baseInput.email })
    );
    expect(result).toEqual({
      status: 201,
      body: {
        success: true,
        message: "Check your email to verify your account",
      },
    });
  });

  it("skips email sending and marks the user verified when AUTH_SKIP_EMAIL_VERIFY=true", async () => {
    const { authService, userRepository, email } = await setupAuthMocks({
      skipVerify: true,
    });

    userRepository.findByEmail.mockResolvedValueOnce(null);
    const created = makeUser({ isVerified: true });
    userRepository.create.mockResolvedValueOnce(created);

    const result = await authService.register(baseInput);

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ isVerified: true })
    );
    // No verification email when skipped.
    expect(email.sendVerificationEmail).not.toHaveBeenCalled();
    expect(created.save).not.toHaveBeenCalled();
    expect(result.body.message).toMatch(/log in/i);
  });

  it("never fails registration when the verification email throws", async () => {
    const { authService, userRepository, email } = await setupAuthMocks();

    userRepository.findByEmail.mockResolvedValueOnce(null);
    userRepository.create.mockResolvedValueOnce(makeUser({ isVerified: false }));
    email.sendVerificationEmail.mockRejectedValueOnce(new Error("SMTP boom"));

    const result = await authService.register(baseInput);
    expect(result.status).toBe(201);
  });
});
