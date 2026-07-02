"use client";

import type { ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmSubmitButtonProps = {
  "aria-label"?: string;
  children: ReactNode;
  className?: string;
  confirmMessage: string;
  size?: VariantProps<typeof buttonVariants>["size"];
  title?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
};

export function ConfirmSubmitButton({
  "aria-label": ariaLabel,
  children,
  className,
  confirmMessage,
  size = "default",
  title,
  variant = "destructive",
}: ConfirmSubmitButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={cn(buttonVariants({ size, variant }), className)}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      title={title}
      type="submit"
    >
      {children}
    </button>
  );
}
