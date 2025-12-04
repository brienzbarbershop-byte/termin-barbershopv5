import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { BookingStatus } from "@prisma/client";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const c = await cookies();
    const headerToken = req.headers.get("x-csrf-token") ?? "";
    const cookieToken = c.get("csrf_token")?.value ?? "";
    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return NextResponse.json({ error: "csrf" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const token = String(((body as { token?: string }).token ?? ""));
    if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });
    const booking = await prisma.booking.findFirst({ where: { cancellationToken: token } });
    if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });
    const now = new Date();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    if (new Date(booking.date).getTime() - now.getTime() < twoHoursMs) {
      return NextResponse.json({ error: "too_close" }, { status: 409 });
    }
    if (String(booking.status) === "STORNIERT") return NextResponse.json({ ok: true }, { status: 200 });
  await prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.STORNIERT } });
  try {
    await prisma.slotLock.deleteMany({ where: { bookingId: booking.id } });
  } catch {}
  return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const msg = typeof e === "object" && e !== null && "message" in e ? (e as { message: string }).message : String(e);
    return NextResponse.json({ error: msg || "cancel failed" }, { status: 500 });
  }
}
