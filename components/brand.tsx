import Link from "next/link";

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand-lockup ${inverted ? "text-ivory" : "text-forest"}`}
      aria-label="Mainali home"
    >
      <span
        className="brand-mark brand-logo-placeholder"
        data-logo-slot="mainali"
        aria-hidden="true"
        title="Mainali logo placeholder"
      >
        <span>M</span>
      </span>
      <span>
        <strong>MAINALI</strong>
        <small>Group of Hotels</small>
      </span>
    </Link>
  );
}
