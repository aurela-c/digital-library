
 // Lightweight load smoke using Node + axios (no k6 required).
 
import axios from "axios";
import { GATEWAY_URL } from "../helpers/env.js";

const CONCURRENCY = Number(process.env.LOAD_CONCURRENCY || 15);
const ROUNDS = Number(process.env.LOAD_ROUNDS || 30);
const MAX_FAIL_RATE = Number(process.env.LOAD_MAX_FAIL_RATE || 0.15);

async function oneRound(client) {
  const t0 = performance.now();
  const health = await client.get("/health", { timeout: 10000 });
  const books = await client.get("/books", {
    timeout: 10000,
    headers: { Authorization: "Bearer invalid" },
    validateStatus: () => true,
  });
  const ms = performance.now() - t0;
  const ok =
    health.status >= 200 &&
    health.status < 600 &&
    books.status >= 200 &&
    books.status < 600;
  return { ok, ms };
}

async function worker(id, client) {
  let ok = 0;
  let fail = 0;
  let totalMs = 0;
  for (let r = 0; r < ROUNDS; r++) {
    try {
      const res = await oneRound(client, id * ROUNDS + r);
      totalMs += res.ms;
      if (res.ok) ok++;
      else fail++;
    } catch {
      fail++;
    }
  }
  return { ok, fail, totalMs };
}

const client = axios.create({
  baseURL: GATEWAY_URL,
  validateStatus: () => true,
  timeout: 15000,
});

console.log(`Load smoke → ${GATEWAY_URL} (${CONCURRENCY} workers × ${ROUNDS} rounds)`);

const tStart = performance.now();
const workers = Array.from({ length: CONCURRENCY }, (_, id) => worker(id, client));
const results = await Promise.all(workers);
const elapsed = (performance.now() - tStart) / 1000;

let totalOk = 0;
let totalFail = 0;
let sumMs = 0;
for (const r of results) {
  totalOk += r.ok;
  totalFail += r.fail;
  sumMs += r.totalMs;
}
const total = totalOk + totalFail;
const failRate = totalFail / total;
const rps = total / elapsed;
const avgMs = sumMs / total;

console.log(JSON.stringify({ total, totalOk, totalFail, failRate, rps, avgMs, elapsedSec: elapsed }, null, 2));

if (failRate > MAX_FAIL_RATE) {
  console.error(`FAIL: fail rate ${failRate.toFixed(3)} > max ${MAX_FAIL_RATE}`);
  process.exit(1);
}
console.log("OK: load smoke finished within fail-rate threshold");
