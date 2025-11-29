import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { prisma } from "../../../lib/prisma";



function getZurichTime(date: Date): string {
  const s = date.toLocaleTimeString("de-CH", {
    timeZone: "Europe/Zurich",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return s.replaceAll(".", ":");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const serviceIdStr = searchParams.get("serviceId");
    const durationStr = searchParams.get("duration");
    if (!dateStr) return NextResponse.json([], { status: 200 });
    let serviceDuration = 30;
    if (serviceIdStr) {
      const serviceId = Number.parseInt(serviceIdStr, 10);
      if (Number.isNaN(serviceId)) return NextResponse.json({ error: "invalid serviceId" }, { status: 400 });
      const service = await prisma.service.findUnique({ where: { id: serviceId } });
      serviceDuration = service?.duration ?? 30;
    } else if (durationStr) {
      const d = Number.parseInt(durationStr, 10);
      if (!Number.isNaN(d) && d > 0) serviceDuration = d;
    }
    const parts = dateStr.split("-").map((x) => Number.parseInt(x, 10));
    const dow = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay();
    const wh = await prisma.workingHours.findUnique({ where: { dayOfWeek: dow } });
    if (!wh?.isOpen) return NextResponse.json([], { status: 200 });

    const toMinutes = (hm: string) => {
      const [hh, mm] = hm.split(":").map((x) => Number.parseInt(x, 10));
      if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
      return hh * 60 + mm;
    };
    const startMin = toMinutes(wh.startTime);
    const endMin = toMinutes(wh.endTime);

    const bookings = await prisma.booking.findMany({
      where: {
        date: {
          gte: new Date(`${dateStr}T00:00:00`),
          lt: new Date(`${dateStr}T23:59:59.999`),
        },
        status: BookingStatus.BESTAETIGT,
      },
      include: { service: true },
    });
    const bookedIntervals: { start: number; end: number }[] = bookings.map((b: typeof bookings[number]) => {
      const startLabel = getZurichTime(new Date(b.date));
      const [hh, mm] = startLabel.split(":");
      const start = Number.parseInt(hh, 10) * 60 + Number.parseInt(mm, 10);
      const dur = b.service?.duration ?? 30;
      return { start, end: start + dur };
    });

    const breakIntervals: { start: number; end: number }[] = [];
    if (wh?.breakStart && wh?.breakEnd) {
      const bs = toMinutes(wh.breakStart);
      const be = toMinutes(wh.breakEnd);
      if (bs < be) breakIntervals.push({ start: bs, end: be });
    }

    let manualIntervals: { start: number; end: number }[] = [];
    try {
      const startOfDay = new Date(`${dateStr}T00:00:00`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999`);
      const blocks = await prisma.blockedSlot.findMany({ where: { date: { gte: startOfDay, lte: endOfDay } } });
      manualIntervals = blocks.map((b: typeof blocks[number]) => ({ start: toMinutes(b.startTime), end: toMinutes(b.endTime) }));
    } catch {
      manualIntervals = [];
    }

    const toLabel = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const slots: { time: string; isBooked: boolean }[] = [];

    const now = new Date();
    const nowParts = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(now);
    const ny = Number(nowParts.find((p) => p.type === "year")?.value ?? now.getFullYear());
    const nm = Number(nowParts.find((p) => p.type === "month")?.value ?? (now.getMonth() + 1));
    const nd = Number(nowParts.find((p) => p.type === "day")?.value ?? now.getDate());
    const nh = Number(nowParts.find((p) => p.type === "hour")?.value ?? now.getHours());
    const nmin = Number(nowParts.find((p) => p.type === "minute")?.value ?? now.getMinutes());
    const todayZurich = `${String(ny)}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
    const nowMinutesZurich = nh * 60 + nmin;
    const isToday = dateStr === todayZurich;
    for (let start = startMin; start < endMin; start += 15) {
      const end = start + serviceDuration;
      const overClosing = end > endMin;
      const overlaps = bookedIntervals.some((bi: { start: number; end: number }) => start < bi.end && end > bi.start);
      const overlapsBreak = breakIntervals.some((bi: { start: number; end: number }) => start < bi.end && end > bi.start);
      const overlapsManual = manualIntervals.some((bi: { start: number; end: number }) => start < bi.end && end > bi.start);
      const label = toLabel(start);
      const past = isToday && start < nowMinutesZurich;
      slots.push({ time: label, isBooked: overClosing || overlaps || overlapsBreak || overlapsManual || past });
    }
    return NextResponse.json(slots, { status: 200 });
  } catch (e) {
    const msg = typeof e === "object" && e !== null && "message" in e ? (e as { message: string }).message : String(e);
    return NextResponse.json({ error: msg || "Failed to compute slots" }, { status: 500 });
  }
}
