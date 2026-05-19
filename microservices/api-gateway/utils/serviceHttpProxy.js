import axios from "axios";
import { resolveHttpServiceUrl } from "../config/serviceUrls.js";

/**
 * Forward HTTP to a microservice (routing only — no JWT validation).
 */
export function createServiceHttpProxy(mountPath, envVar, consulName, fallbackPort) {
  const prefix = mountPath.endsWith("/") ? mountPath.slice(0, -1) : mountPath;

  return async (req, res) => {
    try {
      const base = await resolveHttpServiceUrl(
        process.env[envVar],
        consulName,
        fallbackPort
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
      const upstreamPath =
        pathname.replace(new RegExp(`^${prefix.replace(/\//g, "\\/")}`), "") ||
        "/";
      const forwardUrl = `${base}${upstreamPath}${querySuffix}`;

      const response = await axios({
        method: req.method,
        url: forwardUrl,
        data:
          req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
        headers: forwardHeaders,
        validateStatus: () => true,
        timeout: Number(process.env.SERVICE_PROXY_TIMEOUT_MS) || 30000,
      });

      if (typeof response.data === "object" && response.data !== null) {
        return res.status(response.status).json(response.data);
      }

      return res.status(response.status).send(response.data);
    } catch (err) {
      return res.status(502).json({
        error: `${consulName} unavailable`,
        message: err.message,
      });
    }
  };
}
