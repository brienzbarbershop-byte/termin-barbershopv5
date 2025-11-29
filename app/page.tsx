"use client";
import { useEffect, useState } from "react";
import UiPhoneInput, { isValidPhoneNumber } from "../components/ui/phone-input";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';
import dynamic from "next/dynamic";
const IntroSplash = dynamic(() => import("@/components/ui/IntroSplash"), { ssr: false });
 
import { clsx } from "clsx";

type Service = { id: number; name: string; priceCHF: number };
interface Slot { time: string; isBooked: boolean }

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState<string | undefined>(undefined);
  const [phoneError, setPhoneError] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [emailError, setEmailError] = useState("");
  const [consent, setConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [toast, setToast] = useState<string>("");
  const [openDays, setOpenDays] = useState<boolean[]>([false, false, true, true, true, true, true]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/services");
        const data = await r.json();
        if (!cancelled) setServices(Array.isArray(data) ? data : []);
        try {
          const rh = await fetch("/api/working-hours");
          const hours = await rh.json();
          if (!cancelled && Array.isArray(hours)) {
            const base = [false, false, false, false, false, false, false];
            for (const it of hours) {
              const idx = Number(it?.dayOfWeek ?? -1);
              if (idx >= 0 && idx <= 6) base[idx] = !!it?.isOpen;
            }
            setOpenDays(base);
          }
        } catch {}
      } catch {
        if (!cancelled) setServices([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function handler() {
      if (date && serviceId) {
        loadSlotsFor(date);
        setToast("Slot‑Zeiten aktualisiert");
        setTimeout(() => setToast(""), 2000);
      }
    }
    globalThis.addEventListener?.("recurring-breaks-updated", handler as EventListener);
    return () => {
      globalThis.removeEventListener?.("recurring-breaks-updated", handler as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, serviceId]);

  function loadSlotsFor(d: Date) {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    const qs = `${y}-${m}-${day}`;
    if (!serviceId) { setAvailableSlots([]); return; }
    fetch(`/api/slots?date=${qs}&serviceId=${serviceId}`)
      .then((r) => r.json())
      .then((data: Slot[]) => setAvailableSlots(Array.isArray(data) ? data : []))
      .catch(() => setAvailableSlots([]));
  }

  async function bookAppointment() {
    if (!serviceId || !date || !selectedTime) return;
    setIsLoading(true);
    const fullDate = new Date(date);
    const [h, m] = selectedTime.split(":").map((t) => Number.parseInt(t, 10));
    fullDate.setHours(h, m);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        date: fullDate.toISOString(),
        time: selectedTime,
        clientName,
        clientEmail,
        clientPhone,
        notes: clientNotes,
        consent,
        marketingConsent,
      }),
    });
    setIsLoading(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStep(5);
    } else if (res.status === 409) {
      const err = String(((data as { error?: string })?.error ?? ""));
      let msg = "Fehler";
      if (err === "CONFLICT") msg = "Es tut uns leid, dieser Termin wurde gerade vergeben. Bitte wählen Sie eine andere Zeit.";
      else if (err === "BLOCKED" || err === "OUT_OF_HOURS") msg = "Der Zeitbereich ist zu kurz für diese Dienstleistung";
      else if (err === "CLOSED") msg = "Geschlossen";
      else if (err === "DATE_TOO_FAR") msg = "Datum liegt zu weit in der Zukunft";
      else if (err === "PAST_TIME") msg = "Vergangene Zeit";
      if (err && !["CONFLICT","BLOCKED","OUT_OF_HOURS","CLOSED","DATE_TOO_FAR","PAST_TIME"].includes(err)) {
        msg = err;
      }
      setStatus(msg);
      if (err === "BLOCKED" || err === "OUT_OF_HOURS" || (err && err.includes("za krótki"))) {
        setErrorModal(msg);
      }
    } else {
      setStatus("Fehler");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center py-10">
      {errorModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-[#C5A059] rounded p-6 w-full max-w-md">
            <div className="text-xl text-[#C5A059] mb-4 text-center">{errorModal}</div>
            <div className="flex justify-center">
              <button
                type="button"
                className="px-4 py-2 rounded bg-[#C5A059] text-black"
                onClick={() => { setErrorModal(null); setStep(3); }}
              >Termin ändern</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed top-3 right-3 px-3 py-2 rounded bg-neutral-800 text-neutral-200 border border-neutral-700 z-50">{toast}</div>
      )}
      <IntroSplash variant="client" always />
      <div className="text-[#C5A059] text-2xl mb-6">Dienstleistung auswählen:</div>

      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setServiceId(s.id);
                setStep(2);
              }}
              className={clsx(
                "p-4 rounded-lg border",
                serviceId === s.id ? "border-[#C5A059]" : "border-neutral-700",
                "bg-neutral-900 hover:bg-neutral-800"
              )}
            >
              <div className="font-medium">{s.name}</div>
              <div className="text-sm text-neutral-300">{s.priceCHF} CHF</div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col items-center gap-6 w-full max-w-3xl">
          <Calendar
            onChange={(d) => { const value = d as Date; setDate(value); setSelectedTime(null); loadSlotsFor(value); }}
            value={date}
            minDate={new Date()}
            maxDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
            tileDisabled={({ date, view }) => view === "month" && !openDays[date.getDay()]}
            className="react-calendar w-full max-w-xl rounded-lg"
          />
          <div className="flex gap-4">
            <button onClick={() => setStep(1)} className="px-4 py-2 rounded border border-neutral-700">Zurück</button>
            <button
              disabled={!date}
              onClick={() => date && setStep(3)}
              className="px-4 py-2 rounded bg-[#C5A059] text-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Weiter
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col items-center gap-6 w-full max-w-3xl">
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 w-full">
            {availableSlots.map((slot) => {
              const isSelected = selectedTime === slot.time;
              const base = "px-3 py-2 rounded border";
              const style = slot.isBooked
                ? "bg-neutral-800 text-neutral-600 border-transparent cursor-not-allowed decoration-slice line-through"
                : isSelected
                ? "bg-[#C5A059] text-black border-[#C5A059]"
                : "bg-transparent text-white border-neutral-700 hover:border-[#C5A059]";
              return (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => {
                    if (slot.isBooked) {
                      setToast("Der Zeitbereich ist zu kurz für diese Dienstleistung");
                      setTimeout(() => setToast(""), 2500);
                      return;
                    }
                    setSelectedTime(slot.time);
                  }}
                  className={clsx(base, style)}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4">
            <button onClick={() => setStep(2)} className="px-4 py-2 rounded border border-neutral-700">Zurück</button>
            <button
              disabled={!selectedTime}
              onClick={() => selectedTime && setStep(4)}
              className="px-4 py-2 rounded bg-[#C5A059] text-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Weiter
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Vorname Nachname" className="w-full px-3 py-2 rounded bg-black border border-[#C5A059] text-white" />
          <UiPhoneInput value={clientPhone} onChange={(v) => { setClientPhone(v); setPhoneError(v && isValidPhoneNumber(v) ? "" : "Ungültige Telefonnummer"); }} />
          {phoneError && <div className="text-sm text-red-500 w-full">{phoneError}</div>}
          <input value={clientEmail} onChange={(e) => { setClientEmail(e.target.value); if (emailError) setEmailError(""); }} onBlur={() => { if (!isValidEmail(clientEmail)) setEmailError("Ungültiges E-Mail-Format"); }} placeholder="Email" className={clsx("w-full px-3 py-2 rounded text-white", emailError ? "bg-red-50 border border-red-500 text-red-800" : "bg-black border border-[#C5A059]")} />
          {emailError && <div className="text-sm text-red-500 w-full">{emailError}</div>}
          <textarea value={clientNotes} onChange={(e) => setClientNotes(e.target.value.slice(0, 200))} placeholder="Notizen (max. 200 Zeichen)" className="w-full px-3 py-2 rounded bg-black border border-[#C5A059] text-white min-h-24" />
          <label className="flex items-center gap-2 text-sm w-full"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="accent-[#C5A059]" />Ich akzeptiere die Datenschutzrichtlinie</label>
          <label className="flex items-center gap-2 text-sm w-full"><input type="checkbox" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} className="accent-[#C5A059]" />Ich möchte Angebote erhalten</label>
          <div className="flex gap-4 w-full">
            <button onClick={() => setStep(3)} className="px-4 py-2 rounded border border-neutral-700">Zurück</button>
            <button disabled={isLoading || !clientName || !clientEmail || !clientPhone || !isValidPhoneNumber(clientPhone ?? "") || !!emailError || !isValidEmail(clientEmail) || !consent} onClick={bookAppointment} className="px-4 py-3 rounded bg-[#C5A059] text-black w-full disabled:opacity-50 disabled:cursor-not-allowed text-base font-semibold">Kostenpflichtig buchen</button>
          </div>
          {status && <div className="text-sm">{status}</div>}
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          <div className="text-xl text-[#C5A059] font-semibold text-center">Vielen Dank! Termin bestätigt.</div>
          <button
            type="button"
            onClick={() => { if (typeof globalThis !== "undefined") globalThis.location?.reload(); }}
            className="px-4 py-2 rounded border border-[#C5A059] text-[#C5A059]"
          >
            Zur Startseite
          </button>
        </div>
      )}
    </div>
  );
}
  function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
