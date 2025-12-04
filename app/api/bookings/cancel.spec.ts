import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = '0123456789abcdef0123456789abcdef'
  process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db?schema=public'
})

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'TOKEN' }) })
}))

vi.mock('../../../lib/prisma', () => {
  const booking = {
    findFirst: vi.fn(),
    update: vi.fn()
  }
  const slotLock = {
    deleteMany: vi.fn()
  }
  return { prisma: { booking, slotLock } }
})

import { POST } from './cancel-by-token/route'
import { prisma } from '../../../lib/prisma'

describe('cancel-by-token', () => {
  it('rejects missing csrf', async () => {
    const req = new Request('http://localhost/api/bookings/cancel-by-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 't' }) })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
  it('cancels when window allows', async () => {
    ;(prisma.booking.findFirst as unknown as Mock).mockResolvedValue({ id: 1, date: new Date(Date.now() + 3 * 60 * 60 * 1000), status: 'BESTAETIGT' })
    const del = prisma.slotLock.deleteMany as unknown as Mock
    del.mockResolvedValue({ count: 0 })
    const upd = prisma.booking.update as unknown as Mock
    upd.mockResolvedValue({})
    const req = new Request('http://localhost/api/bookings/cancel-by-token', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'TOKEN' }, body: JSON.stringify({ token: 't' }) })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(del).toHaveBeenCalled()
    expect(upd).toHaveBeenCalled()
  })
  it('blocks when within 2 hours', async () => {
    ;(prisma.booking.findFirst as unknown as Mock).mockResolvedValue({ id: 2, date: new Date(Date.now() + 30 * 60 * 1000), status: 'BESTAETIGT' })
    const req = new Request('http://localhost/api/bookings/cancel-by-token', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'TOKEN' }, body: JSON.stringify({ token: 't' }) })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})
