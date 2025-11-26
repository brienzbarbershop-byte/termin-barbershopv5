import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if (auth) return auth;
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const parts = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")?.value || now.getFullYear());
  const m = Number(parts.find((p) => p.type === "month")?.value || (now.getMonth() + 1));
  const d = Number(parts.find((p) => p.type === "day")?.value || now.getDate());
  const startOfToday = new Date(y, m - 1, d, 0, 0, 0, 0);
  try {
    const items = await prisma.booking.findMany({
      where: { date: { gte: from, lt: to } },
      include: { service: true },
    });
    const includeStatus = new Set<string>(["BESTAETIGT", "ABGESCHLOSSEN"]);
    const visits = items.filter((b) => includeStatus.has(b.status)).length;
    const revenue = items.reduce((sum, b) => {
      if (includeStatus.has(b.status)) return sum + (b.service?.priceCHF ?? 0);
      return sum;
    }, 0);
    const emailsSentToday = await prisma.emailLog.count({ where: { sentAt: { gte: startOfToday } } });
    return NextResponse.json({ monthRevenue: revenue, monthVisits: visits, emailsSentToday }, { status: 200 });
  } catch {
    return NextResponse.json({ monthRevenue: 0, monthVisits: 0, emailsSentToday: 0 }, { status: 200 });
  }
}
