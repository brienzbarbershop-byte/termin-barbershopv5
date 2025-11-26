"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Calendar, BookOpen, Scissors, Clock, Settings, Menu, QrCode } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetClose } from "@/components/ui/sheet";

export default function AdminLayoutClient({ children }: Readonly<{ children: React.ReactNode }>) {
  const [open, setOpen] = useState(false);
  const last = useRef<number>(0);
  useEffect(() => {
    async function tick() {
      try {
        await fetch("/api/auth/refresh", { method: "POST" });
      } catch {}
    }
    function handler() {
      const now = Date.now();
      if (now - last.current > 5 * 60 * 1000) {
        last.current = now;
        tick();
      }
    }
    const opts = { passive: true } as AddEventListenerOptions;
    globalThis.addEventListener("mousemove", handler, opts);
    globalThis.addEventListener("keydown", handler, opts as EventListenerOptions);
    globalThis.addEventListener("click", handler, opts);
    globalThis.addEventListener("touchstart", handler, opts);
    return () => {
      globalThis.removeEventListener("mousemove", handler);
      globalThis.removeEventListener("keydown", handler as EventListener);
      globalThis.removeEventListener("click", handler);
      globalThis.removeEventListener("touchstart", handler);
    };
  }, []);

  const Nav = (
    <nav className="max-h-[70vh] md:h-full overflow-y-auto flex flex-col gap-2 p-4 bg-neutral-950">
      <div className="text-[#C5A059] text-xl mb-4">Admin</div>
      <Link href="/admin" className="flex items-center gap-2 px-3 py-2 rounded hover:bg-neutral-900 text-neutral-100" onClick={() => setOpen(false)}>
        <Calendar size={18} className="text-[#C5A059]" /> Dashboard
      </Link>
      <Link href="/admin/bookings" className="flex items-center gap-2 px-3 py-2 rounded hover:bg-neutral-900 text-neutral-100" onClick={() => setOpen(false)}>
        <BookOpen size={18} className="text-[#C5A059]" /> Buchungen
      </Link>
      <Link href="/admin/services" className="flex items-center gap-2 px-3 py-2 rounded hover:bg-neutral-900 text-neutral-100" onClick={() => setOpen(false)}>
        <Scissors size={18} className="text-[#C5A059]" /> Leistungen
      </Link>
      <Link href="/admin/hours" className="flex items-center gap-2 px-3 py-2 rounded hover:bg-neutral-900 text-neutral-100" onClick={() => setOpen(false)}>
        <Clock size={18} className="text-[#C5A059]" /> Öffnungszeiten
      </Link>
      <Link href="/admin/qr" className="flex items-center gap-2 px-3 py-2 rounded hover:bg-neutral-900 text-neutral-100" onClick={() => setOpen(false)}>
        <QrCode size={18} className="text-[#C5A059]" /> QR‑Code
      </Link>
      <Link href="/admin/settings" className="flex items-center gap-2 px-3 py-2 rounded hover:bg-neutral-900 text-neutral-100" onClick={() => setOpen(false)}>
        <Settings size={18} className="text-[#C5A059]" /> Einstellungen
      </Link>
      <div className="mt-auto pt-4 border-t border-neutral-800">
        <button
          className="w-full px-3 py-2 rounded border border-neutral-700 text-neutral-100 hover:bg-neutral-900"
          onClick={async () => { try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}; globalThis.location.href = "/login"; }}
        >
          Abmelden
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="md:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-black">
        <div className="text-[#C5A059]">Admin</div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="px-3 py-2 rounded border border-[#C5A059] text-[#C5A059]" aria-label="Menu">
              <Menu size={18} />
            </button>
          </SheetTrigger>
          <SheetContent side="center" className="md:hidden">
            {Nav}
            <div className="p-4">
              <SheetClose className="px-3 py-2 rounded border border-neutral-700 text-white">Schließen</SheetClose>
            </div>
          </SheetContent>
          <SheetContent side="left" className="hidden">
            {Nav}
          </SheetContent>
        </Sheet>
      </div>
      <div className="flex">
        <div className="hidden md:block w-64 sticky top-16 h-[calc(100vh-4rem)] border-r border-neutral-800 bg-black">{Nav}</div>
        <main className="flex-1 p-6 w-full">{children}</main>
      </div>
    </div>
  );
}
