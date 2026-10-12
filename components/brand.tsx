import Link from "next/link";
import Image from "next/image";

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand-lockup ${inverted ? "brand-lockup-inverted text-ivory" : "text-forest"}`}
      aria-label="Mainali Hospitality home"
    >
      <Image
        src="/brand/mainali-hospitality.png"
        alt="Mainali Hospitality"
        width={1017}
        height={498}
        sizes="(max-width: 640px) 128px, 160px"
        className="brand-logo"
      />
    </Link>
  );
}
