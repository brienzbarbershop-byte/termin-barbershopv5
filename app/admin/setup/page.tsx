"use client";
import { useEffect, useState } from "react";
import RecurringBreaks from "@/components/admin/RecurringBreaks";
import { Eye, EyeOff } from "lucide-react";
 

export default function AdminSetupPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [status, setStatus] = useState<string>("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setError(null);
    setIsLoading(true);
    try {
      const r = await fetch("/api/store-info");
      if (!r.ok) {
        throw new Error("Store info failed");
      }
      await r.json();
      setStatus("");
    } catch (err) {
      console.error("Setup fetch error:", err);
      setError("Einstellungen konnten nicht geladen werden. Bitte Seite aktualisieren.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submit() {
    setStatus("");
    if (!newPassword || newPassword !== repeatPassword) {
      setStatus("Hasła nie są takie same");
      return;
    }
    const r = await fetch("/api/setup/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (r.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
      setStatus("Hasło zmienione. Nastąpi wylogowanie.");
      alert("Hasło zmienione. Nastąpi wylogowanie.");
      globalThis.location.href = "/login";
    } else {
      const data = await r.json().catch(() => ({ error: "Fehler" }));
      setStatus(data.error || "Fehler bei der Passwortänderung");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <h1 className="text-2xl text-[#C5A059] mb-6">Einstellungen</h1>
      {error && (
        <div className="max-w-xl mb-4 p-3 rounded border border-red-600 text-red-300 bg-red-950/30">
          <div className="mb-2">{error}</div>
          <button onClick={load} className="px-3 py-2 rounded border border-red-600 text-red-300">Spróbuj ponownie</button>
        </div>
      )}
      {isLoading ? (
        <div className="max-w-xl">Ładowanie...</div>
      ) : (
      <div className="max-w-xl space-y-6">
        <div>
          <div className="text-lg text-[#C5A059] mb-3">Sicherheit / Passwort ändern</div>
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                placeholder="Aktuelles Passwort"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded bg-black border border-neutral-700 text-white focus:border-[#C5A059] pr-10"
              />
              <button type="button" aria-label="Toggle password" className="absolute right-2 top-1/2 -translate-y-1/2 text-[#C5A059]" onClick={() => setShowCurrent((v) => !v)}>
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Neues Passwort"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded bg-black border border-neutral-700 text-white focus:border-[#C5A059] pr-10"
              />
              <button type="button" aria-label="Toggle password" className="absolute right-2 top-1/2 -translate-y-1/2 text-[#C5A059]" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Passwort wiederholen"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                className="w-full px-3 py-2 rounded bg-black border border-neutral-700 text-white focus:border-[#C5A059] pr-10"
              />
              <button type="button" aria-label="Toggle password" className="absolute right-2 top-1/2 -translate-y-1/2 text-[#C5A059]" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={submit}
                className="px-4 py-2 rounded bg-[#C5A059] text-black disabled:opacity-50"
                disabled={!currentPassword || !newPassword || newPassword !== repeatPassword}
              >
                Passwort ändern
              </button>
              <button
                onClick={() => { setCurrentPassword(""); setNewPassword(""); setRepeatPassword(""); setStatus(""); }}
                className="px-4 py-2 rounded border border-neutral-700"
              >
                Zurücksetzen
              </button>
            </div>
            {(!newPassword || !repeatPassword || newPassword !== repeatPassword) && (newPassword || repeatPassword) && (
              <div className="text-sm text-red-400">Die Passwörter stimmen nicht überein.</div>
            )}
            {status && <div className="text-sm">{status}</div>}
          </div>
        </div>
        <RecurringBreaks />
      </div>
      )}
    </div>
  );
}
