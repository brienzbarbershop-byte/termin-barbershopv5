import { prisma } from "../../../../lib/prisma";
import CancelButton from "../CancelButton";
import Link from "next/link";

function fmt(d: Date) {
  const datum = d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" });
  const zeit = d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Zurich" }).replace(".", ":");
  return { datum, zeit };
}

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rows = (await prisma.$queryRaw<{ id: number; date: Date; status: string; service_name: string | null; price_chf: number | null }[]>`
    SELECT b.id, b.date, b.status, s.name as service_name, s."priceCHF" as price_chf
    FROM "Booking" b LEFT JOIN "Service" s ON s.id = b."serviceId"
    WHERE b."cancellationToken" = ${token} LIMIT 1
  `) || [];
  const booking = rows[0];
  if (!booking) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md p-6 rounded-lg border border-[#C5A059] bg-black">
          <div className="text-[#C5A059] text-xl mb-3">Ungültiger Link</div>
          <Link href="/" className="px-4 py-2 inline-block rounded bg-[#C5A059] text-black">Zur Startseite</Link>
        </div>
      </div>
    );
  }
  if (booking.status === "STORNIERT") {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md p-6 rounded-lg border border-[#C5A059] bg-black">
          <div className="text-[#C5A059] text-xl mb-3">Dieser Termin wurde bereits storniert</div>
          <Link href="/" className="px-4 py-2 inline-block rounded bg-[#C5A059] text-black">Zur Startseite</Link>
        </div>
      </div>
    );
  }
  const { datum, zeit } = fmt(new Date(booking.date));
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md p-6 rounded-lg border border-[#C5A059] bg-black">
        <div className="text-[#C5A059] text-xl mb-4">Ihre Buchung</div>
        <div className="space-y-2 mb-6">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-neutral-400">Datum</div>
            <div>{datum}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-neutral-400">Zeit</div>
            <div>{zeit}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-neutral-400">Leistung</div>
            <div>{booking.service_name}</div>
          </div>
          {booking.price_chf !== null && (
            <div className="grid grid-cols-2 gap-2">
              <div className="text-neutral-400">Preis</div>
              <div>{booking.price_chf} CHF</div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <CancelButton token={token} />
          <Link href="/" className="px-4 py-2 rounded bg-[#C5A059] text-black">Neuen Termin buchen</Link>
        </div>
      </div>
    </div>
  );
}
