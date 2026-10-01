import type { Metadata } from "next";
import "@daypicker/react/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mainali Group of Hotels",
    template: "%s | Mainali Group of Hotels",
  },
  description: "Mainali Group of Hotels. Discover Hotel Teesta in Darjeeling.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
