import Link from "next/link";

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand-lockup ${inverted ? "text-ivory" : "text-forest"}`}
      aria-label="Mainali home"
    >
      <span>
        <strong>MAINALI</strong>
        <small>Group of Hotels</small>
      </span>
    </Link>
  );
}
