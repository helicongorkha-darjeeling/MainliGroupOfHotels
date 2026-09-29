import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <main>
      <SiteHeader />
      <section className="simple-page site-shell">
        <p className="eyebrow">Page not found</p>
        <h1>This path doesn&apos;t lead<br />to a Mainali stay.</h1>
        <p className="lead">The page may have moved, or the address may be incomplete.</p>
        <Link href="/" className="button button-primary">Return home</Link>
      </section>
      <SiteFooter />
    </main>
  );
}
