type LogLevel = "debug" | "error" | "info" | "warn";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  error: 3,
  info: 1,
  warn: 2,
};

const STYLES: Record<LogLevel, string> = {
  debug: "color:#888;font-weight:600",
  error: "color:#ef4444;font-weight:600",
  info: "color:#3b82f6;font-weight:600",
  warn: "color:#f59e0b;font-weight:600",
};

const ENABLED: boolean = __DEV__;
const MIN_LEVEL: LogLevel = __DEV__ ? "debug" : "warn";

export function createLogger(scope: string) {
  return {
    debug: (...args: unknown[]) => emit("debug", scope, args),
    error: (...args: unknown[]) => emit("error", scope, args),
    info: (...args: unknown[]) => emit("info", scope, args),
    warn: (...args: unknown[]) => emit("warn", scope, args),
  };
}

function emit(level: LogLevel, scope: string, args: unknown[]): void {
  if (!shouldLog(level)) return;
  const tag = `%c[${scope}]`;

  console[level](tag, STYLES[level], ...args);
}

function shouldLog(level: LogLevel): boolean {
  if (!ENABLED && level !== "error" && level !== "warn") return false;
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}
