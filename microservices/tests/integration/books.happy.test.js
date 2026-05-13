import { describe, test, expect, beforeAll } from "@jest/globals";
import { createClient, gatewayReachable } from "../helpers/client.js";
import {
  GATEWAY_URL,
  hasAdminCreds,
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
} from "../helpers/env.js";

const client = createClient();

async function loginUser(email, password) {
  const res = await client.post("/auth/login", { email, password });
  return res;
}

describe("Happy path — books (gateway + book gRPC)", () => {
  let skip = false;
  let userToken = "";
  let adminToken = "";
  let createdBookId = "";

  beforeAll(async () => {
    if (!(await gatewayReachable(client))) {
      skip = true;
      console.warn(`[skip] Gateway not reachable at ${GATEWAY_URL}`);
      return;
    }
    const u = `bookuser_${Date.now()}@example.com`;
    await client.post("/auth/register", {
      name: "Book Reader",
      email: u,
      password: "TestPass123!",
    });
    const login = await loginUser(u, "TestPass123!");
    if (login.status === 200) userToken = login.data.accessToken;

    if (hasAdminCreds()) {
      const a = await loginUser(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
      if (a.status === 200) adminToken = a.data.accessToken;
    }
  });

  test("fetch all books (authenticated USER)", async () => {
    if (skip || !userToken) return;
    const res = await client.get("/books", {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  test("fetch single book when list non-empty", async () => {
    if (skip || !userToken) return;
    const list = await client.get("/books", {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(list.status).toBe(200);
    if (!list.data?.length) {
      console.warn("[skip] No books in DB — seed data for full coverage");
      return;
    }
    const id = list.data[0].id;
    const res = await client.get(`/books/${id}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(res.status).toBe(200);
    expect(res.data?.id).toBe(String(id));
  });

  test("admin creates, updates, deletes book", async () => {
    if (skip || !adminToken) {
      console.warn(
        "[skip] Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD for admin book CRUD"
      );
      return;
    }
    const cat = "1";
    const create = await client.post(
      "/books",
      {
        title: `E2E Book ${Date.now()}`,
        author: "E2E Author",
        image: "https://example.com/cover.jpg",
        description: "Integration test book",
        categoryId: cat,
        totalCopies: 3,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    expect(create.status).toBe(200);
    expect(create.data?.id).toBeTruthy();
    createdBookId = create.data.id;

    const upd = await client.put(
      `/books/${createdBookId}`,
      { quantity: 3, availableCopies: 2 },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    expect(upd.status).toBe(200);

    const del = await client.delete(`/books/${createdBookId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(del.status).toBe(200);
  });
});
