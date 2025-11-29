"use client";
import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { format, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { de } from "date-fns/locale/de";

const DATE_FORMATTER = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" });
const TIME_FORMATTER = new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Zurich" });

type Booking = {
  id: number;
  date: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  status: "BESTAETIGT" | "STORNIERT" | "NO_SHOW" | "ABGESCHLOSSEN";
  notes?: string | null;
  service?: { name: string; priceCHF: number } | null;
};

type Service = { id: number; name: string };

export default function AdminClient({ initial, initialServices }: Readonly<{ initial: Booking[]; initialServices: Service[] }>) {
  const [bookings, setBookings] = useState<Booking[]>(initial);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [filterClient, setFilterClient] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterDateRange, setFilterDateRange] = useState<{ start: string; end: string } | null>(null);
  const [filterService, setFilterService] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "BESTAETIGT" | "STORNIERT" | "NO_SHOW" | "ABGESCHLOSSEN">("ALL");
  const [servicesList] = useState<Service[]>(initialServices);
  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [selectedDayValue, setSelectedDayValue] = useState<string>(() => {
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${m}-${d}`;
  });
  const [dateFilterActive, setDateFilterActive] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const yearsList = useMemo(() => {
    const current = now.getFullYear();
    return [current - 1, current, current + 1];
  }, [now]);

  function generateDaysOfYear(year: number) {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const days = eachDayOfInterval({ start, end });
    return days.map((d) => {
      const value = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const label = format(d, "dd MMM - EEEE", { locale: de });
      return { value, label };
    });
  }

  const daysOptions = useMemo(() => generateDaysOfYear(selectedYear), [selectedYear]);

  useEffect(() => {
    if (!dateFilterActive) return;
    if (selectedYear && selectedDayValue) {
      setFilterDate(`${String(selectedYear)}-${selectedDayValue}`);
      setFilterDateRange(null);
    } else {
      setFilterDate("");
      setFilterDateRange(null);
    }
  }, [selectedYear, selectedDayValue, dateFilterActive]);

  useEffect(() => {
    setBookings(initial);
  }, [initial]);

  const filteredBookings = bookings.filter((b) => {
    const d = new Date(b.date);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const clientHaystack = `${b.clientName} ${b.clientPhone} ${b.clientEmail ?? ""}`.toLowerCase();
    const serviceHaystack = `${b.service?.name ?? ""}`.toLowerCase();
    const passClient = filterClient ? clientHaystack.includes(filterClient.toLowerCase()) : true;
    let passDate = true;
    if (filterDateRange) {
      passDate = dateStr >= filterDateRange.start && dateStr <= filterDateRange.end;
    } else if (filterDate) {
      passDate = dateStr === filterDate;
    }
    const passService = filterService === "ALL" ? true : serviceHaystack === filterService.toLowerCase();
    const passStatus = filterStatus === "ALL" ? true : b.status === filterStatus;
    return passClient && passDate && passService && passStatus;
  });

  const sortedBookings = useMemo(() => {
    const arr = [...filteredBookings];
    arr.sort((a, b) => {
      const ad = new Date(a.date).getTime();
      const bd = new Date(b.date).getTime();
      return sortOrder === "ASC" ? ad - bd : bd - ad;
    });
    return arr;
  }, [filteredBookings, sortOrder]);

  return (
    <div className="md:overflow-x-auto overflow-x-hidden">
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-neutral-900 border border-[#C5A059] text-white shadow-2xl">
          {toastMessage}
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input
            className="px-3 py-2 rounded bg-black border border-neutral-700 text-white"
            placeholder="Kunde suchen..."
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 rounded bg-black border border-neutral-700 text-white"
          value={String(selectedYear)}
          onChange={(e) => {
            const y = Number.parseInt(e.target.value, 10);
            const mm = String(now.getMonth() + 1).padStart(2, "0");
            const dd = String(now.getDate()).padStart(2, "0");
            const candidate = `${mm}-${dd}`;
            const opts = generateDaysOfYear(y);
            const exists = opts.some((o) => o.value === candidate);
            setSelectedYear(y);
            setSelectedDayValue(exists ? candidate : opts[0]?.value ?? "01-01");
            setDateFilterActive(true);
          }}
        >
          {yearsList.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
        <select
          className="px-3 py-2 rounded bg-black border border-neutral-700 text-white w-64 md:w-96"
          value={selectedDayValue}
          onChange={(e) => { setSelectedDayValue(e.target.value); setDateFilterActive(true); }}
        >
          {daysOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          className="px-3 py-2 rounded bg-black border border-neutral-700 text-white"
          value={filterService}
          onChange={(e) => setFilterService(e.target.value)}
        >
          <option value="ALL">Alle Services</option>
          {servicesList.map((s) => (
            <option key={s.id} value={s.name.toLowerCase()}>{s.name}</option>
          ))}
        </select>
        <select
          className="px-3 py-2 rounded bg-black border border-neutral-700 text-white"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "ALL" | "BESTAETIGT" | "STORNIERT" | "NO_SHOW" | "ABGESCHLOSSEN")}
        >
          <option value="ALL">Alle</option>
          <option value="BESTAETIGT">Bestätigt</option>
          <option value="STORNIERT">Storniert</option>
          <option value="ABGESCHLOSSEN">Abgeschlossen</option>
          <option value="NO_SHOW">No Show</option>
        </select>
        <select
          className="px-3 py-2 rounded bg-black border border-neutral-700 text-white"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "ASC" | "DESC")}
        >
          <option value="DESC">Datum ↓</option>
          <option value="ASC">Datum ↑</option>
        </select>
        <button
          className="px-3 py-2 rounded border border-neutral-700 text-white"
          onClick={() => {
            setFilterClient("");
            setFilterDate("");
            setFilterDateRange(null);
            setFilterService("ALL");
            setFilterStatus("ALL");
            setSortOrder("DESC");
            const cy = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, "0");
            const d = String(now.getDate()).padStart(2, "0");
            setSelectedYear(cy);
            setSelectedDayValue(`${m}-${d}`);
            setDateFilterActive(false);
          }}
        >
          Alle anzeigen
        </button>
        <button
          className="px-3 py-2 rounded border border-neutral-700 text-white"
          onClick={() => {
            const today = new Date();
            const cy = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, "0");
            const d = String(today.getDate()).padStart(2, "0");
            setSelectedYear(cy);
            setSelectedDayValue(`${m}-${d}`);
            setFilterDate(`${cy}-${m}-${d}`);
            setFilterDateRange(null);
          }}
        >
          Heute
        </button>
        <button
          className="px-3 py-2 rounded border border-neutral-700 text-white"
          onClick={() => {
            const today = new Date();
            const start = startOfWeek(today, { weekStartsOn: 1 });
            const end = endOfWeek(today, { weekStartsOn: 1 });
            const toStr = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
            setFilterDate("");
            setFilterDateRange({ start: toStr(start), end: toStr(end) });
            setSortOrder("ASC");
          }}
        >
          Woche
        </button>
      </div>
      <div className="mx-0">
        <table className="min-w-full border border-[#C5A059] bg-black">
          <thead className="bg-neutral-900">
            <tr>
              <th className="px-4 py-2 text-left text-[#C5A059]">Datum</th>
              <th className="px-4 py-2 text-left text-[#C5A059]">Zeit</th>
              <th className="px-4 py-2 text-left text-[#C5A059]">Kunde</th>
              <th className="px-4 py-2 text-left text-[#C5A059] hidden md:table-cell">Service</th>
              <th className="px-4 py-2 text-left text-[#C5A059] hidden md:table-cell">Status</th>
              <th className="px-4 py-2 text-left text-[#C5A059] hidden md:table-cell">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {sortedBookings.map((b) => {
              const d = new Date(b.date);
              const datum = DATE_FORMATTER.format(d);
              const zeit = TIME_FORMATTER.format(d);
              return (
                <tr
                  key={b.id}
                  className="border-t border-neutral-800 md:cursor-default cursor-pointer"
                  onClick={() => { if (typeof globalThis !== "undefined" && globalThis.innerWidth < 768) { setSelectedBooking(b); setIsDialogOpen(true); setIsCancelConfirmOpen(false); } }}
                >
                  <td className="px-4 py-2">{datum}</td>
                  <td className="px-4 py-2">{zeit}</td>
                  <td className="px-4 py-2">
                    <div className="hidden md:block">{b.clientName} – {b.clientPhone}</div>
                    <div className="block md:hidden">
                      <div className="leading-tight break-words">{b.clientName}</div>
                      <div className="leading-tight break-words text-neutral-300">{b.clientPhone}</div>
                    </div>
                  </td>
                  <td className="px-4 py-2 hidden md:table-cell">{b.service?.name}</td>
                  <td className="px-4 py-2 hidden md:table-cell">
                    {b.status === "BESTAETIGT" && (
                      <span className="inline-block px-2 py-1 rounded bg-green-900 text-green-100 text-xs">Bestätigt</span>
                    )}
                    {b.status === "ABGESCHLOSSEN" && (
                      <span className="inline-block px-2 py-1 rounded bg-neutral-700 text-neutral-300 text-xs">Abgeschlossen</span>
                    )}
                    {b.status === "STORNIERT" && (
                      <span className="inline-block px-2 py-1 rounded bg-red-900 text-red-100 text-xs">Storniert</span>
                    )}
                    {b.status === "NO_SHOW" && (
                      <span className="inline-block px-2 py-1 rounded bg-orange-900 text-orange-100 text-xs">No Show</span>
                    )}
                  </td>
                  <td className="px-4 py-2 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <button
                        className="flex items-center px-3 py-1 rounded text-[#C5A059] hover:bg-neutral-800 hover:text-[#d6b064]"
                        aria-label="Verwalten"
                        onClick={() => { setSelectedBooking(b); setIsDialogOpen(true); setIsCancelConfirmOpen(false); }}
                      >
                        <Pencil className="w-4 h-4 mr-2" /> Verwalten
                      </button>
                      <button
                        className="px-3 py-1 rounded border border-neutral-700 text-white hover:bg-neutral-800 disabled:opacity-50"
                        disabled={b.status !== "BESTAETIGT"}
                        onClick={async () => {
                          const r = await fetch(`/api/bookings/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "ABGESCHLOSSEN" }) });
                          if (r.ok) {
                            setBookings((prev) => prev.map((p) => p.id === b.id ? { ...p, status: "ABGESCHLOSSEN" } : p));
                            setToastMessage("Als abgeschlossen markiert");
                            setTimeout(() => setToastMessage(null), 3000);
                          }
                        }}
                      >
                        Abschließen
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

            {isDialogOpen && selectedBooking && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="w-full max-w-lg p-6 rounded-lg border border-[#C5A059] bg-neutral-950">
                  <div className={isCancelConfirmOpen ? "text-xl text-red-500 mb-4" : "text-xl text-[#C5A059] mb-4"}>
                    {isCancelConfirmOpen ? "Stornierung bestätigen" : "Buchungsdetails"}
                  </div>
                  {isCancelConfirmOpen ? (
                    <div className="text-white space-y-3">
                <div>
                  Möchten Sie den Termin des Kunden <span className="font-semibold">{selectedBooking.clientName}</span> am <span className="font-semibold">{DATE_FORMATTER.format(new Date(selectedBooking.date))}</span> um <span className="font-semibold">{TIME_FORMATTER.format(new Date(selectedBooking.date))}</span> wirklich stornieren?
                </div>
                <div>Diese Aktion ist unwiderruflich.</div>
              </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 text-white">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-neutral-400">Kunde</div>
                  <div>{selectedBooking.clientName}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-neutral-400">Telefon</div>
                  <div>{selectedBooking.clientPhone}</div>
                </div>
                {selectedBooking.clientEmail && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-neutral-400">E‑Mail</div>
                    <div>{selectedBooking.clientEmail}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-neutral-400">Datum</div>
                  <div>{DATE_FORMATTER.format(new Date(selectedBooking.date))}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-neutral-400">Zeit</div>
                  <div>{TIME_FORMATTER.format(new Date(selectedBooking.date))}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-neutral-400">Service</div>
                  <div>{selectedBooking.service?.name}</div>
                </div>
                {selectedBooking.service?.priceCHF !== undefined && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-neutral-400">Preis</div>
                    <div>{selectedBooking.service?.priceCHF} CHF</div>
                  </div>
                )}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-neutral-400">Status</div>
                        <div><span className="inline-block px-2 py-1 rounded bg-neutral-800 text-green-400 text-xs">Bestätigt</span></div>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="text-neutral-400">Kundenhinweise</div>
                        <div className={selectedBooking.notes ? "bg-neutral-900 p-3 border border-neutral-800 italic" : "text-neutral-400"}>
                          {selectedBooking.notes ? selectedBooking.notes : "Keine Hinweise"}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-6">
                    {isCancelConfirmOpen ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button className="aspect-square flex items-center justify-center text-center md:text-base text-sm rounded border border-neutral-700 bg-white text-black" onClick={() => setIsCancelConfirmOpen(false)}>Zurück</button>
                        <button
                          className="aspect-square flex items-center justify-center text-center md:text-base text-sm rounded bg-red-600 text-white"
                          onClick={async () => {
                            if (!selectedBooking) return;
                            const r = await fetch(`/api/bookings/${selectedBooking.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "STORNIERT" }) });
                            if (r.ok) {
                              setIsDialogOpen(false);
                              setIsCancelConfirmOpen(false);
                              setBookings((prev) => prev.map((p) => p.id === selectedBooking.id ? { ...p, status: "STORNIERT" } : p));
                              setSelectedBooking(null);
                              setToastMessage("Termin storniert");
                              setTimeout(() => setToastMessage(null), 3000);
                            }
                          }}
                        >
                          Endgültig stornieren
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          className="aspect-square flex items-center justify-center text-center md:text-base text-sm rounded bg-red-600 text-white disabled:opacity-50"
                          disabled={selectedBooking?.status !== "BESTAETIGT"}
                          onClick={() => setIsCancelConfirmOpen(true)}
                        >
                          Termin stornieren
                        </button>
                        <button
                          className="aspect-square flex items-center justify-center text-center md:text-base text-sm rounded bg-neutral-700 text-white hover:bg-neutral-600"
                          onClick={async () => {
                            if (!selectedBooking) return;
                            const r = await fetch(`/api/bookings/${selectedBooking.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "NO_SHOW" }) });
                            if (r.ok) {
                              setIsDialogOpen(false);
                              setBookings((prev) => prev.map((p) => p.id === selectedBooking.id ? { ...p, status: "NO_SHOW" } : p));
                              setSelectedBooking(null);
                              setToastMessage("No Show markiert");
                              setTimeout(() => setToastMessage(null), 3000);
                            }
                          }}
                        >
                          NO SHOW
                        </button>
                        <button
                          className="aspect-square flex items-center justify-center text-center md:text-base text-sm rounded bg-black text-white border border-neutral-700 hover:bg-neutral-900 disabled:opacity-50"
                          disabled={selectedBooking?.status !== "BESTAETIGT"}
                          onClick={async () => {
                            if (!selectedBooking) return;
                            const r = await fetch(`/api/bookings/${selectedBooking.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "ABGESCHLOSSEN" }) });
                            if (r.ok) {
                              setIsDialogOpen(false);
                              setBookings((prev) => prev.map((p) => p.id === selectedBooking.id ? { ...p, status: "ABGESCHLOSSEN" } : p));
                              setSelectedBooking(null);
                              setToastMessage("Als abgeschlossen markiert");
                              setTimeout(() => setToastMessage(null), 3000);
                            }
                          }}
                        >
                          Abschließen
                        </button>
                        <button className="aspect-square flex items-center justify-center text-center md:text-base text-sm rounded border border-neutral-700 bg-white text-black" onClick={() => { setIsDialogOpen(false); setSelectedBooking(null); }}>Zurück</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
    </div>
  );
}
