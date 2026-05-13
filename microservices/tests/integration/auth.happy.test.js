import jwt from "jsonwebtoken";
import { describe, test, expect, beforeAll } from "@jest/globals";
import { createClient, gatewayReachable } from "../helpers/client.js";
import { GATEWAY_URL, ACCESS_SECRET } from "../helpers/env.js";

const client = createClient();

describe("Happy path — authentication (via gateway → auth-service)", () => {
  let skip = false;
  const email = `e2e_${Date.now()}@example.com`;
  const password = "TestPass123!";
  const name = "E2E User";

  beforeAll(async () => {
    const ok = await gatewayReachable(client);
    if (!ok) {
      console.warn(`[skip] Gateway not reachable at ${GATEWAY_URL}`);
      skip = true;
    }
  });

  test("register user successfully", async () => {
    if (skip) return;
    const res = await client.post("/auth/register", {
      name,
      email,
      password,
    });
    expect(res.status).toBe(201);
    expect(res.data?.message || res.data).toBeTruthy();
  });

  test("login user successfully and receive JWT", async () => {
    if (skip) return;
    const res = await client.post("/auth/login", { email, password });
    expect(res.status).toBe(200);
    expect(res.data?.accessToken).toBeTruthy();
    expect(typeof res.data.accessToken).toBe("string");
    expect(res.data?.refreshToken).toBeTruthy();
    expect(res.data?.user?.email).toBe(email);
  });

  test("JWT contains role and subject", async () => {
    if (skip) return;
    const res = await client.post("/auth/login", { email, password });
    expect(res.status).toBe(200);
    const decoded = jwt.verify(res.data.accessToken, ACCESS_SECRET);
    expect(decoded.role).toBe("ROLE_USER");
    expect(decoded.sub || decoded.id || decoded.userId).toBeTruthy();
  });
});
