import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BrandHeader from "../components/BrandHeader";
import CookieConsent from "../components/CookieConsent";
import Image from "next/image";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export const metadata: Metadata = {
  title: "Barber Shop Brienz – Ihr Herrenfriseur in Interlaken/Brienz",
  description: "Online buchen. Herrenhaarschnitt, Bart, Kinderleistungen. Schnell und bequem.",
  manifest: "/manifest.json",
  metadataBase: new URL(baseUrl),
  icons: {
    icon: "/booking/favicon.ico",
    shortcut: "/booking/favicon-16x16.png",
    apple: "/booking/apple-touch-icon.png",
  },
  appleWebApp: {
    title: "Barber",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Barber Shop Brienz – Ihr Herrenfriseur in Interlaken/Brienz",
    description: "Online buchen. Herrenhaarschnitt, Bart, Kinderleistungen. Schnell und bequem.",
    url: baseUrl,
    siteName: "Barber Shop Brienz",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
    locale: "de_CH",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="dark bg-black">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background min-h-[100dvh]`}
      >
        <BrandHeader />
        {children}
        <a
          href="https://www.rototype.ch/"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-2 right-2 flex items-center gap-2 text-xs text-neutral-400 hover:text-[#C5A059]"
        >
          <Image src="/logo_rototype.png" alt="Rototype" width={16} height={16} className="h-4 w-auto" />
          Powered by rototype.ch
        </a>
        <CookieConsent />
      </body>
    </html>
  );
}
