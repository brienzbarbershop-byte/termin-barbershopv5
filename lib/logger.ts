import { randomUUID } from 'node:crypto'

type Level = 'info' | 'error'

function base(level: Level, msg: string, fields?: Record<string, unknown>) {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    rid: randomUUID(),
    ...fields,
  }
  const s = JSON.stringify(line)
  if (level === 'error') console.error(s)
  else console.log(s)
}

export function logInfo(msg: string, fields?: Record<string, unknown>) {
  base('info', msg, fields)
}

export function logError(msg: string, fields?: Record<string, unknown>) {
  base('error', msg, fields)
}
