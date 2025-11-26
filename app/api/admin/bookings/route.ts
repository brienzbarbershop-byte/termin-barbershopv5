import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/auth";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;
  const url = new URL(req.url);
  const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = Number.parseInt(url.searchParams.get("pageSize") || "50", 10);
  const take = Math.min(Math.max(pageSize, 1), 200);
  const skip = Math.max((page - 1) * take, 0);
  const bookings = await prisma.booking.findMany({
    include: { service: true },
    orderBy: { date: "desc" },
    take,
    skip,
  });
  return NextResponse.json(bookings);
}
