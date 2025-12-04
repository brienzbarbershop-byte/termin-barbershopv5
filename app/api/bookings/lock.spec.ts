import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = '0123456789abcdef0123456789abcdef'
  process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db?schema=public'
})

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'CSRF' }) })
}))

const tx = {
    service: { findUnique: vi.fn().mockResolvedValue({ id: 1, duration: 30 }) },
    workingHours: { findUnique: vi.fn().mockResolvedValue({ isOpen: true, startTime: '09:00', endTime: '17:00' }) },
    blockedSlot: { findMany: vi.fn().mockResolvedValue([]) },
    recurringBreak: { findMany: vi.fn().mockResolvedValue([]) },
    booking: { create: vi.fn().mockResolvedValue({ id: 123, date: new Date(), clientEmail: 'a@b.c', clientName: 'A', service: { name: 'Cut' } }), findMany: vi.fn().mockResolvedValue([]) },
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn().mockResolvedValue([{ id: 1 }]),
    slotLock: { createMany: vi.fn() },
}
vi.mock('../../../lib/prisma', () => {
  const prisma = {
    $transaction: (fn: (arg: typeof tx) => unknown) => fn(tx)
  }
  return { prisma }
})

vi.mock('../../../lib/email', () => ({
  sendBookingConfirmation: vi.fn().mockResolvedValue(true)
}))

import { POST } from './route'

describe('booking slot lock', () => {
  it('creates booking and locks when free', async () => {
    const req = new Request('http://localhost/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'CSRF' },
      body: JSON.stringify({ serviceId: 1, date: new Date().toISOString(), time: '10:00', clientName: 'A', clientEmail: 'a@b.c', clientPhone: '+41000000000', consent: true })
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('returns 409 when slot is locked', async () => {
    tx.slotLock.createMany.mockImplementation(() => { throw new Error('unique') })
    const req = new Request('http://localhost/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'CSRF' },
      body: JSON.stringify({ serviceId: 1, date: new Date().toISOString(), time: '10:00', clientName: 'A', clientEmail: 'a@b.c', clientPhone: '+41000000000', consent: true })
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})
