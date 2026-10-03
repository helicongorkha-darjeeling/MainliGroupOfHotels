import type { Metadata } from "next";
import localFont from "next/font/local";
import "@daypicker/react/style.css";
import "./globals.css";
import "./mainali-theme.css";

const serif = localFont({ src: "./fonts/cormorant-garamond.woff2", weight: "300 700", variable: "--font-editorial", display: "swap" });
const sans = localFont({ src: "./fonts/jost.woff2", weight: "100 900", variable: "--font-hospitality", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Mainali Group of Hotels",
    template: "%s | Mainali Group of Hotels",
  },
  description: "Budget-friendly stays in central Darjeeling. Explore real Hotel Teesta room photographs and plan your stay directly with Mainali Group of Hotels.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
