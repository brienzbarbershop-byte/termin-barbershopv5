import { describe, it, expect, beforeAll, vi } from 'vitest'

let auth: typeof import('../../../lib/auth')

beforeAll(async () => {
  process.env.ADMIN_SESSION_SECRET = '0123456789abcdef0123456789abcdef'
  process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db?schema=public'
  auth = await import('../../../lib/auth')
})

describe('admin token', () => {
  it('signAdminToken and verifyAdminToken succeed', () => {
    const t = auth.signAdminToken(60)
    const payload = auth.verifyAdminToken(t)
    expect(payload?.uid).toBe('admin')
  })
  it('verifyAdminToken fails with wrong secret', () => {
    const t = auth.signAdminToken(60)
    process.env.ADMIN_SESSION_SECRET = 'differentdifferentdifferent'
    vi.resetModules()
    return import('../../../lib/auth').then((mod) => {
      const bad = mod.verifyAdminToken(t)
      expect(bad).toBeNull()
    })
  })
})
