"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import NextImage from "next/image";

export default function AdminQrPage() {
  const [url, setUrl] = useState("https://termin.barbershop-brienz.ch");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 2, width: 512, color: { dark: "#000000", light: "#ffffff" } });
        if (!cancelled) {
          setDataUrl(d);
          const c = canvasRef.current;
          if (c) {
            const img = new Image();
            img.onload = () => {
              const ctx = c.getContext("2d");
              if (!ctx) return;
              c.width = 512; c.height = 512;
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, c.width, c.height);
              ctx.drawImage(img, 0, 0);
            };
            img.src = d;
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 flex flex-col items-center gap-6">
      <h1 className="text-2xl text-[#C5A059]">QR‑Code Generator</h1>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full max-w-2xl px-3 py-2 rounded bg-black border border-[#C5A059] text-white"
        placeholder="URL"
      />
      <div className="flex flex-col items-center gap-4">
        {dataUrl && (
          <NextImage
            src={dataUrl}
            alt="QR"
            width={256}
            height={256}
            unoptimized
            className="w-64 h-64 border border-[#C5A059] bg-white"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex gap-3">
          <button onClick={() => globalThis.print()} className="px-4 py-2 rounded bg-[#C5A059] text-black">PDF drucken</button>
          {dataUrl && (
            <a href={dataUrl} download="barber-termin-qr.png" className="px-4 py-2 rounded border border-[#C5A059] text-[#C5A059]">
              PNG herunterladen
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
