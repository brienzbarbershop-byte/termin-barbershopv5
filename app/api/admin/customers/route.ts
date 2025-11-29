import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/auth";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const url = new URL(req.url);
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(url.searchParams.get("pageSize") ?? "50", 10);
  const take = Math.min(Math.max(pageSize, 1), 200);
  const skip = Math.max((page - 1) * take, 0);
  try {
    const rows = await prisma.$queryRaw<unknown[]>`
      SELECT id, email, name, phone, marketingConsent, createdAt, deletedAt
      FROM "Customer"
      ORDER BY "createdAt" DESC
      LIMIT ${take} OFFSET ${skip}
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  try {
    const body = await req.json();
    const email = String((body?.email ?? "")).toLowerCase();
    const name = typeof body?.name === "string" ? body.name : null;
    const phone = typeof body?.phone === "string" ? body.phone : null;
    const marketingConsent = !!body?.marketingConsent;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "invalid email" }, { status: 400 });
    }
    await prisma.$executeRaw`
      INSERT INTO "Customer" (email, name, phone, "marketingConsent")
      VALUES (${email}, ${name}, ${phone}, ${marketingConsent})
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, "marketingConsent" = EXCLUDED."marketingConsent";
    `;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  try {
    const url = new URL(req.url);
    const email = String((url.searchParams.get("email") ?? "")).toLowerCase();
    if (!email) return NextResponse.json({ error: "invalid email" }, { status: 400 });
    await prisma.$executeRaw`
      UPDATE "Customer" SET "deletedAt" = NOW() WHERE email = ${email};
    `;
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
