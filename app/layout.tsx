import type { Metadata } from "next";
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
