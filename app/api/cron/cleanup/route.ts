import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";

import { NextResponse } from "next/server";

export async function POST() {
  try {
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const oldIds = await prisma.booking.findMany({
      where: { date: { lt: twoYearsAgo } },
      select: { id: true },
    });
    if (oldIds.length > 0) {
      await prisma.$executeRaw`
        UPDATE "Booking"
        SET "clientName" = 'Anonymisiert', "clientEmail" = 'anonym@example.ch', "clientPhone" = '0000000000'
        WHERE id IN (${Prisma.join(oldIds.map((b) => b.id))})`;
    }

    await prisma.booking.deleteMany({ where: { status: BookingStatus.STORNIERT, date: { lt: thirtyDaysAgo } } });

    return NextResponse.json({ ok: true, anonymized: oldIds.length }, { status: 200 });
  } catch (e) {
    const msg = typeof e === "object" && e !== null && "message" in e ? (e as { message: string }).message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
