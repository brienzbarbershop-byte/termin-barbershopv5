import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if (auth) return auth;
  const hours = await prisma.workingHours.findMany({ orderBy: { dayOfWeek: "asc" } });
  return NextResponse.json(hours);
}

// PUT unchanged auth usage

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  try {
    const body = await request.json();
    console.log("Otrzymane godziny:", JSON.stringify(body, null, 2));
    const items = Array.isArray(body) ? body : body.items;
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Nieprawidłowy format danych (oczekiwano tablicy)" }, { status: 400 });
    }

    type WHInput = {
      dayOfWeek: number | string;
      isOpen: boolean | string;
      startTime?: string | null;
      endTime?: string | null;
      breakStart?: string | null;
      breakEnd?: string | null;
    };
    const list: WHInput[] = items as WHInput[];
    const valid = list
      .filter((x) => Number.isFinite(Number(x.dayOfWeek)))
      .map((x) => {
        const day = Number(x.dayOfWeek);
        const isOpen = Boolean(x.isOpen);
        const toTime = (v: unknown, fallback: string) => {
          const s = typeof v === "string" ? v : undefined;
          return s && /^\d{2}:\d{2}$/.test(s) ? s : fallback;
        };
        const startTime = toTime(x.startTime, "09:00");
        const endTime = toTime(x.endTime, "18:00");
        const bs = typeof x.breakStart === "string" && /^\d{2}:\d{2}$/.test(x.breakStart) ? x.breakStart : null;
        const be = typeof x.breakEnd === "string" && /^\d{2}:\d{2}$/.test(x.breakEnd) ? x.breakEnd : null;
        const breakStart = bs && be ? bs : null;
        const breakEnd = bs && be ? be : null;
        return { dayOfWeek: day, isOpen, startTime, endTime, breakStart, breakEnd };
      });

    const toMinutes = (hm: string) => { const [hh, mm] = hm.split(":").map((x) => Number.parseInt(x, 10)); return hh * 60 + mm; };
    const invalid = valid.some((v) => v.isOpen && toMinutes(String(v.startTime)) >= toMinutes(String(v.endTime)));
    if (invalid) {
      return NextResponse.json({ error: "Die Öffnungszeit muss früher als die Schließzeit sein" }, { status: 400 });
    }

    const now = new Date();
    const bookings = await prisma.booking.findMany({ where: { date: { gt: now } } });
    const conflicts: { clientName: string; date: string; time: string; phone: string; email: string }[] = [];
    const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    for (const b of bookings) {
      const d = new Date(b.date);
      const wdStr = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Zurich", weekday: "short" }).format(d);
      const wd = weekdayMap[wdStr];
      const timeStr = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
      const dateStr = new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
      const rule = valid.find((x) => Number(x?.dayOfWeek) === wd);
      if (rule) {
        const isOpen = Boolean(rule.isOpen);
        const startTime = String(rule.startTime ?? "09:00");
        const endTime = String(rule.endTime ?? "18:00");
        if (isOpen) {
          const t = timeStr;
          const inRange = t >= startTime && t <= endTime;
          if (!inRange) {
            conflicts.push({ clientName: b.clientName, date: dateStr, time: timeStr, phone: b.clientPhone, email: b.clientEmail });
          }
        } else {
          conflicts.push({ clientName: b.clientName, date: dateStr, time: timeStr, phone: b.clientPhone, email: b.clientEmail });
        }
      }
    }
    if (conflicts.length > 0) {
      return NextResponse.json({ conflicts }, { status: 409 });
    }

    await prisma.$transaction(
      valid.map((day) =>
        prisma.workingHours.upsert({
          where: {
            dayOfWeek: Number(day.dayOfWeek),
          },
          update: {
            isOpen: Boolean(day.isOpen),
            startTime: String(day.startTime || "09:00"),
            endTime: String(day.endTime || "18:00"),
            breakStart: day.breakStart ? String(day.breakStart) : null,
            breakEnd: day.breakEnd ? String(day.breakEnd) : null,
          },
          create: {
            dayOfWeek: Number(day.dayOfWeek),
            isOpen: Boolean(day.isOpen),
            startTime: String(day.startTime || "09:00"),
            endTime: String(day.endTime || "18:00"),
            breakStart: day.breakStart ? String(day.breakStart) : null,
            breakEnd: day.breakEnd ? String(day.breakEnd) : null,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Błąd zapisu godzin:", error);
    const msg = typeof error === "object" && error !== null && "message" in (error as Record<string, unknown>)
      ? String((error as { message?: unknown }).message)
      : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
