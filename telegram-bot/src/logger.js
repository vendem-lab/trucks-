import { config } from './config.js';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

export function createLogger(level = 'info') {
  const threshold = LEVELS[String(level).toLowerCase()] ?? LEVELS.info;

  function write(name, args) {
    if (LEVELS[name] < threshold) return;
    const line = `${new Date().toISOString()} ${name.toUpperCase().padEnd(5)}`;
    const target = name === 'error' || name === 'warn' ? console.error : console.log;
    target(line, ...args);
  }

  return {
    debug: (...args) => write('debug', args),
    info: (...args) => write('info', args),
    warn: (...args) => write('warn', args),
    error: (...args) => write('error', args)
  };
}

export const log = createLogger(config.logLevel);
