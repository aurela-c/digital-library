import pino from "pino";
import { Writable } from "node:stream";

/**
 * JSON logs for production / aggregators when LOG_FORMAT=json or NODE_ENV=production.
 * Pretty terminal logs by default in development (LOG_FORMAT=pretty forces pretty anywhere).
 */
export function useJsonLogs() {
  const fmt = String(process.env.LOG_FORMAT || "").toLowerCase();
  if (fmt === "json") return true;
  if (fmt === "pretty" || fmt === "dev" || fmt === "human") return false;
  return String(process.env.NODE_ENV || "").toLowerCase() === "production";
}

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function levelColor(level) {
  if (level >= 60) return C.red;
  if (level >= 50) return C.red;
  if (level >= 40) return C.yellow;
  if (level >= 30) return C.green;
  return C.dim;
}

function levelName(level) {
  if (level >= 60) return "FATAL";
  if (level >= 50) return "ERROR";
  if (level >= 40) return "WARN";
  if (level >= 30) return "INFO";
  if (level >= 20) return "DEBUG";
  return "TRACE";
}

function shortStack(stack, maxLines = 4) {
  if (!stack || typeof stack !== "string") return "";
  return stack.split("\n").slice(0, maxLines).join("\n");
}

function formatInlineErr(err) {
  if (!err || typeof err !== "object") return String(err ?? "");
  const msg = err.message || "";
  const code = err.code ? ` [${err.code}]` : "";
  if (/EADDRINUSE|already in use/i.test(msg)) {
    const m = /:(\d+)/.exec(msg);
    const portHint = m ? ` port ${m[1]}` : "";
    return `address already in use${portHint}${code}`;
  }
  return `${msg}${code}`.trim() || "error";
}

function resolveLogMessage(o) {
  const event = o.event;

  if (event === "http_access") {
    return `${o.method || "?"} ${o.endpoint || o.url || "?"} → ${o.statusCode ?? "?"} ${o.durationMs ?? "?"}ms`;
  }

  if (event === "http_error") {
    const base = o.message || "request failed";
    const where = o.method && o.endpoint ? ` (${o.method} ${o.endpoint})` : "";
    return `${base}${where}`;
  }

  if (event === "audit" || event === "gateway_audit") {
    const action = o.action || o.msg || "audit";
    return typeof action === "string" ? action : "audit_event";
  }

  if (typeof o.message === "string" && o.message) return o.message;

  let msg = o.msg;
  if (msg == null) return "";

  if (typeof msg === "string") {
    const internal = /^(startup_failed|uncaughtException|unhandledRejection|http_access|http_error|audit)$/;
    if (internal.test(msg) && typeof o.message === "string") return o.message;
    return msg;
  }

  return String(msg);
}

class DevPrettyStream extends Writable {
  _write(chunk, _enc, cb) {
    try {
      const raw = chunk.toString();
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const o = JSON.parse(trimmed);
        const lvl = o.level ?? 30;
        const lc = levelColor(lvl);
        const ln = levelName(lvl);
        const text = resolveLogMessage(o);

        let out = `${lc}[${ln}]${C.reset} ${text}`;

        const err = o.err;
        if (err && typeof err === "object" && lvl >= 50) {
          const detail = formatInlineErr(err);
          if (detail && !text.includes(detail)) {
            out += `\n${C.gray}  → ${detail}${C.reset}`;
          }
          if (err.stack && lvl >= 50) {
            out += `\n${C.dim}${shortStack(err.stack)}${C.reset}`;
          }
        }

        console.log(out);
      }
    } catch {
      process.stdout.write(chunk);
    }
    cb();
  }
}

const loggerCache = new Map();

export function createLogger(serviceName) {
  if (loggerCache.has(serviceName)) {
    return loggerCache.get(serviceName);
  }
  const level = process.env.LOG_LEVEL || "info";
  const base = { service: serviceName, name: serviceName };
  const redact = {
    paths: ["req.headers.authorization", "headers.authorization"],
    remove: true,
  };

  let instance;
  if (useJsonLogs()) {
    instance = pino({
      name: serviceName,
      level,
      base,
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level(label) {
          return { level: label };
        },
      },
      redact,
    });
  } else {
    instance = pino(
      {
        name: serviceName,
        level,
        base,
        redact,
      },
      new DevPrettyStream()
    );
  }
  loggerCache.set(serviceName, instance);
  return instance;
}
