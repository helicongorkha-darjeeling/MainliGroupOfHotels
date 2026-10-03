"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Brand } from "@/components/brand";

const links = [
  { href: "/", label: "Home" },
  { href: "/hotels", label: "Hotels" },
  { href: "/experiences", label: "Experiences" },
  { href: "/offers", label: "Offers" },
  { href: "/our-story", label: "Our story" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const pathname = usePathname();
  const menu = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const transparent = overlay && !scrolled;

  useEffect(() => {
    function update() { setScrolled(window.scrollY > 60); }
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  function close() { menu.current?.close(); }

  return <>
    <div className="mainali-topbar"><div className="site-shell"><span>Darjeeling, West Bengal</span><div className="topbar-account-links"><Link href="/my-bookings">My bookings</Link><Link href="/members">Members login</Link></div></div></div>
    <header className={"site-header " + (transparent ? "site-header-overlay" : "site-header-solid") + (overlay ? " header-over-hero" : "")}>
      <div className="site-shell header-inner">
        <Brand inverted={transparent} />
        <nav className="desktop-navigation" aria-label="Primary navigation">
          {links.map((link) => <Link href={link.href} key={link.href} aria-current={pathname === link.href || (link.href === "/hotels" && pathname.startsWith("/stays/")) ? "page" : undefined}>{link.label}</Link>)}
        </nav>
        <Link href="/stays/teesta#check-rooms" className="header-book-link">Book your stay</Link>
        <button ref={trigger} type="button" className="menu-toggle" aria-label="Open menu" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setOpen(true); menu.current?.showModal(); }}><Menu size={27} strokeWidth={1.3} /></button>
      </div>
    </header>
    <dialog ref={menu} className="mainali-menu" aria-label="Site navigation" onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <div className="mobile-menu-head"><Brand inverted /><button type="button" className="quiet-icon" aria-label="Close menu" onClick={close}><X size={26} strokeWidth={1.3} /></button></div>
      <nav aria-label="Mobile navigation">
        {links.map((link) => <Link key={link.href} href={link.href} onClick={close} aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}
        <Link href="/my-bookings" onClick={close}>My bookings</Link>
        <Link href="/members" onClick={close}>Members login</Link>
      </nav>
      <Link href="/stays/teesta#check-rooms" className="button button-primary" onClick={close}>Book your stay</Link>
    </dialog>
  </>;
}
