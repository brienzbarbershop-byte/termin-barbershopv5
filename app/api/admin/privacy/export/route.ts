import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/auth";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  try {
    const body = await req.json();
    const email = String((body?.email ?? "")).toLowerCase();
    if (!email) return NextResponse.json({ error: "invalid email" }, { status: 400 });
    const [customer] = await prisma.$queryRaw<unknown[]>`
      SELECT id, email, name, phone, marketingConsent, createdAt, deletedAt FROM "Customer" WHERE email = ${email} LIMIT 1
    `;
    const bookings = await prisma.$queryRaw<unknown[]>`
      SELECT b.id, b.date, b.clientName, b.clientEmail, b.clientPhone, b.status, s.name as serviceName
      FROM "Booking" b
      LEFT JOIN "Service" s ON s.id = b."serviceId"
      WHERE LOWER(b."clientEmail") = ${email} OR b."customerId" = (SELECT id FROM "Customer" WHERE email = ${email})
      ORDER BY b.date DESC
      LIMIT 500
    `;
    return NextResponse.json({ customer: customer || null, bookings }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
