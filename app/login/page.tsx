"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
const IntroSplash = dynamic(() => import("@/components/ui/IntroSplash"), { ssr: false });

export default function Login() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<string>("");
  const [caps, setCaps] = useState(false);
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowForm(true), 4700);
    return () => clearTimeout(t);
  }, []);

  async function submit() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/admin");
    } else {
      setError("Falsches Passwort");
    }
  }

  async function forgot() {
    setForgotStatus("");
    const r = await fetch("/api/auth/forgot-password", { method: "POST" });
    if (r.ok) {
      setForgotStatus("Link wurde an die Kontakt-E-Mail gesendet.");
    } else {
      setForgotStatus("Link konnte nicht gesendet werden.");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
      <IntroSplash variant="admin" always onDone={() => setShowForm(true)} />
      {showForm && (
      <div className="w-full max-w-sm p-6 rounded-lg border border-[#C5A059] bg-black">
        <h1 className="text-xl text-[#C5A059] mb-4">Admin Login</h1>
        <form
          onSubmit={(e) => { e.preventDefault(); if (!loading && password) submit(); }}
        >
          <div className="mb-4 flex gap-2 items-center">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => setCaps(e.getModifierState("CapsLock"))}
              onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
              onBlur={() => setCaps(false)}
              placeholder="Passwort"
              className="flex-1 px-3 py-2 rounded bg-black border border-[#C5A059] text-white"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="px-3 py-2 rounded border border-[#C5A059] text-[#C5A059]"
            >
              {show ? "Verbergen" : "Anzeigen"}
            </button>
          </div>
          {caps && <div className="-mt-2 mb-2 text-sm text-yellow-400">Feststelltaste ist aktiviert</div>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full px-4 py-2 rounded bg-[#C5A059] text-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Einloggen
          </button>
        </form>
        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
        <div className="mt-4 text-sm">
          <button type="button" onClick={forgot} className="underline text-[#C5A059]">Passwort vergessen?</button>
        </div>
        {forgotStatus && <div className="mt-2 text-sm">{forgotStatus}</div>}
      </div>
      )}
    </div>
  );
}
