import { SENTRY_DSN, NODE_ENV } from './config'

export function reportError(name: string, fields?: Record<string, unknown>) {
  if (!SENTRY_DSN) return
  const payload = {
    ts: new Date().toISOString(),
    level: 'error',
    msg: 'sentry_report',
    name,
    env: NODE_ENV,
    ...fields,
  }
  // Minimal stub: log a structured line; real Sentry SDK can be wired later
  // Avoid secrets/PII; only coarse context
  console.error(JSON.stringify(payload))
}
