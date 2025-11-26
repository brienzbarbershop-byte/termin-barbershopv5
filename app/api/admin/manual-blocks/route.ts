import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

function parseDateParam(dateStr: string | null): { start: Date; end: Date } | null {
  if (!dateStr) return null;
  const day = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(day.getTime())) return null;
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
  return { start, end };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const range = parseDateParam(dateStr);
    const where = range ? { date: { gte: range.start, lte: range.end } } : undefined;
    const items = await prisma.blockedSlot.findMany({ where, orderBy: { date: "asc" } });
    return NextResponse.json(items, { status: 200 });
  } catch (e) {
    const msg = typeof e === "object" && e !== null && "message" in e ? (e as { message: string }).message : String(e);
    return NextResponse.json({ error: msg || "Failed to load manual blocks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, start, end, reason } = body as { date: string; start: string; end: string; reason?: string };
    if (!date || !start || !end) return NextResponse.json({ error: "invalid input" }, { status: 400 });
    const day = new Date(date);
    if (Number.isNaN(day.getTime())) return NextResponse.json({ error: "invalid date" }, { status: 400 });
    const created = await prisma.blockedSlot.create({ data: { date: day, startTime: start, endTime: end, reason } });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const msg = typeof e === "object" && e !== null && "message" in e ? (e as { message: string }).message : String(e);
    return NextResponse.json({ error: msg || "Failed to create manual block" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    const id = idStr ? Number.parseInt(idStr, 10) : NaN;
    if (!id || Number.isNaN(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
    await prisma.blockedSlot.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const msg = typeof e === "object" && e !== null && "message" in e ? (e as { message: string }).message : String(e);
    return NextResponse.json({ error: msg || "Failed to delete manual block" }, { status: 500 });
  }
}
