import {
  jest,
  describe,
  beforeEach,
  beforeAll,
  it,
  expect,
} from "@jest/globals";

// ── Fully mocked Sequelize Book model ────────────────────────────────
const Book = {
  findAndCountAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
};

jest.unstable_mockModule("../../models/Book.js", () => ({ default: Book }));

// Helpers imported AFTER mocks are registered.
let GetAllBooks, GetBook, AddBook, UpdateAvailability, updateBookHttp, DeleteBook;
let invokeGrpc, makeReq, makeRes, makeFakeRow, muteConsole;

beforeAll(async () => {
  const helpers = await import("../../../__tests__/_helpers/http.js");
  ({ invokeGrpc, makeReq, makeRes, makeFakeRow, muteConsole } = helpers);
  ({
    GetAllBooks,
    GetBook,
    AddBook,
    UpdateAvailability,
    updateBookHttp,
    DeleteBook,
  } = await import("../../controllers/bookController.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
  muteConsole();
});

const sampleBookRow = (overrides = {}) =>
  makeFakeRow({
    id: 1,
    title: "1984",
    author: "Orwell",
    image: "https://cdn/x.jpg",
    description: "Classic dystopian novel",
    category_id: 3,
    total_copies: 5,
    available_copies: 5,
    is_popular: false,
    created_at: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  });

// ====================================================================
describe("GetAllBooks (gRPC)", () => {
  it("returns paginated, mapped books with the canonical shape", async () => {
    Book.findAndCountAll.mockResolvedValueOnce({
      count: 2,
      rows: [
        sampleBookRow({ id: 1 }),
        sampleBookRow({ id: 2, category_id: null }),
      ],
    });

    const res = await invokeGrpc(GetAllBooks, { page: 1, limit: 10 });

    expect(Book.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 0, where: {} })
    );
    expect(res.total).toBe(2);
    expect(res.page).toBe(1);
    expect(res.pages).toBe(1);
    expect(res.books).toHaveLength(2);
    expect(res.books[0]).toMatchObject({
      id: "1",
      title: "1984",
      categoryId: "3",
      totalCopies: 5,
      availableCopies: 5,
      isPopular: false,
    });
    // categoryId must always be a STRING (proto field is `string`).
    expect(res.books[1].categoryId).toBe("");
  });

  it("defaults limit to 1000 (catalog default) when none supplied", async () => {
    Book.findAndCountAll.mockResolvedValueOnce({ count: 0, rows: [] });
    await invokeGrpc(GetAllBooks, {});
    expect(Book.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 1000, offset: 0 })
    );
  });

  it("applies categoryId / author / title filters when supplied", async () => {
    Book.findAndCountAll.mockResolvedValueOnce({ count: 0, rows: [] });
    await invokeGrpc(GetAllBooks, {
      categoryId: "3",
      author: "Orwell",
      title: "1984",
    });
    expect(Book.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category_id: 3,
          author: "Orwell",
          title: expect.any(Object),
        }),
      })
    );
  });

  it("ignores empty / non-numeric categoryId filters (gracefully degrades, no SQL noise)", async () => {
    Book.findAndCountAll.mockResolvedValueOnce({ count: 0, rows: [] });
    await invokeGrpc(GetAllBooks, { categoryId: "" });
    expect(Book.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );

    Book.findAndCountAll.mockResolvedValueOnce({ count: 0, rows: [] });
    await invokeGrpc(GetAllBooks, { categoryId: "not-a-number" });
    expect(Book.findAndCountAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it("returns a code-13 gRPC error when the model throws", async () => {
    Book.findAndCountAll.mockRejectedValueOnce(new Error("DB down"));
    await expect(invokeGrpc(GetAllBooks, {})).rejects.toMatchObject({
      code: 13,
    });
  });
});

// ====================================================================
describe("GetBook (gRPC)", () => {
  it("rejects missing IDs with code 3 (INVALID_ARGUMENT)", async () => {
    await expect(invokeGrpc(GetBook, {})).rejects.toMatchObject({ code: 3 });
  });

  it("returns code 5 (NOT_FOUND) when no row matches", async () => {
    Book.findByPk.mockResolvedValueOnce(null);
    await expect(invokeGrpc(GetBook, { id: "999" })).rejects.toMatchObject({
      code: 5,
    });
  });

  it("returns the mapped book payload on success", async () => {
    Book.findByPk.mockResolvedValueOnce(sampleBookRow({ id: 7 }));
    const res = await invokeGrpc(GetBook, { id: "7" });
    expect(res).toMatchObject({ id: "7", title: "1984", availableCopies: 5 });
  });

  it("returns code 13 (INTERNAL) on unexpected exceptions", async () => {
    Book.findByPk.mockRejectedValueOnce(new Error("explode"));
    await expect(invokeGrpc(GetBook, { id: "1" })).rejects.toMatchObject({
      code: 13,
    });
  });
});

// ====================================================================
describe("AddBook (gRPC)", () => {
  const base = {
    title: "Dune",
    author: "Herbert",
    categoryId: "2",
    totalCopies: 4,
  };

  it("rejects when ANY required field is missing", async () => {
    await expect(
      invokeGrpc(AddBook, { ...base, title: "" })
    ).rejects.toMatchObject({ code: 3 });
    await expect(
      invokeGrpc(AddBook, { ...base, author: "" })
    ).rejects.toMatchObject({ code: 3 });
    await expect(
      invokeGrpc(AddBook, { ...base, categoryId: "" })
    ).rejects.toMatchObject({ code: 3 });
    await expect(
      invokeGrpc(AddBook, { ...base, totalCopies: 0 })
    ).rejects.toMatchObject({ code: 3 });
  });

  it("rejects non-positive totalCopies", async () => {
    await expect(
      invokeGrpc(AddBook, { ...base, totalCopies: -2 })
    ).rejects.toMatchObject({ code: 3 });
    await expect(
      invokeGrpc(AddBook, { ...base, totalCopies: "abc" })
    ).rejects.toMatchObject({ code: 3 });
  });

  it("rejects non-positive / non-numeric categoryId", async () => {
    await expect(
      invokeGrpc(AddBook, { ...base, categoryId: "not-an-int" })
    ).rejects.toMatchObject({ code: 3 });
    await expect(
      invokeGrpc(AddBook, { ...base, categoryId: "0" })
    ).rejects.toMatchObject({ code: 3 });
  });

  it("creates a book with trimmed strings, parsed numbers, and matching available/total copies", async () => {
    Book.create.mockResolvedValueOnce(
      sampleBookRow({
        id: 99,
        title: "Dune",
        author: "Herbert",
        category_id: 2,
        total_copies: 4,
        available_copies: 4,
      })
    );

    const res = await invokeGrpc(AddBook, {
      ...base,
      title: "  Dune  ",
      author: "  Herbert  ",
      image: "  https://cdn/x.jpg  ",
      description: "Epic",
    });

    expect(Book.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Dune",
        author: "Herbert",
        image: "https://cdn/x.jpg",
        description: "Epic",
        category_id: 2,
        total_copies: 4,
        // available_copies must mirror total_copies on creation.
        available_copies: 4,
      })
    );
    expect(res).toMatchObject({ id: "99", title: "Dune", categoryId: "2" });
  });

  it("propagates DB failures as code 13 (INTERNAL)", async () => {
    Book.create.mockRejectedValueOnce(new Error("unique violation"));
    await expect(invokeGrpc(AddBook, base)).rejects.toMatchObject({ code: 13 });
  });
});

// ====================================================================
describe("UpdateAvailability (gRPC)", () => {
  it("rejects missing IDs", async () => {
    await expect(
      invokeGrpc(UpdateAvailability, { availableCopies: 1 })
    ).rejects.toMatchObject({ code: 3 });
  });

  it("returns NOT_FOUND when the book is gone", async () => {
    Book.findByPk.mockResolvedValueOnce(null);
    await expect(
      invokeGrpc(UpdateAvailability, { id: "1", availableCopies: 0 })
    ).rejects.toMatchObject({ code: 5 });
  });

  it("requires availableCopies (rejects both undefined and null)", async () => {
    Book.findByPk.mockResolvedValueOnce(sampleBookRow());
    await expect(
      invokeGrpc(UpdateAvailability, { id: "1" })
    ).rejects.toMatchObject({ code: 3 });

    Book.findByPk.mockResolvedValueOnce(sampleBookRow());
    await expect(
      invokeGrpc(UpdateAvailability, { id: "1", availableCopies: null })
    ).rejects.toMatchObject({ code: 3 });
  });

  it("rejects negative availability", async () => {
    Book.findByPk.mockResolvedValueOnce(sampleBookRow());
    await expect(
      invokeGrpc(UpdateAvailability, { id: "1", availableCopies: -1 })
    ).rejects.toMatchObject({ code: 3 });
  });

  it("accepts the legacy `quantity` field name as a synonym", async () => {
    const book = sampleBookRow();
    Book.findByPk.mockResolvedValueOnce(book);
    await invokeGrpc(UpdateAvailability, { id: "1", quantity: 2 });
    expect(book.update).toHaveBeenCalledWith({ available_copies: 2 });
  });

  it("persists the new availability and returns the updated book", async () => {
    const book = sampleBookRow({ id: 5, available_copies: 5 });
    Book.findByPk.mockResolvedValueOnce(book);
    const res = await invokeGrpc(UpdateAvailability, {
      id: "5",
      availableCopies: 3,
    });
    expect(book.update).toHaveBeenCalledWith({ available_copies: 3 });
    expect(res.id).toBe("5");
  });
});

// ====================================================================
describe("updateBookHttp (HTTP — admin full-field update)", () => {
  it("400s on a non-numeric path id", async () => {
    const req = makeReq({ params: { id: "abc" }, body: { title: "x" } });
    const res = makeRes();
    await updateBookHttp(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it("404s when the book is missing", async () => {
    Book.findByPk.mockResolvedValueOnce(null);
    const req = makeReq({ params: { id: "9" }, body: { title: "x" } });
    const res = makeRes();
    await updateBookHttp(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("400s when no whitelisted field survives the filter", async () => {
    Book.findByPk.mockResolvedValueOnce(sampleBookRow());
    const req = makeReq({
      params: { id: "1" },
      body: { malicious_payload: "yes", role: "admin" },
    });
    const res = makeRes();
    await updateBookHttp(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "No updatable fields supplied" })
    );
  });

  it("aliases camelCase keys to snake_case and trims string fields", async () => {
    const book = sampleBookRow();
    Book.findByPk.mockResolvedValueOnce(book);
    const req = makeReq({
      params: { id: "1" },
      body: {
        title: "  New Title  ",
        author: "  Author  ",
        categoryId: 4,
        totalCopies: 7,
        availableCopies: 7,
        isPopular: 1,
      },
    });
    const res = makeRes();
    await updateBookHttp(req, res);

    expect(book.update).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New Title",
        author: "Author",
        category_id: 4,
        total_copies: 7,
        available_copies: 7,
        is_popular: true,
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it("400s on non-numeric numeric fields", async () => {
    Book.findByPk.mockResolvedValueOnce(sampleBookRow());
    const req = makeReq({
      params: { id: "1" },
      body: { totalCopies: "not-a-number" },
    });
    const res = makeRes();
    await updateBookHttp(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("caps available_copies to total_copies when total drops below it", async () => {
    const book = sampleBookRow({ total_copies: 10, available_copies: 8 });
    Book.findByPk.mockResolvedValueOnce(book);
    const req = makeReq({
      params: { id: "1" },
      body: { totalCopies: 3 },
    });
    const res = makeRes();
    await updateBookHttp(req, res);
    expect(book.update).toHaveBeenCalledWith(
      expect.objectContaining({ total_copies: 3, available_copies: 3 })
    );
  });

  it("caps available_copies when the requested available exceeds the new total", async () => {
    const book = sampleBookRow({ total_copies: 5, available_copies: 5 });
    Book.findByPk.mockResolvedValueOnce(book);
    const req = makeReq({
      params: { id: "1" },
      body: { availableCopies: 100, totalCopies: 8 },
    });
    const res = makeRes();
    await updateBookHttp(req, res);
    expect(book.update).toHaveBeenCalledWith(
      expect.objectContaining({ total_copies: 8, available_copies: 8 })
    );
  });

  it("returns 500 when the DB write fails", async () => {
    const book = sampleBookRow();
    book.update.mockRejectedValueOnce(new Error("DB boom"));
    Book.findByPk.mockResolvedValueOnce(book);
    const req = makeReq({ params: { id: "1" }, body: { title: "x" } });
    const res = makeRes();
    await updateBookHttp(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ====================================================================
describe("DeleteBook (gRPC)", () => {
  it("rejects missing ID", async () => {
    await expect(invokeGrpc(DeleteBook, {})).rejects.toMatchObject({ code: 3 });
  });

  it("returns NOT_FOUND for missing rows", async () => {
    Book.findByPk.mockResolvedValueOnce(null);
    await expect(invokeGrpc(DeleteBook, { id: "1" })).rejects.toMatchObject({
      code: 5,
    });
  });

  it("destroys the book on success", async () => {
    const book = sampleBookRow();
    Book.findByPk.mockResolvedValueOnce(book);
    const res = await invokeGrpc(DeleteBook, { id: "1" });
    expect(book.destroy).toHaveBeenCalledTimes(1);
    expect(res).toEqual({});
  });

  it("returns code 13 on DB failure", async () => {
    Book.findByPk.mockRejectedValueOnce(new Error("nope"));
    await expect(invokeGrpc(DeleteBook, { id: "1" })).rejects.toMatchObject({
      code: 13,
    });
  });
});
