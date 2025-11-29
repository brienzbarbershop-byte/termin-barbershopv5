import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

const toMinutes = (hm: string) => { const [hh, mm] = hm.split(":").map((x) => Number.parseInt(x, 10)); return hh * 60 + mm; };
function makeDateTime(ds: string, ts: string): Date {
  const base = new Date(ds);
  const [hh, mm] = ts.split(":").map((x) => Number.parseInt(x, 10));
  if (Number.isNaN(base.getTime()) || Number.isNaN(hh) || Number.isNaN(mm)) return new Date(Number.NaN);
  const dt = new Date(base);
  dt.setHours(hh, mm, 0, 0);
  return dt;
}
function dayRange(dt: Date) {
  return { start: new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()), end: new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1) };
}
async function hasOverlap(curDay: Date, st: string, et: string) {
  const { start, end } = dayRange(curDay);
  const existing = await prisma.blockedSlot.findMany({ where: { date: { gte: start, lt: end } } });
  const sMin = toMinutes(st);
  const eMin = toMinutes(et);
  return existing.some((r: typeof existing[number]) => {
    const rs = toMinutes(r.startTime);
    const re = toMinutes(r.endTime);
    return sMin < re && eMin > rs;
  });
}

export async function GET() {
  try {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const items = await prisma.blockedSlot.findMany({ where: { date: { gte: start } }, orderBy: { date: "asc" } });
    return NextResponse.json(items, { status: 200 });
  } catch (e) {
    const msg = typeof e === "object" && e !== null && "message" in e ? (e as { message: string }).message : String(e);
    return NextResponse.json({ error: msg || "Failed to load blocked slots" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { date, startTime, endTime, endDate, reason } = (await req.json()) as { date: string; startTime: string; endTime: string; endDate?: string; reason?: string };
    const d = new Date(date);
    if (!date || Number.isNaN(d.getTime()) || !startTime || !endTime) {
      return NextResponse.json({ error: "invalid input" }, { status: 400 });
    }
    
    
    if (endDate) {
      const ed = new Date(endDate);
      if (Number.isNaN(ed.getTime())) {
        return NextResponse.json({ error: "invalid input" }, { status: 400 });
      }
      const startDT = makeDateTime(date, startTime);
      const endDT = makeDateTime(endDate, endTime);
      if (endDT.getTime() <= startDT.getTime()) {
        return NextResponse.json({ error: "Startzeit muss vor der Endzeit liegen" }, { status: 400 });
      }
      const results: unknown[] = [];
      const cur = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const endDay = new Date(ed.getFullYear(), ed.getMonth(), ed.getDate());
      while (cur.getTime() <= endDay.getTime()) {
        const isFirst = cur.getFullYear() === d.getFullYear() && cur.getMonth() === d.getMonth() && cur.getDate() === d.getDate();
        const isLast = cur.getFullYear() === ed.getFullYear() && cur.getMonth() === ed.getMonth() && cur.getDate() === ed.getDate();
        const st = isFirst ? startTime : "00:00";
        const et = isLast ? endTime : "23:59";
        const overlap = await hasOverlap(cur, st, et);
        if (overlap) {
          return NextResponse.json({ error: "Zeit überschneidet sich mit bestehender Sperre" }, { status: 409 });
        }
        // jeśli jednostkowy dzień i st>=et, już zwrócono błąd; dla środkowych dni 00:00–23:59
        const created = await prisma.blockedSlot.create({ data: { date: new Date(cur), startTime: st, endTime: et, reason } });
        results.push(created);
        cur.setDate(cur.getDate() + 1);
      }
      return NextResponse.json(results, { status: 201 });
    } else {
      if (toMinutes(startTime) >= toMinutes(endTime)) {
        return NextResponse.json({ error: "Startzeit muss vor der Endzeit liegen" }, { status: 400 });
      }
      const overlap = await hasOverlap(d, startTime, endTime);
      if (overlap) {
        return NextResponse.json({ error: "Zeit überschneidet sich mit bestehender Sperre" }, { status: 409 });
      }
      const created = await prisma.blockedSlot.create({ data: { date: d, startTime, endTime, reason } });
      return NextResponse.json(created, { status: 201 });
    }
  } catch (e) {
    const msg = typeof e === "object" && e !== null && "message" in e ? (e as { message: string }).message : String(e);
    return NextResponse.json({ error: msg || "Failed to create blocked slot" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    const id = idStr ? Number.parseInt(idStr, 10) : Number.NaN;
    if (!id || Number.isNaN(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
    await prisma.blockedSlot.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const msg = typeof e === "object" && e !== null && "message" in e ? (e as { message: string }).message : String(e);
    return NextResponse.json({ error: msg || "Failed to delete blocked slot" }, { status: 500 });
  }
}
