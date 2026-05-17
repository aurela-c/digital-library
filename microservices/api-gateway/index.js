import express from "express";
import cors from "cors";
import axios from "axios";
import redis from "./redisClient.js";
import { securityStack } from "./security/securityStack.js";
import { resolveHttpServiceUrl } from "./config/serviceUrls.js";
import userRoutes from "./routes/userRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import borrowRoutes from "./routes/borrowRoutes.js";
import { printExpressStack } from "./utils/printRoutes.js";
import authClient from "./grpc-clients/authClient.js";
import { promisify } from "util";
import {
  createLogger,
  registerProcessHandlers,
  correlationIdMiddleware,
  createMetricsBundle,
  createRequestLogMiddleware,
  createHealthHandler,
  createErrorHandler,
  notFoundHandler,
} from "../observability/index.js";

const app = express();

const logger = createLogger("api-gateway");
registerProcessHandlers(logger);
const metrics = createMetricsBundle("api-gateway");

app.use(correlationIdMiddleware);
app.use(metrics.middleware);
app.get("/metrics", metrics.handler);

securityStack(app);

app.use(createRequestLogMiddleware(logger));

redis
  .ping()
  .then((r) => logger.info(`Redis: ${r}`))
  .catch((e) => logger.warn(`Redis unavailable - ${e.message}`));

const parseCorsOrigins = () => {
  const raw = process.env.CORS_ORIGIN;
  if (raw) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return ["http://localhost:5173", "http://localhost:5174"];
};

app.use(
  cors({
    origin(origin, callback) {
      const allowed = parseCorsOrigins();
      if (!origin) {
        return callback(null, true);
      }
      if (allowed.includes(origin)) {
        return callback(null, true);
      }
      if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
        return callback(null, true);
      }
      if (/^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
  })
);

const cache = async (req, res, next) => {
  if (req.method !== "GET") return next();
  if (req.headers.authorization) return next();

  const key = req.originalUrl;

  try {
    const cached = await redis.get(key);
    if (cached) {
      logger.debug({ key }, "cache hit");
      return res.json(JSON.parse(cached));
    }

    const originalJson = res.json.bind(res);

    res.json = async (data) => {
      if (data !== undefined) {
        await redis.setex(key, 60, JSON.stringify(data));
      }
      return originalJson(data);
    };

    next();
  } catch (err) {
    logger.warn({ err: err.message, key }, "cache error");
    next();
  }
};

app.use(cache);

const authHttpProxy = async (req, res) => {
  try {
    if (process.env.DEBUG_AUTH === "true") {
      const keys =
        req.body && typeof req.body === "object" ? Object.keys(req.body) : [];
      logger.debug(
        { method: req.method, path: req.originalUrl, bodyKeys: keys },
        "auth proxy"
      );
    }

    const base = await resolveHttpServiceUrl(
      process.env.AUTH_SERVICE_URL,
      "auth-service",
      5001
    );

    const forwardHeaders = {};
    if (req.headers.authorization) {
      forwardHeaders.authorization = req.headers.authorization;
    }
    if (req.headers["content-type"]) {
      forwardHeaders["content-type"] = req.headers["content-type"];
    }
    if (req.correlationId) {
      forwardHeaders["x-request-id"] = req.correlationId;
    }

    const [pathname, ...queryParts] = req.originalUrl.split("?");
    const querySuffix =
      queryParts.length > 0 ? `?${queryParts.join("?")}` : "";
    const upstreamPath = pathname.replace(/^\/api(?=\/auth\b)/, "");
    const forwardUrl = `${base}${upstreamPath}${querySuffix}`;

    const response = await axios({
      method: req.method,
      url: forwardUrl,
      params: req.query,
      data:
        req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
      headers: forwardHeaders,
      validateStatus: () => true,
      timeout: Number(process.env.AUTH_PROXY_TIMEOUT_MS) || 30000,
    });

    if (typeof response.data === "object" && response.data !== null) {
      return res.status(response.status).json(response.data);
    }

    return res.status(response.status).send(response.data);
  } catch (err) {
    logger.error(
      { err: err.message, correlationId: req.correlationId },
      "auth proxy failure"
    );
    return res.status(502).json({ error: "Auth service unavailable" });
  }
};

app.use("/auth", authHttpProxy);
app.use("/api/auth", authHttpProxy);

app.use("/users", userRoutes);
app.use("/books", bookRoutes);
app.use("/borrow", borrowRoutes);

app.get(
  "/health",
  createHealthHandler({
    serviceName: "api-gateway",
    checks: [
      {
        key: "redis",
        run: async () => {
          const r = await redis.ping();
          return { ok: Boolean(r), status: r ? "CONNECTED" : "DOWN" };
        },
      },
      {
        key: "authService",
        run: async () => {
          const base = await resolveHttpServiceUrl(
            process.env.AUTH_SERVICE_URL,
            "auth-service",
            5001
          );
          const r = await axios.get(`${base}/health`, {
            timeout: 5000,
            validateStatus: () => true,
          });
          const ok = r.status === 200 && r.data?.status === "UP";
          return {
            ok,
            status: ok ? "REACHABLE" : `HTTP_${r.status}`,
          };
        },
      },
      {
        key: "authGrpc",
        run: async () => {
          const stub = authClient;
          const fn =
            (typeof stub.validateAccessToken === "function" &&
              stub.validateAccessToken.bind(stub)) ||
            (typeof stub.ValidateAccessToken === "function" &&
              stub.ValidateAccessToken.bind(stub));
          if (!fn) {
            return { ok: false, status: "MISSING_GRPC_STUB" };
          }
          const validate = promisify(fn);
          await validate({ accessToken: "health-probe-invalid" });
          return { ok: true, status: "REACHABLE" };
        },
      },
    ],
  })
);

app.get("/", (req, res) => {
  res.send("Gateway (Consul + gRPC + Microservices) ");
});

app.use(notFoundHandler);
app.use(createErrorHandler(logger));

const port = Number(process.env.PORT) || 4000;
printExpressStack(app, "api-gateway");
app.listen(port, () => {
  logger.info(`HTTP listening on port ${port}`);
});
