"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function IntroSplash({ variant, always }: Readonly<{ variant: "client" | "admin"; always?: boolean }>) {
  const [isVisible, setIsVisible] = useState(() => {
    if (always) return true;
    const key = `hasSeenIntro_${variant}`;
    try { return !globalThis.sessionStorage.getItem(key); } catch { return true; }
  });
  const [accent, setAccent] = useState(false);
  useEffect(() => {
    if (!isVisible) return;
    const key = `hasSeenIntro_${variant}`;
    const t1 = setTimeout(() => { setAccent(true); }, 4100);
    const t2 = setTimeout(() => { setIsVisible(false); }, 4500);
    try { if (!always) globalThis.sessionStorage.setItem(key, "1"); } catch {}
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [variant, isVisible, always]);
  const src = variant === "admin" ? "/logo_admin.svg" : "/logo.svg";
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`fixed inset-0 ${accent ? "bg-transparent" : "bg-black"} z-50 flex items-center justify-center pointer-events-none`}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.img
            layoutId="brand-logo"
            src={src}
            alt="Logo"
            initial={{ scale: 0.9, x: 0, y: 0, filter: "brightness(1) drop-shadow(0 0 0px #C5A059)" }}
            animate={accent ? {
              scale: 1,
              filter: "brightness(1.35) drop-shadow(0 0 25px #C5A059)",
            } : {
              scale: [0.9, 1.05, 0.95, 1],
              filter: [
                "brightness(1) drop-shadow(0 0 0px #C5A059)",
                "brightness(1.3) drop-shadow(0 0 25px #C5A059)",
                "brightness(1.15) drop-shadow(0 0 12px #C5A059)",
                "brightness(1) drop-shadow(0 0 0px #C5A059)",
              ],
            }}
            transition={accent ? { duration: 0.4, ease: "easeInOut" } : { duration: 4.1, ease: "easeInOut", times: [0, 0.33, 0.66, 1] }}
            className="w-48 h-48"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
