"use client";

import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmSubmitButtonProps = {
  children: ReactNode;
  className?: string;
  confirmMessage: string;
  variant?: "default" | "destructive" | "outline";
};

export function ConfirmSubmitButton({
  children,
  className,
  confirmMessage,
  variant = "destructive",
}: ConfirmSubmitButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant }), className)}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {children}
    </button>
  );
}
