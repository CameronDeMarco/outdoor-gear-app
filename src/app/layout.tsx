import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { AuthNav } from "@/components/AuthNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gear IQ — Outdoor Gear, Best-Rated & Best-Priced",
  description:
    "Recommendations driven by real review quality, with live price scanning across retailers.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site">
          <div className="container header-row">
            <Link href="/" className="brand-block">
              <div className="brand">⛰️ Gear IQ</div>
              <div className="tagline">Best-rated gear, scanned for the best price.</div>
            </Link>
            <AuthNav />
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
