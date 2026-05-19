import jwt from "jsonwebtoken";
import { describe, test, expect, beforeAll } from "@jest/globals";
import { createClient, gatewayReachable } from "../helpers/client.js";
import { GATEWAY_URL, ACCESS_SECRET } from "../helpers/env.js";

const client = createClient();

describe("Security (gateway)", () => {
  let skip = false;
  let userToken = "";

  beforeAll(async () => {
    if (!(await gatewayReachable(client))) {
      skip = true;
      console.warn(`[skip] Gateway not reachable at ${GATEWAY_URL}`);
      return;
    }
    const email = `sec_${Date.now()}@example.com`;
    await client.post("/auth/register", {
      name: "Sec User",
      email,
      password: "TestPass123!",
    });
    const login = await client.post("/auth/login", { email, password: "TestPass123!" });
    if (login.status === 200) userToken = login.data.accessToken;
  });

  test("SQLi-like login email does not crash (rejected as bad credentials)", async () => {
    if (skip) return;
    const res = await client.post("/auth/login", {
      email: "admin' OR '1'='1",
      password: "x",
    });
    expect([400, 401]).toContain(res.status);
  });

  test("XSS-like string in register is accepted at API layer (no 5xx)", async () => {
    if (skip) return;
    const email = `xss_${Date.now()}@example.com`;
    const res = await client.post("/auth/register", {
      name: '<img src=x onerror=alert(1)>',
      email,
      password: "TestPass123!",
    });
    expect(res.status).toBe(201);
  });

  test("expired JWT → 401 TOKEN_EXPIRED", async () => {
    if (skip) return;
    const token = jwt.sign(
      { sub: "1", id: 1, role: "ROLE_USER", typ: "access" },
      ACCESS_SECRET,
      { expiresIn: "-10s" }
    );
    const res = await client.get("/books", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
    expect(res.data?.code).toBe("TOKEN_EXPIRED");
  });

  test("wrong-signature JWT → 401 TOKEN_INVALID", async () => {
    if (skip) return;
    const token = jwt.sign(
      { sub: "1", id: 1, role: "ROLE_USER", typ: "access" },
      "wrong-secret-not-gateway",
      { expiresIn: "1h" }
    );
    const res = await client.get("/books", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
    expect(res.data?.code).toBe("TOKEN_INVALID");
  });

  test(
    "many failed logins eventually hit rate limit (429)",
    async () => {
      if (skip) return;
      if (process.env.RUN_RATE_LIMIT_TEST !== "true") {
        console.warn("[skip] Set RUN_RATE_LIMIT_TEST=true to run (isolates rate limiter)");
        return;
      }
      let saw429 = false;
      for (let i = 0; i < 110; i++) {
        const res = await client.post("/auth/login", {
          email: `nope_${i}@example.com`,
          password: "wrong",
        });
        if (res.status === 429) {
          saw429 = true;
          break;
        }
      }
      expect(saw429).toBe(true);
    },
    120000
  );
});
