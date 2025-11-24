import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

async function requireAdmin() {
  const c = await cookies();
  const s = c.get("admin_session");
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const id = Number(params.id);
  const body = await req.json();
  const { name, priceCHF, duration } = body;
  const updated = await prisma.service.update({ where: { id }, data: { name, priceCHF, duration } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const id = Number(params.id);
  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
