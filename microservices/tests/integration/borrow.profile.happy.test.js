import { describe, test, expect, beforeAll } from "@jest/globals";
import { createClient, gatewayReachable } from "../helpers/client.js";
import { GATEWAY_URL } from "../helpers/env.js";

const client = createClient();

describe("Happy path — borrow & profile (gateway)", () => {
  let skip = false;
  let token = "";
  let userId = "";
  let bookId = "";

  beforeAll(async () => {
    if (!(await gatewayReachable(client))) {
      skip = true;
      console.warn(`[skip] Gateway not reachable at ${GATEWAY_URL}`);
      return;
    }
    const email = `borrow_${Date.now()}@example.com`;
    await client.post("/auth/register", {
      name: "Borrow User",
      email,
      password: "TestPass123!",
    });
    const login = await client.post("/auth/login", {
      email,
      password: "TestPass123!",
    });
    if (login.status !== 200) {
      skip = true;
      return;
    }
    token = login.data.accessToken;
    userId = String(login.data.user.id);

    const books = await client.get("/books", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (books.status === 200 && books.data?.length) {
      const b = books.data.find((x) => Number(x.availableCopies) > 0);
      if (b) bookId = String(b.id);
    }
  });

  test("user profile loads from auth (GET /auth/:id)", async () => {
    if (skip || !token || !userId) return;
    const res = await client.get(`/auth/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(res.data?.email || res.data?.username).toBeTruthy();
  });

  test("user borrows a book and sees it in borrow list", async () => {
    if (skip || !token || !userId || !bookId) {
      console.warn("[skip] Need at least one book with availableCopies > 0");
      return;
    }
    const borrow = await client.post(
      "/borrow",
      { bookId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(borrow.status).toBe(200);
    expect(borrow.data?.status).toMatch(/BORROWED/i);

    const list = await client.get(`/borrow/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.status).toBe(200);
    expect(Array.isArray(list.data)).toBe(true);
    const found = list.data.some(
      (row) => String(row.bookId) === bookId && /BORROWED/i.test(row.status)
    );
    expect(found).toBe(true);

    const borrowId = borrow.data.id;
    const ret = await client.put(`/borrow/return/${borrowId}`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(ret.status).toBe(200);
    expect(String(ret.data?.status || "").toUpperCase()).toContain("RETURN");
  });
});
