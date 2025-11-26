import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireAdmin } from "../../../lib/auth";

// shared auth util

export async function GET() {
  try {
    const items = await prisma.service.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(items);
  } catch (e) {
    console.error("/api/services GET failed", e);
    return NextResponse.json({ error: "Service konnte nicht geladen werden" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  try {
    const body = await req.json();
    const { name, priceCHF, duration } = body;
    if (!name || typeof priceCHF !== "number") {
      return NextResponse.json({ error: "Erforderliche Felder fehlen" }, { status: 400 });
    }
    if (typeof duration === "number" && duration % 15 !== 0) {
      return NextResponse.json({ error: "Dauer muss ein Vielfaches von 15 Minuten sein" }, { status: 400 });
    }
    const created = await prisma.service.create({ data: { name, priceCHF, duration: typeof duration === "number" ? duration : 30 } });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Service konnte nicht hinzugefügt werden" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  try {
    const body = await req.json();
    const { id, name, priceCHF, duration } = body;
    const serviceId = Number(id);
    if (!serviceId || !name || typeof priceCHF !== "number") {
      return NextResponse.json({ error: "Erforderliche Felder fehlen" }, { status: 400 });
    }
    if (typeof duration === "number" && duration % 15 !== 0) {
      return NextResponse.json({ error: "Dauer muss ein Vielfaches von 15 Minuten sein" }, { status: 400 });
    }
    const updated = await prisma.service.update({ where: { id: serviceId }, data: { name, priceCHF, duration: typeof duration === "number" ? duration : 30 } });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Service konnte nicht aktualisiert werden" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  try {
    const url = new URL(req.url);
    const idFromQuery = url.searchParams.get("id");
    let idNum: number | null = null;
    if (idFromQuery) {
      idNum = Number(idFromQuery);
    } else {
      try {
        const body = await req.json();
        if (body && ("id" in body)) idNum = Number(body.id);
      } catch {
        idNum = null;
      }
    }
    if (!idNum) {
      return NextResponse.json({ error: "ID fehlt" }, { status: 400 });
    }
    await prisma.service.delete({ where: { id: idNum } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Service konnte nicht gelöscht werden" }, { status: 500 });
  }
}
