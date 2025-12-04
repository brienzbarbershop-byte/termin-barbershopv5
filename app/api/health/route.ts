import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET() {
  let db = false
  try {
    const rows = await prisma.$queryRaw`SELECT 1 as ok`
    db = Array.isArray(rows)
  } catch {
    db = false
  }
  return NextResponse.json({ ok: true, db }, { status: 200 })
}
