import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/auth";

// auth handled via shared util

export async function GET() {
  const auth = await requireAdmin();
  if (auth) return auth;
  const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(services);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const body = await req.json();
  const { name, priceCHF, duration } = body;
  if (!name || typeof priceCHF !== "number") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const created = await prisma.service.create({ data: { name, priceCHF, duration: typeof duration === "number" ? duration : 30 } });
  return NextResponse.json(created, { status: 201 });
}
