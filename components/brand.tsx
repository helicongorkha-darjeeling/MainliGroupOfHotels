"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { hoverLogo } from "@/lib/brand-artwork";
export function Brand({ variant = "light", intro = false }: { variant?: "light" | "dark"; intro?: boolean }) {
  const prefix = "brand-" + useId().replace(/:/g, "");
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!intro || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try { if (sessionStorage.getItem("mainali-logo-intro")) return; sessionStorage.setItem("mainali-logo-intro", "1"); } catch { return; }
    const frame = requestAnimationFrame(() => setPlaying(true)), timer = setTimeout(() => setPlaying(false), 5700);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [intro]);
  const markup = hoverLogo.replace(/id="([^"]+)"/g, (_, id: string) => `id="${prefix}-${id}"`).replace(/href="#([^"]+)"/g, (_, id: string) => `href="#${prefix}-${id}"`).replace(/url\(#([^\)]+)\)/g, (_, id: string) => `url(#${prefix}-${id})`);
  return <Link href="/" className={`brand-lockup brand-${variant}`} aria-label="Mainali Hospitality home">{playing ? <Image src={`/brand/mainali-logo-intro${variant === "dark" ? "-dark" : ""}.svg`} width={240} height={122} alt="" unoptimized /> : <span className="brand-vector" aria-hidden="true" dangerouslySetInnerHTML={{ __html: markup }} />}</Link>;
}
