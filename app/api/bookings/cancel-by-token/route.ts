import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = typeof body?.token === "string" ? body.token : "";
    if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
    const rows = (await prisma.$queryRaw<{ id: number; status: string }[]>`
      SELECT id, status FROM "Booking" WHERE "cancellationToken" = ${token} LIMIT 1
    `) || [];
    const booking = rows[0];
    if (!booking) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    if (booking.status === "STORNIERT") {
      return NextResponse.json({ ok: true, alreadyCancelled: true }, { status: 200 });
    }
    const updated = await prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.STORNIERT } });
    return NextResponse.json({ ok: true, id: updated.id }, { status: 200 });
  } catch (e) {
    const msg = typeof e === "object" && e !== null && "message" in e ? (e as { message: string }).message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
