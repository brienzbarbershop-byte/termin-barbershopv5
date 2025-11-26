import { NextResponse, NextRequest } from "next/server";
import { BookingStatus } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const p = await params; const id = Number(p.id);
  try {
    await prisma.booking.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const { id } = await context.params;
  const idNum = Number(id);
  try {
    const body = await req.json();
    const debugToken = new URL(req.url).searchParams.get("debugToken") === "true";
    if (!body || typeof body.status !== "string") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    if (body.status !== "STORNIERT" && body.status !== "BESTAETIGT" && body.status !== "NO_SHOW" && body.status !== "ABGESCHLOSSEN") {
      return NextResponse.json({ error: "Unsupported status" }, { status: 400 });
    }
    const status = body.status as BookingStatus;
    const updated = await prisma.booking.update({ where: { id: idNum }, data: { status } });
    if (debugToken) {
      try {
        const rows = (await prisma.$queryRaw<{ cancellationToken: string | null }[]>`
          SELECT "cancellationToken" FROM "Booking" WHERE id = ${idNum} LIMIT 1
        `) || [];
        return NextResponse.json({ ...updated, cancellationToken: rows[0]?.cancellationToken ?? null }, { status: 200 });
      } catch {}
    }
    return NextResponse.json(updated, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
