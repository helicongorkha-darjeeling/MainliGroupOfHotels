import Link from "next/link";
import { Brand } from "@/components/brand";

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  return (
    <header className={overlay ? "site-header site-header-overlay" : "site-header site-header-solid"}>
      <div className="site-shell header-inner">
        <Brand inverted={overlay} />
        <nav aria-label="Primary navigation">
          <Link href="/stays/teesta">Stays</Link>
          <Link href="/contact" className="nav-contact">Contact</Link>
          <Link href="/my-bookings" className="nav-bookings">My bookings</Link>
        </nav>
      </div>
    </header>
  );
}
