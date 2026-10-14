import type { Metadata } from "next";
import localFont from "next/font/local";
import "@daypicker/react/style.css";
import "./styles/tokens.css";
import "./globals.css";
import "./styles/legacy-private.css";
import "./styles/base.css";
import "./styles/public.css";
import "./styles/booking.css";

import "./staff/staff-theme.css";

const serif = localFont({ src: "./fonts/cormorant-garamond.woff2", weight: "300 700", variable: "--font-editorial", display: "swap" });
const sans = localFont({ src: "./fonts/jost.woff2", weight: "100 900", variable: "--font-hospitality", display: "swap" });

import { indexingEnabled, siteOrigin } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  robots: { index: indexingEnabled(), follow: indexingEnabled(), googleBot: { index: indexingEnabled(), follow: indexingEnabled(), "max-image-preview": "large" } },
  title: {
    default: "Mainali Hospitality",
    template: "%s | Mainali Hospitality",
  },
  description: "Budget-friendly stays in central Darjeeling. Explore real Hotel Teesta room photographs and plan your stay directly with Mainali Hospitality.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
