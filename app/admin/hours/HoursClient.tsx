"use client";
import { useState } from "react";

type WH = { id: number; dayOfWeek: number; startTime: string; endTime: string; isOpen: boolean };

export default function HoursClient({ initial }: { initial: WH[] }) {
  const [hours, setHours] = useState<WH[]>(initial);
  const [saving, setSaving] = useState(false);

  function timeOptions(): string[] {
    const list: string[] = [];
    const start = new Date();
    start.setHours(6, 0, 0, 0);
    for (let i = 0; i < (16 * 2 + 1); i++) { // 06:00 to 22:00 inclusive every 30m
      const h = start.getHours().toString().padStart(2, "0");
      const m = start.getMinutes().toString().padStart(2, "0");
      list.push(`${h}:${m}`);
      start.setMinutes(start.getMinutes() + 30);
    }
    return list;
  }

  async function save() {
    setSaving(true);
    const payload = hours.map(({ dayOfWeek, startTime, endTime, isOpen }) => ({ dayOfWeek, startTime, endTime, isOpen }));
    const r = await fetch("/api/admin/working-hours", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!r.ok) {
      const ct = r.headers.get("content-type") || "";
      let msg = "Błąd serwera";
      if (ct.includes("application/json")) {
        try {
          const j = await r.json();
          msg = typeof j?.error === "string" ? j.error : JSON.stringify(j);
        } catch {
          const t = await r.clone().text();
          msg = t;
        }
      } else {
        msg = await r.text();
      }
      alert("Błąd serwera: " + msg);
    }
  }

  return (
    <div>
      <h1 className="text-2xl text-[#C5A059] mb-4">Godziny Pracy</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-[#C5A059] bg-black">
          <thead className="bg-neutral-900">
            <tr>
              <th className="px-4 py-2 text-left text-[#C5A059]">Dzień</th>
              <th className="px-4 py-2 text-left text-[#C5A059]">Otwarte</th>
              <th className="px-4 py-2 text-left text-[#C5A059]">Start</th>
              <th className="px-4 py-2 text-left text-[#C5A059]">Koniec</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h.id} className="border-t border-neutral-800">
                <td className="px-4 py-2">{["Nd","Pn","Wt","Śr","Cz","Pt","So"][h.dayOfWeek]}</td>
                <td className="px-4 py-2">
                  <input type="checkbox" checked={h.isOpen} onChange={(e) => setHours((prev) => prev.map((x) => x.id === h.id ? { ...x, isOpen: e.target.checked } : x))} />
                </td>
                <td className="px-4 py-2">
                  <select
                    className="px-2 py-1 rounded bg-black border border-neutral-700 text-white"
                    value={h.startTime}
                    disabled={!h.isOpen}
                    onChange={(e) => setHours((prev) => prev.map((x) => x.id === h.id ? { ...x, startTime: e.target.value } : x))}
                  >
                    {timeOptions().map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select
                    className="px-2 py-1 rounded bg-black border border-neutral-700 text-white"
                    value={h.endTime}
                    disabled={!h.isOpen}
                    onChange={(e) => setHours((prev) => prev.map((x) => x.id === h.id ? { ...x, endTime: e.target.value } : x))}
                  >
                    {timeOptions().map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <button disabled={saving} onClick={save} className="px-4 py-2 rounded bg-[#C5A059] text-black disabled:opacity-50">Zapisz Zmiany</button>
      </div>
    </div>
  );
}
