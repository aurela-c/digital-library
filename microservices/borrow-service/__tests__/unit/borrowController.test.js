import { jest, describe, beforeEach, beforeAll, it, expect } from "@jest/globals";

// ── Mocked Sequelize Borrow model ────────────────────────────────────
const Borrow = {
  create: jest.fn(),
  findByPk: jest.fn(),
  findAndCountAll: jest.fn(),
};
jest.unstable_mockModule("../../models/BorrowedBook.js", () => ({
  default: Borrow,
}));

// ── Mocked gRPC book client (callback-style, as the controller wraps
// it with util.promisify). Each method takes (request, callback). ────
const bookClient = {
  GetBook: jest.fn((req, cb) => cb(null, {})),
  UpdateAvailability: jest.fn((req, cb) => cb(null, {})),
};
jest.unstable_mockModule("../../grpc/bookClient.js", () => ({
  default: bookClient,
}));

let BorrowBook, ReturnBook, GetBorrowsByUser;
let invokeGrpc, makeFakeRow, muteConsole;

beforeAll(async () => {
  ({ invokeGrpc, makeFakeRow, muteConsole } = await import(
    "../../../__tests__/_helpers/http.js"
  ));
  ({ BorrowBook, ReturnBook, GetBorrowsByUser } = await import(
    "../../controllers/borrowController.js"
  ));
});

beforeEach(() => {
  jest.clearAllMocks();
  muteConsole();
  // Default stubs so tests opt in to per-case behaviour.
  bookClient.GetBook.mockImplementation((req, cb) =>
    cb(null, { id: req.id, title: "T", author: "A", image: "I", availableCopies: 1 })
  );
  bookClient.UpdateAvailability.mockImplementation((req, cb) => cb(null, {}));
});

const makeBorrowRow = (overrides = {}) =>
  makeFakeRow({
    id: 10,
    user_id: 1,
    book_id: 7,
    borrow_date: new Date("2025-01-01T00:00:00Z"),
    return_date: null,
    status: "BORROWED",
    ...overrides,
  });

// ====================================================================
describe("BorrowBook", () => {
  it("rejects when the book has no copies left (code 9 / FAILED_PRECONDITION)", async () => {
    bookClient.GetBook.mockImplementationOnce((req, cb) =>
      cb(null, { availableCopies: 0, title: "x", author: "y", image: "" })
    );

    await expect(
      invokeGrpc(BorrowBook, { userId: 1, bookId: "7" })
    ).rejects.toMatchObject({ code: 9 });

    expect(bookClient.UpdateAvailability).not.toHaveBeenCalled();
    expect(Borrow.create).not.toHaveBeenCalled();
  });

  it("decrements available copies by exactly 1 and persists a BORROWED record", async () => {
    bookClient.GetBook.mockImplementationOnce((req, cb) =>
      cb(null, { availableCopies: 3, title: "T", author: "A", image: "I" })
    );
    Borrow.create.mockResolvedValueOnce(
      makeBorrowRow({ id: 100, user_id: 5, book_id: 7 })
    );

    const res = await invokeGrpc(BorrowBook, { userId: 5, bookId: "7" });

    expect(bookClient.UpdateAvailability).toHaveBeenCalledWith(
      { id: "7", availableCopies: 2 },
      expect.any(Function)
    );
    expect(Borrow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 5,
        book_id: "7",
        status: "BORROWED",
        return_date: null,
      })
    );
    expect(res).toMatchObject({
      id: "100",
      userId: "5",
      bookId: "7",
      status: "BORROWED",
    });
    // The mapped response carries the cached book snippet for the SPA.
    expect(res.bookTitle).toBe("T");
    expect(res.bookAuthor).toBe("A");
  });

  it("propagates gRPC errors from the book service as code 13", async () => {
    bookClient.GetBook.mockImplementationOnce((req, cb) =>
      cb(new Error("book svc down"))
    );
    await expect(
      invokeGrpc(BorrowBook, { userId: 1, bookId: "7" })
    ).rejects.toMatchObject({ code: 13 });
  });
});

// ====================================================================
describe("ReturnBook", () => {
  it("rejects missing borrowId / actorUserId", async () => {
    await expect(invokeGrpc(ReturnBook, {})).rejects.toMatchObject({ code: 3 });
    await expect(
      invokeGrpc(ReturnBook, { borrowId: "1" })
    ).rejects.toMatchObject({ code: 3 });
    await expect(
      invokeGrpc(ReturnBook, { actorUserId: "1" })
    ).rejects.toMatchObject({ code: 3 });
  });

  it("returns NOT_FOUND (code 5) when the borrow row is missing OR already RETURNED", async () => {
    Borrow.findByPk.mockResolvedValueOnce(null);
    await expect(
      invokeGrpc(ReturnBook, { borrowId: "1", actorUserId: "1" })
    ).rejects.toMatchObject({ code: 5 });

    Borrow.findByPk.mockResolvedValueOnce(
      makeBorrowRow({ status: "RETURNED" })
    );
    await expect(
      invokeGrpc(ReturnBook, { borrowId: "1", actorUserId: "1" })
    ).rejects.toMatchObject({ code: 5 });
  });

  it("forbids a different user from returning someone else's borrow (code 7)", async () => {
    Borrow.findByPk.mockResolvedValueOnce(makeBorrowRow({ user_id: 1 }));
    await expect(
      invokeGrpc(ReturnBook, {
        borrowId: "10",
        actorUserId: "2",
        actorRole: "ROLE_USER",
      })
    ).rejects.toMatchObject({ code: 7 });
  });

  it("lets an admin return another user's borrow", async () => {
    Borrow.findByPk.mockResolvedValueOnce(makeBorrowRow({ user_id: 1 }));
    bookClient.GetBook.mockImplementationOnce((req, cb) =>
      cb(null, { availableCopies: 2 })
    );

    const out = await invokeGrpc(ReturnBook, {
      borrowId: "10",
      actorUserId: "99",
      actorRole: "ROLE_ADMIN",
    });

    expect(bookClient.UpdateAvailability).toHaveBeenCalledWith(
      { id: "7", availableCopies: 3 },
      expect.any(Function)
    );
    expect(out.status).toBe("RETURNED");
  });

  it("returns the book to inventory (+1), marks the row RETURNED, stamps return_date", async () => {
    const borrow = makeBorrowRow({ user_id: 5, book_id: 7 });
    Borrow.findByPk.mockResolvedValueOnce(borrow);
    bookClient.GetBook.mockImplementationOnce((req, cb) =>
      cb(null, { availableCopies: 4 })
    );

    const out = await invokeGrpc(ReturnBook, {
      borrowId: "10",
      actorUserId: "5",
      actorRole: "ROLE_USER",
    });

    expect(bookClient.UpdateAvailability).toHaveBeenCalledWith(
      { id: "7", availableCopies: 5 },
      expect.any(Function)
    );
    expect(borrow.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "RETURNED",
        return_date: expect.any(Date),
      })
    );
    expect(out.status).toBe("RETURNED");
  });

  it("returns INTERNAL (13) on unexpected failures", async () => {
    Borrow.findByPk.mockRejectedValueOnce(new Error("boom"));
    await expect(
      invokeGrpc(ReturnBook, { borrowId: "1", actorUserId: "1" })
    ).rejects.toMatchObject({ code: 13 });
  });
});

// ====================================================================
describe("GetBorrowsByUser", () => {
  it("returns a paginated, enriched list scoped to the user", async () => {
    Borrow.findAndCountAll.mockResolvedValueOnce({
      count: 2,
      rows: [
        makeBorrowRow({ id: 1, user_id: 9, book_id: 7 }),
        makeBorrowRow({ id: 2, user_id: 9, book_id: 8, status: "RETURNED" }),
      ],
    });
    bookClient.GetBook.mockImplementation((req, cb) =>
      cb(null, {
        title: `Title-${req.id}`,
        author: "Author",
        image: "img",
      })
    );

    const out = await invokeGrpc(GetBorrowsByUser, {
      userId: 9,
      page: 1,
      limit: 50,
    });

    expect(Borrow.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: 9 },
        limit: 50,
        offset: 0,
      })
    );
    expect(out.total).toBe(2);
    expect(out.borrows).toHaveLength(2);
    expect(out.borrows[0]).toMatchObject({
      id: "1",
      userId: "9",
      bookId: "7",
      status: "BORROWED",
      bookTitle: "Title-7",
    });
    expect(out.borrows[1].bookTitle).toBe("Title-8");
  });

  it("clamps page/limit to safe defaults when caller omits them", async () => {
    Borrow.findAndCountAll.mockResolvedValueOnce({ count: 0, rows: [] });
    await invokeGrpc(GetBorrowsByUser, { userId: 1 });
    expect(Borrow.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 200, offset: 0 })
    );
  });

  it("caps limit at 500 (preventing accidental full-table dumps)", async () => {
    Borrow.findAndCountAll.mockResolvedValueOnce({ count: 0, rows: [] });
    await invokeGrpc(GetBorrowsByUser, { userId: 1, limit: 100_000 });
    expect(Borrow.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 500 })
    );
  });

  it("returns empty snippet fields when the book-service lookup fails (degrades gracefully)", async () => {
    Borrow.findAndCountAll.mockResolvedValueOnce({
      count: 1,
      rows: [makeBorrowRow({ id: 1, book_id: 999 })],
    });
    bookClient.GetBook.mockImplementationOnce((req, cb) =>
      cb(new Error("book missing"))
    );

    const out = await invokeGrpc(GetBorrowsByUser, { userId: 1 });
    expect(out.borrows[0].bookTitle).toBe("");
    expect(out.borrows[0].bookAuthor).toBe("");
  });

  it("returns INTERNAL (13) on DB failure", async () => {
    Borrow.findAndCountAll.mockRejectedValueOnce(new Error("dead"));
    await expect(
      invokeGrpc(GetBorrowsByUser, { userId: 1 })
    ).rejects.toMatchObject({ code: 13 });
  });
});
