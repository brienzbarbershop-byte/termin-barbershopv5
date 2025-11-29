import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { BookingStatus } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(((body as { token?: string }).token ?? ""));
    if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });
    const booking = await prisma.booking.findFirst({ where: { cancellationToken: token } });
    if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (String(booking.status) === "STORNIERT") return NextResponse.json({ ok: true }, { status: 200 });
    await prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.STORNIERT } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const msg = typeof e === "object" && e !== null && "message" in e ? (e as { message: string }).message : String(e);
    return NextResponse.json({ error: msg || "cancel failed" }, { status: 500 });
  }
}
