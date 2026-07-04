"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PendingSubmitButtonProps = ComponentProps<typeof Button> & {
  pendingLabel?: string;
};

export function PendingSubmitButton({
  children,
  className,
  disabled,
  pendingLabel,
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-disabled={pending || disabled}
      className={cn(className)}
      disabled={pending || disabled}
      {...props}
    >
      {pending ? pendingLabel ?? children : children}
    </Button>
  );
}
