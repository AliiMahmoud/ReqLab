/**
 * The only logger in the main process. Everything it writes is redacted first:
 * secrets must never reach a log file, a terminal, or a bug report.
 */

const REDACTED = "[redacted]";

const SENSITIVE_KEY =
  /authorization|cookie|password|passphrase|secret|token|api[-_]?key|private[-_]?key|^key$/i;

const SENSITIVE_TEXT: RegExp[] = [
  /\b(Bearer|Basic|Digest)\s+[\w\-.~+/=]+/gi,
  /\beyJ[\w-]+\.[\w-]+\.[\w-]*/g, // JWT
  /\b(AKIA|ASIA)[A-Z0-9]{16}\b/g, // AWS access key id
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

const MAX_DEPTH = 5;

export function redact(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return redactText(value);
  if (value instanceof Error) return { name: value.name, message: redactText(value.message) };
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[too deep]";
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return redactObject(value as Record<string, unknown>, depth);
}

function redactObject(value: Record<string, unknown>, depth: number): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1);
  }
  return result;
}

function redactText(text: string): string {
  return SENSITIVE_TEXT.reduce((result, pattern) => result.replace(pattern, REDACTED), text);
}

type Level = "info" | "warn" | "error";

export interface Logger {
  info(message: string, details?: unknown): void;
  warn(message: string, details?: unknown): void;
  error(message: string, details?: unknown): void;
}

export function createLogger(scope: string): Logger {
  const write = (level: Level, message: string, details?: unknown): void => {
    const line = JSON.stringify({
      time: new Date().toISOString(),
      level,
      scope,
      message: redactText(message),
      details: redact(details),
    });
    if (level === "info") console.log(line);
    else console.error(line);
  };
  return {
    info: (message, details) => {
      write("info", message, details);
    },
    warn: (message, details) => {
      write("warn", message, details);
    },
    error: (message, details) => {
      write("error", message, details);
    },
  };
}
