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
