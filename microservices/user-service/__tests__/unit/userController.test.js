import { jest, describe, beforeEach, beforeAll, it, expect } from "@jest/globals";

const User = {
  findAndCountAll: jest.fn(),
  findByPk: jest.fn(),
};
jest.unstable_mockModule("../../models/User.js", () => ({ default: User }));

let GetAllUsers, GetUserById;
let invokeGrpc, makeFakeRow, muteConsole;

beforeAll(async () => {
  ({ invokeGrpc, makeFakeRow, muteConsole } = await import(
    "../../../__tests__/_helpers/http.js"
  ));
  ({ GetAllUsers, GetUserById } = await import(
    "../../controllers/userController.js"
  ));
});

beforeEach(() => {
  jest.clearAllMocks();
  muteConsole();
});

const sampleUserRow = (overrides = {}) =>
  makeFakeRow({
    id: 1,
    username: "alice",
    email: "alice@example.com",
    role: "ROLE_USER",
    profileImage: null,
    created_at: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  });

describe("GetAllUsers", () => {
  it("returns a paginated user list and never leaks the password field", async () => {
    User.findAndCountAll.mockResolvedValueOnce({
      count: 2,
      rows: [
        sampleUserRow({ id: 1 }),
        sampleUserRow({ id: 2, email: "bob@example.com" }),
      ],
    });

    const out = await invokeGrpc(GetAllUsers, { page: 1, limit: 10 });

    expect(out).toMatchObject({ total: 2, page: 1, pages: 1 });
    expect(out.users[0]).toEqual({
      id: "1",
      username: "alice",
      email: "alice@example.com",
      role: "ROLE_USER",
      profileImage: null,
      createdAt: expect.any(Date),
    });
    for (const u of out.users) {
      expect(u).not.toHaveProperty("password");
    }
  });

  it("applies role / email exact-match filters", async () => {
    User.findAndCountAll.mockResolvedValueOnce({ count: 0, rows: [] });
    await invokeGrpc(GetAllUsers, {
      role: "ROLE_ADMIN",
      email: "x@y.z",
    });
    expect(User.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: "ROLE_ADMIN", email: "x@y.z" },
      })
    );
  });

  it("applies a LIKE filter on username when provided", async () => {
    User.findAndCountAll.mockResolvedValueOnce({ count: 0, rows: [] });
    await invokeGrpc(GetAllUsers, { username: "ali" });
    const call = User.findAndCountAll.mock.calls[0][0];
    expect(call.where.username).toMatchObject({});
    // The value must be an object (Sequelize Op.like signature) and not the
    // raw string — otherwise we would do an exact match.
    expect(typeof call.where.username).toBe("object");
  });

  it("returns INTERNAL (13) on DB failure", async () => {
    User.findAndCountAll.mockRejectedValueOnce(new Error("dead"));
    await expect(invokeGrpc(GetAllUsers, {})).rejects.toMatchObject({
      code: 13,
    });
  });
});

describe("GetUserById", () => {
  it("rejects missing id with INVALID_ARGUMENT", async () => {
    await expect(invokeGrpc(GetUserById, {})).rejects.toMatchObject({
      code: 3,
    });
  });

  it("returns NOT_FOUND when the user is missing", async () => {
    User.findByPk.mockResolvedValueOnce(null);
    await expect(
      invokeGrpc(GetUserById, { id: "1" })
    ).rejects.toMatchObject({ code: 5 });
  });

  it("returns the mapped user record on success", async () => {
    User.findByPk.mockResolvedValueOnce(
      sampleUserRow({ id: 11, role: "ROLE_ADMIN" })
    );
    const out = await invokeGrpc(GetUserById, { id: "11" });
    expect(out).toMatchObject({
      id: "11",
      username: "alice",
      role: "ROLE_ADMIN",
    });
    expect(out).not.toHaveProperty("password");
  });

  it("returns INTERNAL (13) on DB failure", async () => {
    User.findByPk.mockRejectedValueOnce(new Error("explode"));
    await expect(
      invokeGrpc(GetUserById, { id: "1" })
    ).rejects.toMatchObject({ code: 13 });
  });
});
