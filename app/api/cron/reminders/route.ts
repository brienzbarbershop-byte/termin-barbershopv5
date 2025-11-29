import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { sendReminderEmail } from "../../../../lib/email";

function zurichDateTimeParts(d: Date) {
  const dateStr = d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" });
  const timeStr = d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Zurich" }).replaceAll(".", ":");
  return { dateStr, timeStr };
}

export async function GET(req: Request) {
  const now = new Date();
  const params = new URL(req.url).searchParams;
  const hrs = Number.parseInt(params.get("hours") ?? "3", 10);
  const upper = new Date(now.getTime() + Math.max(1, Math.min(48, hrs)) * 60 * 60 * 1000);
  let sentCount = 0;
  const dry = params.get("dry") === "true";
  const debug = params.get("debug") === "true";
  const matched: { id: number; date: string }[] = [];
  const checkId = Number.parseInt(params.get("checkId") ?? "0", 10);
  if (checkId > 0) {
    try {
      const rows = (await prisma.$queryRaw<{ reminderSent: boolean }[]>`
        SELECT "reminderSent" FROM "Booking" WHERE id = ${checkId} LIMIT 1
      `) || [];
      return NextResponse.json({ id: checkId, reminderSent: rows[0]?.reminderSent ?? null });
    } catch {
      return NextResponse.json({ id: checkId, reminderSent: null }, { status: 500 });
    }
  }
  try {
    const debugAll = params.get("debugAll") === "true";
    const rangeUpper = debugAll ? new Date(now.getTime() + 48 * 60 * 60 * 1000) : upper;
    type BookingRow = { id: number; date: Date; clientName: string; clientEmail: string; serviceName: string | null };
    const bookings: BookingRow[] = debugAll
      ? ((await prisma.$queryRaw<BookingRow[]>`
          SELECT b.id, b.date, b."clientName", b."clientEmail", s.name AS "serviceName"
          FROM "Booking" b
          LEFT JOIN "Service" s ON s.id = b."serviceId"
          WHERE b.date > ${now} AND b.date < ${rangeUpper}
          ORDER BY b.date ASC
        `) || [])
      : ((await prisma.$queryRaw<BookingRow[]>`
          SELECT b.id, b.date, b."clientName", b."clientEmail", s.name AS "serviceName"
          FROM "Booking" b
          LEFT JOIN "Service" s ON s.id = b."serviceId"
          WHERE b.date > ${now} AND b.date < ${rangeUpper}
          AND b.status = 'BESTAETIGT' AND COALESCE(b."reminderSent", false) = false
          ORDER BY b.date ASC
        `) || []);
    for (const b of bookings) {
      try {
        const when = new Date(b.date);
        if (debug) matched.push({ id: b.id, date: b.date.toISOString?.() ?? String(b.date) });
        const { dateStr, timeStr } = zurichDateTimeParts(when);
        const ok = dry ? true : await sendReminderEmail({ to: b.clientEmail, name: b.clientName, date: dateStr, time: timeStr, serviceName: b.serviceName ?? "" });
        if (ok) {
            try {
              await prisma.$executeRaw`
                UPDATE "Booking" SET "reminderSent" = true WHERE id = ${b.id}
              `;
            } catch {
              console.error("reminder flag update failed");
            }
          sentCount++;
        }
      } catch {
        console.error("reminder send failed");
      }
    }
  } catch {
    console.error("reminders query failed");
  }
  return NextResponse.json(debug ? { success: true, sentCount, matched } : { success: true, sentCount });
}
