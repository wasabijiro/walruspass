import { Logger, LogLevel } from './types'

function formatMessage(level: LogLevel, message: string): string {
  return `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`
}

export function createConsoleLogger(): Logger {
  return {
    debug(message: string, ...args: unknown[]): void {
      console.debug(formatMessage('debug', message), ...args)
    },
    info(message: string, ...args: unknown[]): void {
      console.info(formatMessage('info', message), ...args)
    },
    warn(message: string, ...args: unknown[]): void {
      console.warn(formatMessage('warn', message), ...args)
    },
    error(message: string, ...args: unknown[]): void {
      console.error(formatMessage('error', message), ...args)
    }
  }
} 