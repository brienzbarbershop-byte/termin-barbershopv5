import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PrismaClient, BookingStatus } from "@prisma/client";
import { requireAdmin } from "../../../lib/auth";
import { randomUUID } from "node:crypto";
import { sendBookingConfirmation } from "../../../lib/email";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  try {
    const url = new URL(req.url);
    const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = Number.parseInt(url.searchParams.get("pageSize") || "50", 10);
    const take = Math.min(Math.max(pageSize, 1), 200);
    const skip = Math.max((page - 1) * take, 0);
    const bookings = await prisma.booking.findMany({ include: { service: true }, orderBy: { date: "desc" }, take, skip });
    return NextResponse.json(bookings, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to load bookings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceId, date, clientName, clientEmail, clientPhone, notes, consent, marketingConsent } = body;
    if (!serviceId || !date || !clientName || !clientEmail || !clientPhone || consent !== true) {
      return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
    }
    const created = await prisma.$transaction(async (tx) => {
      const when = new Date(date);
      const today = new Date();
      const limit = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (when.getTime() > limit.getTime()) {
        throw new Error("DATE_TOO_FAR");
      }
      const np = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date());
      const ny = Number(np.find((p) => p.type === "year")?.value || today.getFullYear());
      const nm = Number(np.find((p) => p.type === "month")?.value || (today.getMonth() + 1));
      const nd = Number(np.find((p) => p.type === "day")?.value || today.getDate());
      const nh = Number(np.find((p) => p.type === "hour")?.value || today.getHours());
      const nmin = Number(np.find((p) => p.type === "minute")?.value || today.getMinutes());
      const nowZurich = new Date(ny, nm - 1, nd, nh, nmin, 0, 0);
      const wp = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(when);
      const wy = Number(wp.find((p) => p.type === "year")?.value || when.getFullYear());
      const wm = Number(wp.find((p) => p.type === "month")?.value || (when.getMonth() + 1));
      const wd = Number(wp.find((p) => p.type === "day")?.value || when.getDate());
      const whh = Number(wp.find((p) => p.type === "hour")?.value || when.getHours());
      const wmm = Number(wp.find((p) => p.type === "minute")?.value || when.getMinutes());
      const whenZurich = new Date(wy, wm - 1, wd, whh, wmm, 0, 0);
      if (whenZurich.getTime() < nowZurich.getTime()) {
        throw new Error("PAST_TIME");
      }
      const service = await tx.service.findUnique({ where: { id: serviceId } });
      if (!service) {
        throw new Error("SERVICE_NOT_FOUND");
      }
      const duration = service.duration ?? 30;
      // Öffnungszeiten prüfen
      const dow = whenZurich.getDay();
      const wh = await tx.workingHours.findUnique({ where: { dayOfWeek: dow } });
      const toMinutes = (hm: string) => {
        const [hh, mm] = hm.split(":").map((x) => Number.parseInt(x, 10));
        if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
        return hh * 60 + mm;
      };
      const zurichMinutes = (d: Date) => {
        const parts = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit" }).formatToParts(d);
        const hh = Number(parts.find((p) => p.type === "hour")?.value || d.getHours());
        const mm = Number(parts.find((p) => p.type === "minute")?.value || d.getMinutes());
        return hh * 60 + mm;
      };
      if (!wh || !wh.isOpen) {
        throw new Error("CLOSED");
      }
      const startMin = toMinutes(wh.startTime);
      const endMin = toMinutes(wh.endTime);
      const timeStr = typeof body?.time === "string" ? body.time : null;
      const [th, tm] = timeStr && /^\d{2}:\d{2}$/.test(timeStr)
        ? timeStr.split(":").map((x: string) => Number.parseInt(x, 10))
        : [whh, wmm];
      const startCandidate = th * 60 + tm;
      const endCandidate = startCandidate + duration;
      if (startCandidate < startMin || endCandidate > endMin) {
        throw new Error("OUT_OF_HOURS");
      }
      if (wh.breakStart && wh.breakEnd) {
        const bs = toMinutes(wh.breakStart);
        const be = toMinutes(wh.breakEnd);
        if (startCandidate < be && endCandidate > bs) {
          throw new Error("BLOCKED");
        }
      }
      const dayStart = new Date(when.getFullYear(), when.getMonth(), when.getDate(), 0, 0, 0, 0);
      const dayEnd = new Date(when.getFullYear(), when.getMonth(), when.getDate(), 23, 59, 59, 999);
      const existing = await tx.booking.findMany({
        where: { status: BookingStatus.BESTAETIGT, date: { gte: dayStart, lte: dayEnd } },
        include: { service: true },
      });
      const overlap = existing.some((b) => {
        const sMin = zurichMinutes(new Date(b.date));
        const eMin = sMin + (b.service?.duration ?? 30);
        return startCandidate < eMin && endCandidate > sMin;
      });
      if (overlap) {
        throw new Error("TOO_SHORT");
      }
      try {
        const blocks = await tx.blockedSlot.findMany({ where: { date: { gte: dayStart, lte: dayEnd } } });
        const overlapsManual = blocks.some((b) => {
          const bs = toMinutes(b.startTime);
          const be = toMinutes(b.endTime);
          return startCandidate < be && endCandidate > bs;
        });
        if (overlapsManual) {
          throw new Error("BLOCKED");
        }
      } catch {}
      // Prüfen, ob Termin in regelmäßiger Pause liegt
      try {
        const breaks = await tx.recurringBreak.findMany({ where: { enabled: true } });
        const overlapsBreak = breaks.some((br) => {
          const bStart = toMinutes(br.startTime);
          const bEnd = toMinutes(br.endTime);
          return startCandidate < bEnd && endCandidate > bStart;
        });
        if (overlapsBreak) {
          throw new Error("BLOCKED");
        }
      } catch {}
      return tx.booking.create({
        data: {
          serviceId,
          date: when,
          clientName,
          clientEmail,
          clientPhone,
          notes,
          status: BookingStatus.BESTAETIGT,
          consent: !!consent,
          marketingConsent: !!marketingConsent,
        },
        include: { service: true },
      });
    });
    const token = created.cancellationToken || randomUUID();
    try {
      await sendBookingConfirmation({ email: created.clientEmail, name: created.clientName, date: new Date(created.date), serviceName: created.service?.name, token });
    } catch (e) {
      console.error("sendBookingConfirmation error", e);
    }
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const url = new URL(req.url);
    const debug = url.searchParams.get("debug") === "true";
    const msg = typeof e === "object" && e !== null && "message" in e ? (e as { message: string }).message : String(e);
    if (msg === "TOO_SHORT") {
      return NextResponse.json({ error: "Wybrany termin jest za krótki dla tej usługi. Proszę wybrać inną godzinę." }, { status: 409 });
    }
    if (msg === "CLOSED" || msg === "OUT_OF_HOURS" || msg === "BLOCKED" || msg === "DATE_TOO_FAR" || msg === "PAST_TIME") {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    if (msg === "SERVICE_NOT_FOUND") {
      return NextResponse.json({ error: "Service nicht gefunden" }, { status: 400 });
    }
    return NextResponse.json(debug ? { error: msg } : { error: "Failed to create booking" }, { status: 500 });
  }
}

export async function DELETE() {
  const c = await cookies();
  const s = c.get("admin_session");
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const res = await prisma.booking.deleteMany({});
    return NextResponse.json({ ok: true, count: res.count }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to delete bookings" }, { status: 500 });
  }
}
