import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center" aria-label="DENTech Medikal ana sayfa">
      <span className="relative block h-9 w-[174px] overflow-hidden rounded-sm bg-white">
        <Image
          alt="DENTech Medikal"
          fill
          className="h-full w-full object-cover object-bottom"
          sizes="174px"
          src="/brand/dentech-logo.png"
        />
      </span>
    </Link>
  );
}
