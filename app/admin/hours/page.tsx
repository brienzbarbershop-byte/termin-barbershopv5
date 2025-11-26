import { prisma } from "../../../lib/prisma";
import HoursClient from "./HoursClient";

export const dynamic = "force-dynamic";

export default async function AdminHours() {
  const hours = await prisma.workingHours.findMany({ orderBy: { dayOfWeek: "asc" } });
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const blocks = await prisma.blockedSlot.findMany({ where: { date: { gte: start } }, orderBy: { date: "asc" } });
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 space-y-6">
      <HoursClient initial={hours} initialBlocks={blocks.map((b) => ({ id: b.id, date: b.date.toISOString(), startTime: b.startTime, endTime: b.endTime, reason: b.reason }))} />
    </div>
  );
}
