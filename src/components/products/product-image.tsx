"use client";

import { useState } from "react";

type ProductImageProps = {
  alt: string;
  fallback: React.ReactNode;
  src: string | null;
};

export function ProductImage({ alt, fallback, src }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <>{fallback}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className="relative z-0 h-[96%] w-[96%] object-contain drop-shadow-[0_22px_26px_rgb(15_23_42/0.14)] transition duration-300 group-hover/card:scale-[1.03]"
      loading="lazy"
      onError={() => setFailed(true)}
      src={src}
    />
  );
}
