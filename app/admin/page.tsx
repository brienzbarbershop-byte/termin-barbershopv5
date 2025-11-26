import { prisma } from "../../lib/prisma";
import Link from "next/link";
import Progress from "@/components/ui/progress";
export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const dow = now.getDay();
  const startOfWeek = new Date(startOfToday);
  const startOffset = dow === 0 ? -6 : 1 - dow; // Montag als Wochenbeginn
  startOfWeek.setDate(startOfWeek.getDate() + startOffset);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  const todayRows = await prisma.booking.findMany({ where: { date: { gte: startOfToday, lt: endOfToday } }, select: { status: true } });
  const todayCount = todayRows.filter((r) => String(r.status) === "BESTAETIGT" || String(r.status) === "ABGESCHLOSSEN").length;
  const weekRows = await prisma.booking.findMany({ where: { date: { gte: startOfWeek, lt: endOfWeek } }, select: { status: true } });
  const weekCount = weekRows.filter((r) => String(r.status) === "BESTAETIGT" || String(r.status) === "ABGESCHLOSSEN").length;
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthItems = await prisma.booking.findMany({ where: { date: { gte: from, lt: to } }, include: { service: true } });
  const includeStatuses = new Set<string>(["BESTAETIGT", "ABGESCHLOSSEN"]);
  const monthVisits = monthItems.filter((b) => includeStatuses.has(String(b.status))).length;
  const monthRevenue = monthItems.reduce((sum, b) => includeStatuses.has(String(b.status)) ? sum + (b.service?.priceCHF ?? 0) : sum, 0);
  const monthRevenueAbgeschlossen = monthItems.reduce((sum, b) => (String(b.status) === "ABGESCHLOSSEN" ? sum + (b.service?.priceCHF ?? 0) : sum), 0);
  const dayVisits = todayCount;
  const weekVisits = weekCount;
  const emailsSentToday = await prisma.emailLog.count({ where: { sentAt: { gte: startOfToday } } });
  const percent = Math.min(100, Math.round((emailsSentToday / 300) * 100));
  let barColor = "#C5A059";
  if (emailsSentToday >= 290) barColor = "#ef4444";
  else if (emailsSentToday >= 250) barColor = "#f59e0b";
  const dateStr = now.toLocaleDateString("de-CH", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 flex flex-col items-center">
      <div className="text-2xl text-[#C5A059] mb-4 text-center">Willkommen Juan! Heute ist <span className="font-semibold">{dateStr}</span>.</div>
      <div className="text-lg mb-6 text-center">
        Du hast heute <span className="text-[#C5A059] font-semibold">{todayCount}</span> vereinbarte Kundentermine.
        <br />
        Diese Woche erwartest du noch <span className="text-[#C5A059] font-semibold">{weekCount}</span> Besuche.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
        <div className="p-6 rounded-lg border border-[#C5A059] bg-black text-center">
          <div className="text-neutral-300 mb-2">Erbrachte Leistungen (Heute)</div>
          <div className="text-3xl text-[#C5A059] font-semibold">{dayVisits}</div>
        </div>
        <div className="p-6 rounded-lg border border-[#C5A059] bg-black text-center">
          <div className="text-neutral-300 mb-2">Erbrachte Leistungen (Diese Woche)</div>
          <div className="text-3xl text-[#C5A059] font-semibold">{weekVisits}</div>
        </div>
        <div className="p-6 rounded-lg border border-[#C5A059] bg-black text-center">
          <div className="text-neutral-300 mb-2">Erbrachte Leistungen (Monat)</div>
          <div className="text-3xl text-[#C5A059] font-semibold">{monthVisits}</div>
        </div>

        <div className="p-6 rounded-lg border border-[#C5A059] bg-black text-center">
          <div className="text-neutral-300 mb-2">Umsatz (Aktueller Monat – Bestätigt + Abgeschlossen)</div>
          <div className="text-3xl text-[#C5A059] font-semibold">CHF {monthRevenue}</div>
          <div className="mt-2 text-xs text-neutral-400">Zählt <span className="font-semibold">BESTÄTIGT</span> und <span className="font-semibold">ABGESCHLOSSEN</span>; keine potenziellen No‑Shows/Stornierungen, sofern korrekt markiert.</div>
        </div>
        <div className="p-6 rounded-lg border border-[#C5A059] bg-black text-center">
          <div className="text-neutral-300 mb-2">Umsatz (Aktueller Monat – Abgeschlossen)</div>
          <div className="text-3xl text-[#C5A059] font-semibold">CHF {monthRevenueAbgeschlossen}</div>
          <div className="mt-2 text-xs text-neutral-400">Nach manueller Kontrolle tatsächlich erbrachter Leistungen (Status <span className="font-semibold">ABGESCHLOSSEN</span>).</div>
        </div>
        <div className="p-6 rounded-lg border border-[#C5A059] bg-black text-center">
          <div className="text-neutral-300 mb-2">E‑Mail‑Limit (Heute)</div>
          <div className="text-3xl text-[#C5A059] font-semibold">{emailsSentToday} / 300</div>
          <div className="mt-4">
            <Progress value={percent} indicatorColor={barColor} />
          </div>
          <div className="mt-2 text-xs text-neutral-400">Zählt alle heute versendeten E‑Mails (Europe/Zurich).</div>
          {emailsSentToday >= 290 && (
            <div className="mt-2 text-red-500 text-sm">Warnung: Limit fast erreicht</div>
          )}
        </div>
      </div>
      <div className="w-full max-w-5xl mt-8">
        <div className="p-6 rounded-lg border border-[#C5A059] bg-black text-center">
          <Link href="/admin/hours#slot-blocker" className="px-8 py-4 rounded bg-[#C5A059] text-black text-xl font-semibold inline-block">Slot‑Blocker verwalten</Link>
        </div>
      </div>
    </div>
  );
}
