import { describe, test, expect, beforeAll } from "@jest/globals";
import { createClient, gatewayReachable } from "../helpers/client.js";
import { GATEWAY_URL } from "../helpers/env.js";

const client = createClient();

describe("Edge cases (gateway)", () => {
  let skip = false;
  let userToken = "";
  let userId = "";
  let bookId = "";

  beforeAll(async () => {
    if (!(await gatewayReachable(client))) {
      skip = true;
      console.warn(`[skip] Gateway not reachable at ${GATEWAY_URL}`);
      return;
    }
    const email = `edge_${Date.now()}@example.com`;
    await client.post("/auth/register", {
      name: "Edge User",
      email,
      password: "TestPass123!",
    });
    const login = await client.post("/auth/login", { email, password: "TestPass123!" });
    if (login.status === 200) {
      userToken = login.data.accessToken;
      userId = String(login.data.user.id);
    }
    const books = await client.get("/books", {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (books.status === 200 && books.data?.length) {
      const b = books.data.find((x) => Number(x.availableCopies) > 0);
      if (b) bookId = String(b.id);
    }
  });

  test("second borrow of same book while copies remain may succeed (current behavior)", async () => {
    if (skip || !userToken || !bookId) return;
    const first = await client.post(
      "/borrow",
      { bookId },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    expect(first.status).toBe(200);
    const second = await client.post(
      "/borrow",
      { bookId },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    expect([200, 500]).toContain(second.status);
    if (first.data?.id) {
      await client.put(`/borrow/return/${first.data.id}`, {}, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
    }
    if (second.status === 200 && second.data?.id) {
      await client.put(`/borrow/return/${second.data.id}`, {}, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
    }
  });

  test("return non-existent borrow id yields error (not 200)", async () => {
    if (skip || !userToken) return;
    const res = await client.put("/borrow/return/999999999", {}, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("USER cannot list all users (admin route)", async () => {
    if (skip || !userToken) return;
    const res = await client.get("/users", {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect([401, 403]).toContain(res.status);
  });

  test("invalid book id returns server error path (gRPC not found)", async () => {
    if (skip || !userToken) return;
    const res = await client.get("/books/999999999", {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect([404, 500]).toContain(res.status);
  });

  test("USER cannot POST /books (staff only)", async () => {
    if (skip || !userToken) return;
    const res = await client.post(
      "/books",
      {
        title: "X",
        author: "Y",
        categoryId: "1",
        totalCopies: 1,
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    expect(res.status).toBe(403);
  });

  test("missing token on protected route → 401", async () => {
    if (skip) return;
    const res = await client.get("/books");
    expect(res.status).toBe(401);
    expect(res.data?.code === "NO_TOKEN" || res.data?.error).toBeTruthy();
  });
});
