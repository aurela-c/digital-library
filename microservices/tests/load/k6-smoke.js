
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.INTEGRATION_GATEWAY_URL || "http://127.0.0.1:4000";

export const options = {
  scenarios: {
    health_and_books: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 15 },
        { duration: "20s", target: 15 },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "5s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.95"],
    http_req_duration: ["p(95)<5000"],
  },
};

export default function () {
  const h = http.get(`${BASE}/health`);
  check(h, { "health status": (r) => r.status === 200 || r.status === 503 });

  const b = http.get(`${BASE}/books`, {
    headers: { Authorization: "Bearer invalid" },
  });
  check(b, { "books rejects bad auth": (r) => r.status === 401 || r.status === 403 });

  sleep(0.05);
}
