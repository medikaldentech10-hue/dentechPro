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
      className="h-full w-full object-contain"
      loading="lazy"
      onError={() => setFailed(true)}
      src={src}
    />
  );
}
