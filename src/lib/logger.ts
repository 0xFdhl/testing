import "server-only";

type Level = "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

const redactKeys = ["password", "token", "secret", "apiKey", "authorization", "cookie"];

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactKeys.some((r) => k.toLowerCase().includes(r)) ? "[REDACTED]" : redact(v);
    }
    return out;
  }
  return value;
}

function emit(level: Level, msg: string, fields?: LogFields): void {
  const record = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(fields ? (redact(fields) as LogFields) : {}),
  };
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (msg: string, fields?: LogFields) => emit("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => emit("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => emit("error", msg, fields),
};