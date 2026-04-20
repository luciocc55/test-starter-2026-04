import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BTS — Describe your space. We'll find it.",
    template: "%s · BTS",
  },
  description:
    "AI-powered search across every NYC office submarket. Describe what you need in plain English.",
  openGraph: {
    type: "website",
    siteName: "BTS — NYC Office Search",
    url: SITE_URL,
    title: "BTS — Describe your space. We'll find it.",
    description: "AI-powered search across every NYC office submarket.",
  },
  twitter: { card: "summary_large_image", title: "BTS — NYC Office Search" },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
