"use client";
import { useState } from "react";

export default function CancelButton({ id }: Readonly<{ id: number }>) {
  const [loading, setLoading] = useState(false);
  async function cancel() {
    setLoading(true);
    await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    setLoading(false);
    globalThis.location.reload();
  }
  return (
    <button
      disabled={loading}
      onClick={cancel}
      className="px-3 py-1 rounded border border-[#C5A059] text-[#C5A059] disabled:opacity-50"
    >
      Stornieren
    </button>
  );
}
