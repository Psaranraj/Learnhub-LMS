const log = (level: string, msg: string, extra?: unknown) =>
  console.log(`${new Date().toISOString()} [${level}] ${msg}`, extra ?? '');

export const logger = {
  info: (msg: string, extra?: unknown) => log('INFO', msg, extra),
  warn: (msg: string, extra?: unknown) => log('WARN', msg, extra),
  error: (msg: string, extra?: unknown) => log('ERROR', msg, extra),
};
