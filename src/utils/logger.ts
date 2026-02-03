/**
 * Environment-aware logging utility.
 *
 * Provides consistent logging throughout the application with environment-based
 * filtering. In production, only errors and warnings are logged to reduce noise.
 * In development, all log levels are shown for debugging.
 *
 * @module utils/logger
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
    /** Whether logging is enabled */
    enabled: boolean;
    /** Minimum log level to display */
    minLevel: LogLevel;
    /** Prefix to add to all log messages */
    prefix: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const isDev = import.meta.env.DEV;

const defaultConfig: LoggerConfig = {
    enabled: true,
    minLevel: isDev ? 'debug' : 'warn',
    prefix: '[HRM Connect]',
};

/**
 * Creates a logger instance with the specified configuration.
 * @param config - Optional configuration overrides
 * @returns Logger object with debug, info, warn, and error methods
 */
function createLogger(config: Partial<LoggerConfig> = {}) {
    const mergedConfig: LoggerConfig = { ...defaultConfig, ...config };

    const shouldLog = (level: LogLevel): boolean => {
        if (!mergedConfig.enabled) return false;
        return LOG_LEVELS[level] >= LOG_LEVELS[mergedConfig.minLevel];
    };

    const formatMessage = (level: LogLevel, message: string): string => {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
        return `${mergedConfig.prefix} [${timestamp}] [${level.toUpperCase()}] ${message}`;
    };

    return {
        /**
         * Logs debug-level messages. Only shown in development.
         * Use for detailed debugging information.
         */
        debug: (message: string, ...args: unknown[]) => {
            if (shouldLog('debug')) {
                console.log(formatMessage('debug', message), ...args);
            }
        },

        /**
         * Logs info-level messages. Only shown in development.
         * Use for general information about app flow.
         */
        info: (message: string, ...args: unknown[]) => {
            if (shouldLog('info')) {
                console.info(formatMessage('info', message), ...args);
            }
        },

        /**
         * Logs warning-level messages. Shown in all environments.
         * Use for recoverable issues or deprecation notices.
         */
        warn: (message: string, ...args: unknown[]) => {
            if (shouldLog('warn')) {
                console.warn(formatMessage('warn', message), ...args);
            }
        },

        /**
         * Logs error-level messages. Shown in all environments.
         * Use for errors that need attention.
         */
        error: (message: string, ...args: unknown[]) => {
            if (shouldLog('error')) {
                console.error(formatMessage('error', message), ...args);
            }
        },

        /**
         * Groups multiple log messages together.
         * Only shown in development.
         */
        group: (label: string) => {
            if (isDev && mergedConfig.enabled) {
                console.group(`${mergedConfig.prefix} ${label}`);
            }
        },

        /**
         * Ends a log group started with group().
         */
        groupEnd: () => {
            if (isDev && mergedConfig.enabled) {
                console.groupEnd();
            }
        },

        /**
         * Measures execution time of an async function.
         * Only shown in development.
         */
        time: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
            if (!isDev) return fn();

            const start = performance.now();
            try {
                return await fn();
            } finally {
                const duration = (performance.now() - start).toFixed(2);
                console.log(formatMessage('debug', `${label} completed in ${duration}ms`));
            }
        },
    };
}

/** Default logger instance for the application */
export const logger = createLogger();

/** Create a logger with a custom prefix for a specific module */
export const createModuleLogger = (moduleName: string) =>
    createLogger({ prefix: `[HRM Connect:${moduleName}]` });
