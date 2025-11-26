import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { randomUUID } from "node:crypto";
import { sendAdminResetEmail } from "../../../../lib/email";


export async function POST() {
  try {
    const token = randomUUID();
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    const existing = await prisma.storeConfig.findFirst();
    const updated = existing
      ? await prisma.storeConfig.update({ where: { id: existing.id }, data: { resetToken: token, resetTokenExpiry: expiry } })
      : await prisma.storeConfig.create({ data: { resetToken: token, resetTokenExpiry: expiry } });
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${base}/auth/reset/${token}`;
    const to = process.env.ADMIN_CONTACT_EMAIL || "kontakt@barbershop-brienz.ch";
    try { await sendAdminResetEmail({ to, resetUrl: resetLink }); } catch {}
    return NextResponse.json({ ok: true, id: updated.id }, { status: 200 });
  } catch (e) {
    const msg = typeof e === "object" && e !== null && "message" in e ? (e as { message: string }).message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
