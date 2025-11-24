import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

async function requireAdmin() {
  const c = await cookies();
  const s = c.get("admin_session");
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth) return auth;
  const hours = await prisma.workingHours.findMany({ orderBy: { dayOfWeek: "asc" } });
  return NextResponse.json(hours);
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  try {
    const items = await req.json();
    console.log("HOURS UPDATE INPUT:", items);
    if (!Array.isArray(items)) return NextResponse.json({ error: "Payload must be an array" }, { status: 400 });
    for (const day of items) {
      await prisma.workingHours.upsert({
        where: { dayOfWeek: day.dayOfWeek },
        update: { isOpen: day.isOpen, startTime: day.startTime, endTime: day.endTime },
        create: { dayOfWeek: day.dayOfWeek, isOpen: day.isOpen, startTime: day.startTime, endTime: day.endTime },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("HOURS UPDATE ERROR:", e);
    const msg = typeof e === "object" && e !== null && "message" in e ? (e as { message: string }).message : "Failed to update working hours";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
