import { describe, it, expect, beforeEach, vi } from 'vitest'

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = '0123456789abcdef0123456789abcdef'
  process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db?schema=public'
})

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: '' }) })
}))

import { POST } from './route'

describe('booking csrf', () => {
  it('rejects when csrf missing', async () => {
    const req = new Request('http://localhost/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
})
