import {
  Registry,
  collectDefaultMetrics,
  Histogram,
  Counter,
} from "prom-client";

export function createMetricsBundle(serviceName) {
  const register = new Registry();
  register.setDefaultLabels({ service: serviceName });

  collectDefaultMetrics({ register });

  const httpRequestDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request latency in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [register],
  });

  const httpRequestTotal = new Counter({
    name: "http_requests_total",
    help: "Total HTTP requests",
    labelNames: ["method", "route", "status_code"],
    registers: [register],
  });

  const normalizeRoute = (req) => {
    if (req.route?.path) return `${req.baseUrl || ""}${req.route.path}`;
    const p = req.originalUrl?.split("?")[0] || req.url || "";
    return p.length > 120 ? `${p.slice(0, 117)}...` : p;
  };

  const middleware = (req, res, next) => {
    const route = normalizeRoute(req);
    const endTimer = httpRequestDuration.startTimer({
      method: req.method,
      route,
    });

    res.on("finish", () => {
      const status = String(res.statusCode || 0);
      endTimer({ status_code: status });
      httpRequestTotal.inc({
        method: req.method,
        route,
        status_code: status,
      });
    });
    next();
  };

  const handler = async (req, res) => {
    res.setHeader("Content-Type", register.contentType);
    res.end(await register.metrics());
  };

  return { register, middleware, handler };
}
