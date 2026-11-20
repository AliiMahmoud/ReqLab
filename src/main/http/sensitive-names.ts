/** Header, query and field names whose values are credentials: redacted in history and logs. */
export const SENSITIVE_NAME = /authorization|cookie|token|secret|password|api[-_]?key|^key$|signature/i;

export const REDACTED = "[redacted]";
