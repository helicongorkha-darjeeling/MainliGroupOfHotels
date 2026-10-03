import Image from "next/image";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export function EditorialPage({ title, eyebrow, intro, image, children }: { title: string; eyebrow: string; intro: string; image: string; children: ReactNode }) {
  return <main className="mainali-public-page">
    <SiteHeader overlay />
    <section className="mainali-property-hero editorial-page-hero">
      <Image src={image} alt="Hotel Teesta, Darjeeling" fill preload sizes="100vw" className="cover-image" style={{objectPosition:"50% 60%"}} />
      <div className="mainali-hero-shade" />
      <div className="mainali-hero-copy site-shell"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{intro}</p></div>
    </section>
    {children}
    <SiteFooter />
  </main>;
}
