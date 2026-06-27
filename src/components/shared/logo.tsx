import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center" aria-label="DENTech Medikal ana sayfa">
      <span className="relative block h-10 w-[218px] overflow-hidden rounded-sm">
        <Image
          alt="DENTech Medikal"
          fill
          className="h-full w-full object-contain"
          sizes="218px"
          src="/brand/dentech-logo.png"
        />
      </span>
    </Link>
  );
}
