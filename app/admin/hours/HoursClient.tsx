"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type WH = { id?: number; dayOfWeek: number; startTime: string; endTime: string; isOpen: boolean; breakStart?: string | null; breakEnd?: string | null };
type WHMap = Record<number, WH>;


function timeOptions(): string[] {
  const list: string[] = [];
  const start = new Date();
  start.setHours(6, 0, 0, 0);
  for (let i = 0; i < (16 * 2 + 1); i++) {
    const h = start.getHours().toString().padStart(2, "0");
    const m = start.getMinutes().toString().padStart(2, "0");
    list.push(`${h}:${m}`);
    start.setMinutes(start.getMinutes() + 30);
  }
  return list;
}

export default function HoursClient({ initial, initialBlocks }: Readonly<{ initial: WH[]; initialBlocks?: { id: number; date: string; startTime: string; endTime: string; reason?: string | null }[] }>) {
  const hoursRef = useRef<HTMLDivElement | null>(null);
  const slotsRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const initialMap = useMemo<WHMap>(() => {
    const base: WHMap = {
      0: { dayOfWeek: 0, isOpen: false, startTime: "06:00", endTime: "06:00", breakStart: null, breakEnd: null },
      1: { dayOfWeek: 1, isOpen: false, startTime: "09:00", endTime: "17:00", breakStart: null, breakEnd: null },
      2: { dayOfWeek: 2, isOpen: true, startTime: "09:00", endTime: "17:00", breakStart: null, breakEnd: null },
      3: { dayOfWeek: 3, isOpen: true, startTime: "09:00", endTime: "17:00", breakStart: null, breakEnd: null },
      4: { dayOfWeek: 4, isOpen: true, startTime: "09:00", endTime: "17:00", breakStart: null, breakEnd: null },
      5: { dayOfWeek: 5, isOpen: true, startTime: "09:00", endTime: "17:00", breakStart: null, breakEnd: null },
      6: { dayOfWeek: 6, isOpen: true, startTime: "09:00", endTime: "17:00", breakStart: null, breakEnd: null },
    };
    for (const it of initial || []) {
      base[it.dayOfWeek] = { ...base[it.dayOfWeek], ...it };
    }
    return base;
  }, [initial]);
  const [hours, setHours] = useState<WHMap>(initialMap);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConflict, setShowConflict] = useState(false);
  const [conflicts, setConflicts] = useState<{ clientName: string; date: string; time: string; phone: string; email: string }[]>([]);
  const toMinutes = (hm: string) => { const [hh, mm] = hm.split(":").map((x) => Number.parseInt(x, 10)); return hh * 60 + mm; };
  const invalidMessage = "Die Öffnungszeit muss früher als die Schließzeit sein";
  function isInvalidDay(d: number): boolean { const h = hours[d]; if (!h?.isOpen) return false; return toMinutes(h.startTime) >= toMinutes(h.endTime); }

  function isDirty(): boolean {
    for (let d = 0; d <= 6; d++) {
      const a = hours[d];
      const b = initialMap[d];
      if (!a || !b) return true;
      if (a.isOpen !== b.isOpen || a.startTime !== b.startTime || a.endTime !== b.endTime || (a.breakStart ?? "") !== (b.breakStart ?? "") || (a.breakEnd ?? "") !== (b.breakEnd ?? "")) return true;
    }
    return false;
  }

  function changes(): string[] {
    const names = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
    const list: string[] = [];
    for (let d = 0; d <= 6; d++) {
      const a = hours[d];
      const b = initialMap[d];
      if (a.isOpen !== b.isOpen) {
        if (a.isOpen) list.push(`${names[d]}: geschlossen -> geöffnet ${a.startTime}-${a.endTime}`);
        else list.push(`${names[d]}: geöffnet ${b.startTime}-${b.endTime} -> geschlossen`);
      } else if (a.isOpen && (a.startTime !== b.startTime || a.endTime !== b.endTime || (a.breakStart ?? "") !== (b.breakStart ?? "") || (a.breakEnd ?? "") !== (b.breakEnd ?? ""))) {
        const oldBreak = b.breakStart && b.breakEnd ? `, Pause ${b.breakStart}-${b.breakEnd}` : "";
        const newBreak = a.breakStart && a.breakEnd ? `, Pause ${a.breakStart}-${a.breakEnd}` : "";
        list.push(`${names[d]}: ${b.startTime}-${b.endTime}${oldBreak} -> ${a.startTime}-${a.endTime}${newBreak}`);
      }
    }
    return list;
  }


  async function save() {
    setSaving(true);
    const payload = Array.from({ length: 7 }, (_, d) => hours[d]).map(({ dayOfWeek, startTime, endTime, isOpen, breakStart, breakEnd }) => ({ dayOfWeek, startTime, endTime, isOpen, breakStart, breakEnd }));
    const r = await fetch("/api/admin/working-hours", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payload }),
    });
    setSaving(false);
    if (!r.ok) {
      const ct = r.headers.get("content-type") ?? "";
      let msg = "";
      if (ct.includes("application/json")) {
        try {
          const j = await r.json();
          if (r.status === 409 && Array.isArray(j?.conflicts)) {
            setConflicts(j.conflicts as { clientName: string; date: string; time: string; phone: string; email: string }[]);
            setShowConflict(true);
            return;
          }
          msg = typeof j?.error === "string" ? j.error : JSON.stringify(j);
        } catch {
          const t = await r.clone().text();
          msg = t;
        }
      } else {
        msg = await r.text();
      }
      alert("Serverfehler: " + (msg || "Serverfehler"));
    } else {
      setShowSuccess(true);
    }
  }

  // forceSave usunięte – nie można zapisać przy aktywnych rezerwacjach

  return (
    <div>
      <div className="sticky top-[72px] md:top-0 z-40 bg-black border-b border-neutral-800 md:hidden">
        <div className="grid grid-cols-2 gap-2 p-2">
          <button className="px-3 py-2 rounded border border-[#C5A059] text-[#C5A059]" onClick={() => hoursRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>Öffnungszeiten</button>
          <button className="px-3 py-2 rounded border border-[#C5A059] text-[#C5A059]" onClick={() => slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>Slot‑Blocker</button>
        </div>
      </div>
      <div ref={hoursRef}>
        <h1 className="text-2xl text-[#C5A059] mb-4">Öffnungszeiten</h1>
      </div>
      <div className="overflow-x-auto -mx-6 md:mx-0">
        <table className="w-full border border-[#C5A059] bg-black">
          <thead className="bg-neutral-900">
            <tr>
              <th className="px-4 py-2 text-left text-[#C5A059]">Tag</th>
              <th className="px-2 md:px-4 py-2 text-left text-[#C5A059] w-16 md:w-auto">Geöffnet</th>
              <th className="px-4 py-2 text-left text-[#C5A059]">Start</th>
              <th className="px-4 py-2 text-left text-[#C5A059]">Ende</th>
              <th className="px-4 py-2 text-left text-[#C5A059] hidden md:table-cell">Pause Start</th>
              <th className="px-4 py-2 text-left text-[#C5A059] hidden md:table-cell">Pause Ende</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 7 }, (_, d) => d).map((d) => {
              const h = hours[d];
              return (
                <React.Fragment key={d}>
                <tr className="border-t border-neutral-800">
                  <td className="px-4 py-2">{["So","Mo","Di","Mi","Do","Fr","Sa"][d]}</td>
                  <td className="px-2 md:px-4 py-2 w-16 md:w-auto">
                    <input type="checkbox" checked={h.isOpen} onChange={(e) => setHours((prev) => ({ ...prev, [d]: { ...prev[d], isOpen: e.target.checked } }))} />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      className={`px-2 py-1 rounded bg-black border ${isInvalidDay(d) ? "border-red-600" : "border-neutral-700"} text-white w-[110px] md:w-auto`}
                      value={h.startTime}
                      disabled={!h.isOpen}
                      onChange={(e) => setHours((prev) => ({ ...prev, [d]: { ...prev[d], startTime: e.target.value } }))}
                    >
                      {timeOptions().map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      className={`px-2 py-1 rounded bg-black border ${isInvalidDay(d) ? "border-red-600" : "border-neutral-700"} text-white w-[110px] md:w-auto`}
                      value={h.endTime}
                      disabled={!h.isOpen}
                      onChange={(e) => setHours((prev) => ({ ...prev, [d]: { ...prev[d], endTime: e.target.value } }))}
                    >
                      {timeOptions().map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                <td className="px-4 py-2 hidden md:table-cell">
                  <select
                    className="px-2 py-1 rounded bg-black border border-neutral-700 text-white"
                    value={h.breakStart ?? ""}
                    disabled={!h.isOpen}
                    onChange={(e) => setHours((prev) => ({ ...prev, [d]: { ...prev[d], breakStart: e.target.value || null } }))}
                  >
                    <option value="">(keine)</option>
                    {timeOptions().map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 hidden md:table-cell">
                  <select
                    className="px-2 py-1 rounded bg-black border border-neutral-700 text-white"
                    value={h.breakEnd ?? ""}
                    disabled={!h.isOpen}
                    onChange={(e) => setHours((prev) => ({ ...prev, [d]: { ...prev[d], breakEnd: e.target.value || null } }))}
                  >
                    <option value="">(keine)</option>
                    {timeOptions().map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr className="border-t border-neutral-800 md:hidden">
                <td className="px-4 py-2 text-[#C5A059]" colSpan={2}>Pause</td>
                <td className="px-4 py-2">
                  <select
                    className="px-2 py-1 rounded bg-black border border-neutral-700 text-white w-[110px] md:w-auto"
                    value={h.breakStart ?? ""}
                    disabled={!h.isOpen}
                    onChange={(e) => setHours((prev) => ({ ...prev, [d]: { ...prev[d], breakStart: e.target.value || null } }))}
                  >
                    <option value="">(keine)</option>
                    {timeOptions().map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select
                    className="px-2 py-1 rounded bg-black border border-neutral-700 text-white w-[110px] md:w-auto"
                    value={h.breakEnd ?? ""}
                    disabled={!h.isOpen}
                    onChange={(e) => setHours((prev) => ({ ...prev, [d]: { ...prev[d], breakEnd: e.target.value || null } }))}
                  >
                    <option value="">(keine)</option>
                    {timeOptions().map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
              </tr>
              </React.Fragment>
              );})}
          </tbody>
        </table>
        {Array.from({ length: 7 }, (_, d) => d).some(isInvalidDay) && (
          <div className="mt-3 text-sm text-red-500">{invalidMessage}</div>
        )}
      </div>
      <div className="mt-4">
        <button disabled={saving || !isDirty() || Array.from({ length: 7 }, (_, d) => d).some(isInvalidDay)} onClick={save} className="px-4 py-2 rounded bg-[#C5A059] text-black disabled:opacity-50">Änderungen speichern</button>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-[#C5A059] rounded p-6 w-full max-w-lg">
            <div className="text-xl mb-4 text-[#C5A059]">Öffnungszeiten aktualisiert</div>
            <div className="space-y-2 text-white">
              {changes().length === 0 ? (
                <div>Keine Änderungen</div>
              ) : (
                changes().map((c) => <div key={c}>{c}</div>)
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded bg-[#C5A059] text-black"
                onClick={() => {
                  setShowSuccess(false);
                  router.refresh();
                }}
              >OK</button>
            </div>
          </div>
        </div>
      )}

      {showConflict && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-[#C5A059] rounded p-6 w-full max-w-2xl">
            <div className="text-xl mb-2 text-[#C5A059]">Achtung! Es gibt Buchungen in diesem Zeitraum</div>
            <div className="mb-2 text-white">Die Änderung der Öffnungszeiten wirkt sich auf folgende Termine aus:</div>
            <div className="mb-4 text-yellow-300">Bitte verschieben Sie zuerst diese Termine (najpierw należy przenieść te wizyty).</div>
            <div className="max-h-80 overflow-auto">
              <table className="min-w-full border border-neutral-700 text-white">
                <thead className="bg-neutral-800">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Datum</th>
                    <th className="px-3 py-2 text-left">Zeit</th>
                    <th className="px-3 py-2 text-left">Telefon</th>
                    <th className="px-3 py-2 text-left">E‑Mail</th>
                  </tr>
                </thead>
                <tbody>
                  {conflicts.map((c) => (
                    <tr key={`${c.clientName}-${c.date}-${c.time}-${c.phone}`} className="border-t border-neutral-700">
                      <td className="px-3 py-2">{c.clientName}</td>
                      <td className="px-3 py-2">{c.date}</td>
                      <td className="px-3 py-2">{c.time}</td>
                      <td className="px-3 py-2">{c.phone}</td>
                      <td className="px-3 py-2">{c.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <button className="px-4 py-2 rounded bg-neutral-700 text-white" onClick={() => setShowConflict(false)}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      <div ref={slotsRef} id="slot-blocker" className="mt-10">
        <h2 className="text-xl text-[#C5A059] mb-3">Slot‑Blocker (Einmalige Sperren)</h2>
        <div className="text-sm text-neutral-400 mb-3">Erfassen Sie geplante Abwesenheiten (Ferien, Arzttermine usw.)</div>
        <SlotBlockerAdmin initial={initialBlocks ?? []} />
      </div>
    </div>
  );
}

function SlotBlockerAdmin({ initial }: Readonly<{ initial: { id: number; date: string; startTime: string; endTime: string; reason?: string | null }[] }>) {
  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [start, setStart] = useState<string>("09:00");
  const [end, setEnd] = useState<string>("09:30");
  const [reason, setReason] = useState<string>("");
  const [list, setList] = useState<{ id: number; date: string; startTime: string; endTime: string; reason?: string | null }[]>(initial);
  const [error, setError] = useState<string>("");
  const [toast, setToast] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<string>(date);
  const toMinutes = (hm: string) => { const [hh, mm] = hm.split(":").map((x) => Number.parseInt(x, 10)); return hh * 60 + mm; };
  const invalidMessageSB = "Die Öffnungszeit muss früher als die Schließzeit sein";
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterReason, setFilterReason] = useState<string>("");
  const [filterStart, setFilterStart] = useState<string>("");
  const [filterEnd, setFilterEnd] = useState<string>("");
  const toYMDZurich = (dt: Date) => {
    const parts = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(dt);
    const y = parts.find((p) => p.type === "year")?.value || String(dt.getFullYear());
    const m = parts.find((p) => p.type === "month")?.value || String(dt.getMonth() + 1).padStart(2, "0");
    const d = parts.find((p) => p.type === "day")?.value || String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const filteredList = useMemo(() => {
    const arr = list.filter((b) => {
      const dk = toYMDZurich(new Date(b.date));
      const byExact = !filterDate || dk === filterDate;
      const byStart = !filterStart || dk >= filterStart;
      const byEnd = !filterEnd || dk <= filterEnd;
      const byReason = !filterReason || (b.reason ?? "").toLowerCase().includes(filterReason.toLowerCase());
      return byExact && byStart && byEnd && byReason;
    });
    return arr.sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      if (tb !== ta) return tb - ta;
      const ma = toMinutes(a.startTime);
      const mb = toMinutes(b.startTime);
      return mb - ma;
    });
  }, [list, filterDate, filterStart, filterEnd, filterReason]);

  const isInvalid = (() => {
    const sd = new Date(date);
    const ed = new Date(endDate);
    if (Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime())) return true;
    if (sd.getTime() === ed.getTime()) {
      return toMinutes(start) >= toMinutes(end);
    }
    const startDT = new Date(`${date}T${start}:00`);
    const endDT = new Date(`${endDate}T${end}:00`);
    return !(endDT.getTime() > startDT.getTime());
  })();

  async function load() {
    try {
      const r = await fetch("/api/blockers");
      const data = await r.json();
      setList(Array.isArray(data) ? data : []);
    } catch {
      setList([]);
    }
  }

  async function add() {
    try {
      setError("");
      if (isInvalid) { setError(invalidMessageSB); return; }
      const payload: Record<string, unknown> = { date, startTime: start, endTime: end, reason };
      if (endDate !== date) payload.endDate = endDate;
      const res = await fetch("/api/blockers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        load();
      } else {
        try {
          const data = await res.json();
          const msg = typeof data?.error === "string" && data.error.length > 0 ? data.error : "Fehler beim Erstellen der Sperre";
          setError(msg);
          setToast(msg);
          setTimeout(() => setToast(""), 3000);
        } catch {
          setError("Fehler beim Erstellen der Sperre");
        }
      }
    } catch {}
  }

  async function del(id: number) {
    try {
      const item = list.find((x) => x.id === id);
      const res = await fetch(`/api/blockers?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        load();
        if (item) {
          const d = new Date(item.date);
          const datum = d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" });
          setToast(`Usunięto slot: ${datum} ${item.startTime}–${item.endTime}`);
          setTimeout(() => setToast(""), 3000);
        }
      }
    } catch {}
  }

  useEffect(() => { /* initial list provided server-side */ }, []);

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-3 right-3 z-50 px-3 py-2 rounded bg-neutral-800 text-neutral-200 border border-[#C5A059] shadow-2xl">{toast}</div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
        <div>
          <div className="text-sm text-neutral-300 mb-1">Datum von</div>
          <input type="date" value={date} onChange={(e) => { setDate(e.target.value); if (error) setError(""); }} className={`px-3 py-2 rounded bg-black border ${isInvalid ? "border-red-600" : "border-neutral-700"} text-white`} />
        </div>
        <div>
          <div className="text-sm text-neutral-300 mb-1">Zeit von</div>
          <select value={start} onChange={(e) => { setStart(e.target.value); if (error) setError(""); }} className={`px-2 py-2 rounded bg-black border ${isInvalid ? "border-red-600" : "border-neutral-700"} text-white`}>
            {timeOptions().map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <div className="text-sm text-neutral-300 mb-1">Datum bis</div>
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); if (error) setError(""); }} className={`px-3 py-2 rounded bg-black border ${isInvalid ? "border-red-600" : "border-neutral-700"} text-white`} />
        </div>
        <div>
          <div className="text-sm text-neutral-300 mb-1">Zeit bis</div>
          <select value={end} onChange={(e) => { setEnd(e.target.value); if (error) setError(""); }} className={`px-2 py-2 rounded bg-black border ${isInvalid ? "border-red-600" : "border-neutral-700"} text-white`}>
            {timeOptions().map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="md:col-span-2 flex flex-col md:flex-row items-end gap-3">
          <div className="flex-1">
            <div className="text-sm text-neutral-300 mb-1">Grund</div>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="z.B. Arzt" className="px-3 py-2 rounded bg-black border border-neutral-700 text-white w-full" />
          </div>
          <button disabled={isInvalid} onClick={add} className="px-4 py-2 rounded bg-[#C5A059] text-black disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 whitespace-nowrap">Termin sperren</button>
        </div>
      </div>
      {(error || isInvalid) && <div className="text-sm text-red-500">{error || invalidMessageSB}</div>}
      <div className="border-t border-[#C5A059] my-4" />

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <div>
            <div className="text-sm text-neutral-300 mb-1">Filter Datum</div>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="px-3 py-2 rounded bg-black border border-neutral-700 text-white w-full" />
          </div>
          <div>
            <div className="text-sm text-neutral-300 mb-1">Von</div>
            <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} className="px-3 py-2 rounded bg-black border border-neutral-700 text-white w-full" />
          </div>
          <div>
            <div className="text-sm text-neutral-300 mb-1">Bis</div>
            <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} className="px-3 py-2 rounded bg-black border border-neutral-700 text-white w-full" />
          </div>
          <div>
            <div className="text-sm text-neutral-300 mb-1">Filter Grund</div>
            <input value={filterReason} onChange={(e) => setFilterReason(e.target.value)} placeholder="z.B. Arzt" className="px-3 py-2 rounded bg-black border border-neutral-700 text-white w-full" />
          </div>
          <div className="col-span-2 md:col-span-2 flex items-end gap-2">
            <button onClick={() => { setFilterDate(""); setFilterStart(""); setFilterEnd(""); setFilterReason(""); }} className="px-3 py-2 rounded border border-neutral-700 text-white">Alle anzeigen</button>
          </div>
        </div>
        <div className="md:overflow-x-auto overflow-x-hidden -mx-6 md:mx-0 max-h-80 overflow-y-auto">
          <table className="w-full border border-[#C5A059] bg-black">
          <thead className="bg-neutral-900">
            <tr>
              <th className="px-3 py-2 text-left text-[#C5A059]">Datum</th>
              <th className="px-3 py-2 text-left text-[#C5A059]">Zeit</th>
              <th className="px-3 py-2 text-left text-[#C5A059]">Grund</th>
              <th className="px-3 py-2 text-left text-[#C5A059]">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((b) => {
              const d = new Date(b.date);
              const datum = d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" });
              return (
                <tr key={b.id} className="border-t border-neutral-800">
                  <td className="px-3 py-2">{datum}</td>
                  <td className="px-3 py-2">{b.startTime}–{b.endTime}</td>
                  <td className="px-3 py-2">{b.reason ?? ""}</td>
                  <td className="px-3 py-2"><button onClick={() => { setConfirmId(b.id); setConfirmOpen(true); }} className="px-3 py-1 rounded bg-red-600 text-white">X</button></td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-[#C5A059] rounded p-6 w-full max-w-md">
            <div className="text-xl text-[#C5A059] mb-4">Bestätigung</div>
            <div className="text-white mb-6">Möchten Sie diesen Slot wirklich löschen?</div>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded bg-[#C5A059] text-black"
                onClick={() => { if (confirmId) del(confirmId); setConfirmOpen(false); setConfirmId(null); }}
              >Ja, sicher</button>
              <button
                className="px-4 py-2 rounded border border-neutral-700 text-white"
                onClick={() => { setConfirmOpen(false); setConfirmId(null); }}
              >Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
