"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
const IntroSplash = dynamic(() => import("@/components/ui/IntroSplash"), { ssr: false });

export default function AdminIntro() {
  const router = useRouter();
  useEffect(() => {
    const key = "hasSeenIntro_admin";
    try {
      const seen = globalThis.sessionStorage.getItem(key);
      if (seen) { router.replace("/login"); return; }
    } catch {}
    const t = setTimeout(() => { router.replace("/login"); }, 3100);
    return () => { clearTimeout(t); };
  }, [router]);
  return <IntroSplash variant="admin" />;
}
