/**
 * Minimal structured logger. Every line is a single JSON object so it can be
 * piped into any log aggregator later. Kept dependency-free intentionally.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, message: string, meta?: Record<string, unknown>) {
  const line = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const out = JSON.stringify(line);
  if (level === 'error') console.error(out);
  else if (level === 'warn') console.warn(out);
  else console.log(out);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => emit('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => emit('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit('error', message, meta),
};
