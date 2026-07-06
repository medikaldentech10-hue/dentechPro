"use client";

import { useState } from "react";

type ProductImageProps = {
  alt: string;
  fallback: React.ReactNode;
  priority?: boolean;
  src: string | null;
};

export function ProductImage({
  alt,
  fallback,
  priority = false,
  src,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <>{fallback}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className="relative z-0 h-full w-full object-contain drop-shadow-[0_18px_22px_rgb(15_23_42/0.12)] transition duration-300 group-hover/card:scale-[1.03] sm:h-[96%] sm:w-[96%]"
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      loading={priority ? "eager" : "lazy"}
      onError={() => setFailed(true)}
      src={src}
    />
  );
}
