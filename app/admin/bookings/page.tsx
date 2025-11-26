import { prisma } from "../../../lib/prisma";
export const dynamic = "force-dynamic";
import AdminClient from "../AdminClient";

export default async function AdminBookings() {
  const raw = await prisma.booking.findMany({ include: { service: true }, orderBy: { date: "desc" } });
  const bookings = raw.map((b) => ({
    id: b.id,
    date: b.date.toISOString(),
    clientName: b.clientName,
    clientPhone: b.clientPhone,
    clientEmail: b.clientEmail ?? undefined,
    status: (b as unknown as { status?: "BESTAETIGT" | "STORNIERT" | "NO_SHOW" | "ABGESCHLOSSEN" }).status ?? "BESTAETIGT",
    notes: (b as unknown as { notes?: string | null }).notes ?? null,
    service: b.service ? { name: b.service.name, priceCHF: b.service.priceCHF } : null,
  }));
  const services = await prisma.service.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 md:px-8 px-0 py-8">
      <h1 className="text-2xl text-[#C5A059] mb-6">Buchungen</h1>
      <AdminClient initial={bookings} initialServices={services} />
    </div>
  );
}
