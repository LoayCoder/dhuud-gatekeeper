/**
 * Development-gated logging utility
 * 
 * This utility provides consistent logging that:
 * - Only outputs debug/info logs in development mode
 * - Always outputs warn/error logs (important for production debugging)
 * - Can be extended to send errors to external services
 */

const isDev = import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  /** Additional context to include with all logs */
  context?: Record<string, unknown>;
}

function formatMessage(level: LogLevel, args: unknown[]): unknown[] {
  const timestamp = new Date().toISOString();
  const prefix = `[${level.toUpperCase()}] ${timestamp}`;
  return [prefix, ...args];
}

export const logger = {
  /**
   * Debug logs - only shown in development
   * Use for verbose debugging information
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log(...formatMessage('debug', args));
    }
  },

  /**
   * Info logs - only shown in development
   * Use for general information about app state
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...formatMessage('info', args));
    }
  },

  /**
   * Warning logs - always shown
   * Use for non-critical issues that should be addressed
   */
  warn: (...args: unknown[]) => {
    console.warn(...formatMessage('warn', args));
  },

  /**
   * Error logs - always shown
   * Use for errors that need attention
   * Could be extended to send to error tracking services
   */
  error: (...args: unknown[]) => {
    console.error(...formatMessage('error', args));
    // TODO: Optionally send to error tracking service like Sentry
  },

  /**
   * Create a scoped logger with a prefix
   * Useful for module-specific logging
   */
  scope: (scopeName: string) => ({
    debug: (...args: unknown[]) => logger.debug(`[${scopeName}]`, ...args),
    info: (...args: unknown[]) => logger.info(`[${scopeName}]`, ...args),
    warn: (...args: unknown[]) => logger.warn(`[${scopeName}]`, ...args),
    error: (...args: unknown[]) => logger.error(`[${scopeName}]`, ...args),
  }),
};

export default logger;
