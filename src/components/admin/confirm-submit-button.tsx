"use client";

import type { ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

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
  const { pending } = useFormStatus();

  return (
    <button
      aria-label={ariaLabel}
      className={cn(buttonVariants({ size, variant }), className)}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      title={title}
      type="submit"
    >
      {pending ? <LoaderCircle className="animate-spin" /> : children}
    </button>
  );
}
