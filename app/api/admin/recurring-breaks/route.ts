import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const items = await prisma.recurringBreak.findMany({ orderBy: { id: "asc" } });
    return NextResponse.json(items, { status: 200 });
  } catch {
    try {
      const rows = await prisma.$queryRaw<{ id: number; name: string; startTime: string; endTime: string; enabled: boolean }[]>`
        SELECT id, name, "startTime", "endTime", enabled FROM "RecurringBreak" ORDER BY id ASC
      `;
      return NextResponse.json(rows, { status: 200 });
    } catch (e) {
      const msg = typeof e === "object" && e !== null && "message" in e ? (e as { message: string }).message : String(e);
      return NextResponse.json({ error: msg || "Failed to load breaks" }, { status: 500 });
    }
  }
}

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as { items: { name: string; start: string; end: string; enabled: boolean }[] };
    const items = Array.isArray(data.items) ? data.items : [];
    try {
      await prisma.$transaction(async (tx) => {
        await tx.recurringBreak.deleteMany({});
        for (const it of items) {
          await tx.recurringBreak.create({ data: { name: it.name, startTime: it.start, endTime: it.end, enabled: !!it.enabled } });
        }
      });
    } catch {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`DELETE FROM "RecurringBreak"`;
        for (const it of items) {
          await tx.$executeRaw`INSERT INTO "RecurringBreak" (name, "startTime", "endTime", enabled) VALUES (${it.name}, ${it.start}, ${it.end}, ${it.enabled})`;
        }
      });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const msg = typeof e === "object" && e !== null && "message" in e ? (e as { message: string }).message : String(e);
    return NextResponse.json({ error: msg || "Failed to save breaks" }, { status: 500 });
  }
}
