import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center"
      aria-label="DENTech Medikal ana sayfa"
    >
      <span className="relative block h-9 w-[190px] overflow-hidden rounded-sm sm:h-10 sm:w-[218px]">
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
