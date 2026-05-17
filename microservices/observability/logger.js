import pino from "pino";
import { Writable } from "node:stream";

/** Production / log aggregators: JSON lines. Dev default: human-readable ANSI. */
export function useJsonLogs() {
  return (
    process.env.LOG_FORMAT === "json" ||
    String(process.env.NODE_ENV || "").toLowerCase() === "production"
  );
}

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
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

class DevPrettyStream extends Writable {
  _write(chunk, _enc, cb) {
    try {
      const raw = chunk.toString();
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const o = JSON.parse(trimmed);
        const svc = String(o.service || o.name || "app").toUpperCase();
        const lvl = o.level ?? 30;
        const lc = levelColor(lvl);
        const ln = levelName(lvl);
        let msg = o.msg;

        if (o.msg === "http_access") {
          msg = `${o.method} ${o.endpoint} → ${o.statusCode} ${o.durationMs}ms`;
        }

        if (msg == null && o.message) msg = o.message;
        if (msg == null) msg = "";

        let extra = "";
        if (o.port != null && /listening/i.test(String(msg))) {
          extra = "";
        } else if (o.grpcPort != null && !String(msg).includes("port")) {
          extra = ` (gRPC ${o.grpcPort})`;
        } else if (o.redis != null && String(msg).includes("redis")) {
          extra = ` (${o.redis})`;
        }

        let out = `${lc}[${ln}]${C.reset}${C.cyan}[${svc}]${C.reset} ${msg}${extra}`;

        const err = o.err;
        if (err && typeof err === "object" && (lvl >= 50 || o.msg === "http_error")) {
          out += `\n${C.gray}  ${formatInlineErr(err)}${C.reset}`;
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
