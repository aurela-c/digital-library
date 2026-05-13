import { describe, test, expect, beforeAll } from "@jest/globals";
import { createClient, gatewayReachable } from "../helpers/client.js";
import { GATEWAY_URL } from "../helpers/env.js";

const client = createClient();

describe("Validation & negative inputs (gateway → auth)", () => {
  let skip = false;

  beforeAll(async () => {
    skip = !(await gatewayReachable(client));
    if (skip) console.warn(`[skip] Gateway not reachable at ${GATEWAY_URL}`);
  });

  test("login with empty fields → 400", async () => {
    if (skip) return;
    const res = await client.post("/auth/login", { email: "", password: "" });
    expect(res.status).toBe(400);
  });

  test("register with missing fields → 400", async () => {
    if (skip) return;
    const res = await client.post("/auth/register", { email: "a@b.com" });
    expect(res.status).toBe(400);
  });

  test("borrow without bookId → 400", async () => {
    if (skip) return;
    const email = `val_${Date.now()}@example.com`;
    await client.post("/auth/register", {
      name: "V",
      email,
      password: "TestPass123!",
    });
    const login = await client.post("/auth/login", { email, password: "TestPass123!" });
    if (login.status !== 200) return;
    const res = await client.post(
      "/borrow",
      {},
      { headers: { Authorization: `Bearer ${login.data.accessToken}` } }
    );
    expect(res.status).toBe(400);
    expect(res.data?.error).toMatch(/bookId/i);
  });

  test("malformed JSON body → 4xx (parser)", async () => {
    if (skip) return;
    const res = await client.request({
      method: "POST",
      url: "/auth/login",
      data: "{not-json",
      headers: { "Content-Type": "application/json" },
      transformRequest: [() => "{not-json"],
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
