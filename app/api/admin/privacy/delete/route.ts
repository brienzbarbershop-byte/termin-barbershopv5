import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/auth";
import crypto from "node:crypto";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  try {
    const body = await req.json();
    const email = String((body?.email ?? "")).toLowerCase();
    if (!email) return NextResponse.json({ error: "invalid email" }, { status: 400 });
    const hash = crypto.createHash("sha256").update(email).digest("hex");
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`INSERT INTO "Suppression" ("emailHash") VALUES (${hash}) ON CONFLICT ("emailHash") DO NOTHING;`;
      await tx.$executeRaw`UPDATE "Customer" SET "deletedAt" = NOW(), "marketingConsent" = FALSE WHERE email = ${email};`;
      await tx.$executeRaw`
        UPDATE "Booking"
        SET "clientName" = 'Anonymisiert', "clientEmail" = 'anonym@example.ch', "clientPhone" = '0000000000'
        WHERE LOWER("clientEmail") = ${email} OR "customerId" = (SELECT id FROM "Customer" WHERE email = ${email});
      `;
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
