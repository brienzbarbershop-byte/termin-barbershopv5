"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = useParams() as { token: string };
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [status, setStatus] = useState<string>("");
  const disabled = !p1 || !p2 || p1 !== p2;
  const [show, setShow] = useState(false);

  async function submit() {
    setStatus("");
    const r = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: p1 }),
    });
    if (r.ok) {
      router.push("/admin");
    } else {
      const data = await r.json().catch(() => ({ error: "Fehler" }));
      setStatus(data.error || "Fehler beim Zurücksetzen");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm p-6 rounded-lg border border-[#C5A059] bg-black">
        <h1 className="text-xl text-[#C5A059] mb-4">Passwort zurücksetzen – Admin</h1>
        <div className="space-y-3">
          <div className="relative">
            <input type={show ? "text" : "password"} placeholder="Neues Passwort" value={p1} onChange={(e) => setP1(e.target.value)} className="w-full px-3 py-2 rounded bg-black border border-[#C5A059] text-white pr-10" />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-[#C5A059]" onClick={() => setShow((v) => !v)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          <div className="relative">
            <input type={show ? "text" : "password"} placeholder="Passwort wiederholen" value={p2} onChange={(e) => setP2(e.target.value)} className="w-full px-3 py-2 rounded bg-black border border-[#C5A059] text-white pr-10" />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-[#C5A059]" onClick={() => setShow((v) => !v)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          {p1 && p2 && p1 !== p2 && <div className="text-sm text-red-400">Die Passwörter stimmen nicht überein.</div>}
          <button disabled={disabled} onClick={submit} className="w-full px-4 py-2 rounded bg-[#C5A059] text-black disabled:opacity-50">Neues Passwort speichern</button>
          {status && <div className="text-sm">{status}</div>}
        </div>
      </div>
    </div>
  );
}
