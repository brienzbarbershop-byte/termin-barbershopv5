import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/auth";

// shared auth util

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const p = await params; const id = Number(p.id);
  const body = await req.json();
  const { name, priceCHF, duration } = body;
  const updated = await prisma.service.update({ where: { id }, data: { name, priceCHF, duration } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const p = await params; const id = Number(p.id);
  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
