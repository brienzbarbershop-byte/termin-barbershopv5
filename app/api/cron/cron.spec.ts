import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  process.env.CRON_SECRET = 'SECRET'
  process.env.ADMIN_SESSION_SECRET = '0123456789abcdef0123456789abcdef'
  process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db?schema=public'
})

vi.mock('../../../lib/prisma', () => {
  const prisma = {
    booking: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    $executeRaw: vi.fn()
  }
  return { prisma }
})

vi.mock('../../../lib/email', () => ({
  sendReminderEmail: vi.fn().mockResolvedValue(true)
}))

type Handler = (req: Request) => Promise<Response>
let RemindersGET: Handler
let CleanupPOST: Handler

beforeEach(async () => {
  const rem = await import('./reminders/route')
  RemindersGET = rem.GET
  const cl = await import('./cleanup/route')
  CleanupPOST = cl.POST
})

describe('cron secret enforcement', () => {
  it('reminders rejects without secret', async () => {
    const res = await RemindersGET(new Request('http://localhost/api/cron/reminders'))
    expect(res.status).toBe(401)
  })
  it('reminders accepts with secret header', async () => {
    const res = await RemindersGET(new Request('http://localhost/api/cron/reminders', { headers: { 'x-cron-secret': 'SECRET' } }))
    expect(res.status).toBe(200)
  })
  it('cleanup rejects without secret', async () => {
    const res = await CleanupPOST(new Request('http://localhost/api/cron/cleanup', { method: 'POST' }))
    expect(res.status).toBe(401)
  })
  it('cleanup accepts with secret header', async () => {
    const res = await CleanupPOST(new Request('http://localhost/api/cron/cleanup', { method: 'POST', headers: { 'x-cron-secret': 'SECRET' } }))
    expect(res.status).toBe(200)
  })
})
