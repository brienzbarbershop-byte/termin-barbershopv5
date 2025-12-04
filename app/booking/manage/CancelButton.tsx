"use client";
import { useEffect, useState } from "react";

export default function CancelButton({ token, canCancel = true, disabledReason }: Readonly<{ token: string; canCancel?: boolean; disabledReason?: string }>) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [csrf, setCsrf] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/security/csrf");
        const d = await r.json().catch(() => ({}));
        if (!cancelled && d?.token) setCsrf(String(d.token));
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, []);
  async function cancel() {
    setLoading(true);
    try {
      const r = await fetch("/api/bookings/cancel-by-token", { method: "POST", headers: { "Content-Type": "application/json", "x-csrf-token": csrf }, body: JSON.stringify({ token }) });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data?.ok) {
        setStatus("Termin storniert");
        setTimeout(() => { if (typeof globalThis !== "undefined") globalThis.location?.reload(); }, 800);
      } else {
        const err = String((data as { error?: string })?.error ?? "");
        if (r.status === 403 && err === "csrf") setStatus("Sitzung abgelaufen. Bitte Seite neu laden.");
        else if (r.status === 409 && err === "too_close") setStatus("Stornierung ist weniger als 2 Stunden vor dem Termin nicht möglich.");
        else setStatus("Fehler");
      }
    } catch {
      setStatus("Fehler");
    }
    setLoading(false);
  }
  return (
    <div className="flex flex-col gap-2">
      <button aria-label="Termin stornieren" disabled={loading || !canCancel} onClick={cancel} className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50">Termin stornieren</button>
      {disabledReason && <div className="text-sm text-neutral-400">{disabledReason}</div>}
      {status && <div className="text-sm">{status}</div>}
    </div>
  );
}
