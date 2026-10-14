"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Brand } from "./brand";
const links = [{ href: "/rooms", label: "Rooms" }, { href: "/stays/teesta", label: "Hotel Teesta" }, { href: "/experiences", label: "Darjeeling guide" }, { href: "/contact", label: "Contact" }];
export function SiteHeader({ overlay = false, home = false }: { overlay?: boolean; home?: boolean }) {
  const pathname = usePathname(), menu = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const [scrolled, setScrolled] = useState(false), [open, setOpen] = useState(false);
  const transparent = overlay && !scrolled;
  useEffect(() => { const update = () => setScrolled(window.scrollY > 40); const frame = requestAnimationFrame(update); window.addEventListener("scroll", update, { passive: true }); return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", update); }; }, []);
  useEffect(() => { if (!open) return; const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; }; }, [open]);
  const close = () => menu.current?.close();
  return <>
    <header className={`site-header ${transparent ? "site-header-overlay" : "site-header-solid"}`}><div className="site-shell header-inner">
      <Brand variant={transparent ? "dark" : "light"} intro={home} />
      <nav className="desktop-navigation" aria-label="Primary navigation">{links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}<Link href="/my-bookings">My booking</Link></nav>
      <Link href={home || pathname === "/stays/teesta" ? "#check-rooms" : "/stays/teesta#check-rooms"} className="button button-primary header-book-link">Book</Link>
      <button ref={trigger} type="button" className="menu-toggle quiet-icon" aria-label="Open menu" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setOpen(true); menu.current?.showModal(); }}><Menu size={26} /></button>
    </div></header>
    <dialog ref={menu} className="mainali-menu" aria-label="Site navigation" onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <div className="mobile-menu-head"><Brand variant="dark" /><button className="quiet-icon" aria-label="Close menu" onClick={close}><X /></button></div>
      <nav aria-label="Mobile navigation">{links.map(link => <Link key={link.href} href={link.href} onClick={close}>{link.label}</Link>)}</nav>
      <div className="menu-secondary"><Link href="/my-bookings" onClick={close}>My booking</Link><Link href="/members" onClick={close}>Members login</Link><Link href="/our-story" onClick={close}>Our story</Link></div>
      <Link href="/stays/teesta#check-rooms" className="button button-primary menu-cta" onClick={close}>Check availability</Link>
    </dialog>
  </>;
}
